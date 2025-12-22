import { PublicKey } from '@solana/web3.js';
import {
    getLink, savePendingVerification, getPendingVerification,
    getPendingJoin, saveUserWallet, getAllLinks, saveChatMember, getUserWallets
} from '../storage.js';
import { checkVerification } from '../verification_monitor.js';
import { MESSAGES } from '../messages.js';

export async function handleVerify(ctx) {
    const userId = ctx.from.id;

    // Enforce Private DM
    if (ctx.chat.type !== 'private') {
        return ctx.reply(MESSAGES.ERRORS.ONLY_DM);
    }
    let communityAddress = await getLink(ctx.chat.id);
    const args = ctx.message.text.split(' ');

    // Check pending Context (Deep Link Join)
    if (!communityAddress) {
        communityAddress = await getPendingJoin(userId);
    }

    // NEW REQUIREMENT: Wallet Address is mandatory argument
    if (args.length < 2) {
        return ctx.reply(MESSAGES.VERIFY.ARGUMENT_REQUIRED, { parse_mode: 'Markdown' });
    }

    const userWallet = args[1];
    // Validate Wallet
    try {
        new PublicKey(userWallet);
    } catch (e) {
        return ctx.reply(MESSAGES.ERRORS.INVALID_ADDRESS);
    }

    // Save the wallet they are claiming
    await savePendingVerification(userId, userWallet);

    const MEMO_MINT_DISPLAY = "8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump";

    // CASE A: Member Joining a Community (communityAddress is known)
    if (communityAddress) {
        const message = MESSAGES.VERIFY.INSTRUCTIONS_COMMUNITY(userWallet, communityAddress, MEMO_MINT_DISPLAY, userId);

        return ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: "🔄 Can't send a Memo? Use Amount Verify", callback_data: `verify_amount:${userWallet}` }
                ]]
            }
        });
    }

    // CASE B: General Verification (No community context)
    const message = MESSAGES.VERIFY.INSTRUCTIONS_GENERAL(userWallet, MEMO_MINT_DISPLAY, userId);

    return ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: "🔄 Can't send Memo? Use Amount Verify with SOL", callback_data: `verify_amount:${userWallet}` }
            ]]
        }
    });
}

// Handler for the alternative verification method
export async function handleVerifyAmount(ctx, userWallet) {
    const userId = ctx.from.id;
    let communityAddress = await getLink(ctx.chat.id);
    if (!communityAddress) {
        communityAddress = await getPendingJoin(userId);
    }

    // Generate Unique Verification Amount for SOL (0.001xxxxx)
    // We want a small amount that is unique.
    // 0.001 SOL is reasonable (~$0.15 at $150/SOL)
    const dust = Math.floor(1000 + Math.random() * 900000);
    const uniqueAmount = (0.001 + (dust / 1000000000)).toFixed(9); // 9 decimals for SOL

    // Save wallet AND expected amount
    await savePendingVerification(userId, userWallet, uniqueAmount);

    const MEMO_MINT_DISPLAY = "8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump";

    let communityLine = "";
    if (communityAddress) {
        communityLine = `Community: \`${communityAddress}\`\n\n`;
    }

    const instructions = MESSAGES.VERIFY.INSTRUCTIONS_AMOUNT(userWallet, uniqueAmount, communityLine);

    return ctx.reply(instructions, { parse_mode: 'Markdown' });
}

