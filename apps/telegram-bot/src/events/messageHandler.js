
import { PublicKey, Keypair } from '@solana/web3.js';
import {
    getWizardSession, saveWizardSession, deleteWizardSession,
    getLink, getUserWallet, getUserWallets, saveChatMember,
    getLastSpokeBalance, saveLastSpokeBalance
} from '../storage.js';
import { getRules } from '../utils/rulesManager.js';
import { getTokenBalance, getTokenSupply, getAggregatedTokenBalance } from '../solana.js';
import { config } from '../config.js';
import { MESSAGES } from '../messages.js';
import { escapeMarkdown } from '../utils/formatting.js';

// --- Wizard Logic ---
async function handleWizardStep(ctx) {
    const userId = ctx.from.id;
    let session = await getWizardSession(userId);

    // If no session, return null to indicate we should proceed to other handlers
    if (!session) return false;

    // Logic from bot.js
    const text = ctx.message.text ? ctx.message.text.trim() : '';
    if (!text && session.step !== 999) return false; // Non-text message in wizard?

    // Cancel check
    if (text.toLowerCase() === 'cancel') {
        await deleteWizardSession(userId);
        await ctx.reply(MESSAGES.WIZARD.CANCEL);
        return true; // handled
    }

    // Step 0: Community Name
    if (session.step === 'NAME') {
        session.data = { name: text };
        session.step = 1;
        await saveWizardSession(userId, session);
        await ctx.reply(
            MESSAGES.WIZARD.STEP_NAME_SAVED(text),
            { parse_mode: 'Markdown' }
        );
        return true;
    }

    // Step 1: Token Mint
    if (session.step === 1) {
        try {
            new PublicKey(text); // Validate address
            session.data.tokenMint = text;
            session.step = 2;
            await saveWizardSession(userId, session); // Save state
            await ctx.reply(
                MESSAGES.WIZARD.STEP_MINT_SAVED,
                { parse_mode: 'Markdown' }
            );
            return true;
        } catch (e) {
            await ctx.reply(MESSAGES.ERRORS.INVALID_ADDRESS);
            return true;
        }
    }

    // Step 2: Min Balance OR Percentage
    if (session.step === 2) {
        let isPercentage = false;
        if (text.endsWith('%')) {
            isPercentage = true;
        }

        const value = parseFloat(text.replace('%', '')); // Strip % if present

        if (isNaN(value) || value < 0) {
            await ctx.reply(MESSAGES.ERRORS.INVALID_NUMBER);
            return true;
        }

        if (isPercentage && value > 100) {
            await ctx.reply(MESSAGES.ERRORS.INVALID_PERCENTAGE);
            return true;
        }

        // Save based on type
        if (isPercentage) {
            session.data.minTokenPercentage = value;
            session.data.minTokenBalance = 0;
        } else {
            session.data.minTokenBalance = value;
            session.data.minTokenPercentage = 0;
        }

        session.step = 3;
        await saveWizardSession(userId, session); // Save state
        const displayValue = isPercentage ? value + '%' : value.toLocaleString() + ' Tokens';
        await ctx.reply(
            MESSAGES.WIZARD.STEP_REQUIREMENT_SAVED(displayValue),
            { parse_mode: 'Markdown' }
        );
        return true;
    }

    // Step 3: Jeet Mode
    if (session.step === 3) {
        const lower = text.toLowerCase();
        let enabled = false;
        if (['yes', 'y', 'true', 'on'].includes(lower)) {
            enabled = true;
        } else if (['no', 'n', 'false', 'off'].includes(lower)) {
            enabled = false;
        } else {
            // Default to no if unclear, or ask again? Let's just assume No for anything else to be safe/easy
            // Or maybe strict 'Yes'/'No' is better?
            // Let's go strict for better UX to avoid accidental 'no'
            if (lower !== 'no' && lower !== 'n') {
                // For now, lenient: if it contains 'yes' -> yes.
                if (lower.includes('yes')) enabled = true;
            }
        }

        session.data.jeetMode = enabled;
        session.step = 4;
        await saveWizardSession(userId, session);

        await ctx.reply(
            MESSAGES.WIZARD.STEP_JEET_SAVED(enabled),
            { parse_mode: 'Markdown' }
        );
        return true;
    }

    // Step 4: Whale % & Finalize
    if (session.step === 4) {
        let whale = parseFloat(text);
        if (isNaN(whale) || whale < 0 || whale > 100) {
            await ctx.reply(MESSAGES.WIZARD.INVALID_RANGE);
            return true;
        }
        session.data.whalePercentage = whale;

        // Generate Rules JSON
        const rules = {
            type: "COMMUNITY_RULES",
            name: session.data.name || "Telegram Community",
            tokenMint: session.data.tokenMint,
            minTokenPercentage: session.data.minTokenPercentage,
            minTokenBalance: session.data.minTokenBalance,
            whalePercentage: session.data.whalePercentage,
            jeetMode: session.data.jeetMode
        };

        // Generate a fresh keypair for the community
        // Note: In a real app we might want to be careful generating keys on server/bot
        // but this follows existing logic.
        const newCommunityKeypair = Keypair.generate();
        const address = newCommunityKeypair.publicKey.toString();

        const jsonString = JSON.stringify(rules);

        await ctx.reply(
            MESSAGES.WIZARD.COMPLETE(address, jsonString),
            { parse_mode: 'Markdown' }
        );

        // Clear session
        await deleteWizardSession(userId);
        return true;
    }

    return false;
}

