import { Telegraf } from 'telegraf';
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import { fetchCommunityRules, getTokenBalance } from './solana.js';
import { startServer } from './server.js';
import { saveLink, getLink, getUserWallet, saveUserWallet, getAllLinks, saveChatMember, removeChatMember, getChatMembers, removeUserWallet } from './storage.js';


import { checkVerification } from './verification_monitor.js';


dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
// Public URL for the verification page (requires ngrok/tunnel for local dev)
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

if (!BOT_TOKEN) {
    console.error("Error: BOT_TOKEN is missing in .env");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const connection = new Connection(RPC_URL, 'confirmed');

// Debug Logger: Trace all updates
bot.use(async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        console.log(`[TRACE] Message: ${ctx.message.text} from ${ctx.from.id}`);
    }
    await next();
});

// Cache for rules: { communityAddress: { rules: Object, lastFetched: timestamp } }
const rulesCache = {};
const CACHE_TTL = 60 * 1000; // 1 minute

async function getCachedRules(communityAddress) {
    const now = Date.now();
    if (rulesCache[communityAddress] && (now - rulesCache[communityAddress].lastFetched < CACHE_TTL)) {
        return rulesCache[communityAddress].rules;
    }

    const rules = await fetchCommunityRules(connection, communityAddress);
    if (rules) {
        rulesCache[communityAddress] = {
            rules,
            lastFetched: now
        };
    }
    return rules;
}

// --- Commands ---


function formatRules(rules) {
    if (!rules) return "No rules set.";

    let message = `📜 *Community Rules* 📜\n\n`;

    if (rules.name) message += `🏷 *Name:* ${rules.name}\n`;
    if (rules.tokenMint) message += `💎 *Token:* \`${rules.tokenMint}\`\n`;
    if (rules.minTokenBalance) message += `⚖️ *Min Balance:* ${rules.minTokenBalance.toLocaleString()}\n`;

    // Only show whale percentage if it exists and is greater than 0
    if (rules.whalePercentage > 0) message += `🐋 *Whale Threshold:* ${rules.whalePercentage}%\n`;

    if (rules.bannedWords && rules.bannedWords.length > 0) {
        message += `🚫 *Banned Words:* ${rules.bannedWords.join(', ')}\n`;
    }

    if (rules.imagesOnly) {
        message += `🖼 *Images Only mode is active.*\n`;
    }

    return message;
}

// Context storage for DMs: { userId: communityAddress }
const userPendingContext = {};

