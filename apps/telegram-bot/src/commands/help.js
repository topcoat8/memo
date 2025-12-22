
import { savePendingJoin } from '../storage.js';

// Reusing handleStart logic for Help, but maybe stripping the deep link check logic if we want pure help.
// Actually, /help usually just shows the manual.
export async function handleHelp(ctx) {
    const message = `🚀 *Memo Protocol Bot Help* 🚀\n\n` +
        `I help admin gate their groups with tokens, and users prove their holdings.\n\n` +
        `👇 **Command Reference** 👇\n\n` +
        `👤 **User Commands**\n` +
        `/verify - Link your wallet to your account\n` +
        `/mystatus - Check your current verification status\n` +
        `/leaderboard - View top token holders in this group\n` +
        `/locked - View any locked community funds\n` +
        `/supply - View total token supply of the community\n` +
        `/poll "Question" "Opt1" "Opt2" - Create a poll\n\n` +
        `👑 **Admin Commands**\n` +
        `/create - Launch a new Token Gated community (DM)\n` +
        `/link <address> - connect this group to your community\n` +
        `/rules - View current community rules\n` +
        `/audit - Check all members for compliance\n` +
        `/kick - Remove users who no longer hold tokens\n` +
        `/check - Check a specific user's status (Reply to them)\n` +
        `/tally - Tally poll weights (Reply to poll)\n` +
        `/addlocked <amount> <link> - Register locked funds\n` +
        `/removelocked <id> - Remove a locked fund entry\n` +
        `/export - Export member list as CSV`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
}
