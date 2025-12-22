
import { pollCommand, handleVote } from './commands/poll.js';
import { saveUserWallet, savePoll } from './storage.js';

// Mock context factory
const createMockCtx = (overrides = {}) => ({
    chat: { id: 1001 },
    from: { id: 123456789, first_name: 'TestUser' },
    reply: async (msg, extra) => {
        console.log('\n--- BOT REPLY ---');
        console.log('Message:', msg);
        if (extra) console.log('Extra:', JSON.stringify(extra, null, 2));
        return { message_id: 999 }; // Return fake message object
    },
    answerCbQuery: async (text, alert) => {
        console.log('\n--- ANSWER CALLBACK ---');
        if (text) console.log('Text:', text);
        if (alert) console.log('Alert:', alert);
    },
    editMessageReplyMarkup: async (markup) => {
        console.log('\n--- EDIT MARKUP ---');
        console.log(JSON.stringify(markup, null, 2));
    },
    ...overrides
});

async function run() {
    console.log('>>> SETUP: Verifying user 123456789 with a fake wallet...');
    await saveUserWallet(123456789, 'FakeSolanaWalletAddress123');

    console.log('\n>>> TEST 1: Creating a Poll');
    // Simulate /poll What is best? "Option A" "Option B"
    // Regex match in poll.js produces: [full, args_string]
    // But poll.js uses ctx.match[1] as the input string
    const pollInput = '"What is the best color?" "Red" "Blue" "Green"';
    const pollCtx = createMockCtx({
        match: [null, pollInput]
    });

    await pollCommand(pollCtx);

    console.log('\n>>> TEST 2: Voting on a Poll');
    // We need a poll ID to vote on. Since pollCommand generates a random one,
    // let's manually create a known poll for testing voting efficiently.
    const testPollId = 'test-poll-id';
    await savePoll(testPollId, {
        question: 'Test Poll Question',
        options: ['Yes', 'No'],
        chatId: 1001,
        messageId: 888,
        createdAt: Date.now()
    });

    console.log(`Created manual poll with ID: ${testPollId}`);

    // Vote for "Yes" (index 0)
    const voteCtx = createMockCtx({
        callbackQuery: {
            data: JSON.stringify({
                t: 'v',
                i: 0,
                p: testPollId
            })
        }
    });

    await handleVote(voteCtx);

    await handleVote(voteCtx);

    console.log('\n>>> TEST 3: Tall Command (Syntax Check)');
    // We need to mock getPollIdFromMessage etc in storage.js for this to fully work without a real DB
    // But we can check if it throws syntax errors if we mock enough.
    // For now, let's just ensure the import works and we can call it.

    // We didn't import tallyCommand yet.
    // We will assume this file is just for checking runtime errors.

    console.log('\n>>> Done.');
}

run().catch(console.error);
