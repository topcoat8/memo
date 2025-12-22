import { getLink, getLockedAmounts } from '../storage.js';
import { escapeMarkdown } from '../utils/formatting.js';


export async function handleLocked(ctx) {
    const chatId = ctx.chat.id;
    const lockedAmounts = await getLockedAmounts(chatId);

    // Also get community link to make sure it's a valid community chat
    const communityLink = await getLink(chatId);
    if (!communityLink && lockedAmounts.length === 0) {
        return ctx.reply("This group is not linked to any Memo community yet.", {
            parse_mode: 'Markdown'
        });
    }

    if (lockedAmounts.length === 0) {
        return ctx.reply("*Community Locked Funds*\n\nNo locked amounts have been added yet.", {
            parse_mode: 'Markdown'
        });
    }

    let response = "*🔐 Community Locked Funds* \n\n";
    response += "Here are the tracked locked allocations for this community:\n\n";

    lockedAmounts.forEach((entry, index) => {
        response += `* ${index + 1}.Amount:* \`${escapeMarkdown(entry.amount)}\`\n`;
        response += `   🔗 [View Contract](${entry.link})\n\n`;
    });

    // Add footer
    response += "\n_These amounts are tracked manually by community admins._";

    const opts = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    };

    ctx.reply(response, opts);
}
