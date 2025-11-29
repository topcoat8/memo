import nacl from 'tweetnacl';
import {
    deriveKeyPairFromSignature,
    encryptMessageAsymmetric,
    decryptMessageAsymmetric,
    utf8ToUint8Array
} from './src/shared/utils/encryption.js';

// Mock compression to avoid dependency issues in standalone script if pako isn't set up for node
// We'll just mock it for this test if needed, but let's try to use the real one first.
// If this fails due to imports, we might need to adjust.
// Actually, let's just test the core logic.

console.log("Starting Encryption Verification...");

try {
    // 1. Simulate a signature (32 bytes)
    const mockSignature = new Uint8Array(64); // Signatures are usually 64 bytes
    for (let i = 0; i < 64; i++) mockSignature[i] = i;

    console.log("1. Deriving keys from signature...");
    const keyPair = deriveKeyPairFromSignature(mockSignature);

    if (!keyPair.publicKey || !keyPair.secretKey) {
        throw new Error("Failed to derive keypair");
    }
    console.log("   Keypair derived successfully.");

    // 2. Simulate another user
    const mockSignature2 = new Uint8Array(64);
    for (let i = 0; i < 64; i++) mockSignature2[i] = i + 1;
    const keyPair2 = deriveKeyPairFromSignature(mockSignature2);

    // 3. Encrypt message from User 1 to User 2
    const message = "Hello, Cyberpunk World!";
    console.log(`2. Encrypting message: "${message}"`);

    const { encryptedData, nonce } = encryptMessageAsymmetric(
        message,
        keyPair2.publicKey, // Recipient Public
        keyPair.secretKey   // Sender Secret
    );

    console.log("   Encryption successful. Encrypted bytes:", encryptedData.length);

    // 4. Decrypt message as User 2
    console.log("3. Decrypting message...");
    const decrypted = decryptMessageAsymmetric(
        encryptedData,
        nonce,
        keyPair.publicKey, // Sender Public
        keyPair2.secretKey // Recipient Secret
    );

    console.log(`   Decrypted message: "${decrypted}"`);

    if (decrypted === message) {
        console.log("SUCCESS: Message matches original!");
    } else {
        console.error("FAILURE: Decrypted message does not match.");
    }

} catch (err) {
    console.error("Verification Failed:", err);
}
