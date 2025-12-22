import { savePendingJoin } from '../storage.js';
import { MESSAGES } from '../messages.js';

export async function handleStart(ctx) {
    try {
        // Check for deep link payload: /start verify_<address>
        const parts = ctx.message.text.split(' ').filter(p => p.trim() !== '');
        const payload = parts.length > 1 ? parts[1] : null;

        if (payload && payload.startsWith('verify_')) {
            const address = payload.replace('verify_', '');

            // Save context
            await savePendingJoin(ctx.from.id, address);

            await ctx.reply(MESSAGES.START.WELCOME_DEEP_LINK(address), { parse_mode: 'Markdown' });
        } else {
            await ctx.reply(MESSAGES.START.WELCOME_GENERAL, { parse_mode: 'Markdown' });
        }
    } catch (e) {
        console.error("Critical error in /start command:", e);
        await ctx.reply(MESSAGES.ERRORS.GENERIC);
    }
}
