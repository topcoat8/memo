/**
 * Memo Protocol - Compression Utilities
 * 
 * Message compression using pako (gzip) to reduce on-chain storage costs.
 */

import pako from 'pako';

/**
 * Compresses a plaintext message using gzip compression
 * 
 * @param {string} text - Plaintext message to compress
 * @returns {Uint8Array} - Compressed message bytes
 */
export function compressMessage(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Message must be a non-empty string');
    }

    try {
        // Convert string to UTF-8 bytes
        const textBytes = new TextEncoder().encode(text);

        // Compress using gzip
        const compressed = pako.gzip(textBytes, { level: 9 }); // Maximum compression

        return compressed;
    } catch (error) {
        throw new Error(`Compression failed: ${error.message}`);
    }
}

/**
 * Decompresses a compressed message back to plaintext
 * 
 * @param {Uint8Array} compressedData - Compressed message bytes
 * @returns {string} - Decompressed plaintext message
 */
export function decompressMessage(compressedData) {
    if (!compressedData || !(compressedData instanceof Uint8Array)) {
        throw new Error('Compressed data must be a Uint8Array');
    }

    try {
        // Decompress using gzip
        const decompressed = pako.ungzip(compressedData);

        // Convert bytes back to UTF-8 string
        const text = new TextDecoder().decode(decompressed);

        return text;
    } catch (error) {
        throw new Error(`Decompression failed: ${error.message}`);
    }
}

/**
 * Gets the compressed size of a message
 * Useful for validation before sending
 * 
 * @param {string} text - Plaintext message
 * @returns {number} - Compressed size in bytes
 */
export function getCompressedSize(text) {
    const compressed = compressMessage(text);
    return compressed.length;
}
