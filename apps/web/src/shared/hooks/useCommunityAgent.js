import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

/**
 * Hook for the Local AI Agent
 * Analyzes on-chain data to generate insights for the community.
 * 
 * @param {Object} options
 * @param {Connection} options.connection
 * @param {string} options.tokenMint
 * @param {string} options.communityAddress
 * @returns {Object} Agent state and insights
 */
export function useCommunityAgent({ connection, tokenMint, communityAddress }) {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastRun, setLastRun] = useState(null);

    const generateInsights = useCallback(async () => {
        if (!connection || !tokenMint) return;

        setLoading(true);
        setInsights([]); // Clear previous insights while loading

        try {
            const mintPubkey = new PublicKey(tokenMint);

            // 1. Fetch recent signatures for the token mint (proxy for community activity)
            // We look at the mint address itself to see minting/burning, but for transfer activity
            // we really want to look at the community wallet or just general token activity.
            // For this POC, let's look at the Community Wallet's token account activity if possible,
            // OR just the last N transactions on the mint if the RPC allows (often limited).
            // Better approach for POC: Look at the Community Address's recent transactions.

            const targetPubkey = new PublicKey(communityAddress || tokenMint);

            const signatures = await connection.getSignaturesForAddress(
                targetPubkey,
                { limit: 50 },
                'confirmed'
            );

            if (signatures.length === 0) {
                setInsights([{ type: 'info', message: "No recent activity found to analyze." }]);
                setLoading(false);
                return;
            }

            // 2. Analyze activity levels
            const now = Date.now() / 1000;
            const oneDayAgo = now - 86400;
            const recentTxCount = signatures.filter(s => (s.blockTime || 0) > oneDayAgo).length;

            const newInsights = [];

            // Insight: Activity Level
            if (recentTxCount > 20) {
                newInsights.push({
                    type: 'trending',
                    title: 'High Activity',
                    message: `🔥 This community is on fire! ${recentTxCount} transactions in the last 24h.`
                });
            } else if (recentTxCount > 5) {
                newInsights.push({
                    type: 'normal',
                    title: 'Steady Traffic',
                    message: `👥 Consistent activity with ${recentTxCount} transactions recently.`
                });
            } else {
                newInsights.push({
                    type: 'quiet',
                    title: 'Quiet Day',
                    message: `💤 It's a bit quiet in here. Only ${recentTxCount} transactions in the last 24h.`
                });
            }

            // 3. Fetch a few full transactions to find "Whales" or large movements
            // We'll just check the first 5 for speed in this POC
            // Note: We use Promise.all with individual requests to avoid "Batch requests" 403 error on free RPCs
            const txsToFetch = signatures.slice(0, 5).map(s => s.signature);

            const txs = await Promise.all(txsToFetch.map(async (sig) => {
                try {
                    return await connection.getParsedTransaction(sig, {
                        maxSupportedTransactionVersion: 0
                    });
                } catch (e) {
                    console.warn(`Failed to fetch tx ${sig}`, e);
                    return null;
                }
            }));

            let whaleCount = 0;
            let uniqueSigners = new Set();

            txs.forEach(tx => {
                if (!tx || !tx.meta) return;

                // Check for unique signers
                const signer = tx.transaction.message.accountKeys.find(k => k.signer)?.pubkey.toString();
                if (signer) uniqueSigners.add(signer);

                // Check for large SOL or Token transfers (heuristic)
                // This is rough parsing.
                const preBalances = tx.meta.preBalances;
                const postBalances = tx.meta.postBalances;

                // Simple check: did anyone move more than 10 SOL?
                const maxSolChange = preBalances.reduce((max, pre, idx) => {
                    const diff = Math.abs(pre - postBalances[idx]);
                    return Math.max(max, diff);
                }, 0);

                if (maxSolChange > 10 * 1e9) { // 10 SOL
                    whaleCount++;
                }
            });

            if (whaleCount > 0) {
                newInsights.push({
                    type: 'whale',
                    title: 'Whale Alert',
                    message: `🐋 Spotted ${whaleCount} transaction(s) involving large amounts (>10 SOL) recently!`
                });
            }

            if (uniqueSigners.size > 3) {
                newInsights.push({
                    type: 'growth',
                    title: 'Diverse Participation',
                    message: `🌱 ${uniqueSigners.size} unique members are active right now.`
                });
            }

            setInsights(newInsights);
            setLastRun(new Date());

        } catch (err) {
            console.error("Agent analysis failed:", err);
            setInsights([{ type: 'error', message: "My circuits are fried. Couldn't analyze data." }]);
        } finally {
            setLoading(false);
        }
    }, [connection, tokenMint, communityAddress]);

    // Run once on mount if we haven't run yet
    useEffect(() => {
        if (!lastRun && connection && tokenMint) {
            generateInsights();
        }
    }, [lastRun, connection, tokenMint, generateInsights]);

    return {
        insights,
        loading,
        refresh: generateInsights
    };
}
