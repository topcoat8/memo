
import {
    Connection,
    Keypair,
    PublicKey,
    VersionedTransaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import * as bs58 from "bs58";
import fetch from "node-fetch";

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// --- Configuration ---
const RPC_URL = process.env.VITE_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const PRIVATE_KEY_STRING = process.env.PRIVATE_KEY;
const MINT_ADDRESS = process.env.VITE_TOKEN_MINT;
const JUP_KEY = process.env.JUP_KEY; // Optional Jupiter API Key
const BUY_AMOUNT_SOL = 0.0001; // Increased to ~0.10 USD to show on DexScreener
const TOTAL_TXS = 1000;
const CONCURRENCY = 2; // Reduced concurrency to avoid rate limits and look more organic
const SLIPPAGE_BPS = 500; // 5% slippage to ensure execution
const WSOL = "So11111111111111111111111111111111111111112";

// Jupiter API
const JUPITER_QUOTE_API = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_API = "https://api.jup.ag/swap/v1/swap";

// --- Setup ---
if (!PRIVATE_KEY_STRING || !MINT_ADDRESS) {
    console.error("Error: PRIVATE_KEY or VITE_TOKEN_MINT not found in .env");
    process.exit(1);
}

const connection = new Connection(RPC_URL, "confirmed");

let wallet: Keypair;
try {
    if (PRIVATE_KEY_STRING.includes("[")) {
        wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(PRIVATE_KEY_STRING)));
    } else {
        wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY_STRING));
    }
} catch (e) {
    console.error("Failed to parse PRIVATE_KEY");
    process.exit(1);
}

console.log(`Bot Wallet: ${wallet.publicKey.toBase58()}`);
console.log(`Target Token: ${MINT_ADDRESS}`);
console.log(`Goal: ${TOTAL_TXS} Transactions`);

// --- Helpers ---

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJupiterQuote(amountLamports: number) {
    try {
        const url = `${JUPITER_QUOTE_API}?inputMint=${WSOL}&outputMint=${MINT_ADDRESS}&amount=${amountLamports}&slippageBps=${SLIPPAGE_BPS}`;
        const response = await fetch(url, {
            headers: JUP_KEY ? { "x-api-key": JUP_KEY } : {},
        });
        const data = await response.json();
        return data;
    } catch (e: any) {
        console.error("Jupiter Quote Error:", e.message);
        return null;
    }
}

async function getJupiterSwapTx(quoteResponse: any) {
    try {
        const response = await fetch(JUPITER_SWAP_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(JUP_KEY ? { "x-api-key": JUP_KEY } : {}),
            },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey: wallet.publicKey.toBase58(),
                wrapAndUnwrapSol: true,
            }),
        });
        const data = await response.json();
        return data.swapTransaction;
    } catch (e: any) {
        console.error("Jupiter Swap Error:", e.message);
        return null;
    }
}

// --- Main Execution ---

let successCount = 0;
let attemptCount = 0;

async function performBuy(index: number) {
    // Randomize amount: Base + 0-20% random
    const randomFactor = 1 + (Math.random() * 0.2);
    const amountLamports = Math.floor((BUY_AMOUNT_SOL * LAMPORTS_PER_SOL) * randomFactor);

    const quote = await getJupiterQuote(amountLamports);
    if (!quote || quote.error) {
        // console.error(`[${index}] Quote failed.`);
        return;
    }

    const txBase64 = await getJupiterSwapTx(quote);
    if (!txBase64) {
        // console.error(`[${index}] Swap gen failed.`);
        return;
    }

    try {
        const tx = VersionedTransaction.deserialize(Buffer.from(txBase64, "base64"));
        tx.sign([wallet]);

        const sig = await connection.sendTransaction(tx, {
            skipPreflight: true,
            maxRetries: 0,
        });

        console.log(`[${++successCount}/${TOTAL_TXS}] Sent: https://solscan.io/tx/${sig} (Amt: ${amountLamports})`);
    } catch (e: any) {
        console.error(`[${index}] Send failed: ${e.message}`);
    }
}

async function run() {
    console.log("Starting spam (Adjusted for visibility)...");

    // Process in batches/concurrency
    while (successCount < TOTAL_TXS) {
        const promises = [];
        for (let i = 0; i < CONCURRENCY; i++) {
            attemptCount++;
            promises.push(performBuy(attemptCount));
            // Random delay between launches
            await wait(Math.random() * 500);
        }
        await Promise.all(promises);

        // Random larger delay between batches
        await wait(500 + Math.random() * 1000);
    }

    console.log("Done!");
}

run();