bot.command('start', (ctx) => {
    // Check for deep link payload: /start verify_<address>
    const text = ctx.message.text;
    if (text.includes(' ') && text.split(' ')[1].startsWith('verify_')) {
        const payload = text.split(' ')[1];
        const address = payload.replace('verify_', '');

        // Save context
        userPendingContext[ctx.from.id] = address;

        ctx.reply(`👋 Welcome! I see you want to verify for Community: \`${address}\`\n\nPlease run /verify to see the instructions.`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply('Welcome to the Memo Protocol Bridge Bot! 🚀\n\nAdmins can link this chat to a Memo Community using:\n/link <community_address>');
    }
});

bot.command('link', async (ctx) => {
    try {
        const member = await ctx.getChatMember(ctx.from.id);
        if (member.status !== 'creator' && member.status !== 'administrator') {
            return ctx.reply('❌ Only admins can link this chat to a community.');
        }

        const args = ctx.message.text.split(' ');
        if (args.length !== 2) {
            return ctx.reply('Usage: /link <community_address>');
        }

        const address = args[1];
        try {
            new PublicKey(address);
        } catch (e) {
            return ctx.reply('❌ Invalid Solana address.');
        }

        const rules = await fetchCommunityRules(connection, address);
        if (!rules) {
            return ctx.reply(`⚠️ No community rules found for address: ${address}.\nWe linked it anyway, but the bot won't enforce anything until rules are posted on-chain.`);
        }


        saveLink(ctx.chat.id, address);

        ctx.reply(`✅ Successfully linked to Memo Community!\n\n${formatRules(rules)}`, { parse_mode: 'Markdown' });

    } catch (e) {
        console.error(e);
        ctx.reply('❌ An error occurred while linking.');
    }
});

// --- Rule Enforcement (Gating & Periodic Checks) ---

// Define the join request handler separately so we can reuse it
const handleChatJoinRequest = async (ctx) => {
    console.log(`[DEBUG] Received chat_join_request from user ${ctx.from.id} for chat ${ctx.chat.id}`);
    try {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        const address = getLink(chatId);

        console.log(`[DEBUG] Linked Address for chat ${chatId}: ${address || 'NONE'}`);

        if (!address) {
            console.log(`[DEBUG] No address linked, keying approval.`);
            return ctx.approveChatJoinRequest(userId);
        }

        console.log(`[DEBUG] Checking wallet for user ${userId}`);
        const wallet = getUserWallet(userId);
        console.log(`[DEBUG] Wallet found: ${wallet || 'NONE'}`);

        if (!wallet) {
            console.log(`[DEBUG] Access Denied. Attempting to DM user info.`);
            // Not verified: DM instructions
            await ctx.telegram.sendMessage(userId,
                `🚫 *Access Denied*\n\nTo join **${ctx.chat.title}**, you must verify your wallet first.\n\n` +
                `1. [Click here to Verify](https://t.me/memo_verification_bot?start=verify_${address})\n` +
                `2. Follow the instructions to send the transaction.\n` +
                `3. Run \`/i_sent_it\` when done.\n` +
                `4. Once verified, request to join again!`,
                { parse_mode: 'Markdown' }
            ).catch((err) => { console.log(`[DEBUG] DM Failed: ${err.message}`); });
            // If user blocked bot, this fails silently
            // We ignore the request, leaving it in 'pending' state
            console.log(`[DEBUG] DM sent (or failed). Returning.`);
            return;
        }

        console.log(`[DEBUG] User verified. Fetching rules...`);
        // Check Rules
        const rules = await getCachedRules(address);
        if (!rules) {
            // No rules loaded? Safe to approve for now
            return ctx.approveChatJoinRequest(userId);
        }

        // Helper to check requirements
        const checkRequirements = async () => {
            // 1. Min Balance
            if (rules.minTokenBalance > 0 && rules.tokenMint) {
                const balance = await getTokenBalance(connection, wallet, rules.tokenMint);
                if (balance < rules.minTokenBalance) return false;
            }
            return true;
        };

        const meetsRequirements = await checkRequirements();

        if (meetsRequirements) {
            await ctx.approveChatJoinRequest(userId);
            saveChatMember(chatId, userId); // Track them!
            await ctx.telegram.sendMessage(userId, `✅ You have been approved to join ${ctx.chat.title}!`).catch(() => { });
        } else {
            await ctx.telegram.sendMessage(userId,
                `🚫 *Access Denied*\n\nYou do not meet the minimum requirements for **${ctx.chat.title}**.\n` +
                `Required Balance: ${rules.minTokenBalance} $MEMO`,
                { parse_mode: 'Markdown' }
            ).catch(() => { });
            // Could strictly decline: ctx.declineChatJoinRequest(userId);
        }

    } catch (e) {
        console.error("Join Request Error:", e);
    }
};

// Gated Entry: Verify users BEFORE letting them join
bot.on('chat_join_request', handleChatJoinRequest);

bot.command('rules', async (ctx) => {
    const address = getLink(ctx.chat.id);
    if (!address) {
        return ctx.reply('This chat is not linked to any Memo Community.');
    }

    const rulesData = await getCachedRules(address);
    if (!rulesData) {
        return ctx.reply('No rules found on-chain yet.');
    }

    ctx.reply(formatRules(rulesData), { parse_mode: 'Markdown' });
});

bot.command('verify', (ctx) => {
    const userId = ctx.from.id;
    let address = getLink(ctx.chat.id);

    // Fallback: Check pending context (for DMs)
    if (!address) {
        address = userPendingContext[userId];
    }

    if (!address) {
        return ctx.reply('⚠️ Unknown Community. Please start verification from the group join link or use /start verify_<address>');
    }

    const message = `🔐 *Verify your Wallet*\n\n` +
        `SEND $MEMO (1 is fine) to the **Community Address** below.\n` +
        `⚠️ *IMPORTANT:* You must include your Telegram ID in the **Memo** field!.\n\n` +
        `👇 *Your Telegram ID:*\n\`${userId}\`\n\n` +
        `👇 *Community Address to Verify against:*\n\`${address}\`\n\n` +
        `📝 *Steps:*\n` +
        `1. Send the transaction.\n` +
        `2. Wait a few seconds for it to confirm.\n` +
        `3. Type \`/i\\_sent\\_it\` to complete verification!`;

    ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('i_sent_it', async (ctx) => {
    const userId = ctx.from.id;
    let address = getLink(ctx.chat.id);

    if (!address) {
        address = userPendingContext[userId];
    }

    if (!address) {
        return ctx.reply('⚠️ Unknown Community. Please start verification from the group join link.');
    }

    ctx.reply("🔍 Checking recent transactions... please wait a moment.");

    const result = await checkVerification(connection, address, userId.toString());

    if (result) {
        saveUserWallet(userId.toString(), result.walletAddress);

        let successMessage = `✅ *Verified!*\n\nWallet: \`${result.walletAddress}\`\n\n`;

        // Find the chat ID(s) associated with this community address and approve pending requests
        const allLinks = getAllLinks();
        let approvedCount = 0;

        for (const [chatId, communityAddress] of Object.entries(allLinks)) {
            if (communityAddress === address) {
                try {
                    await ctx.telegram.approveChatJoinRequest(chatId, userId);
                    saveChatMember(chatId, userId); // Track them immediately!
                    approvedCount++;
                    const chat = await ctx.telegram.getChat(chatId);
                    // Add an invite link if possible, or just tell them they are approved
                    if (chat.invite_link) {
                        successMessage += `🎉 **Access Granted!**\n[Join ${chat.title} Here](${chat.invite_link})\n\n`;
                    } else {
                        successMessage += `🎉 **Access Granted to ${chat.title}!**\nYou can now open the group chat.\n\n`;
                    }
                } catch (e) {
                    // Ignored: User might not have a pending request there, or bot lacks permission
                    console.log(`[DEBUG] Auto-approve failed for ${chatId}: ${e.message}`);
                }
            }
        }

        if (approvedCount === 0) {
            successMessage += `You can now go back to the group and request to join again (it will be auto-approved).`;
        }

        ctx.reply(successMessage, { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`❌ Could not find a recent transaction with your ID (\`${userId}\`).\n\nEnsure you sent **$MEMO** to \`${address}\` with your ID in the memo field, then try again.`, { parse_mode: 'Markdown' });
    }
});


bot.command('my_status', async (ctx) => {
    const userId = ctx.from.id;
    const wallet = getUserWallet(userId.toString());

    if (!wallet) {
        return ctx.reply('❌ You have not verified a wallet yet. Use /verify to link one.');
    }

    let message = `✅ *Verified Wallet:*\n\`${wallet}\`\n\n`;

    const address = getLink(ctx.chat.id);
    if (address) {
        const rulesData = await getCachedRules(address);
        if (rulesData) {
            // Check balance if rules exist
            if (rulesData.minTokenBalance && rulesData.tokenMint) {
                const balance = await getTokenBalance(connection, wallet, rulesData.tokenMint);
                const meetsRequirement = balance >= rulesData.minTokenBalance;

                message += `💎 *Balance:* ${balance.toLocaleString()}\n`;
                message += `📜 *Requirement:* ${rulesData.minTokenBalance.toLocaleString()}\n`;
                message += `Status: ${meetsRequirement ? '✅ PASSED' : '❌ INSUFFICIENT'}`;
            }
        }
    }

    ctx.reply(message, { parse_mode: 'Markdown' });
});

bot.command('list_balances', async (ctx) => {
    // Check admin permissions - DISABLED per user request (Any user can list)
    if (ctx.chat.type === 'private') {
        return ctx.reply('❌ This command can only be used in groups.');
    }

    // Check if linked
    const address = getLink(ctx.chat.id);
    if (!address) {
        return ctx.reply('⚠️ This chat is not linked to any Memo Community.');
    }

    const rules = await getCachedRules(address);
    if (!rules || !rules.tokenMint) {
        return ctx.reply('⚠️ Could not determine token mint from community rules.');
    }

    ctx.reply("🔍 Scanning verified members... this may take a moment.");

    const memberIds = getChatMembers(ctx.chat.id); // Returns Array of IDs

    if (!memberIds || memberIds.length === 0) {
        return ctx.reply("ℹ️ No verified members tracked in this group yet.");
    }

    const leaderboard = [];
    // Only scan first 50 to avoid limits
    const scanList = memberIds.slice(0, 50);

    for (const userId of scanList) {
        const wallet = getUserWallet(userId.toString());
        if (wallet) {
            const balance = await getTokenBalance(connection, wallet, rules.tokenMint);
            leaderboard.push({ userId, balance, wallet });
        }
        await new Promise(r => setTimeout(r, 100));
    }

    leaderboard.sort((a, b) => b.balance - a.balance);

    let output = `📊 **Token Leaderboard** 📊\n`;
    output += `Token: \`${rules.tokenMint}\`\n\n`;

    for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        let name = `User ${entry.userId}`;
        try {
            const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, entry.userId);
            if (chatMember.user.username) {
                name = `@${chatMember.user.username}`;
            } else if (chatMember.user.first_name) {
                name = chatMember.user.first_name;
            }
        } catch (e) { }

        output += `${i + 1}. **${name}**: ${entry.balance.toLocaleString()} $MEMO\n`;
    }

    ctx.reply(output, { parse_mode: 'Markdown' });
});

bot.command('check_unverified', async (ctx) => {
    // Check admin permissions - DISABLED (Any user can check)
    if (ctx.chat.type === 'private') {
        return ctx.reply('❌ This command can only be used in groups.');
    }

    // Check if linked
    const address = getLink(ctx.chat.id);
    if (!address) {
        return ctx.reply('⚠️ This chat is not linked to any Memo Community.');
    }

    ctx.reply("🔍 Scanning for unverified members...");

    // Get tracked members
    const memberIds = getChatMembers(ctx.chat.id);
    if (!memberIds || memberIds.length === 0) {
        return ctx.reply("ℹ️ No tracked members found.");
    }

    const unverifiedList = [];

    for (const userId of memberIds) {
        const wallet = getUserWallet(userId.toString());
        if (!wallet) {
            unverifiedList.push(userId);
        }
    }

    if (unverifiedList.length === 0) {
        return ctx.reply("✅ All tracked members are verified!");
    }

    let output = `⚠️ **Unverified Members Found** (${unverifiedList.length}):\n\n`;

    // Cap output at 50 to prevent huge messages
    for (let i = 0; i < Math.min(unverifiedList.length, 50); i++) {
        const userId = unverifiedList[i];
        let name = `User \`${userId}\``;
        // Try to fetch name
        try {
            const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
            const user = chatMember.user;
            name = `${user.first_name} ${user.last_name || ''} (@${user.username || 'no_user'})`;
        } catch (e) { }
        output += `${i + 1}. ${name} \n`;
    }

    if (unverifiedList.length > 50) {
        output += `\n...and ${unverifiedList.length - 50} more.`;
    }

    ctx.reply(output, { parse_mode: 'Markdown' });
});

bot.command('check_user', async (ctx) => {
    // Check if admin
    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== 'creator' && member.status !== 'administrator') {
        return ctx.reply('❌ Only admins can check other users.');
    }

    if (!ctx.message.reply_to_message) {
        return ctx.reply('⚠️ Please reply to a user\'s message to check their status.');
    }

    const targetUser = ctx.message.reply_to_message.from;
    const wallet = getUserWallet(targetUser.id.toString());

    if (!wallet) {
        return ctx.reply(`❌ User ${targetUser.first_name} has not verified a wallet.`);
    }

    let message = `👤 *User:* ${targetUser.first_name}\nAddress: \`${wallet}\`\n\n`;

    const address = getLink(ctx.chat.id);
    if (address) {
        const rulesData = await getCachedRules(address);
        if (rulesData && rulesData.minTokenBalance && rulesData.tokenMint) {
            const balance = await getTokenBalance(connection, wallet, rulesData.tokenMint);
            const meetsRequirement = balance >= rulesData.minTokenBalance;

            message += `💎 *Balance:* ${balance.toLocaleString()}\n`;
            message += `Result: ${meetsRequirement ? '✅ Eligible' : '❌ Ineligible'}`;
        }
    }

    ctx.reply(message, { parse_mode: 'Markdown' });
});

// --- Enforcement Middleware ---

bot.on('message', async (ctx, next) => {
    // 1. Track Member
    if (ctx.chat.type !== 'private') {
        saveChatMember(ctx.chat.id, ctx.from.id);
    }

    // Skip if it's a command
    if (ctx.message.text && ctx.message.text.startsWith('/')) {
        return next();
    }

    const address = getLink(ctx.chat.id);
    if (!address) return next();

    const rules = await getCachedRules(address);
    if (!rules) return next();

    // 0. Verify Wallet Connection
    const walletAddress = getUserWallet(ctx.from.id.toString());

    // If rules require verification (implicitly required for token gating)
    if (rules.minTokenBalance && !walletAddress) {
        try {
            await ctx.deleteMessage();
            const verifyUrl = `${PUBLIC_URL}/verify?userId=${ctx.from.id}&chatId=${ctx.chat.id}`;
            /*
            // DM the user (safer, but requires them to have started stats with bot)
            try {
                await ctx.telegram.sendMessage(ctx.from.id, `⚠️ Access Denied: You must verify your wallet.\n${verifyUrl}`);
            } catch (e) {
                // If DM fails (blocked bot), reply in chat then delete
                const warning = await ctx.reply(`⚠️ @${ctx.from.username || ctx.from.first_name}, you must verify your wallet to speak here.\nCheck your DMs or click: /verify`);
                setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => {}), 10000);
            }
            */
            // Simple reply for now
            const warning = await ctx.reply(`⚠️ @${ctx.from.username || ctx.from.first_name}, Verified Wallet Required.\n[Verify Here](${verifyUrl})`, { parse_mode: 'Markdown' });
            setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => { }), 15000);

            return;
        } catch (e) { }
        return;
    }

    // Check Token Balance (if verified)
    if (rules.minTokenBalance && walletAddress) {
        // Assume rules.tokenMint is defined, otherwise fallback to Memo or specific check
        // If the rules don't specify *which* token, we can't check. 
        // For this implementation, let's assume the rules object has `tokenMint` or we use a default if implied.
        // Or we might check the community token itself if it's a DAO?
        // Let's assume rules structure: { minTokenBalance: 100, tokenMint: "..." }

        const mint = rules.tokenMint;
        if (mint) {
            const balance = await getTokenBalance(connection, walletAddress, mint);
            if (balance < rules.minTokenBalance) {
                try {
                    await ctx.deleteMessage();
                    const warning = await ctx.reply(`⚠️ Insufficient Balance. You need ${rules.minTokenBalance} tokens to speak.`);
                    setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => { }), 5000);
                    return;
                } catch (e) { }
                return;
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
                    const warning = await ctx.reply(`⚠️ Message deleted. Reason: Contains banned word "${word}".`);
                    setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => { }), 5000);
                    return;
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
            const warning = await ctx.reply(`⚠️ Message deleted. Reason: This channel only allows images.`);
            setTimeout(() => ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => { }), 5000);
            return;
        } catch (e) { }
    }

    // If all clear
    next();
});

