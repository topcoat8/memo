import { describe, it, expect } from 'vitest';
import {
    encryptMessage,
    decryptMessage,
    deriveKeyFromIdentifier,
    utf8ToUint8Array,
    uint8ArrayToBase64
} from './encryption';

describe('Encryption Utilities', () => {
    it('should encrypt and decrypt a message correctly', () => {
        const message = "Hello, World!";
        const recipientId = "Hj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9K"; // Mock base58 address

        const encrypted = encryptMessage(message, recipientId);
        expect(encrypted).toBeDefined();
        expect(typeof encrypted).toBe('string');
        expect(encrypted).not.toBe(message);

        const decrypted = decryptMessage(encrypted, recipientId);
        expect(decrypted).toBe(message);
    });

    it('should fail to decrypt with wrong recipient ID', () => {
        const message = "Secret Message";
        const recipientId = "Hj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9K";
        const wrongId = "Aj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9Kj6ibS9K";

        const encrypted = encryptMessage(message, recipientId);
        const decrypted = decryptMessage(encrypted, wrongId);

        expect(decrypted).toContain('Decryption failed');
    });

    it('should derive consistent keys from identifier', () => {
        const id = "test-id";
        const key1 = deriveKeyFromIdentifier(id);
        const key2 = deriveKeyFromIdentifier(id);

        expect(key1).toEqual(key2);
    });

    it('should convert utf8 to base64 and back', () => {
        const str = "Test String";
        const bytes = utf8ToUint8Array(str);
        const b64 = uint8ArrayToBase64(bytes);

        expect(b64).toBe(btoa(str));
    });
});
