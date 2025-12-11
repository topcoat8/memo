import { Connection, PublicKey } from '@solana/web3.js';
import { decryptMessageFromChain, base64ToUint8Array } from './utils/encryption.js';

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb';

/**
 * Fetches and parses community rules from on-chain memos.
 * 
 * @param {Connection} connection 
 * @param {string} communityAddress 
 * @returns {Promise<Object|null>} rules object or null
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches and parses community rules from on-chain memos.
 * 
 * @param {Connection} connection 
 * @param {string} communityAddress 
 * @returns {Promise<Object|null>} rules object or null
 */
export async function fetchCommunityRules(connection, communityAddress) {
    if (!communityAddress) return null;

    try {
        const pubkey = new PublicKey(communityAddress);

        // Fetch recent transaction history for the community address
        const signatures = await connection.getSignaturesForAddress(
            pubkey,
            { limit: 50 }, // Check last 50 transactions
            'confirmed'
        );

        for (const sigInfo of signatures) {
            try {
                const tx = await connection.getParsedTransaction(sigInfo.signature, {
                    maxSupportedTransactionVersion: 0,
                });

                if (!tx || !tx.meta || tx.meta.err) {
                    await sleep(200); // Rate limit protection
                    continue;
                }

                // Look for Memo instruction
                const memoInstruction = tx.transaction.message.instructions.find(ix =>
                    ix.programId.toString() === MEMO_PROGRAM_ID ||
                    ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
                    ix.program === 'spl-memo'
                );

                if (!memoInstruction) {
                    await sleep(200); // Rate limit protection
                    continue;
                }

                let memoData;
                if (memoInstruction.parsed) {
                    memoData = memoInstruction.parsed;
                } else if (memoInstruction.data) {
                    memoData = Buffer.from(memoInstruction.data, 'base64').toString('utf-8');
                } else {
                    await sleep(200); // Rate limit protection
                    continue;
                }

                let parsedMemo;
                try {
                    parsedMemo = typeof memoData === 'string' ? JSON.parse(memoData) : memoData;
                } catch (err) {
                    await sleep(200); // Rate limit protection
                    continue;
                }

                // Try to decrypt if it looks like an encrypted memo
                if (parsedMemo.encrypted && parsedMemo.nonce) {
                    try {
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
                            await sleep(200); // Rate limit protection
                            continue;
                        }
                    } catch (e) {
                        // Decryption failed
                        await sleep(200); // Rate limit protection
                        continue;
                    }
                }

                if (parsedMemo && parsedMemo.type === 'COMMUNITY_RULES') {
                    return parsedMemo; // Found the latest rules
                }
            } catch (err) {
                console.warn(`Failed to parse tx ${sigInfo.signature}`, err);
                if (err.message && err.message.includes('429')) {
                    await sleep(2000); // Longer wait on rate limit
                }
            }
            await sleep(200); // Basic rate limit protection
        }
    } catch (err) {
        console.error("Failed to fetch community rules:", err);
    }
    return null;
}

/**
 * Gets the token balance for a wallet.
 * 
 * @param {Connection} connection 
 * @param {string} walletAddress 
 * @param {string} tokenMintAddress 
 * @returns {Promise<number>} balance
 */
export async function getTokenBalance(connection, walletAddress, tokenMintAddress) {
    try {
        const walletPubkey = new PublicKey(walletAddress);
        const mintPubkey = new PublicKey(tokenMintAddress);

        const response = await connection.getParsedTokenAccountsByOwner(
            walletPubkey,
            { mint: mintPubkey }
        );

        let totalBalance = 0;
        for (const accountInfo of response.value) {
            const amount = accountInfo.account.data.parsed.info.tokenAmount.uiAmount;
            totalBalance += amount;
        }
        return totalBalance;

    } catch (e) {
        console.error(`Failed to get token balance for ${walletAddress}:`, e);
        return 0;
    }
}