// Track users leaving/kicked
bot.on('left_chat_member', (ctx) => {
    const userId = ctx.message.left_chat_member.id;
    removeChatMember(ctx.chat.id, userId);

    // Also remove their verification if strict memory-less mode is desired
    // This forces them to verify again if they rejoin
    removeUserWallet(userId);
});

bot.on('new_chat_members', (ctx) => {
    ctx.message.new_chat_members.forEach(member => {
        if (!member.is_bot) saveChatMember(ctx.chat.id, member.id);
    });
});


// --- Periodic Checks (Hourly) ---
// const CHECK_INTERVAL = 60 * 60 * 1000; // 1 Hour
const CHECK_INTERVAL = 60 * 60 * 1000;

async function runPeriodicChecks() {
    console.log("Running periodic rule enforcement checks...");
    const allLinks = getAllLinks();

    for (const [chatId, communityAddress] of Object.entries(allLinks)) {
        try {
            const rules = await getCachedRules(communityAddress);
            if (!rules || (!rules.minTokenBalance && !rules.tokenMint)) continue;

            const members = getChatMembers(chatId);
            for (const userId of members) {
                try {
                    const wallet = getUserWallet(userId);

                    // If no wallet linked, kick
                    if (!wallet) {
                        await bot.telegram.banChatMember(chatId, userId);
                        await bot.telegram.unbanChatMember(chatId, userId); // Allow rejoin if they verify
                        continue;
                    }

                    // Check Balance
                    if (rules.minTokenBalance > 0 && rules.tokenMint) {
                        const balance = await getTokenBalance(connection, wallet, rules.tokenMint);
                        if (balance < rules.minTokenBalance) {
                            console.log(`Kicking user ${userId} from ${chatId} (Balance: ${balance} < ${rules.minTokenBalance})`);
                            await bot.telegram.banChatMember(chatId, userId);
                            await bot.telegram.unbanChatMember(chatId, userId); // Soft ban (kick)

                            // Notify Chat (optional, to avoid spam maybe do this carefully)
                            // bot.telegram.sendMessage(chatId, `👢 Removed user ${userId} (Insufficient Balance: ${balance})`);
                        }
                    }

                } catch (e) {
                    console.error(`Error checking user ${userId} in ${chatId}:`, e.message);
                }
            }
        } catch (e) {
            console.error(`Error checking chat ${chatId}:`, e);
        }
    }
}

