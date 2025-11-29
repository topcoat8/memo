import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { MEMO_PROGRAM_ID } from '../constants';
import { Buffer } from 'buffer';

/**
 * Hook to fetch and parse community rules from on-chain memos.
 * 
 * @param {Object} params
 * @param {Connection} params.connection
 * @param {string} params.communityAddress
 * @returns {Object} { rules, loading, error }
 */
export function useCommunityRules({ connection, communityAddress }) {
    const [rules, setRules] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!connection || !communityAddress || communityAddress === "INSERT_COMMUNITY_ADDRESS_HERE") {
            setRules(null);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(null);

        async function fetchRules() {
            try {
                const pubkey = new PublicKey(communityAddress);

                // Fetch recent transaction history for the community address
                // We only need to find the latest "COMMUNITY_RULES" memo
                const signatures = await connection.getSignaturesForAddress(
                    pubkey,
                    { limit: 20 }, // Check last 20 transactions
                    'confirmed'
                );

                let foundRules = null;

                for (const sigInfo of signatures) {
                    if (foundRules) break;

                    try {
                        const tx = await connection.getParsedTransaction(sigInfo.signature, {
                            maxSupportedTransactionVersion: 0,
                        });

                        if (!tx || !tx.meta || tx.meta.err) continue;

                        // Look for Memo instruction
                        const memoInstruction = tx.transaction.message.instructions.find(ix =>
                            ix.programId.toString() === MEMO_PROGRAM_ID.toString() ||
                            ix.program === 'spl-memo'
                        );

                        if (!memoInstruction) continue;

                        let memoData;
                        if (memoInstruction.parsed) {
                            memoData = memoInstruction.parsed;
                        } else if (memoInstruction.data) {
                            memoData = Buffer.from(memoInstruction.data, 'base64').toString('utf-8');
                        } else {
                            continue;
                        }

                        let parsedMemo;
                        try {
                            parsedMemo = typeof memoData === 'string' ? JSON.parse(memoData) : memoData;
                        } catch (err) {
                            continue;
                        }

                        // Try to decrypt if it looks like an encrypted memo
                        if (parsedMemo.encrypted && parsedMemo.nonce) {
                            try {
                                const { decryptMessageFromChain, base64ToUint8Array } = await import('../utils/encryption');

                                const encryptedBytes = typeof parsedMemo.encrypted === 'string'
                                    ? base64ToUint8Array(parsedMemo.encrypted)
                                    : new Uint8Array(parsedMemo.encrypted);

                                const nonceBytes = typeof parsedMemo.nonce === 'string'
                                    ? base64ToUint8Array(parsedMemo.nonce)
                                    : new Uint8Array(parsedMemo.nonce);

                                const decrypted = decryptMessageFromChain(
                                    encryptedBytes,
                                    nonceBytes,
                                    communityAddress
                                );
                                try {
                                    parsedMemo = JSON.parse(decrypted);
                                } catch (e) {
                                    // Decrypted content might not be JSON, ignore
                                    continue;
                                }
                            } catch (e) {
                                // Decryption failed
                                continue;
                            }
                        }

                        if (parsedMemo.type === 'COMMUNITY_RULES') {
                            foundRules = parsedMemo;
                        }
                    } catch (err) {
                        console.warn(`Failed to parse tx ${sigInfo.signature}`, err);
                    }
                }

                if (isMounted) {
                    setRules(foundRules);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch community rules:", err);
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        }

        fetchRules();

        return () => {
            isMounted = false;
        };
    }, [connection, communityAddress]);

    return { rules, loading, error };
}
