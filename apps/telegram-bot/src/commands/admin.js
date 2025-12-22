import { PublicKey } from '@solana/web3.js';
import { fetchCommunityRules, getTokenBalance, getTokenSupply, getAggregatedTokenBalance } from '../solana.js';
import {
    saveLink, getLink, getChatMembers, removeChatMember, getUserWallet, getUserWallets,
    saveWizardSession, getWizardSession, deleteWizardSession
} from '../storage.js';
import { getRules } from '../utils/rulesManager.js';
import { escapeMarkdown } from '../utils/formatting.js';
import { config } from '../config.js';
import { MESSAGES } from '../messages.js';

export async function handleLink(ctx, connection) {
    try {
        // Enforce Group Chat Only
        if (ctx.chat.type === 'private') {
            return ctx.reply(MESSAGES.ADMIN.LINK_WRONG_CHAT(ctx.botInfo.username), { parse_mode: 'Markdown' });
        }

        const member = await ctx.getChatMember(ctx.from.id);
        if (member.status !== 'creator' && member.status !== 'administrator') {
            return ctx.reply(MESSAGES.ERRORS.ONLY_ADMINS);
        }

        const args = ctx.message.text.split(' ');
        if (args.length !== 2) {
            return ctx.reply(MESSAGES.ADMIN.LINK_USAGE);
        }

        const address = args[1];
        try {
            new PublicKey(address);
        } catch (e) {
            return ctx.reply(MESSAGES.ERRORS.INVALID_ADDRESS);
        }

        const rules = await fetchCommunityRules(connection, address);
        if (!rules) {
            return ctx.reply(MESSAGES.ADMIN.RULES_NOT_FOUND(address), { parse_mode: 'Markdown' });
        }


        await saveLink(ctx.chat.id, address);

        ctx.reply(MESSAGES.ADMIN.LINK_SUCCESS(rules.name || 'Memo Community'), { parse_mode: 'Markdown' });

    } catch (e) {
        console.error(e);
        ctx.reply('❌ An error occurred while linking.');
    }
}

export async function handleAudit(ctx, connection) {
    if (ctx.chat.type === 'private') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_GROUP);
    }

    // Check if sender is admin
    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== 'creator' && member.status !== 'administrator') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_ADMINS);
    }

    const address = await getLink(ctx.chat.id);
    if (!address) {
        return ctx.reply('⚠️ This chat is not linked to any Memo Community.');
    }

    ctx.reply(MESSAGES.ADMIN.AUDIT_START);

    const memberIds = await getChatMembers(ctx.chat.id);
    if (!memberIds || memberIds.length === 0) {
        return ctx.reply(MESSAGES.ADMIN.AUDIT_NO_MEMBERS);
    }

    const rules = await getRules(connection, address);
    if (!rules || !rules.tokenMint) {
        return ctx.reply(MESSAGES.ADMIN.AUDIT_ERROR_RULES);
    }

    const unverifiedList = [];

    for (const userId of memberIds) {
        if (String(userId) === config.EXEMPT_USER_ID) continue; // Skip exempted user
        try {
            // Check if user is still in chat
            const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
            if (chatMember.status === 'left' || chatMember.status === 'kicked') {
                await removeChatMember(ctx.chat.id, userId);
                continue;
            }
            if (chatMember.user.is_bot) continue;

            const wallets = await getUserWallets(userId.toString());

            // 1. Check if wallet linked
            if (!wallets || wallets.length === 0) {
                unverifiedList.push({ userId, reason: "No Wallet Linked" });
                continue;
            }

            // 2. Check Balance
            const balance = await getAggregatedTokenBalance(connection, wallets, rules.tokenMint);
            if (balance === null) continue; // Skip on RPC Error to avoid false negatives

            let passed = true;

            if (rules.minTokenPercentage > 0) {
                const supply = await getTokenSupply(connection, rules.tokenMint);
                if (supply === null) continue; // Skip supply check error
                const required = supply * (rules.minTokenPercentage / 100);
                if (balance < required) passed = false;
            } else if (rules.minTokenBalance > 0) {
                if (balance < rules.minTokenBalance) passed = false;
            }

            if (!passed) {
                unverifiedList.push({ userId, reason: `Insufficient Balance (${balance.toLocaleString()})` });
            }

        } catch (e) {
            console.error(`Audit error for ${userId}:`, e.message);
        }
    }

    if (unverifiedList.length === 0) {
        return ctx.reply(MESSAGES.ADMIN.AUDIT_PASSED);
    }

    let output = MESSAGES.ADMIN.AUDIT_REPORT_HEADER(unverifiedList.length);

    for (let i = 0; i < Math.min(unverifiedList.length, 40); i++) {
        const item = unverifiedList[i];
        let name = `User \`${item.userId}\``;
        try {
            const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, item.userId);
            const user = chatMember.user;
            const rawName = user.username ? `@${user.username}` : user.first_name;
            name = escapeMarkdown(rawName);
        } catch (e) { }
        output += `${i + 1}. ${name} - ${item.reason}\n`;
    }

    if (unverifiedList.length > 40) {
        output += MESSAGES.ADMIN.AUDIT_REPORT_FOOTER(unverifiedList.length - 40);
    } else {
        output += `\n👉 Run \`/kick\` to remove these users.`;
    }

    ctx.reply(output, { parse_mode: 'Markdown' });
}

