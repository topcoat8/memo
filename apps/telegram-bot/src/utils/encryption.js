/**
 * Memo Protocol - Encryption Utilities
 * 
 * Client-side encryption using TweetNaCl's authenticated encryption (secretbox).
 */

import nacl from 'tweetnacl';
import { compressMessage, decompressMessage } from './compression.js';

const naclInstance = nacl;

/**
 * Converts a UTF-8 string to a Uint8Array
 */
export function utf8ToUint8Array(str) {
    return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a base64 string
 */
export function uint8ArrayToBase64(bytes) {
    return Buffer.from(bytes).toString('base64');
}

/**
 * Converts a base64 string to a Uint8Array
 */
export function base64ToUint8Array(b64) {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Derives a 32-byte encryption key from a recipient identifier.
 * Uses SHA-512 hash of the identifier, truncated to 32 bytes.
 * 
 * @param {string} id - The recipient identifier (wallet public key)
 * @returns {Uint8Array} - 32-byte encryption key
 */
export function deriveKeyFromIdentifier(id) {
    if (!id || typeof id !== 'string') {
        throw new Error('Recipient identifier must be a non-empty string');
    }
    const hash = naclInstance.hash(utf8ToUint8Array(id));
    return hash.slice(0, 32);
}

/**
 * Decrypts a message from on-chain storage.
 * Decrypts first, then decompresses to get the original plaintext.
 * 
 * @param {Uint8Array} encryptedData - Encrypted message data
 * @param {Uint8Array|Array<number>} nonce - Nonce used for encryption (24 bytes)
 * @param {string} recipientId - The recipient's wallet public key
 * @returns {string} - Decrypted plaintext message or error message
 */
export function decryptMessageFromChain(encryptedData, nonce, recipientId) {
    if (!encryptedData || !(encryptedData instanceof Uint8Array)) {
        return "[Decryption failed: Invalid encrypted data format]";
    }
    if (!nonce || (nonce.length !== 24 && !Array.isArray(nonce))) {
        return "[Decryption failed: Invalid nonce format]";
    }
    if (!recipientId || typeof recipientId !== 'string') {
        return "[Decryption failed: Invalid recipient ID]";
    }

    try {
        const nonceBytes = Array.isArray(nonce) ? new Uint8Array(nonce) : nonce;

        if (nonceBytes.length !== naclInstance.secretbox.nonceLength) {
            return "[Decryption failed: Invalid nonce length]";
        }

        const key = deriveKeyFromIdentifier(recipientId);
        const opened = naclInstance.secretbox.open(encryptedData, nonceBytes, key);

        if (!opened) {
            return "[Decryption failed: Authentication failed]";
        }

        const plaintext = decompressMessage(opened);

        return plaintext;
    } catch (error) {
        return `[Decryption failed: ${error.message}]`;
    }
}