// Start Loop
setInterval(runPeriodicChecks, CHECK_INTERVAL);

// --- Launch ---

// Start Express Server
startServer();

// Wizard session storage: { userId: { step: number, data: object } }
const creationSessions = {};

bot.command('create_community', (ctx) => {
    // Only allow in private chat to avoid spamming groups
    if (ctx.chat.type !== 'private') {
        return ctx.reply('Please run this command in a private chat with me.');
    }

    creationSessions[ctx.from.id] = { step: 1, data: {} };
    ctx.reply(
        "🛠 *Create a Memo Community* 🛠\n\n" +
        "Let's set up your community rules.\n\n" +
        "1️⃣ **What is the Token Mint Address** you want to gate this community with?\n" +
        "(e.g., `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`)",
        { parse_mode: 'Markdown' }
    );
});


// Handle Wizard Steps (Text Messages)
bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;
    const session = creationSessions[userId];

    // If no session, pass to other handlers (like commands)
    if (!session) return next();

    const text = ctx.message.text.trim();

    // Step 1: Token Mint
    if (session.step === 1) {
        try {
            new PublicKey(text); // Validate address
            session.data.tokenMint = text;
            session.step = 2;
            return ctx.reply(
                "✅ Token Mint saved.\n\n" +
                "2️⃣ **What is the Minimum Token Balance** required to join?\n" +
                "(Enter a number, e.g., `100` or `10000`)",
                { parse_mode: 'Markdown' }
            );
        } catch (e) {
            return ctx.reply("❌ Invalid Solana Address. Please try again.");
        }
    }

    // Step 2: Min Balance
    if (session.step === 2) {
        const balance = parseFloat(text);
        if (isNaN(balance) || balance < 0) {
            return ctx.reply("❌ Please enter a valid non-negative number.");
        }
        session.data.minTokenBalance = balance;
        session.step = 3;
        return ctx.reply(
            "✅ Minimum Balance saved.\n\n" +
            "3️⃣ **What is the Whale Threshold %?** (Optional)\n" +
            "Users holding more than this % of supply will get a special 🐋 badge.\n" +
            "(Enter a number 0-100, or `0` to disable)",
            { parse_mode: 'Markdown' }
        );
    }

    // Step 3: Whale % & Finalize
    if (session.step === 3) {
        let whale = parseFloat(text);
        if (isNaN(whale) || whale < 0 || whale > 100) {
            return ctx.reply("❌ Please enter a percentage between 0 and 100.");
        }
        session.data.whalePercentage = whale;

        // Generate Rules JSON
        const rules = {
            type: "COMMUNITY_RULES",
            name: "Telegram Community", // Could ask for this too, but keeping it simple
            tokenMint: session.data.tokenMint,
            minTokenBalance: session.data.minTokenBalance,
            whalePercentage: session.data.whalePercentage
        };

        // Generate a fresh keypair for the community
        // Note: In a real app, user might want to use their own existing address.
        // But generating one is easier for the flow.
        const { Keypair } = await import('@solana/web3.js'); // Import dynamically if needed, or rely on top level
        const newCommunityKeypair = Keypair.generate();
        const address = newCommunityKeypair.publicKey.toString();

        const jsonString = JSON.stringify(rules);

        await ctx.reply(
            "🎉 **Community Configuration Ready!** 🎉\n\n" +
            "To activate your community, you need to post these rules on-chain.\n\n" +
            "**Your New Community Address:**\n" +
            `\`${address}\`\n\n` +
            "⚠️ **Save the Private Key below safely!** (You need it to update rules later)\n" +
            `\`[${newCommunityKeypair.secretKey.toString()}]\`\n\n` +
            "🚀 **ACTIVATION INSTRUCTION:**\n" +
            `Send **0.001 SOL** to \`${address}\` with the following **MEMO**:\n\n` +
            `\`${jsonString}\`\n\n` +
            "Once sent, run `/link ${address}` in your group!",
            { parse_mode: 'Markdown' }
        );

        // Clear session
        delete creationSessions[userId];
        return;
    }

    return next();
});

bot.launch().then(() => {
    console.log('Memo Telegram Bot Started! 🚀');
}).catch(err => {
    console.error('Failed to start bot', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
