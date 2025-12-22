import { removeChatMember, removeUserWallet, saveChatMember, getLink, getUserWallet, getUserWallets } from '../storage.js';
import { getRules } from '../utils/rulesManager.js';
import { getTokenBalance, getTokenSupply, getAggregatedTokenBalance } from '../solana.js';
import { MESSAGES } from '../messages.js';
import { escapeMarkdown } from '../utils/formatting.js';

export async function handleLeftChatMember(ctx) {
    const userId = ctx.message.left_chat_member.id;
    await removeChatMember(ctx.chat.id, userId);


}

export async function handleNewChatMembers(ctx, connection) {
    for (const member of ctx.message.new_chat_members) {
        if (member.is_bot) continue;

        try {
            await saveChatMember(ctx.chat.id, member.id);

            // Welcome Logic
            const address = await getLink(ctx.chat.id);
            if (address) {
                const rules = await getRules(connection, address);
                if (rules && rules.tokenMint) {
                    // 2. PRE-CALCULATE REQUIREMENTS
                    let supply = 0;
                    let requiredAmount = 0;
                    let isPercent = false;

                    if (rules.minTokenPercentage > 0) {
                        isPercent = true;
                        supply = await getTokenSupply(connection, rules.tokenMint);
                        // RPC ERROR CHECK FOR SUPPLY
                        if (supply === null) {
                            console.warn(`[AUDIT] RPC Error checking supply for ${member.id}`);
                            return; // Silent fail or retry later?
                        }
                        requiredAmount = supply * (rules.minTokenPercentage / 100);
                    } else if (rules.minTokenBalance > 0) {
                        requiredAmount = rules.minTokenBalance;
                    }

                    const wallets = await getUserWallets(member.id);
                    let balanceMsg = "";

                    if (wallets && wallets.length > 0) {
                        const balance = await getAggregatedTokenBalance(connection, wallets, rules.tokenMint);

                        // 1. RPC ERROR CHECK - Fail Safe
                        if (balance === null) {
                            console.warn(`[AUDIT] RPC Error checking balance for ${member.id}`);
                            try {
                                await ctx.banChatMember(member.id);
                                await ctx.unbanChatMember(member.id);
                                await removeChatMember(ctx.chat.id, member.id);
                                return ctx.reply(`⚠️ **Network Error**: Could not verify wallet for ${member.first_name}. Please try joining again in a few minutes.`);
                            } catch (e) {
                                console.error(`Failed to kick ${member.id}:`, e.message);
                            }
                            return;
                        }

                        // 2. CHECK RULES vs BALANCE
                        let passed = true;
                        if (balance < requiredAmount) passed = false;

                        // 3. ENFORCE
                        if (passed) {
                            balanceMsg = MESSAGES.WELCOME.BALANCE(balance.toLocaleString());

                            // Whale Check
                            if (rules.whalePercentage > 0) {
                                if (supply === 0 && rules.whalePercentage) {
                                    // Lazy fetch supply if we didn't get it above
                                    supply = await getTokenSupply(connection, rules.tokenMint);
                                }
                                if (supply) {
                                    const threshold = supply * (rules.whalePercentage / 100);
                                    if (balance >= threshold) {
                                        balanceMsg += MESSAGES.WELCOME.WHALE;
                                    }
                                }
                            }
                        } else {
                            // KICK
                            console.log(`[AUDIT] User ${member.id} kicked. Bal: ${balance}, Req: ${requiredAmount}`);
                            try {
                                await ctx.banChatMember(member.id);
                                await ctx.unbanChatMember(member.id);
                                await removeChatMember(ctx.chat.id, member.id);

                                // Clean Notification
                                const name = member.first_name || "Member";
                                await ctx.reply(`🚫 **Access Denied**: ${name} does not meet requirements.\n\n` +
                                    `Required: ${(rules.minTokenPercentage ? rules.minTokenPercentage + "%" : requiredAmount.toLocaleString())}\n` +
                                    `Your Balance: ${balance.toLocaleString()}`);

                                // DM User (Best Effort)
                                await ctx.telegram.sendMessage(member.id, `❌ You were removed from **${ctx.chat.title}**\n\n` +
                                    `You need ${requiredAmount.toLocaleString()} tokens to join.\n` +
                                    `Your verified balance: ${balance.toLocaleString()}`).catch(() => { });

                            } catch (e) {
                                console.error(`Failed to kick ${member.id}:`, e.message);
                            }
                            return; // Stop Welcome
                        }
                    } else {
                        // No Wallet Linked
                        balanceMsg = MESSAGES.WELCOME.UNVERIFIED(requiredAmount.toLocaleString(), isPercent);
                    }

                    const name = member.first_name || member.username || "Member";
                    const escapedName = escapeMarkdown(name);
                    const escapedUsername = member.username ? escapeMarkdown(member.username) : "";

                    // Using mention if possible
                    const mention = member.username ? `@${escapedUsername}` : `[${escapedName}](tg://user?id=${member.id})`;

                    await ctx.reply(
                        MESSAGES.WELCOME.MAIN(mention, balanceMsg),
                        { parse_mode: 'Markdown' }
                    );
                }
            }
        } catch (e) {
            console.error("Error in welcome handler:", e);
        }
    }
}
