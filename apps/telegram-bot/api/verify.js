import { verifySignature } from '../src/verifier.js';
import { saveUserWallet } from '../src/storage.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, publicKey, signature, timestamp } = req.body;

    if (!userId || !publicKey || !signature || !timestamp) {
        return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const isValid = verifySignature(userId, publicKey, signature, timestamp);

    if (isValid) {
        try {
            await saveUserWallet(userId, publicKey);
            console.log(`✅ Verified user ${userId} with wallet ${publicKey}`);
            return res.json({ success: true });
        } catch (error) {
            console.error('Storage error:', error);
            return res.status(500).json({ success: false, error: "Storage error. Bot may not see verification." });
        }
    } else {
        return res.status(401).json({ success: false, error: "Invalid signature" });
    }
}