export async function handleSent(ctx, connection) {
    const userId = ctx.from.id;
    let communityAddress = await getLink(ctx.chat.id);
    let selfVerifyMode = false;

    if (!communityAddress) {
        communityAddress = await getPendingJoin(userId);
    }

    // Get the pending verification data
    const pendingData = await getPendingVerification(userId);

    if (!pendingData) {
        return ctx.reply(MESSAGES.VERIFY.NO_PENDING, { parse_mode: 'Markdown' });
    }

    const pendingWallet = pendingData.wallet || pendingData; // Fallback just in case
    const expectedAmount = pendingData.amount; // Might be null

    // Determine Mode
    if (!communityAddress) {
        selfVerifyMode = true;
        // Creator Mode: communityAddress effectively acts as the user's wallet (Self-Transfer)
        communityAddress = pendingWallet;
    }

    if (!communityAddress) {
        return ctx.reply(MESSAGES.ERRORS.UNKNOWN_CONTEXT);
    }

    if (expectedAmount) {
        ctx.reply(MESSAGES.VERIFY.SEARCHING_AMOUNT(expectedAmount), { parse_mode: 'Markdown' });
    } else {
        ctx.reply(MESSAGES.VERIFY.SEARCHING_MEMO);
    }

    // Pass expectedAmount (can be null)
    const result = await checkVerification(connection, communityAddress, userId.toString(), pendingWallet, expectedAmount);

    if (result) {
        await saveUserWallet(userId.toString(), result.walletAddress);

        // Get updated count for UX
        const wallets = await getUserWallets(userId.toString());
        const walletCount = wallets.length;
        const countMsg = walletCount > 1 ? `\n(You now have ${walletCount} linked wallets)` : "";

        let successMessage = "";

        if (selfVerifyMode) {
            successMessage = MESSAGES.VERIFY.SUCCESS_SELF(result.walletAddress) + countMsg;

            ctx.reply(successMessage, { parse_mode: 'Markdown' });
        } else {
            let foundGroups = false;
            const allLinks = await getAllLinks();
            const joinButtons = [];

            for (const [chatId, linkedAddr] of Object.entries(allLinks)) {
                if (linkedAddr === communityAddress) {
                    foundGroups = true;
                    // 1. Try to Auto-Approve (Best Effort)
                    try {
                        await ctx.telegram.approveChatJoinRequest(chatId, userId);
                        await saveChatMember(chatId, userId);
                    } catch (e) {
                        console.log(`[DEBUG] Auto-approve skipped for ${chatId} (User likely not pending): ${e.message}`);
                    }

                    // 2. Prepare Invite Link
                    try {
                        let chat = await ctx.telegram.getChat(chatId);
                        let inviteLink = chat.invite_link;

                        if (!inviteLink) {
                            // Try to generate one if missing
                            const linkParams = { name: 'Memo Verification', expire_date: 0, member_limit: 0 };
                            try {
                                const newLink = await ctx.telegram.createChatInviteLink(chatId, linkParams);
                                inviteLink = newLink.invite_link;
                            } catch (err) {
                                console.warn(`Failed to create invite link for ${chatId}:`, err.message);
                            }
                        }

                        if (inviteLink) {
                            joinButtons.push([
                                { text: `🚀 Join ${chat.title}`, url: inviteLink }
                            ]);
                        }
                    } catch (e) {
                        console.error(`Failed to get chat info for ${chatId}`, e);
                    }
                }
            }

            // 3. Send Success Message with Buttons
            const keyboard = {
                inline_keyboard: joinButtons
            };

            if (joinButtons.length > 0) {
                successMessage = MESSAGES.VERIFY.SUCCESS_GROUP(result.walletAddress) + countMsg;
                await ctx.reply(successMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } else {
                // Fallback if we couldn't generate links
                successMessage = MESSAGES.VERIFY.SUCCESS_GROUP_FALLBACK(result.walletAddress) + countMsg;
                await ctx.reply(successMessage, { parse_mode: 'Markdown' });
            }
        }
    } else {
        if (expectedAmount) {
            ctx.reply(MESSAGES.VERIFY.FAIL_AMOUNT(expectedAmount, pendingWallet), { parse_mode: 'Markdown' });
        } else {
            ctx.reply(MESSAGES.VERIFY.FAIL_MEMO(pendingWallet, userId), { parse_mode: 'Markdown' });
        }
    }
}
