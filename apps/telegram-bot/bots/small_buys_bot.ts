import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    VersionedTransaction,
    TransactionMessage,
    SystemProgram,
    LAMPORTS_PER_SOL,
    TransactionInstruction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import fetch from "node-fetch";

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// --- Configuration ---
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const PRIVATE_KEY_STRING = process.env.PRIVATE_KEY;
const MINT_ADDRESS = process.env.TOKEN_MINT; // Target Token
const JUP_KEY = process.env.JUP_KEY; // Optional Jupiter API Key
const BUY_AMOUNT_SOL = 0.0001; // SOL to buy with (Buy Bot Mode - "smallest amount")
const JITO_TIP_AMOUNT = 10_000; // Lamports (0.00001 SOL)
const MIN_BALANCE_SOL = 0.01;
const LOOP_DELAY_MS = 10_000;
const SLIPPAGE_BPS = 100; // 1%
const WSOL = "So11111111111111111111111111111111111111112";

// Jupiter API
const JUPITER_QUOTE_API = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_API = "https://api.jup.ag/swap/v1/swap";

// Jito Block Engine
const JITO_BLOCK_ENGINES = [
    "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

// Jito Tip Accounts
const JITO_TIP_ACCOUNTS = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
];

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

console.log(`Buy Bot Wallet: ${wallet.publicKey.toBase58()}`);
console.log(`Target Token: ${MINT_ADDRESS}`);

// --- Helpers ---

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getRandomTipAccount(): PublicKey {
    const acc = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
    return new PublicKey(acc);
}

function getRandomBlockEngine(): string {
    return JITO_BLOCK_ENGINES[Math.floor(Math.random() * JITO_BLOCK_ENGINES.length)];
}

let currentBlockEngine = getRandomBlockEngine();

// --- Jupiter API ---

async function getJupiterQuote(inputMint: string, outputMint: string, amount: number) {
    try {
        const url = `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${SLIPPAGE_BPS}`;
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

async function getJupiterSwapTx(quoteResponse: any, userPublicKey: string) {
    try {
        const response = await fetch(JUPITER_SWAP_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(JUP_KEY ? { "x-api-key": JUP_KEY } : {}),
            },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey,
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

// --- Jito Bundle ---

async function sendBundle(transactions: string[]) {
    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [transactions],
    };

    const engineUrl = currentBlockEngine;

    try {
        console.log(`Sending bundle to Jito (${engineUrl})...`);
        const response = await fetch(engineUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.error) {
            if (data.error.code === -32097) {
                console.warn(`⚠️ Jito Rate Limit on ${engineUrl}. Switching endpoints...`);
                currentBlockEngine = getRandomBlockEngine();
            } else {
                console.error("Jito Error:", data.error);
            }
            return null;
        }
        return data.result;
    } catch (e: any) {
        console.error("Jito Network Error:", e.message);
        return null;
    }
}

async function createTipTx() {
    const { blockhash } = await connection.getLatestBlockhash();
    const tipInstruction = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: getRandomTipAccount(),
        lamports: JITO_TIP_AMOUNT,
    });
    const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: [tipInstruction],
    }).compileToV0Message();
    const tipTx = new VersionedTransaction(messageV0);
    tipTx.sign([wallet]);
    return bs58.encode(tipTx.serialize());
}

// --- Mode: Only Buy ---

async function executeBuyCycle() {
    console.log(`\n--- [Mode: Buy Bot (Only Buy)] ---`);
    const NUM_BUYS = 4; // Max 5 tx per bundle, so 4 buys + 1 tip
    const transactions: string[] = [];
    const signatures: string[] = [];

    console.log(`Attempting to bundle ${NUM_BUYS} small buys...`);

    for (let i = 0; i < NUM_BUYS; i++) {
        // Add a tiny amount to ensure unique transaction (prevent duplicate signature)
        // e.g., base + 0, base + 1, base + 2 lamports
        const amountLamports = Math.floor(BUY_AMOUNT_SOL * LAMPORTS_PER_SOL) + i;

        const quote = await getJupiterQuote(WSOL, MINT_ADDRESS!, amountLamports);
        if (!quote || quote.error) {
            console.error(`Buy Quote ${i + 1} Failed`);
            continue;
        }

        const txBase64 = await getJupiterSwapTx(quote, wallet.publicKey.toBase58());
        if (!txBase64) {
            console.error(`Buy Tx ${i + 1} Failed to generate`);
            continue;
        }

        const tx = VersionedTransaction.deserialize(Buffer.from(txBase64, "base64"));
        tx.sign([wallet]);

        transactions.push(bs58.encode(tx.serialize()));
        signatures.push(bs58.encode(tx.signatures[0]));

        console.log(`Prepared Buy #${i + 1}: ${amountLamports / LAMPORTS_PER_SOL} SOL`);

        // Small delay to be nice to API
        await wait(200);
    }

    if (transactions.length === 0) {
        console.log("No buy transactions prepared. Skipping bundle.");
        return;
    }

    // Add Tip
    const tipTxBase64 = await createTipTx();
    transactions.push(tipTxBase64);

    // Send Bundle
    const bundleId = await sendBundle(transactions);

    if (bundleId) {
        console.log(`Buy Bundle Sent! ID: ${bundleId}`);
        console.log(`Tx 1: https://solscan.io/tx/${signatures[0]}`);
    }
}

// --- Main Loop ---

async function run() {
    console.log("\n=== Jito Buy Bot (Small Buys) ===");

    while (true) {
        try {
            // Check Balance
            const balance = await connection.getBalance(wallet.publicKey);
            if (balance < MIN_BALANCE_SOL * LAMPORTS_PER_SOL) {
                console.error(`Low Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL. Exiting.`);
                break;
            }

            await executeBuyCycle();
            console.log(`Waiting ${LOOP_DELAY_MS / 1000}s...`);
            await wait(LOOP_DELAY_MS);

        } catch (e: any) {
            console.error("Loop Error:", e.message);
            await wait(LOOP_DELAY_MS);
        }
    }
}

run();
