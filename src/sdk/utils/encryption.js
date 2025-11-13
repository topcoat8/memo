/**
 * Memo Protocol - Encryption Utilities
 * 
 * Client-side encryption using TweetNaCl's authenticated encryption (secretbox).
 * All encryption/decryption happens in the browser - we never see private keys or message content.
 */

import nacl from 'tweetnacl';

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
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
 * Encrypts a plaintext message for a specific recipient.
 * Uses TweetNaCl secretbox with a random nonce.
 * Returns base64-encoded ciphertext (nonce + encrypted data).
 * 
 * @param {string} plaintext - The message to encrypt
 * @param {string} recipientId - The recipient's wallet public key
 * @returns {string} - Base64-encoded encrypted message
 */
export function encryptMessage(plaintext, recipientId) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Message must be a non-empty string');
  }
  if (!recipientId || typeof recipientId !== 'string') {
    throw new Error('Recipient ID must be a non-empty string');
  }

  const key = deriveKeyFromIdentifier(recipientId);
  const nonce = naclInstance.randomBytes(naclInstance.secretbox.nonceLength);
  const boxed = naclInstance.secretbox(utf8ToUint8Array(plaintext), nonce, key);
  
  if (!boxed) {
    throw new Error('Encryption failed');
  }

  const combined = new Uint8Array(nonce.length + boxed.length);
  combined.set(nonce, 0);
  combined.set(boxed, nonce.length);
  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts a message encrypted for a specific recipient.
 * Returns the plaintext if decryption succeeds, or an error message if it fails.
 * 
 * @param {string} encryptedBase64 - Base64-encoded encrypted message
 * @param {string} recipientId - The recipient's wallet public key
 * @returns {string} - Decrypted plaintext message or error message
 */
export function decryptMessage(encryptedBase64, recipientId) {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    return "[Decryption failed: Invalid ciphertext format]";
  }
  if (!recipientId || typeof recipientId !== 'string') {
    return "[Decryption failed: Invalid recipient ID]";
  }

  try {
    const combined = base64ToUint8Array(encryptedBase64);
    const nonceLen = naclInstance.secretbox.nonceLength;
    
    if (combined.length < nonceLen) {
      return "[Decryption failed: Invalid ciphertext length]";
    }
    
    const nonce = combined.slice(0, nonceLen);
    const boxed = combined.slice(nonceLen);
    const key = deriveKeyFromIdentifier(recipientId);
    const opened = naclInstance.secretbox.open(boxed, nonce, key);
    
    if (!opened) {
      return "[Decryption failed: Authentication failed]";
    }
    
    return new TextDecoder().decode(opened);
  } catch (error) {
    return `[Decryption failed: ${error.message}]`;
  }
}

/**
 * Validates a Solana wallet address format
 * Basic validation - checks length and base58 character set
 * 
 * @param {string} address - Wallet address to validate
 * @returns {boolean} - True if address appears valid
 */
export function isValidWalletAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  // Solana addresses are base58 encoded and typically 32-44 characters
  // This is a basic check - full validation would require base58 decoding
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

