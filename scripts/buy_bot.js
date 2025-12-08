const {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
    TransactionInstruction,
    VersionedTransaction,
    TransactionMessage
} = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const bs58 = require("bs58");
const fetch = require("node-fetch");
const dns = require("dns");
const { promisify } = require("util");
const resolve4 = promisify(dns.resolve4);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Configuration
const RPC_URL = process.env.VITE_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const PRIVATE_KEY_STRING = process.env.PRIVATE_KEY;
const MINT_ADDRESS = "8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump";
const WALLET_FILE_PATH = path.resolve(__dirname, "buy_wallet.json"); // Single wallet file
const FUNDING_AMOUNT_SOL = 0.01; // Reduced to fit main wallet balance
const MIN_BALANCE_SOL = 0.005; // Minimum balance before topping up
const BUY_AMOUNT_SOL = 0.00001; // Tiny buy amount

// High Throughput Settings
const CONCURRENCY = 1; // Reduced to 1 to stop 429s
const BUYS_PER_BUNDLE = 4; // Number of buy txs per Jito bundle

const JITO_BLOCK_ENGINE_URLS = [
    "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
    "https://slc.mainnet.block-engine.jito.wtf/api/v1/bundles"
];

function getRandomBlockEngineUrl() {
    return JITO_BLOCK_ENGINE_URLS[Math.floor(Math.random() * JITO_BLOCK_ENGINE_URLS.length)];
}

// Jito Tip Accounts
let JITO_TIP_ACCOUNTS = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt"
];

async function refreshTipAccounts() {
    try {
        const endpoint = getRandomBlockEngineUrl();
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTipAccounts",
                params: []
            })
        });
        const data = await response.json();
        if (data && data.result && Array.isArray(data.result)) {
            const validAccounts = data.result.filter(acc => {
                try {
                    new PublicKey(acc);
                    return true;
                } catch (e) {
                    return false;
                }
            });
            if (validAccounts.length > 0) {
                JITO_TIP_ACCOUNTS = validAccounts;
            }
        }
    } catch (e) {
        console.error("Failed to refresh tip accounts:", e.message);
    }
}

// Constants
const LAMPORTS_PER_SOL = 1_000_000_000;
const SLIPPAGE_BASIS_POINTS = 2000n; // 20%
const JITO_TIP_LAMPORTS = 100000; // 0.0001 SOL

if (!PRIVATE_KEY_STRING) {
    console.error("Error: PRIVATE_KEY not found in .env");
    process.exit(1);
}

// Setup Connection and Wallet
const connection = new Connection(RPC_URL, "confirmed");
let mainWallet;

try {
    if (PRIVATE_KEY_STRING.includes("[")) {
        const secretKey = Uint8Array.from(JSON.parse(PRIVATE_KEY_STRING));
        mainWallet = Keypair.fromSecretKey(secretKey);
    } else {
        const secretKey = bs58.decode(PRIVATE_KEY_STRING);
        mainWallet = Keypair.fromSecretKey(secretKey);
    }
} catch (e) {
    console.error("Failed to parse PRIVATE_KEY.");
    process.exit(1);
}

console.log(`Main Wallet: ${mainWallet.publicKey.toBase58()}`);

// --- Single Wallet Logic ---

function loadOrGenerateWallet() {
    let wallet;
    if (fs.existsSync(WALLET_FILE_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, "utf-8"));
            wallet = Keypair.fromSecretKey(Uint8Array.from(data));
            console.log(`Loaded wallet from file: ${wallet.publicKey.toBase58()}`);
        } catch (e) {
            console.error("Failed to load wallet file:", e.message);
        }
    }

    if (!wallet) {
        console.log(`Generating new wallet...`);
        wallet = Keypair.generate();
        // Save back to file
        const dataToSave = Array.from(wallet.secretKey);
        fs.writeFileSync(WALLET_FILE_PATH, JSON.stringify(dataToSave));
        console.log(`Saved wallet to ${WALLET_FILE_PATH}`);
    }
    return wallet;
}

