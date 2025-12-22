
import { getLink, getUserWallet, getUserWallets, saveChatMember } from '../storage.js';
import { getRules } from '../utils/rulesManager.js';
import { getTokenBalance, getTokenSupply, getAggregatedTokenBalance } from '../solana.js';
import { MESSAGES } from '../messages.js';

export async function handleChatJoinRequest(ctx, connection) {
    console.log(`[DEBUG] Received chat_join_request from user ${ctx.from.id} for chat ${ctx.chat.id}`);
    try {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        const address = await getLink(chatId);

        console.log(`[DEBUG] Linked Address for chat ${chatId}: ${address || 'NONE'}`);

        if (!address) {
            console.log(`[DEBUG] No address linked, keying approval.`);
            return ctx.approveChatJoinRequest(userId);
        }

        console.log(`[DEBUG] Checking wallet for user ${userId}`);
        const wallets = await getUserWallets(userId);
        console.log(`[DEBUG] Wallets found: ${wallets ? wallets.length : 0}`);

        console.log(`[DEBUG] User verified. Fetching rules...`);
        // Check Rules
        const rules = await getRules(connection, address);
        if (!rules) {
            // No rules loaded? Safe to approve for now
            return ctx.approveChatJoinRequest(userId);
        }

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

        if (!wallets || wallets.length === 0) {
            console.log(`[DEBUG] Access Denied. Attempting to DM user info.`);
            // Not verified: DM instructions
            const botUsername = ctx.botInfo ? ctx.botInfo.username : 'memo_verification_bot';
            const verifyUrl = `https://t.me/${botUsername}?start=verify_${address}`;
            const reqText = await getRequirementText();

            await ctx.telegram.sendMessage(userId,
                MESSAGES.JOIN.DENIED_DM(ctx.chat.title, verifyUrl, reqText),
                { parse_mode: 'Markdown' }
            ).catch((err) => { console.log(`[DEBUG] DM Failed: ${err.message}`); });
            // If user blocked bot, this fails silently
            // We ignore the request, leaving it in 'pending' state
            console.log(`[DEBUG] DM sent (or failed). Returning.`);
            return;
        }

        // Helper to check requirements
        const checkRequirements = async () => {
            if (!rules.tokenMint) return true;

            const walletBalance = await getAggregatedTokenBalance(connection, wallets, rules.tokenMint);
            if (walletBalance === null) {
                return { passed: false, reason: "Temporary network error (RPC). Please try again in a moment." };
            }

            // 1a. Percentage Requirement (Preferred)
            if (rules.minTokenPercentage > 0) {
                const supply = await getTokenSupply(connection, rules.tokenMint);

                // CRITICAL FIX: Fail Closed on RPC Error
                if (supply === null) {
                    return { passed: false, reason: "Temporary network error (Supply RPC). Please try again." };
                }

                const requiredAmount = supply * (rules.minTokenPercentage / 100);
                if (walletBalance < requiredAmount) {
                    return {
                        passed: false,
                        reason: MESSAGES.JOIN.REASON_PERCENT(rules.minTokenPercentage, requiredAmount.toLocaleString(), walletBalance.toLocaleString())
                    };
                }
            }
            // 1b. Raw Balance Requirement (Legacy/Fallback)
            else if (rules.minTokenBalance > 0) {
                if (walletBalance < rules.minTokenBalance) {
                    return {
                        passed: false,
                        reason: MESSAGES.JOIN.REASON_AMOUNT(rules.minTokenBalance.toLocaleString(), walletBalance.toLocaleString())
                    };
                }
            }
            return { passed: true };
        };

        const result = await checkRequirements();

        if (result.passed) {
            await ctx.approveChatJoinRequest(userId);
            await saveChatMember(chatId, userId); // Track them!
            await ctx.telegram.sendMessage(userId, MESSAGES.JOIN.APPROVED(ctx.chat.title)).catch(() => { });
        } else {
            await ctx.telegram.sendMessage(userId,
                MESSAGES.JOIN.DENIED_REASON(ctx.chat.title, result.reason),
                { parse_mode: 'Markdown' }
            ).catch(() => { });
            // Could strictly decline: ctx.declineChatJoinRequest(userId);
        }

    } catch (e) {
        console.error("Join Request Error:", e);
    }
}
