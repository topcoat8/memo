
import { Connection } from '@solana/web3.js';
import { getAllLinks, getChatMembers, getUserWallets } from './src/storage.js';
import { fetchCommunityRules } from './src/solana.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL);

async function main() {
    console.log("🔍 Fetching community stats...");

    const links = await getAllLinks();
    const chatIds = Object.keys(links);

    if (chatIds.length === 0) {
        console.log("❌ No linked communities found.");
        process.exit(0);
    }

    console.log(`Found ${chatIds.length} linked communities.\n`);

    const stats = [];

    for (const chatId of chatIds) {
        const address = links[chatId];
        process.stdout.write(`Processing Chat ID ${chatId} (${address})... `);

        try {
            // 1. Fetch On-Chain Rules (and Creator)
            const rules = await fetchCommunityRules(connection, address);

            // 2. Fetch Local Member Stats
            const memberIds = await getChatMembers(chatId);
            let verifiedCount = 0;

            for (const uid of memberIds) {
                const wallets = await getUserWallets(uid.toString());
                if (wallets && wallets.length > 0) {
                    verifiedCount++;
                }
            }

            stats.push({
                name: rules ? (rules.name || 'Unknown') : '⚠️ Locked/Rules Not Found',
                creator: rules ? (rules.creator || 'Unknown') : 'Unknown',
                members: memberIds.length,
                verified: verifiedCount,
                address: address,
                chatId: chatId
            });

            console.log("✅");
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }

    console.log("\n--- COMMUNITY STATS REPORT ---\n");
    console.table(stats);

    // Optional: CSV Output
    console.log("\nCSV Format:");
    console.log("Name,Creator,Members,Verified,Address,ChatID");
    stats.forEach(s => {
        console.log(`"${s.name}","${s.creator}",${s.members},${s.verified},"${s.address}","${s.chatId}"`);
    });

    process.exit(0);
}

main().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
