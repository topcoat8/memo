import { savePoll, getPoll, saveVote, getPollVotes, getUserWallets, savePollIdMapping } from '../storage.js';
import { escapeMarkdown } from '../utils/formatting.js';

export const handleVote = async (ctx) => {
    try {
        const data = JSON.parse(ctx.callbackQuery.data);
        const { i: idx, p: pid } = data; // i = index, p = pollId
        const userId = ctx.from.id;

        // 1. Check Verification
        const wallets = await getUserWallets(userId);
        if (!wallets || wallets.length === 0) {
            return ctx.answerCbQuery("⚠️ You must verify your wallet to vote!", { show_alert: true });
        }

        // 2. Save Vote
        await saveVote(pid, userId, idx);

        // 3. Update UI
        const poll = await getPoll(pid);
        if (!poll) return ctx.answerCbQuery("Poll expired or not found.");

        const votes = await getPollVotes(pid);

        // Calculate Counts
        const counts = new Array(poll.options.length).fill(0);
        Object.values(votes).forEach(voteIdx => {
            const idx = parseInt(voteIdx, 10);
            if (!isNaN(idx) && counts[idx] !== undefined) counts[idx]++;
        });

        // Rebuild Keyboard
        const newKeyboard = poll.options.map((opt, index) => {
            const count = counts[index];
            return [{
                text: `${opt} (${count})`,
                callback_data: JSON.stringify({
                    t: 'v',
                    i: index,
                    p: pid
                })
            }];
        });

        // Edit Message
        try {
            await ctx.editMessageReplyMarkup({
                inline_keyboard: newKeyboard
            });
        } catch (e) {
            // Ignore "message is not modified" errors
        }

        return ctx.answerCbQuery();

    } catch (e) {
        console.error("Vote Error:", e);
        return ctx.answerCbQuery("Error recording vote.");
    }
};

export const pollCommand = async (ctx) => {
    const chatId = ctx.chat.id;
    // Telegraf with .hears(/^\/poll\s+(.+)/) puts capture groups in ctx.match
    const input = ctx.match && ctx.match[1] ? ctx.match[1] : '';

    if (!input) {
        return ctx.reply("Usage: /poll <question> <option1> <option2> ...");
    }

    // Split by double quotes or spaces, effectively parsing "Question" "Opt 1" "Opt 2"
    // Regex matches text inside quotes OR text without spaces. 
    const args = input.match(/"([^"]+)"|'([^']+)'|(\S+)/g);

    if (!args || args.length < 3) {
        return ctx.reply("Usage: /poll \"Question\" \"Option 1\" \"Option 2\" ... (Minimum 2 options)");
    }

    // Clean up quotes from args
    const cleanArgs = args.map(arg => arg.replace(/^["']|["']$/g, ""));
    const question = cleanArgs[0];
    const options = cleanArgs.slice(1);

    if (options.length > 10) {
        return ctx.reply("Maximum 10 options allowed.");
    }

    // Generate unique ID
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const pollId = uniqueId;

    // Create Inline Keyboard with ID
    const keyboard = options.map((opt, index) => {
        return [{
            text: `${opt} (0)`, // Initial count 0
            callback_data: JSON.stringify({
                t: 'v', // type: vote
                i: index,
                p: pollId
            })
        }];
    });

    const pollMessage = `📊 **${escapeMarkdown(question)}**\n\nClick a button below to vote.`;

    try {
        const sentMsg = await ctx.reply(pollMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });

        // Save Poll Data
        await savePoll(pollId, {
            question,
            options,
            chatId,
            messageId: sentMsg.message_id,
            createdAt: Date.now()
        });

        // Save Mapping for Tally
        await savePollIdMapping(chatId, sentMsg.message_id, pollId);
    } catch (e) {
        console.error("Poll Error:", e);
        ctx.reply("Failed to create poll. An error occurred.");
    }
};
