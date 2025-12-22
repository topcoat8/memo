
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, executeWithRetry } from './solana.js';

/**
 * Checks recent transactions on the community address for a memo containing the userId.
 * 
 * @param {Connection} connection 
 * @param {string} communityAddress 
 * @param {string} userId 
 * @returns {Promise<{walletAddress: string, signature: string}|null>}
 */

const MEMO_MINT = '8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump';

/**
 * Checks recent transactions on the community address for a memo containing the userId AND a MEMO token transfer.
 * 
 * @param {Connection} connection 
 * @param {string} communityAddress 
 * @param {string} userId 
 * @param {string | null} [findingWallet=null] - Optional wallet address to search transactions for instead of the community address.
 * @param {string | null} [expectedAmount=null] - The exact amount of MEMO expected in the self-transfer.
 * @returns {Promise<{walletAddress: string, signature: string}|null>}
 */
export async function checkVerification(connection, communityAddress, userId, findingWallet = null, expectedAmount = null) {
    try {
        let targetPubkey;

        if (findingWallet) {
            console.log(`[DEBUG] Searching txs for User Wallet: ${findingWallet} -> Community: ${communityAddress}`);
            try {
                targetPubkey = new PublicKey(findingWallet);
            } catch (e) {
                console.error("Invalid findingWallet provided");
                return null;
            }
        } else {
            console.log(`[DEBUG] Searching txs for Community Wallet: ${communityAddress}`);
            targetPubkey = new PublicKey(communityAddress);
        }

        // 1. Get Signatures
        // 1. Get Signatures
        const signatures = await executeWithRetry(() => connection.getSignaturesForAddress(
            targetPubkey,
            { limit: 50 },
            'confirmed'
        ));

        // 4. Process Transactions in Parallel Batches (Limit concurrency to avoid 429s)
        const BATCH_SIZE = 5;
        const DELAY_MS = 200;

        for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
            const batch = signatures.slice(i, i + BATCH_SIZE);
            const promises = batch.map(async (sigInfo) => {
                try {
                    const tx = await executeWithRetry(() => connection.getParsedTransaction(sigInfo.signature, {
                        maxSupportedTransactionVersion: 0,
                    }));
                    return { sigInfo, tx };
                } catch (e) {
                    console.warn(`Failed to fetch tx ${sigInfo.signature}`, e.message);
                    return { sigInfo, tx: null };
                }
            });

            const results = await Promise.all(promises);

            // Process results
            for (const { sigInfo, tx } of results) {
                if (!tx || !tx.meta || tx.meta.err) continue;

                const checkAmountInstruction = (ix, amt) => {
                    const expectedVal = parseFloat(amt);
                    if (isNaN(expectedVal)) return false;

                    // CHECK 1: SPL Token Transfer
                    if (ix.program === 'spl-token' || ix.programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || ix.programId.toString() === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') {
                        if (ix.parsed && (ix.parsed.type === 'transfer' || ix.parsed.type === 'transferChecked')) {
                            const info = ix.parsed.info;
                            let detectedAmt = 0;
                            if (info.tokenAmount && info.tokenAmount.uiAmount !== undefined) {
                                detectedAmt = info.tokenAmount.uiAmount;
                            } else if (info.amount) {
                                // Fallback for raw amount (MEMO has 6 decimals)
                                detectedAmt = parseFloat(info.amount) / 1000000;
                            }

                            // 1. Check Amount (Epsilon match)
                            if (Math.abs(detectedAmt - expectedVal) > 0.000001) return false;

                            // 2. Check Token Mint (Security)
                            const MEMO_MINT = '8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump';
                            const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

                            // If transferChecked, Mint is explicit
                            if (info.mint && info.mint !== MEMO_MINT) return false;

                            // If transfer (no mint field), check if Source/Dest matches User's MEMO ATA
                            if (!info.mint && findingWallet) {
                                try {
                                    const userATA = getAssociatedTokenAddressSync(new PublicKey(findingWallet), new PublicKey(MEMO_MINT)).toString();
                                    const userATA2022 = getAssociatedTokenAddressSync(new PublicKey(findingWallet), new PublicKey(MEMO_MINT), TOKEN_2022_PROGRAM_ID).toString();
                                    const isSourceMemo = info.source === userATA || info.source === userATA2022;
                                    const isDestMemo = info.destination === userATA || info.destination === userATA2022;

                                    if (!isSourceMemo && !isDestMemo) return false;
                                } catch (e) { return false; }
                            }
                            return true;
                        }
                    }

                    // CHECK 2: System Program Transfer (SOL)
                    if (ix.program === 'system' || ix.programId.toString() === '11111111111111111111111111111111') {
                        if (ix.parsed && ix.parsed.type === 'transfer') {
                            const info = ix.parsed.info;
                            // info.lamports is the amount in lamports (1 SOL = 1e9 lamports)
                            if (info.lamports) {
                                const detectedSol = info.lamports / 1000000000;
                                // Check Amount (Epsilon match)
                                // We verify 9 decimal places for SOL
                                if (Math.abs(detectedSol - expectedVal) < 0.00000001) return true;
                            }
                        }
                    }

                    return false;
                };

                // Helper to check instruction for Memo ID
                const checkMemoInstruction = (ix) => {
                    let memoText = "";
                    if (ix.parsed) {
                        if (typeof ix.parsed === 'string') memoText = ix.parsed;
                        else try { memoText = JSON.stringify(ix.parsed); } catch (e) { }
                    } else if (ix.data) {
                        try { memoText = Buffer.from(ix.data, 'base64').toString('utf-8'); } catch (e) { }
                    }
                    return memoText && memoText.includes(userId.toString());
                };

                const instructions = tx.transaction.message.instructions;
                let foundMatch = false;

                // Loop Instructions
                for (const ix of instructions) {
                    if (expectedAmount) {
                        // MODE: Amount Verification
                        if (checkAmountInstruction(ix, expectedAmount)) {
                            foundMatch = true;
                            break;
                        }
                    } else {
                        // MODE: Memo Verification
                        if (checkMemoInstruction(ix)) {
                            foundMatch = true;
                            break;
                        }
                    }
                }

                // Also check inner instructions if not found
                if (!foundMatch && tx.meta && tx.meta.innerInstructions) {
                    for (const inner of tx.meta.innerInstructions) {
                        for (const ix of inner.instructions) {
                            if (expectedAmount) {
                                if (checkAmountInstruction(ix, expectedAmount)) { foundMatch = true; break; }
                            } else {
                                if (checkMemoInstruction(ix)) { foundMatch = true; break; }
                            }
                        }
                        if (foundMatch) break;
                    }
                }

                if (foundMatch) {
                    const accountKeys = tx.transaction.message.accountKeys;
                    const signer = accountKeys.find(acc => acc.signer);

                    if (findingWallet) {
                        // Strict Check: Signer must match the wallet we are verifying
                        if (signer && signer.pubkey.toString() === findingWallet) {
                            return {
                                walletAddress: findingWallet,
                                signature: sigInfo.signature
                            };
                        }
                    } else {
                        if (signer) {
                            return {
                                walletAddress: signer.pubkey.toString(),
                                signature: sigInfo.signature
                            };
                        }
                    }
                }
            }

            // Check if we found it in this batch (Actually the loop up top returns, so we are good)
            // Wait before next batch
            if (i + BATCH_SIZE < signatures.length) {
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }
    } catch (err) {
        console.warn(`Error processing txs for ${targetPubkey.toString()}:`, err);
    }
    return null;
}
