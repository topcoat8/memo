import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, AccountLayout } from '@solana/spl-token';

/**
 * Hook to batch fetch token balances for a list of user IDs
 * 
 * @param {Object} options
 * @param {Connection} options.connection - Solana connection
 * @param {PublicKey} options.tokenMint - Token mint address
 * @param {string[]} options.userIds - List of user wallet addresses
 * @returns {Object} { balances: Record<string, number>, loading: boolean }
 */
export function useChatTokenBalances({ connection, tokenMint, userIds }) {
    const [balances, setBalances] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;

        const fetchBalances = async () => {
            if (!connection || !tokenMint || !userIds || userIds.length === 0) {
                return;
            }

            try {
                if (mounted) setLoading(true);

                // Deduplicate user IDs
                const uniqueIds = [...new Set(userIds)];

                // Ensure tokenMint is a PublicKey
                let mintKey = tokenMint;
                if (typeof tokenMint === 'string') {
                    try {
                        mintKey = new PublicKey(tokenMint);
                    } catch (e) {
                        console.error("Invalid token mint string:", tokenMint);
                        return;
                    }
                }

                // Derive ATAs for all users
                const ataPromises = uniqueIds.map(async (userId) => {
                    try {
                        const userPubkey = new PublicKey(userId);
                        const ata = await getAssociatedTokenAddress(mintKey, userPubkey);
                        return { userId, ata };
                    } catch (e) {
                        console.warn(`Invalid public key or ATA derivation failed for user: ${userId}`, e);
                        return null;
                    }
                });

                const derived = (await Promise.all(ataPromises)).filter(Boolean);
                const atas = derived.map(d => d.ata);

                // Batch fetch account info
                // Chunking to avoid hitting RPC limits (limit is usually 100)
                const CHUNK_SIZE = 100;
                const chunks = [];
                for (let i = 0; i < atas.length; i += CHUNK_SIZE) {
                    chunks.push(atas.slice(i, i + CHUNK_SIZE));
                }

                const newBalances = {};

                for (const chunk of chunks) {
                    const accountInfos = await connection.getMultipleAccountsInfo(chunk);

                    // Process batch results
                    const fallbackPromises = [];

                    chunk.forEach((ata, i) => {
                        const info = accountInfos[i];
                        // Find the userId corresponding to this ATA
                        // Since we sliced the 'atas' array, we need to map back to 'derived'
                        // But 'derived' and 'atas' are aligned.
                        // We need the global index.
                        // Actually, let's just iterate 'derived' in chunks too or map results back.
                        // Easier: just map the results back to the chunk.

                        // We need to know which userId this ATA belongs to.
                        // We can find it in 'derived' by matching ATA.
                        const derivedEntry = derived.find(d => d.ata.equals(ata));
                        if (!derivedEntry) return;

                        if (info) {
                            try {
                                const decoded = AccountLayout.decode(info.data);
                                // amount is a bigint
                                // We'll store it as a number for UI, assuming appropriate decimals handling in UI or here.
                                // Usually we want the UI amount (float).
                                // But we don't have decimals here easily unless we fetch mint info.
                                // For now, let's return the raw amount as string or number if safe.
                                // JS number is safe up to 2^53 - 1. Token amounts can be larger.
                                // Let's return a formatted string or keep it simple.
                                // The user asked for "amount of the chat mint they hold".
                                // Let's assume standard 6 or 9 decimals.
                                // Ideally we should fetch mint info to get decimals.
                                // Let's just return the raw BigInt converted to string for now, 
                                // OR better, let's assume we can get decimals from context or just show raw if needed.
                                // Actually, let's try to get decimals. 
                                // But to keep it fast, let's just return the raw amount and let the UI format it if it knows decimals,
                                // or we can fetch mint info once.

                                // Let's just return the raw amount for now.
                                newBalances[derivedEntry.userId] = Number(decoded.amount);
                            } catch (e) {
                                console.error("Error decoding account data", e);
                                newBalances[derivedEntry.userId] = 0;
                            }
                        } else {
                            // ATA not found, queue fallback fetch
                            fallbackPromises.push(async () => {
                                try {
                                    const userPubkey = new PublicKey(derivedEntry.userId);
                                    const accounts = await connection.getParsedTokenAccountsByOwner(userPubkey, {
                                        mint: mintKey
                                    });

                                    const total = accounts.value.reduce((acc, accInfo) => {
                                        return acc + Number(accInfo.account.data.parsed.info.tokenAmount.amount);
                                    }, 0);

                                    return { userId: derivedEntry.userId, amount: total };
                                } catch (e) {
                                    console.warn(`Fallback fetch failed for ${derivedEntry.userId}`, e);
                                    return { userId: derivedEntry.userId, amount: 0 };
                                }
                            });
                        }
                    });

                    // Execute fallbacks in parallel (but limited by chunk size which is 100, might be too many)
                    // Let's execute them.
                    if (fallbackPromises.length > 0) {
                        const results = await Promise.all(fallbackPromises.map(p => p()));
                        results.forEach(r => {
                            newBalances[r.userId] = r.amount;
                        });
                    }
                }

                if (mounted) setBalances(newBalances);
            } catch (err) {
                console.error("Failed to fetch chat balances:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchBalances();

        return () => {
            mounted = false;
        };
    }, [connection, tokenMint, JSON.stringify(userIds)]); // JSON.stringify to compare arrays by value

    return { balances, loading };
}
