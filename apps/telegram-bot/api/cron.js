
import { runPeriodicChecks } from '../src/bot.js';

export default async function handler(req, res) {
    // Vercel Cron automatically sends this header
    // Ideally we check for CRON_SECRET if we set one, but for now we'll allow the trigger.

    console.log('[CRON] Starting daily audit...');
    try {
        await runPeriodicChecks();
        console.log('[CRON] Audit complete.');
        res.status(200).json({ success: true, message: 'Audit completed' });
    } catch (error) {
        console.error('[CRON] Error during audit:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
