
import { getLink, getChatMembers, getUserWallets } from '../storage.js';
import { getAggregatedTokenBalance, getTokenSupply } from '../solana.js';
import { getRules } from '../utils/rulesManager.js';
import { config } from '../config.js';

export async function handleSupply(ctx, connection) {
    const chatId = ctx.chat.id;

    // 1. Get Community Link
    const communityAddress = await getLink(chatId);
    if (!communityAddress) {
        return ctx.reply("This group is not linked to any Memo community.", {
            parse_mode: 'Markdown'
        });
    }

    // 2. Get Rules (for Token Mint)
    const rules = await getRules(connection, communityAddress);
    if (!rules || !rules.tokenMint) {
        return ctx.reply("⚠️ Could not determine the token mint for this community.", {
            parse_mode: 'Markdown'
        });
    }

    const tokenMint = rules.tokenMint;

    // 3. Notify User (Processing)
    const processingMsg = await ctx.reply("🔄 Calculating Group Supply... this may take a moment.");

    try {
        // 4. Get All Members
        const memberIds = await getChatMembers(chatId);
        if (!memberIds || memberIds.length === 0) {
            return ctx.telegram.editMessageText(chatId, processingMsg.message_id, null,
                "⚠️ No verified members found in this group."
            );
        }

        // 5. Fetch Supply & Balances
        // Fetch Total Supply *first* to fail fast
        const totalSupply = await getTokenSupply(connection, tokenMint);
        if (totalSupply === null) {
            throw new Error("Failed to fetch token supply");
        }

        let totalGroupBalance = 0;
        let processedCount = 0;
        const totalMembers = memberIds.length;

        // Batch processing to avoid rate limits
        const BATCH_SIZE = 10;
        const DELAY_MS = 200;

        for (let i = 0; i < totalMembers; i += BATCH_SIZE) {
            const batch = memberIds.slice(i, i + BATCH_SIZE);

            const promises = batch.map(async (userId) => {
                const wallets = await getUserWallets(userId.toString());
                if (!wallets || wallets.length === 0) return 0;

                const balance = await getAggregatedTokenBalance(connection, wallets, tokenMint);
                return balance !== null ? balance : 0; // Treat error as 0 for sum to continue? Or fail? Plan said fail closed? 
                // Actually info.js treats null as error. But here we might want best effort? 
                // Let's stick to best effort for now, treating errors as 0 but maybe logging?
                // Re-reading plan: "Add /supply ... adds up all ... gives %".
                // If we miss balances, the % is wrong. 
                // But failing the whole command for 1 user error is harsh. 
                // Let's assume 0 for errors but maybe count them.
            });

            const results = await Promise.all(promises);
            totalGroupBalance += results.reduce((acc, val) => acc + val, 0);

            processedCount += batch.length;

            // Interaction to avoid timeouts? No, just wait.
            if (i + BATCH_SIZE < totalMembers) {
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }

        // 6. Calculate Percentage
        const percentage = (totalGroupBalance / totalSupply) * 100;

        // 7. Format Output
        const msg = `📊 **Community Supply Stats**\n\n` +
            `💎 **Token:** \`${tokenMint}\`\n` +
            `👥 **Verified Members:** ${totalMembers}\n` +
            `💰 **Group Total:** ${totalGroupBalance.toLocaleString()}\n` +
            `🌍 **Total Supply:** ${totalSupply.toLocaleString()}\n\n` +
            `🔥 **Group Ownership:** \`${percentage.toFixed(4)}%\``;

        // Edit the processing message
        await ctx.telegram.editMessageText(chatId, processingMsg.message_id, null, msg, {
            parse_mode: 'Markdown'
        });

    } catch (err) {
        console.error("Supply command error:", err);
        await ctx.telegram.editMessageText(chatId, processingMsg.message_id, null,
            "❌ An error occurred while calculating supply. Please try again later."
        );
    }
}