// --- Enforcement Logic ---
async function handleEnforcement(ctx, connection) {
    // 1. Track Member
    if (ctx.chat.type !== 'private') {
        saveChatMember(ctx.chat.id, ctx.from.id).catch(console.error);
    }

    // Exempt User Check
    if (String(ctx.from.id) === config.EXEMPT_USER_ID) return false;

    // Skip if it's a command
    if (ctx.message.text && ctx.message.text.startsWith('/')) {
        return false; // Not handled, let other middleware handle it (or next())
    }

    const address = await getLink(ctx.chat.id);
    if (!address) return false;

    const rules = await getRules(connection, address);
    if (!rules) return false;

    // 0. Verify Wallet Connection
    const wallets = await getUserWallets(ctx.from.id.toString());

    // If rules require verification (implicitly required for token gating)
    if ((rules.minTokenBalance || rules.minTokenPercentage) && (!wallets || wallets.length === 0)) {
        try {
            await ctx.deleteMessage();

            const botUsername = ctx.botInfo?.username || 'memo_verification_bot';
            const verifyUrl = `https://t.me/${botUsername}?start=verify_${address}`;

            // Helper to get requirement text
            const getRequirementText = async () => {
                if (rules.minTokenPercentage > 0) {
                    const supply = await getTokenSupply(connection, rules.tokenMint);
                    if (supply === null) return "Check failed (RPC Error)";
                    const requiredAmount = supply * (rules.minTokenPercentage / 100);
                    return `${rules.minTokenPercentage}% of Supply (${requiredAmount.toLocaleString()} tokens)`;
                } else if (rules.minTokenBalance > 0) {
                    return `${rules.minTokenBalance.toLocaleString()} tokens`;
                }
                return "No specific requirement";
            };

            const reqText = await getRequirementText();

            // Send DM Warning
            try {
                await ctx.telegram.sendMessage(
                    ctx.from.id,
                    MESSAGES.ENFORCEMENT.VERIFY_WARNING(ctx.chat.title, verifyUrl, reqText),
                    { parse_mode: 'Markdown' }
                );
            } catch (dmError) {
                // User might have blocked bot
                console.log(`[DEBUG] Failed to DM enforcement warning to ${ctx.from.id}: ${dmError.message}`);
            }

            return true; // Handled (Deleted)
        } catch (e) { }
        return true;
    }

    // Check Token Balance (if verified)
    if ((rules.minTokenBalance || rules.minTokenPercentage) && wallets && wallets.length > 0) {
        const mint = rules.tokenMint;
        if (mint) {
            const balance = await getAggregatedTokenBalance(connection, wallets, mint);
            if (balance === null) return false; // Skip on Error (Fail Open)

            let passed = true;
            let requiredAmount = 0;

            if (rules.minTokenPercentage > 0) {
                const supply = await getTokenSupply(connection, mint);
                if (supply === null) return false; // Skip on Error
                requiredAmount = supply * (rules.minTokenPercentage / 100);
                if (balance < requiredAmount) passed = false;
            } else if (rules.minTokenBalance > 0) {
                requiredAmount = rules.minTokenBalance;
                if (balance < rules.minTokenBalance) passed = false;
            }

            if (!passed) {
                try {
                    await ctx.deleteMessage();
                    const warning = await ctx.reply(MESSAGES.ENFORCEMENT.INSUFFICIENT_BALANCE(requiredAmount.toLocaleString(), rules.minTokenPercentage > 0));
                    setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => { }), 5000);
                    return true;
                } catch (e) { }
                return true;
            }

            // --- Jeet Mode Check ---
            if (rules.jeetMode) {
                try {
                    const lastBalance = await getLastSpokeBalance(ctx.chat.id, ctx.from.id);
                    // Only alert if we have a history AND current is LESS than last
                    if (lastBalance !== null && balance < lastBalance) {
                        // User is poorer - Call them out!
                        const mention = `[${escapeMarkdown(ctx.from.first_name)}](tg://user?id=${ctx.from.id})`;
                        await ctx.reply(
                            MESSAGES.ENFORCEMENT.JEET_ALERT(mention, lastBalance.toLocaleString(), balance.toLocaleString()),
                            { parse_mode: 'Markdown' }
                        );
                    }
                    // Update last spoke balance (always update to current)
                    await saveLastSpokeBalance(ctx.chat.id, ctx.from.id, balance);
                } catch (e) {
                    console.error("Jeet Mode Error:", e);
                }
            }
        }
    }


    // 1. Check Banned Words
    if (rules.bannedWords && ctx.message.text) {
        const text = ctx.message.text.toLowerCase();
        for (const word of rules.bannedWords) {
            if (text.includes(word.toLowerCase())) {
                try {
                    await ctx.deleteMessage();
                    const warning = await ctx.reply(MESSAGES.ENFORCEMENT.BANNED_WORD(word));
                    setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => { }), 5000);
                    return true;
                } catch (e) {
                    console.error("Failed to delete message:", e.message);
                }
            }
        }
    }

    // 2. Check "Images Only"
    if (rules.imagesOnly && !ctx.message.photo) {
        try {
            await ctx.deleteMessage();
            const warning = await ctx.reply(MESSAGES.ENFORCEMENT.IMAGES_ONLY);
            setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => { }), 5000);
            return true;
        } catch (e) { }
        return true;
    }

    return false; // Clean
}


// Main Handler
export async function handleMessage(ctx, next, connection) {
    // 1. Wizard Check (Primary)
    if (ctx.chat.type === 'private') {
        const wizardHandled = await handleWizardStep(ctx);
        if (wizardHandled) return; // Stop propagation
    }

    // 2. Enforcement Check
    if (ctx.chat.type !== 'private') {
        const enforcementHandled = await handleEnforcement(ctx, connection);
        if (enforcementHandled) return; // Stop propagation (deleted message)
    }

    // 3. Next
    return next();
}
