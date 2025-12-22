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

export async function executeWithRetry(operation, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (err) {
            const isLastAttempt = i === retries - 1;
            if (isLastAttempt) throw err;

            // Exponential backoff
            const waitTime = delay * Math.pow(2, i);
            console.warn(`RPC Error, retrying in ${waitTime}ms... (${i + 1}/${retries})`);
            await sleep(waitTime);
        }
    }
}

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
        return await executeWithRetry(async () => {
            const pubkey = new PublicKey(communityAddress);

            // Fetch recent transaction history for the community address
            const signatures = await connection.getSignaturesForAddress(
                pubkey,
                { limit: 50 }, // Check last 50 transactions
                'confirmed'
            );

            // Batch Fetch Transactions for Rules
            // Process Transactions Sequentially (Free Tier friendly)
            for (const sigInfo of signatures) {
                try {
                    // Helius Free Tier does not support batch requests.
                    const tx = await connection.getParsedTransaction(sigInfo.signature, {
                        maxSupportedTransactionVersion: 0,
                    });

                    await sleep(150); // Rate limit protection

                    if (!tx || !tx.meta || tx.meta.err) continue;

                    // Look for Memo instruction
                    const memoInstruction = tx.transaction.message.instructions.find(ix =>
                        ix.programId.toString() === MEMO_PROGRAM_ID ||
                        ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
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

                    if (parsedMemo && parsedMemo.type === 'COMMUNITY_RULES') {
                        // Add Creator (Transaction Signer/Fee Payer - usually the first account)
                        const creator = tx.transaction.message.accountKeys[0].pubkey.toString();
                        return { ...parsedMemo, creator }; // Found the latest rules
                    }
                } catch (err) {
                    console.warn(`Failed to parse tx in rule fetch`, err);
                    if (err.message && err.message.includes('429')) {
                        await sleep(2000); // Longer wait on rate limit
                    }
                }
            }
            return null;
        });
    } catch (err) {
        console.error("Failed to fetch community rules after retries:", err.message);
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
        return await executeWithRetry(async () => {
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
        });
    } catch (e) {
        console.error(`Failed to get token balance for ${walletAddress}:`, e.message);
        return null;
    }
}

/**
 * Gets the total token balance across multiple wallets.
 * Returns null if ANY wallet fetch fails (to prevent false negatives/positives).
 * 
 * @param {Connection} connection 
 * @param {string[]} wallets 
 * @param {string} tokenMintAddress 
 * @returns {Promise<number|null>}
 */
export async function getAggregatedTokenBalance(connection, wallets, tokenMintAddress) {
    let total = 0;
    // Remove duplicates just in case
    const uniqueWallets = [...new Set(wallets)];

    for (const wallet of uniqueWallets) {
        const balance = await getTokenBalance(connection, wallet, tokenMintAddress);
        if (balance === null) {
            return null; // RPC Error on one wallet invalidates the total sum
        }
        total += balance;
    }
    return total;
}

/**
 * Gets the total supply of a token.
 * 
 * @param {Connection} connection 
 * @param {string} tokenMintAddress 
 * @returns {Promise<number>} supply
 */
export async function getTokenSupply(connection, tokenMintAddress) {
    try {
        return await executeWithRetry(async () => {
            const mintPubkey = new PublicKey(tokenMintAddress);
            const tokenSupply = await connection.getTokenSupply(mintPubkey);
            return tokenSupply.value.uiAmount;
        });
    } catch (e) {
        console.error(`Failed to get token supply for ${tokenMintAddress}:`, e.message);
        return null; // Return null on error
    }
}

/**
 * Derives the Associated Token Account (ATA) address for a wallet and mint.
 * (Replaces need for @solana/spl-token dependency)
 * 
 * @param {string} walletAddress 
 * @param {string} tokenMintAddress 
 * @returns {Promise<PublicKey>}
 */
/**
 * Derives the Associated Token Account (ATA) address for a wallet and mint.
 * (Replaces need for @solana/spl-token dependency)
 * 
 * @param {string} walletAddress 
 * @param {string} tokenMintAddress 
 * @param {PublicKey} [tokenProgramId] - Optional: Program ID of the token (default: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
 * @returns {PublicKey}
 */
export function getAssociatedTokenAddressSync(walletAddress, tokenMintAddress, tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) {
    const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMintAddress);

    const [ata] = PublicKey.findProgramAddressSync(
        [
            wallet.toBuffer(),
            tokenProgramId.toBuffer(),
            mint.toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );
    return ata;
}