export async function handleKick(ctx, connection) {
    if (ctx.chat.type === 'private') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_GROUP);
    }

    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== 'creator' && member.status !== 'administrator') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_ADMINS);
    }

    const address = await getLink(ctx.chat.id);
    if (!address) return ctx.reply('⚠️ This chat is not linked.');

    const rules = await getRules(connection, address);
    if (!rules) return ctx.reply('❌ Cannot fetch rules.');

    ctx.reply(MESSAGES.ADMIN.KICK_START);

    const memberIds = await getChatMembers(ctx.chat.id);
    let kickedCount = 0;

    for (const userId of memberIds) {
        if (String(userId) === config.EXEMPT_USER_ID) continue; // Skip exempted user
        try {
            const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
            if (chatMember.status === 'left' || chatMember.status === 'kicked') {
                await removeChatMember(ctx.chat.id, userId);
                continue;
            }
            if (chatMember.user.is_bot) continue;
            // Don't kick admins
            if (chatMember.status === 'administrator' || chatMember.status === 'creator') continue;

            const wallets = await getUserWallets(userId.toString());
            let shouldKick = false;
            let kickReason = "Non-compliance";

            if (!wallets || wallets.length === 0) {
                shouldKick = true;
                kickReason = "No Wallet Linked";
            } else {
                const balance = await getAggregatedTokenBalance(connection, wallets, rules.tokenMint);
                if (balance === null) {
                    console.warn(`Skipping kick for ${userId} (RPC Error)`);
                    continue;
                }

                if (rules.minTokenPercentage > 0) {
                    const supply = await getTokenSupply(connection, rules.tokenMint);
                    if (supply === null) {
                        console.warn(`Skipping kick for ${userId} (Supply RPC Error)`);
                        continue;
                    }
                    const required = supply * (rules.minTokenPercentage / 100);
                    if (balance < required) {
                        shouldKick = true;
                        kickReason = `Insufficient Balance: ${balance.toLocaleString()} (Req: ${required.toLocaleString()})`;
                    }
                } else if (rules.minTokenBalance > 0) {
                    // Logic was inconsistent here, previously blindly checked balance < minTokenBalance
                    if (balance < rules.minTokenBalance) {
                        shouldKick = true;
                        kickReason = `Insufficient Balance: ${balance.toLocaleString()} (Req: ${rules.minTokenBalance.toLocaleString()})`;
                    }
                }
            }

            if (shouldKick) {
                // Notify User
                try {
                    const safeTitle = escapeMarkdown(ctx.chat.title);
                    await ctx.telegram.sendMessage(userId, MESSAGES.ADMIN.KICK_DM(safeTitle, kickReason), { parse_mode: 'Markdown' });
                } catch (err) {
                    console.log(`Could not DM user ${userId} before kick: ${err.message}`);
                }

                await ctx.banChatMember(userId);
                await ctx.unbanChatMember(userId); // Unban to allow re-joining
                await removeChatMember(ctx.chat.id, userId); // Stop tracking
                kickedCount++;
            }
        } catch (e) {
            console.error(`Failed to kick ${userId}:`, e.message);
        }
    }

    ctx.reply(MESSAGES.ADMIN.KICK_COMPLETE(kickedCount), { parse_mode: 'Markdown' });
}

