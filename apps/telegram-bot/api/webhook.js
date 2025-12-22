import { bot } from '../src/bot.js';

export default async function handler(req, res) {
    try {
        // Vercel serverless function for Telegram Webhook
        if (req.method === 'POST') {
            console.log("Webhook received update:", JSON.stringify(req.body).substring(0, 200));
            await bot.handleUpdate(req.body);
            console.log("Update handled successfully");
            res.status(200).json({ ok: true });
        } else {
            res.status(200).send('Memo Telegram Bot Webhook is Active!');
        }
    } catch (e) {
        console.error('Webhook error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
