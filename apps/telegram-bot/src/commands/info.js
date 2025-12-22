
import { getLink, getUserWallet, getUserWallets, getChatMembers } from '../storage.js';
import { getTokenBalance, getTokenSupply, getAggregatedTokenBalance } from '../solana.js';
import { getRules, formatRules } from '../utils/rulesManager.js';
import { escapeMarkdown } from '../utils/formatting.js';
import { config } from '../config.js';

export async function handleRules(ctx, connection) {
    const address = await getLink(ctx.chat.id);
    if (!address) {
        return ctx.reply('This chat is not linked to any Memo Community.');
    }

    const rulesData = await getRules(connection, address);
    if (!rulesData) {
        return ctx.reply('No rules found on-chain yet.');
    }

    ctx.reply(formatRules(rulesData), { parse_mode: 'Markdown' });
}

export async function handleMyStatus(ctx, connection) {
    const userId = ctx.from.id;
    const wallets = await getUserWallets(userId.toString());

    if (!wallets || wallets.length === 0) {
        return ctx.reply('❌ You have not verified a wallet yet. Use /verify to link one.');
    }

    let message = `✅ *Verified Wallets:*\n`;
    wallets.forEach(w => message += `\`${w}\`\n`);
    message += `\n`;

    // Check Creator Status (Aggregated)
    const memoBalance = await getAggregatedTokenBalance(connection, wallets, config.MEMO_MINT);

    // Handle RPC Error
    if (memoBalance === null) {
        message += `⚠️ Could not fetch balances. Please try again later.\n`;
        return ctx.reply(message, { parse_mode: 'Markdown' });
    }

    message += `🏗 **Creator Status:**\n$MEMO Balance: ${memoBalance.toLocaleString()}\n`;
    if (memoBalance >= config.CREATOR_MIN_BALANCE) {
        message += `✅ Eligible to Create Communities (Min 50k)\n\n`;
    } else {
        message += `❌ Not Exempt (Need 50k to Create)\n\n`;
    }

    const address = await getLink(ctx.chat.id);
    if (address) {
        const rulesData = await getRules(connection, address);
        if (rulesData && rulesData.tokenMint) {
            const balance = await getAggregatedTokenBalance(connection, wallets, rulesData.tokenMint);

            if (balance === null) {
                message += `💎 *Group Token Balance:* (Network Error)\n`;
                return ctx.reply(message, { parse_mode: 'Markdown' });
            }

            message += `💎 *Group Token Balance:* ${balance.toLocaleString()}\n`;

            let passed = true;
            let requirementText = "";

            if (rulesData.minTokenPercentage > 0) {
                const supply = await getTokenSupply(connection, rulesData.tokenMint);
                const requiredAmount = supply * (rulesData.minTokenPercentage / 100);
                requirementText = `${rulesData.minTokenPercentage}% of Supply (${requiredAmount.toLocaleString()})`;
                if (balance < requiredAmount) passed = false;
            } else if (rulesData.minTokenBalance > 0) {
                requirementText = `${rulesData.minTokenBalance.toLocaleString()}`;
                if (balance < rulesData.minTokenBalance) passed = false;
            }

            if (requirementText) {
                message += `📜 *Requirement:* ${requirementText}\n`;
                message += `Status: ${passed ? '✅ PASSED' : '❌ INSUFFICIENT'}\n`;
            }

            // Whale Check
            if (rulesData.whalePercentage > 0) {
                const supply = await getTokenSupply(connection, rulesData.tokenMint);
                const whaleThreshold = supply * (rulesData.whalePercentage / 100);
                if (balance >= whaleThreshold) {
                    message += `\n🐋 **WHALE STATUS: ACTIVE** 🐋`;
                }
            }
        }
    }

    ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function handleLeaderboard(ctx, connection) {
    // Check admin permissions - DISABLED per user request (Any user can list)
    if (ctx.chat.type === 'private') {
        return ctx.reply('❌ This command can only be used in groups.');
    }

    // Check if linked
    const address = await getLink(ctx.chat.id);
    if (!address) {
        return ctx.reply('⚠️ This chat is not linked to any Memo Community.');
    }

    const rules = await getRules(connection, address);
    if (!rules || !rules.tokenMint) {
        return ctx.reply('⚠️ Could not determine token mint from community rules.');
    }

    ctx.reply("🔍 Scanning verified members... this may take a moment.");

    const memberIds = await getChatMembers(ctx.chat.id); // Returns Array of IDs

    if (!memberIds || memberIds.length === 0) {
        return ctx.reply("ℹ️ No verified members tracked in this group yet.");
    }

    const leaderboard = [];
    // Only scan first 50 to avoid limits
    const scanList = memberIds.slice(0, 50);

    for (const userId of scanList) {
        const wallets = await getUserWallets(userId.toString());
        if (wallets && wallets.length > 0) {
            const balance = await getAggregatedTokenBalance(connection, wallets, rules.tokenMint);
            if (balance !== null) {
                leaderboard.push({ userId, balance, wallet: wallets[0] }); // Display primary wallet only
            }
        }
        await new Promise(r => setTimeout(r, 100));
    }

    leaderboard.sort((a, b) => b.balance - a.balance);

    let output = `📊 **Token Leaderboard** 📊\n`;
    output += `Token: \`${rules.tokenMint}\`\n\n`;

    // Fetch supply once for whale calc
    let whaleThreshold = Infinity;
    if (rules.whalePercentage > 0) {
        const supply = await getTokenSupply(connection, rules.tokenMint);
        whaleThreshold = supply * (rules.whalePercentage / 100);
    }

    // Display Top 10
    const top10 = leaderboard.slice(0, 10);

    for (let i = 0; i < top10.length; i++) {
        const entry = top10[i];
        let name = `User ${entry.userId}`;
        try {
            const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, entry.userId);
            if (chatMember.user.username) {
                name = `@${chatMember.user.username}`;
            } else if (chatMember.user.first_name) {
                name = chatMember.user.first_name;
            }
        } catch (e) { }

        let whaleBadge = "";
        if (entry.balance >= whaleThreshold) {
            whaleBadge = "🐋 ";
        }

        output += `${i + 1}. ${whaleBadge}**${escapeMarkdown(name)}**: ${entry.balance.toLocaleString()} $MEMO\n`;
    }

    ctx.reply(output, { parse_mode: 'Markdown' });
}
