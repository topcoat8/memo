import 'dotenv/config';
import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.argv[2];

if (!BOT_TOKEN) {
    console.error("Error: BOT_TOKEN is missing in .env");
    process.exit(1);
}

if (!WEBHOOK_URL) {
    console.error("Usage: node scripts/set_webhook.js <YOUR_VERCEL_URL>");
    console.error("Example: node scripts/set_webhook.js https://memo-tg.vercel.app/api/webhook");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function setWebhook() {
    try {
        console.log(`Setting webhook to: ${WEBHOOK_URL}`);
        const success = await bot.telegram.setWebhook(WEBHOOK_URL);
        if (success) {
            console.log("✅ Webhook set successfully!");
            console.log("Telegram will now send updates to your Vercel URL.");
        } else {
            console.error("❌ Failed to set webhook.");
        }
    } catch (e) {
        console.error("Error setting webhook:", e.message);
    }
}

setWebhook();