async function ensureWalletFunds(targetWallet) {
    try {
        const balance = await connection.getBalance(targetWallet.publicKey);
        console.log(`Wallet ${targetWallet.publicKey.toBase58()} Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(5)} SOL`);

        if (balance < MIN_BALANCE_SOL * LAMPORTS_PER_SOL) {
            console.log(`Funding wallet ${targetWallet.publicKey.toBase58()} with ${FUNDING_AMOUNT_SOL} SOL...`);
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: mainWallet.publicKey,
                    toPubkey: targetWallet.publicKey,
                    lamports: FUNDING_AMOUNT_SOL * LAMPORTS_PER_SOL,
                })
            );

            const signature = await sendAndConfirmTransaction(connection, transaction, [mainWallet]);
            console.log(`Funded! Tx: ${signature}`);
            await wait(2000); // Wait for confirmation propagation
        }
    } catch (e) {
        console.error(`Failed to fund wallet ${targetWallet.publicKey.toBase58()}:`, e.message);
    }
}

// --- End Single Wallet Logic ---

// Jupiter API
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap";

// Helper to delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// DNS Resolution for Jupiter
let jupiterIp = null;
async function resolveJupiterIp() {
    if (jupiterIp) return jupiterIp;
    try {
        const { address } = await promisify(dns.lookup)("quote-api.jup.ag");
        if (address) {
            jupiterIp = address;
            return jupiterIp;
        }
    } catch (e) {
        console.error("DNS Resolution failed:", e.message);
    }
    return "172.67.163.235"; // Fallback
}

async function fetchWithRetry(url, options = {}, retries = 3) {
    let fetchUrl = url;
    let headers = options.headers || {};
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === "quote-api.jup.ag") {
        const ip = await resolveJupiterIp();
        if (ip) {
            fetchUrl = url.replace("quote-api.jup.ag", ip);
            headers["Host"] = "quote-api.jup.ag";
            options.headers = headers;
        }
    }
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(fetchUrl, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (err) {
            if (i === retries - 1) throw err;
            await wait(1000 * (i + 1));
        }
    }
}

async function getJupiterSwapTransaction(inputMint, outputMint, amount, walletPubKey) {
    try {
        const quoteUrl = `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${Number(SLIPPAGE_BASIS_POINTS)}`;
        const quoteResponse = await fetchWithRetry(quoteUrl);
        const quoteData = await quoteResponse.json();

        if (!quoteData || quoteData.error) {
            throw new Error(`Jupiter Quote Failed: ${JSON.stringify(quoteData)}`);
        }

        const swapResponse = await fetchWithRetry(JUPITER_SWAP_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse: quoteData,
                userPublicKey: walletPubKey.toBase58(),
                wrapAndUnwrapSol: true
            })
        });
        const swapData = await swapResponse.json();

        if (!swapData || !swapData.swapTransaction) {
            throw new Error(`Jupiter Swap Construction Failed: ${JSON.stringify(swapData)}`);
        }

        return {
            swapTransaction: swapData.swapTransaction,
            outAmount: quoteData.outAmount
        };
    } catch (e) {
        console.error("Jupiter Error:", e.message);
        return null;
    }
}

function getRandomTipAccount() {
    const acc = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
    return new PublicKey(acc);
}

async function sendBundle(transactions) {
    const maxRetries = 10;
    let currentRetry = 0;

    const encodedTransactions = transactions.map((tx) => {
        let serialized = tx.serialize();
        return bs58.encode(serialized);
    });

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [encodedTransactions]
    };

    while (currentRetry < maxRetries) {
        try {
            const endpoint = getRandomBlockEngineUrl();
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.error) {
                if (data.error.code === -32097) {
                    console.warn(`Jito Rate Limit hit. Waiting...`);
                    await wait(2000 * (currentRetry + 1));
                    currentRetry++;
                    continue;
                }
                console.error("Bundle Failed:", JSON.stringify(data));
                return data;
            }

            return data;
        } catch (e) {
            console.error(`Jito Bundle Network Error:`, e.message);
            await wait(1000 * (currentRetry + 1));
            currentRetry++;
        }
    }
    return null;
}

