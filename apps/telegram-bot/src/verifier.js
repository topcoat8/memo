import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Verifies a wallet signature for the Memo Bot login.
 * 
 * @param {string} userId - Telegram User ID
 * @param {string} publicKeyStr - Wallet Public Key (Base58)
 * @param {number[]} signatureArr - Signature bytes
 * @param {number} timestamp - Timestamp signed
 * @returns {boolean} isValid
 */
export function verifySignature(userId, publicKeyStr, signatureArr, timestamp) {
    try {
        // Enforce timestamp freshness (e.g., 5 minutes)
        const now = Date.now();
        if (now - timestamp > 5 * 60 * 1000) {
            console.log("Signature expired");
            return false;
        }

        const messageText = `Sign in to Memo Bot as ${userId}\nTimestamp: ${timestamp}`;
        const messageBytes = new TextEncoder().encode(messageText);
        const signatureBytes = new Uint8Array(signatureArr);
        const publicKeyBytes = new PublicKey(publicKeyStr).toBytes();

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (e) {
        console.error("Verification error:", e);
        return false;
    }
}
