
import { Telegraf } from 'telegraf';
import { Connection } from '@solana/web3.js';
import { startServer } from './server.js';
import { config } from './config.js';
import { registerCommands } from './commands/index.js';
import { getAllLinks, getChatMembers, getUserWallet, getUserWallets } from './storage.js';
import { getRules } from './utils/rulesManager.js';
import { getTokenBalance, getTokenSupply, getAggregatedTokenBalance } from './solana.js';

const bot = new Telegraf(config.BOT_TOKEN);
const connection = new Connection(config.RPC_URL, 'confirmed');
console.log(`[DEBUG] RPC URL in use: ${config.RPC_URL.includes('helius') ? 'Helius (Valid)' : 'Public/Other'}`);

// Debug Logger: Trace all updates
bot.use(async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        console.log(`[TRACE] Message: ${ctx.message.text} from ${ctx.from.id}`);
    }
    await next();
});

// Register all commands and events
registerCommands(bot, connection);

// --- Periodic Checks (Hourly) ---
async function runPeriodicChecks(specificChatId = null) {
    console.log("Running periodic rule enforcement checks...");
    const allLinks = await getAllLinks();

    for (const [chatId, communityAddress] of Object.entries(allLinks)) {
        // If specific chat requested, skip others
        if (specificChatId && String(chatId) !== String(specificChatId)) continue;

        try {
            const rules = await getRules(connection, communityAddress);
            if (!rules || !rules.tokenMint) continue;

            const members = await getChatMembers(chatId);
            const unverifiedList = [];

            for (const userId of members) {
                if (String(userId) === config.EXEMPT_USER_ID) continue; // Skip exempted user

                try {
                    const wallets = await getUserWallets(userId);

                    // If no wallet linked
                    if (!wallets || wallets.length === 0) {
                        unverifiedList.push({ userId, reason: "No Wallet Linked" });
                        continue;
                    }

                    // Check Balance vs Rules
                    let passed = true;
                    // Debug Log
                    // console.log(`[DEBUG] Checking ${userId} in ${chatId}. Mint: ${rules.tokenMint}`);

                    const balance = await getAggregatedTokenBalance(connection, wallets, rules.tokenMint);

                    if (balance === null) {
                        console.warn(`[AUDIT] Skipping user ${userId} due to RPC error.`);
                        continue;
                    }

                    if (rules.minTokenPercentage > 0) {
                        const supply = await getTokenSupply(connection, rules.tokenMint);
                        if (supply === null) continue;
                        const requiredAmount = supply * (rules.minTokenPercentage / 100);
                        if (balance < requiredAmount) passed = false;
                    } else if (rules.minTokenBalance > 0) {
                        if (balance < rules.minTokenBalance) passed = false;
                    }

                    if (!passed) {
                        console.log(`[AUDIT] User ${userId} in ${chatId} failed. Balance: ${balance}`);
                        unverifiedList.push({ userId, reason: `Insufficient Balance (${balance.toLocaleString()})` });
                    }

                } catch (e) {
                    console.error(`Error checking user ${userId} in ${chatId}:`, e.message);
                }
            }

            // Report Results to Group
            if (unverifiedList.length > 0) {
                // Construct Message specific to this group
                // We need to resolve usernames if possible, but bot.telegram.getChatMember might be rate limited for many users.
                // We will try to resolve a few or just list IDs/Mentions.

                // Use a helper or just simple format to avoid heavy API calls in loop
                let output = `⚠️ **Compliance Report**\nFound ${unverifiedList.length} non-compliant members:\n\n`;

                // Limit display to 20 to avoid huge messages
                const displayLimit = 20;
                for (let i = 0; i < Math.min(unverifiedList.length, displayLimit); i++) {
                    const item = unverifiedList[i];
                    output += `${i + 1}. [User ${item.userId}](tg://user?id=${item.userId}) - ${item.reason}\n`;
                }

                if (unverifiedList.length > displayLimit) {
                    output += `\n...and ${unverifiedList.length - displayLimit} more.`;
                }

                output += `\n👉 Admins: Run \`/kick\` to remove these users.`;

                try {
                    await bot.telegram.sendMessage(chatId, output, { parse_mode: 'Markdown' });
                    console.log(`[AUDIT] Sent report to ${chatId}`);
                } catch (e) {
                    console.error(`[AUDIT] Failed to send report to ${chatId}:`, e.message);
                }
            } else if (specificChatId) {
                await bot.telegram.sendMessage(specificChatId, `✅ **All good!** Everyone meets requirements.`);
            }

        } catch (e) {
            console.error(`Error checking chat ${chatId}:`, e);
        }
    }
}

// Export for Vercel
export { bot, runPeriodicChecks };

// Only start normally if NOT on Vercel
if (!process.env.VERCEL) {
    bot.launch().then(() => {
        console.log('Memo Telegram Bot Started! 🚀');
    }).catch(err => {
        console.error('Failed to start bot', err);
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    // Start Express Server
    startServer();

    // Start Loop
    setInterval(runPeriodicChecks, 60 * 60 * 1000);
}