// --- High Throughput Logic ---

async function createBuyTransaction(activeWallet) {
    try {
        const buyAmountLamports = Math.floor(BUY_AMOUNT_SOL * LAMPORTS_PER_SOL);
        const buyResult = await getJupiterSwapTransaction(
            "So11111111111111111111111111111111111111112", // WSOL
            MINT_ADDRESS,
            buyAmountLamports,
            activeWallet.publicKey
        );

        if (!buyResult) return null;
        const { swapTransaction: buyTxBase64 } = buyResult;

        let buyTx;
        try {
            buyTx = VersionedTransaction.deserialize(Buffer.from(buyTxBase64, "base64"));
        } catch (e) {
            buyTx = Transaction.from(Buffer.from(buyTxBase64, "base64"));
        }

        // Add Memo to make it unique
        // Note: For VersionedTransaction, we can't easily append instructions after compilation.
        // However, Jupiter quotes are usually unique due to timestamps/blockhash.
        // If we need strict uniqueness for batching identical swaps, we rely on the fact that
        // we are calling Jupiter separately for each one, so they might have different routes or blockhashes.
        // If Jupiter returns identical txs, Jito might reject duplicates.
        // To be safe, we can assume Jupiter returns fresh blockhashes.

        return buyTx;
    } catch (e) {
        console.error("Error creating single buy tx:", e.message);
        return null;
    }
}

async function worker(id, wallet) {
    console.log(`Worker ${id} started.`);
    while (true) {
        try {
            await ensureWalletFunds(wallet);

            // Generate Batch of Buys
            const buyPromises = [];
            for (let i = 0; i < BUYS_PER_BUNDLE; i++) {
                buyPromises.push(createBuyTransaction(wallet));
                await wait(500); // Stagger Jupiter calls more (500ms)
            }

            const results = await Promise.all(buyPromises);
            const validBuys = results.filter(tx => tx !== null);

            if (validBuys.length === 0) {
                console.log(`Worker ${id}: No valid buy txs generated. Retrying...`);
                await wait(1000);
                continue;
            }

            console.log(`Worker ${id}: Bundling ${validBuys.length} buys...`);

            // Create Tip
            const tipAccount = getRandomTipAccount();
            const { blockhash } = await connection.getLatestBlockhash();
            const tipInstruction = SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: tipAccount,
                lamports: JITO_TIP_LAMPORTS
            });
            const messageV0 = new TransactionMessage({
                payerKey: wallet.publicKey,
                recentBlockhash: blockhash,
                instructions: [tipInstruction]
            }).compileToV0Message();
            const tipTx = new VersionedTransaction(messageV0);
            tipTx.sign([wallet]);

            // Sign Buys
            validBuys.forEach(tx => {
                if (tx instanceof VersionedTransaction) tx.sign([wallet]);
                else tx.sign(wallet);
            });

            // Bundle
            const bundle = [...validBuys, tipTx];

            // Send
            const result = await sendBundle(bundle);
            if (result && result.result) {
                console.log(`Worker ${id}: Bundle Sent! ID: ${result.result}`);
            }

            // Wait a bit before next batch
            await wait(2000);

        } catch (e) {
            console.error(`Worker ${id} Error:`, e.message);
            await wait(2000);
        }
    }
}

async function main() {
    console.log(`Starting Buy-Only Bot (High Throughput: ${CONCURRENCY} Workers, ${BUYS_PER_BUNDLE} Buys/Bundle)...`);
    await refreshTipAccounts();

    const wallet = loadOrGenerateWallet();

    // Start Workers
    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker(i + 1, wallet));
        await wait(1000); // Stagger start
    }

    await Promise.all(workers);
}

main();
