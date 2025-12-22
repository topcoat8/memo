
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
    REDIS_URL: process.env.REDIS_URL, // Optional, defaults to local file if missing (handled in storage.js)
    PUBLIC_URL: process.env.PUBLIC_URL || 'http://localhost:3000',
    MEMO_MINT: '8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump',
    CREATOR_MIN_BALANCE: 50000,
    CACHE_TTL: 60 * 1000, // 1 minute
    EXEMPT_USER_ID: '7846315260'
};

if (!config.BOT_TOKEN) {
    console.error("Error: BOT_TOKEN is missing in .env");
}