export async function handleCheck(ctx, connection) {
    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== 'creator' && member.status !== 'administrator') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_ADMINS);
    }

    if (!ctx.message.reply_to_message) {
        return ctx.reply(MESSAGES.ADMIN.CHECK_REPLY);
    }

    const targetUser = ctx.message.reply_to_message.from;
    const wallets = await getUserWallets(targetUser.id.toString());

    if (!wallets || wallets.length === 0) {
        return ctx.reply(MESSAGES.ADMIN.CHECK_USER_NO_WALLET(escapeMarkdown(targetUser.first_name)), { parse_mode: 'Markdown' });
    }

    let message = MESSAGES.ADMIN.CHECK_RESULT_HEADER(escapeMarkdown(targetUser.first_name));

    const address = await getLink(ctx.chat.id);
    if (address) {
        const rulesData = await getRules(connection, address);
        if (rulesData && rulesData.tokenMint) {
            const balance = await getAggregatedTokenBalance(connection, wallets, rulesData.tokenMint);

            if (balance === null) {
                return ctx.reply("❌ **RPC Error**: Could not fetch balance. Please try again.");
            }

            message += MESSAGES.ADMIN.CHECK_RESULT_BALANCE(balance.toLocaleString());

            let passed = true;
            if (rulesData.minTokenPercentage > 0) {
                const supply = await getTokenSupply(connection, rulesData.tokenMint);
                if (supply === null) {
                    return ctx.reply("❌ **RPC Error**: Could not fetch supply.");
                }
                const requiredAmount = supply * (rulesData.minTokenPercentage / 100);
                if (balance < requiredAmount) passed = false;
            } else if (rulesData.minTokenBalance > 0) {
                if (balance < rulesData.minTokenBalance) passed = false;
            }

            message += passed ? MESSAGES.ADMIN.CHECK_RESULT_PASSED : MESSAGES.ADMIN.CHECK_RESULT_FAILED;
        }
    }

    ctx.reply(message, { parse_mode: 'Markdown' });
}

// Handler for /create (Wizard moved here)
export async function handleCreate(ctx, connection) {
    // Only in DM
    if (ctx.chat.type !== 'private') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_DM);
    }

    const userId = ctx.from.id;
    const wallets = await getUserWallets(userId.toString());

    if (!wallets || wallets.length === 0) {
        return ctx.reply(MESSAGES.ERRORS.NO_WALLET);
    }

    // Check Eligibility
    const memoBalance = await getAggregatedTokenBalance(connection, wallets, config.MEMO_MINT);

    // Handle RPC Error
    if (memoBalance === null) {
        return ctx.reply("⚠️ Network Error. Could not fetch balances to verify eligibility.", { parse_mode: 'Markdown' });
    }

    if (memoBalance < config.CREATOR_MIN_BALANCE) {
        return ctx.reply(MESSAGES.WIZARD.INSUFFICIENT_MEMO(config.CREATOR_MIN_BALANCE.toLocaleString(), memoBalance.toLocaleString()), { parse_mode: 'Markdown' });
    }

    // Start Wizard
    await saveWizardSession(userId, { step: 'NAME' });

    ctx.reply(MESSAGES.WIZARD.START);
}



