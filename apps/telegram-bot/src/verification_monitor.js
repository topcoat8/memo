
import { PublicKey } from '@solana/web3.js';

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
 * @returns {Promise<{walletAddress: string, signature: string}|null>}
 */
export async function checkVerification(connection, communityAddress, userId) {
    try {
        const pubkey = new PublicKey(communityAddress);
        const mintPubkey = new PublicKey(MEMO_MINT);

        // 1. Get Signatures for Main Wallet
        const mainSignatures = await connection.getSignaturesForAddress(
            pubkey,
            { limit: 50 },
            'confirmed'
        );

        // 2. Get Signatures for Token Account (if exists)
        let tokenSignatures = [];
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                pubkey,
                { mint: mintPubkey }
            );

            if (tokenAccounts.value.length > 0) {
                const tokenAccountAddress = tokenAccounts.value[0].pubkey;
                tokenSignatures = await connection.getSignaturesForAddress(
                    tokenAccountAddress,
                    { limit: 50 },
                    'confirmed'
                );
            }
        } catch (e) {
            console.warn("Could not fetch token account history:", e);
        }

        // 3. Merge & Deduplicate
        const allSignatures = [...mainSignatures, ...tokenSignatures];
        const uniqueSignatures = Array.from(new Map(allSignatures.map(item => [item.signature, item])).values());

        // Sort by time (descending) just in case, though usually already sorted
        uniqueSignatures.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

        // 4. Process Transactions
        for (const sigInfo of uniqueSignatures) {
            try {
                const tx = await connection.getParsedTransaction(sigInfo.signature, {
                    maxSupportedTransactionVersion: 0,
                });

                if (!tx || !tx.meta || tx.meta.err) continue;

                // 1. Check for MEMO Token Transfer
                // We look at token balance changes. We need to see that *someone* (the community address) received MEMO tokens, 
                // OR just that a MEMO token transfer occurred involving the community address.

                // Let's filter for relevant balance changes
                const preBalances = tx.meta.preTokenBalances || [];
                const postBalances = tx.meta.postTokenBalances || [];

                // We want to verify that the transaction INVOLVED the MEMO mint
                const involvesMemoMint = postBalances.some(b => b.mint === MEMO_MINT);

                if (!involvesMemoMint) continue;

                // 2. Look for Memo instruction with User ID
                const memoInstructions = tx.transaction.message.instructions.filter(ix =>
                    ix.program === 'spl-memo' ||
                    ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb' ||
                    ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
                );

                let foundUserId = false;

                for (const ix of memoInstructions) {
                    let memoText = null;
                    if (ix.parsed) {
                        memoText = ix.parsed;
                    } else if (ix.data) {
                        memoText = Buffer.from(ix.data, 'base64').toString('utf-8');
                    }

                    if (memoText && memoText.includes(userId.toString())) {
                        foundUserId = true;
                        break;
                    }
                }

                if (foundUserId) {
                    // Found the transaction!

                    // Identify sender. In Solana, the fee payer or first signer is usually the initiator.
                    const accountKeys = tx.transaction.message.accountKeys;
                    const signer = accountKeys.find(acc => acc.signer);

                    if (signer) {
                        return {
                            walletAddress: signer.pubkey.toString(),
                            signature: sigInfo.signature
                        };
                    }
                }
            } catch (err) {
                console.warn(`Error parsing tx ${sigInfo.signature}:`, err);
            }
        }
    } catch (e) {
        console.error("Error checking verification:", e);
    }
    return null;
}
