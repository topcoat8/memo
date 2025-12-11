import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifySignature } from './verifier.js';
import { saveUserWallet } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve the verification page
app.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API to handle verification
app.post('/api/verify', (req, res) => {
    const { userId, publicKey, signature, timestamp } = req.body;

    if (!userId || !publicKey || !signature || !timestamp) {
        return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const isValid = verifySignature(userId, publicKey, signature, timestamp);

    if (isValid) {
        saveUserWallet(userId, publicKey);
        console.log(`✅ Verified user ${userId} with wallet ${publicKey}`);
        return res.json({ success: true });
    } else {
        return res.status(401).json({ success: false, error: "Invalid signature" });
    }
});

export function startServer() {
    app.listen(PORT, () => {
        console.log(`🌐 Verification server running on port ${PORT}`);
    });
}
