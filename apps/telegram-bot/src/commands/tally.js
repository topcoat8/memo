import { getPoll, getPollVotes, getLink, getUserWallets, getPollIdFromMessage } from '../storage.js';
import { getRules } from '../utils/rulesManager.js';
import { getAggregatedTokenBalance } from '../solana.js';
import { escapeMarkdown } from '../utils/formatting.js';

export const tallyCommand = async (ctx, connection) => {
    try {
        const msg = ctx.message;
        const chatId = msg.chat.id;

        // 1. Validate Reply
        if (!msg.reply_to_message) {
            return ctx.reply("⚠️ Please reply to the poll you want to tally.");
        }

        const replyMsgId = msg.reply_to_message.message_id;

        // 2. Identify Poll
        // Need to find key by value? Or do we construct ID?
        // Poll ID was stored as `pollId` (random string) in `savePoll` in my updated code.
        // BUT `savePoll` call arguments: `savePoll(pollId, { ... messageId: sentMsg.message_id ... })`.
        // We don't have a mapping from messageId -> pollId efficiently unless we scan.
        // OR we change pollId back to `${chatId}_${messageId}` which is deterministic?

        // In my `poll.js` update, I changed it to `uniqueId`. 
        // This makes looking up by reply difficult!

        // REVERT DECISION: I should use `${chatId}_${btnMessageId}` as the Poll ID.
        // But `poll.js` needs `pollId` for the buttons *before* sending.
        // Paradox: 
        // - To put ID in button, need ID. 
        // - To use messageID as ID, need to send message.
        // - To send message with buttons, need ID.

        // Solution: 
        // 1. Use Unique ID.
        // 2. Store mapping `poll_lookup:${chatId}:${messageId}` -> `pollId`.
        // 3. Update `savePoll` in storage to handle this? Or just do it here.

        // Alternative: Use Unique ID and search? No, scanning is bad.

        // I will update `poll.js` to save a lookup.
        // But I don't want to context switch too much.
        // Let's check `storage.js` again.

        // Actually, if I look at `getPoll(pollId)`, it expects the ID.
        // If I can't derive ID from message, I'm stuck.

        // Let's assume for this `tally.js` implementation that I will fix `poll.js` to save the lookup or use a deterministic ID.

        // WAIT. If I use `uniqueId`, I can simply update the message *after* sending to include the ID? No, buttons are immutable-ish (can edit).
        // 
        // BEST APPROACH:
        // Use `uniqueId`.
        // Save `poll_msg:${chatId}:${messageId}` -> `uniqueId` in Redis/Storage.

        // For now, I will write `tally.js` assuming `getPollIdFromMessage(chatId, messageId)` exists in `storage.js`.
        // Then I will go add that function to storage and update `poll.js`.


        // Detect if user is replying to a previous Tally result
        if (msg.reply_to_message.text && (
            msg.reply_to_message.text.startsWith('🧮') ||
            msg.reply_to_message.text.startsWith('📢')
        )) {
            return ctx.reply("⚠️ Please reply to the **original poll** message, not the tally results.");
        }

        const pollId = await getPollIdFromMessage(chatId, replyMsgId);
        if (!pollId) {
            return ctx.reply("❌ Poll not found. Ensure you are replying to a valid poll created by me.");
        }

        const poll = await getPoll(pollId);
        if (!poll) return ctx.reply("❌ Poll data missing.");

        // 3. Check Permissions (Admin)
        const member = await ctx.telegram.getChatMember(chatId, ctx.from.id);
        if (!['creator', 'administrator'].includes(member.status)) {
            return ctx.reply("👮 Only admins can tally votes.");
        }

        const sentMsg = await ctx.reply("🧮 Calculating weighted results... This may take a moment.");

        // 4. Get Rules (Token Mint)
        const communityAddress = await getLink(chatId);
        if (!communityAddress) return ctx.reply("⚠️ Community not linked to any token.");

        const rules = await getRules(connection, communityAddress);
        if (!rules || !rules.tokenMint) return ctx.reply("⚠️ No token mint found for this community.");

        // 5. Calculate Weights
        const votes = await getPollVotes(pollId); // { userId: optionIdx }
        const userIds = Object.keys(votes);

        if (userIds.length === 0) {
            return ctx.telegram.editMessageText(chatId, sentMsg.message_id, null, "No votes cast yet.");
        }

        // Aggregate
        const weights = new Array(poll.options.length).fill(0);
        const voterCount = new Array(poll.options.length).fill(0);
        let totalWeight = 0;

        // Batch processing to respect RPC limits? 
        // We'll do serial for now as per "Free Tier" logic in solana.js

        for (const userId of userIds) {
            const rawOptionIdx = votes[userId];
            if (rawOptionIdx === undefined || rawOptionIdx === null) continue;

            const optionIdx = parseInt(rawOptionIdx, 10);
            if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= weights.length) {
                console.warn(`Invalid vote index "${rawOptionIdx}" for user ${userId}`);
                continue;
            }

            const wallets = await getUserWallets(userId);
            if (!wallets || wallets.length === 0) continue; // Should be verified to vote, but double check

            const balance = await getAggregatedTokenBalance(connection, wallets, rules.tokenMint);

            if (balance !== null && balance > 0) {
                weights[optionIdx] += balance;
                totalWeight += balance;
            }
            voterCount[optionIdx]++;
        }

        // 6. Format Output
        let resultText = `📢 **Weighted Poll Results**\n\n**${escapeMarkdown(poll.question)}**\n\n`;

        poll.options.forEach((opt, idx) => {
            const weight = weights[idx];
            const count = voterCount[idx];
            const percent = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : 0;

            resultText += `**${escapeMarkdown(opt)}**\n`;
            resultText += `Votes: ${count} | Weight: ${weight.toLocaleString()} (${percent}%)\n\n`;
        });

        resultText += `Checking against: \`${rules.tokenMint}\``;

        await ctx.telegram.editMessageText(chatId, sentMsg.message_id, null, resultText, { parse_mode: 'Markdown' });

    } catch (e) {
        console.error("Tally Error:", e);
        ctx.reply("❌ Error calculating tally.");
    }
};


