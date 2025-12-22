/**
 * Memo Protocol - Encryption Utilities
 * 
 * Client-side encryption using TweetNaCl's authenticated encryption (secretbox).
 * All encryption/decryption happens in the browser - we never see private keys or message content.
 * 
 * For on-chain storage: Messages are compressed before encryption, and nonce is stored separately.
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
 * Encrypts a plaintext message for a specific recipient (on-chain version).
 * Compresses the message first, then encrypts with TweetNaCl secretbox.
 * Returns encrypted data and nonce separately for on-chain storage.
 * 
 * @param {string} plaintext - The message to encrypt
 * @param {string} recipientId - The recipient's wallet public key
 * @returns {Object} - { encryptedData: Uint8Array, nonce: Uint8Array }
 */
export function encryptMessageForChain(plaintext, recipientId) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Message must be a non-empty string');
  }
  if (!recipientId || typeof recipientId !== 'string') {
    throw new Error('Recipient ID must be a non-empty string');
  }

  const compressed = compressMessage(plaintext);

  const key = deriveKeyFromIdentifier(recipientId);
  const nonce = naclInstance.randomBytes(naclInstance.secretbox.nonceLength);
  const boxed = naclInstance.secretbox(compressed, nonce, key);

  if (!boxed) {
    throw new Error('Encryption failed');
  }

  return {
    encryptedData: boxed,
    nonce: nonce,
  };
}

/**
 * Encrypts a plaintext message for a specific recipient (legacy version).
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

/**
 * Decrypts a message encrypted for a specific recipient (legacy version).
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
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// --- Asymmetric Encryption (Curve25519) ---

/**
 * Derives a Curve25519 keypair from a signature (or any high-entropy 32+ byte source).
 * This allows users to deterministically regenerate their encryption keys from a wallet signature.
 * 
 * @param {Uint8Array} signature - The signature to use as a seed
 * @returns {nacl.BoxKeyPair} - The generated keypair
 */
export function deriveKeyPairFromSignature(signature) {
  if (!signature || signature.length < 32) {
    throw new Error('Signature must be at least 32 bytes');
  }
  const seed = signature.slice(0, 32);
  return naclInstance.box.keyPair.fromSecretKey(seed);
}

/**
 * Encrypts a message using asymmetric encryption (Sender Priv + Recipient Pub).
 * 
 * @param {string} plaintext - Message to encrypt
 * @param {Uint8Array} recipientPublicKey - Recipient's Curve25519 public key
 * @param {Uint8Array} senderSecretKey - Sender's Curve25519 private key
 * @returns {Object} - { encryptedData: Uint8Array, nonce: Uint8Array }
 */
export function encryptMessageAsymmetric(plaintext, recipientPublicKey, senderSecretKey) {
  if (!plaintext) throw new Error("Missing plaintext");
  if (!recipientPublicKey) throw new Error("Missing recipient public key");
  if (!senderSecretKey) throw new Error("Missing sender secret key");

  const compressed = compressMessage(plaintext);
  const nonce = naclInstance.randomBytes(naclInstance.box.nonceLength);

  const boxed = naclInstance.box(
    compressed,
    nonce,
    recipientPublicKey,
    senderSecretKey
  );

  return {
    encryptedData: boxed,
    nonce: nonce
  };
}

/**
 * Decrypts a message using asymmetric encryption.
 * 
 * @param {Uint8Array} encryptedData - The encrypted bytes
 * @param {Uint8Array} nonce - The nonce used
 * @param {Uint8Array} senderPublicKey - The sender's Curve25519 public key
 * @param {Uint8Array} recipientSecretKey - The recipient's Curve25519 private key
 * @returns {string} - Decrypted plaintext
 */
export function decryptMessageAsymmetric(encryptedData, nonce, senderPublicKey, recipientSecretKey) {
  if (!encryptedData || !nonce || !senderPublicKey || !recipientSecretKey) {
    throw new Error("Missing decryption parameters");
  }

  const nonceBytes = Array.isArray(nonce) ? new Uint8Array(nonce) : nonce;

  const opened = naclInstance.box.open(
    encryptedData,
    nonceBytes,
    senderPublicKey,
    recipientSecretKey
  );

  if (!opened) {
    throw new Error("Decryption failed (Asymmetric)");
  }

  return decompressMessage(opened);
}

