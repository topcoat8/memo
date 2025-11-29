/**
 * Memo Protocol - useCommunityMessages Hook
 *
 * React hook for retrieving messages for the Community Chat.
 * Queries RPC for transactions involving the Community Address.
 */

import { useState, useEffect, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
import { decryptMessageFromChain, base64ToUint8Array } from '../utils/encryption';
import { MEMO_PROGRAM_ID, THREE_DAYS_IN_SECONDS, COMMUNITY_ADDRESS } from '../constants';

/**
 * Hook for retrieving community messages
 * 
 * @param {Object} options - Hook options
 * @param {Connection} options.connection - Solana connection
 * @param {string} options.tokenMint - Token mint address
 * @param {number} options.limit - Maximum number of messages to retrieve
 * @returns {Object} - Messages state
 */
export function useCommunityMessages({
    connection,
    tokenMint,
    communityAddress,
    limit: limitCount = 50,
}) {
    const [memos, setMemos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!connection || !tokenMint) {
            setLoading(false);
            return;
        }

        // If address is placeholder or missing, don't fetch
        if (!communityAddress || communityAddress === "INSERT_COMMUNITY_ADDRESS_HERE") {
            setLoading(false);
            setMemos([]); // Clear memos when no valid address
            return;
        }

        let isMounted = true;
        setLoading(true); // Reset loading state when address changes
        setError(null);

        async function fetchMessages() {
            try {
                const communityPubkey = new PublicKey(communityAddress);

                // 1. Main Wallet Signatures for Community Address
                const mainSignatures = await connection.getSignaturesForAddress(
                    communityPubkey,
                    { limit: 50 },
                    'confirmed'
                );

                // 2. ATA Signatures for Community Address
                let ataSignatures = [];
                if (tokenMint) {
                    try {
                        const ataAddress = await getAssociatedTokenAddress(
                            new PublicKey(tokenMint),
                            communityPubkey,
                            false,
                            TOKEN_2022_PROGRAM_ID
                        );
                        ataSignatures = await connection.getSignaturesForAddress(
                            ataAddress,
                            { limit: 50 },
                            'confirmed'
                        );
                    } catch (e) {
                        console.warn("Failed to fetch ATA signatures:", e);
                    }
                }

                // 3. Merge and Deduplicate
                const allSignatures = [...mainSignatures, ...ataSignatures];
                const uniqueSignaturesMap = new Map();

                allSignatures.forEach(sig => {
                    uniqueSignaturesMap.set(sig.signature, sig);
                });

                const uniqueSignatures = Array.from(uniqueSignaturesMap.values());

                // 4. Sort by blockTime desc
                uniqueSignatures.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

                // 5. Filter by time (3 days)
                const nowInSeconds = Math.floor(Date.now() / 1000);
                const cutoffTime = nowInSeconds - THREE_DAYS_IN_SECONDS;

                const recentSignatures = [];
                for (const sig of uniqueSignatures) {
                    if (sig.blockTime && sig.blockTime > cutoffTime) {
                        recentSignatures.push(sig);
                    } else if (sig.blockTime && sig.blockTime <= cutoffTime) {
                        break;
                    }
                }

                if (recentSignatures.length === 0) {
                    if (isMounted) {
                        setMemos([]);
                        setLoading(false);
                    }
                    return;
                }

                const allTransactions = [];

                for (const sigInfo of recentSignatures) {
                    try {
                        // Check local cache first
                        const cacheKey = `memo_tx_${sigInfo.signature}`;
                        const cachedTx = localStorage.getItem(cacheKey);

                        if (cachedTx) {
                            try {
                                const parsedTx = JSON.parse(cachedTx);
                                allTransactions.push({ tx: parsedTx, signature: sigInfo.signature });
                                continue;
                            } catch (e) {
                                localStorage.removeItem(cacheKey);
                            }
                        }

                        // Rate limit protection
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const tx = await connection.getParsedTransaction(sigInfo.signature, {
                            maxSupportedTransactionVersion: 0,
                        });

                        if (tx && tx.meta && !tx.meta.err) {
                            try {
                                localStorage.setItem(cacheKey, JSON.stringify(tx));
                            } catch (e) {
                                console.warn('Failed to cache transaction:', e);
                            }
                            allTransactions.push({ tx, signature: sigInfo.signature });
                        }
                    } catch (err) {
                        console.error(`Failed to fetch transaction ${sigInfo.signature}:`, err);
                    }
                }

                // Map transactions back to their signatures for ID consistency
                const rawMessages = allTransactions.map(({ tx, signature }) => {
                    if (!tx || !tx.meta || tx.meta.err) {
                        return null;
                    }

                    try {
                        let memoInstruction = tx.transaction.message.instructions.find(
                            (ix) => {
                                if (ix.programId?.toString() === MEMO_PROGRAM_ID.toString()) {
                                    return true;
                                }
                                if (ix.program === 'spl-memo') {
                                    return true;
                                }
                                return false;
                            }
                        );

                        if (!memoInstruction) {
                            return null;
                        }

                        let memoData;
                        if (memoInstruction.parsed) {
                            memoData = memoInstruction.parsed;
                        } else if (memoInstruction.data) {
                            memoData = Buffer.from(memoInstruction.data, 'base64').toString('utf-8');
                        } else {
                            return null;
                        }

                        let parsedMemo;
                        try {
                            parsedMemo = typeof memoData === 'string' ? JSON.parse(memoData) : memoData;
                        } catch (err) {
                            return null;
                        }

                        // Skip IDENTITY announcements
                        if (parsedMemo.type === 'IDENTITY') {
                            return null;
                        }

                        // Only include messages sent TO the community address
                        if (parsedMemo.recipient !== communityAddress) {
                            return null;
                        }

                        return {
                            id: signature,
                            senderId: tx.transaction.message.accountKeys[0].pubkey.toString(),
                            recipientId: parsedMemo.recipient,
                            encryptedContent: typeof parsedMemo.encrypted === 'string' ? base64ToUint8Array(parsedMemo.encrypted) : new Uint8Array(parsedMemo.encrypted),
                            nonce: typeof parsedMemo.nonce === 'string' ? base64ToUint8Array(parsedMemo.nonce) : new Uint8Array(parsedMemo.nonce),
                            isAsymmetric: !!parsedMemo.isAsymmetric,
                            timestamp: tx.blockTime || 0,
                            createdAt: new Date((tx.blockTime || 0) * 1000),
                            signature: signature,
                        };
                    } catch (err) {
                        return null;
                    }
                }).filter(msg => msg !== null);

                // Decrypt all messages using the Community Address (Symmetric)
                const decryptedMessages = rawMessages.map(memo => {
                    try {
                        // We assume all community messages are symmetrically encrypted for the community address
                        // If someone sent an asymmetric message, we can't read it without the private key (which we don't have)
                        if (memo.isAsymmetric) {
                            return {
                                ...memo,
                                decryptedContent: "[Encrypted Message - Private]",
                                isDecrypted: false
                            };
                        }

                        const decrypted = decryptMessageFromChain(
                            memo.encryptedContent,
                            memo.nonce,
                            communityAddress
                        );

                        return {
                            ...memo,
                            decryptedContent: decrypted,
                            isDecrypted: true
                        };
                    } catch (err) {
                        return {
                            ...memo,
                            decryptedContent: `[Decryption failed: ${err.message}]`,
                            isDecrypted: false
                        };
                    }
                });

                decryptedMessages.sort((a, b) => {
                    const timeA = a.timestamp || 0;
                    const timeB = b.timestamp || 0;
                    return timeB - timeA;
                });

                if (limitCount > 0) {
                    decryptedMessages.splice(limitCount);
                }

                if (isMounted) {
                    setMemos(decryptedMessages);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch community messages:', err);
                if (isMounted) {
                    setError(err?.message || 'Failed to load messages');
                    setLoading(false);
                }
            }
        }

        fetchMessages();

        // Poll every 30 seconds
        const intervalId = setInterval(() => {
            if (isMounted) fetchMessages();
        }, 30000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [connection, tokenMint, limitCount, communityAddress]);

    return {
        memos,
        loading,
        error,
    };
}