export async function handleExport(ctx, connection) {
    if (ctx.chat.type === 'private') return ctx.reply(MESSAGES.ERRORS.ONLY_GROUP);

    // Admin Only
    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== 'creator' && member.status !== 'administrator') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_ADMINS);
    }

    const address = await getLink(ctx.chat.id);
    const rules = address ? await getRules(connection, address) : null;
    const tokenMint = rules ? rules.tokenMint : null;

    const processingMsg = await ctx.reply(tokenMint
        ? "📂 generating export with balances... (this may take a moment)"
        : "📂 Generating export (no token rules found)...");

    try {
        const memberIds = await getChatMembers(ctx.chat.id);
        if (!memberIds || memberIds.length === 0) {
            return ctx.reply("❌ No members found to export.");
        }

        const exportDate = new Date().toISOString();
        let csvContent = "User ID,Username,Wallet Address,Token Balance,Export Date\n";
        let count = 0;

        // Process in batches to avoid Rate Limits
        const BATCH_SIZE = 5;
        for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
            const batch = memberIds.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (userId) => {
                if (String(userId) === config.EXEMPT_USER_ID) return;

                const wallets = await getUserWallets(userId.toString());
                if (wallets && wallets.length > 0) {
                    let balance = "N/A";
                    if (tokenMint) {
                        try {
                            const balVal = await getAggregatedTokenBalance(connection, wallets, tokenMint);
                            balance = balVal !== null ? balVal : "Error";
                        } catch (e) { }
                    }

                    // Fetch Username
                    let username = "N/A";
                    try {
                        const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
                        username = chatMember.user.username ? `@${chatMember.user.username}` : chatMember.user.first_name;
                    } catch (e) {
                        console.warn(`Could not fetch user ${userId} for export:`, e.message);
                    }

                    // Join wallets with a separator for CSV
                    const walletStr = wallets.join(' ; ');
                    csvContent += `${userId},"${username}","${walletStr}",${balance},${exportDate}\n`;
                    count++;
                }
            }));

            // Small delay between batches
            await new Promise(r => setTimeout(r, 200));
        }

        if (count === 0) {
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            return ctx.reply("⚠️ No verified wallets found in this group.");
        }

        const buffer = Buffer.from(csvContent, 'utf-8');
        await ctx.replyWithDocument({
            source: buffer,
            filename: `holders_export_${exportDate.split('T')[0]}.csv`
        });

        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

    } catch (e) {
        console.error("Export Error:", e);
        ctx.reply("❌ Failed to export data.");
    }
}

// Locked Amounts Handlers
import { saveLockedAmount, removeLockedAmount } from '../storage.js';

export async function handleAddLocked(ctx) {
    if (ctx.chat.type === 'private') return ctx.reply(MESSAGES.ERRORS.ONLY_GROUP);

    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== 'creator' && member.status !== 'administrator') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_ADMINS);
    }

    const args = ctx.message.text.split(' ');
    // Expect: /addlocked <amount> <link>
    if (args.length !== 3) {
        return ctx.reply("ℹ️ Usage: `/addlocked <amount> <contract_link>`\nExample: `/addlocked 50M https://app.streamflow.finance/...`", { parse_mode: 'Markdown' });
    }

    const amount = args[1];
    const link = args[2];

    try {
        await saveLockedAmount(ctx.chat.id, amount, link);
        ctx.reply(`✅ **Locked Amount Added**\n\nBy: ${escapeMarkdown(ctx.from.first_name)}\nAmount: \`${amount}\`\n[View Contract](${link})`, { parse_mode: 'Markdown', disable_web_page_preview: true });
    } catch (e) {
        console.error(e);
        ctx.reply("❌ Failed to save locked amount.");
    }
}

export async function handleRemoveLocked(ctx) {
    if (ctx.chat.type === 'private') return ctx.reply(MESSAGES.ERRORS.ONLY_GROUP);

    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== 'creator' && member.status !== 'administrator') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_ADMINS);
    }

    const args = ctx.message.text.split(' ');
    // Expect: /removelocked <index>
    if (args.length !== 2) {
        return ctx.reply("ℹ️ Usage: `/removelocked <number>`\nCheck `/locked` to see numbers.", { parse_mode: 'Markdown' });
    }

    const index = parseInt(args[1]) - 1; // 1-based to 0-based
    if (isNaN(index)) {
        return ctx.reply("❌ Invalid number.");
    }

    try {
        const success = await removeLockedAmount(ctx.chat.id, index);
        if (success) {
            ctx.reply("✅ Removed locked amount entry.");
        } else {
            ctx.reply("❌ Entry not found. Check `/locked` for correct numbers.", { parse_mode: 'Markdown' });
        }
    } catch (e) {
        console.error(e);
        ctx.reply("❌ Failed to remove entry.");
    }
}
