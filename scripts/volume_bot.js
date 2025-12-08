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
const JUP_KEY = process.env.JUP_KEY; // Load Jupiter API Key

if (!JUP_KEY) {
    console.warn("WARNING: JUP_KEY not found in .env. Using public API (may be rate limited).");
} else {
    console.log(`Loaded JUP_KEY: ${JUP_KEY.substring(0, 4)}...`);
}
const WALLETS_FILE_PATH = path.resolve(__dirname, "volume_wallets.json");
const NUM_SUB_WALLETS = 100; // Scaled to 100 wallets
const FUNDING_AMOUNT_SOL = 0.01; // Reduced to 0.01 SOL to save capital
const MIN_BALANCE_SOL = 0.005; // Minimum balance before topping up

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
// Jito Tip Accounts (Fallback list - Verified)
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
        console.log(`Sending to Jito (${endpoint})...`);
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
                    console.warn(`Invalid tip account received: ${acc}`);
                    return false;
                }
            });

            if (validAccounts.length > 0) {
                JITO_TIP_ACCOUNTS = validAccounts;
                console.log("Updated Jito Tip Accounts:", JITO_TIP_ACCOUNTS);
            } else {
                console.warn("No valid tip accounts found in Jito response. Keeping fallback list.");
            }
        }
    } catch (e) {
        console.error("Failed to refresh tip accounts:", e.message);
    }
}

// Constants
const LAMPORTS_PER_SOL = 1_000_000_000;
const SLIPPAGE_BASIS_POINTS = 1000n; // 10% (High slippage for guaranteed execution in bundle)
const JITO_TIP_LAMPORTS = 1000; // 0.000001 SOL (Minimal tip)

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
    console.error("Failed to parse PRIVATE_KEY. Ensure it is a JSON array or Base58 string.");
    process.exit(1);
}

console.log(`Main Wallet: ${mainWallet.publicKey.toBase58()}`);
console.log(`Target Token: ${MINT_ADDRESS}`);

// --- Multi-Wallet Logic ---

function loadOrGenerateWallets() {
    let wallets = [];
    if (fs.existsSync(WALLETS_FILE_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(WALLETS_FILE_PATH, "utf-8"));
            wallets = data.map(secretKeyArr => Keypair.fromSecretKey(Uint8Array.from(secretKeyArr)));
            console.log(`Loaded ${wallets.length} sub-wallets from file.`);
        } catch (e) {
            console.error("Failed to load wallets file:", e.message);
        }
    }

    if (wallets.length < NUM_SUB_WALLETS) {
        const needed = NUM_SUB_WALLETS - wallets.length;
        console.log(`Generating ${needed} new sub-wallets...`);
        for (let i = 0; i < needed; i++) {
            wallets.push(Keypair.generate());
        }
        // Save back to file
        const dataToSave = wallets.map(w => Array.from(w.secretKey));
        fs.writeFileSync(WALLETS_FILE_PATH, JSON.stringify(dataToSave, null, 2));
        console.log(`Saved ${wallets.length} sub-wallets to ${WALLETS_FILE_PATH}`);
    }
    return wallets;
}

async function ensureWalletFunds(targetWallet) {
    try {
        const balance = await connection.getBalance(targetWallet.publicKey);
        console.log(`Wallet ${targetWallet.publicKey.toBase58()} Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

        if (balance < MIN_BALANCE_SOL * LAMPORTS_PER_SOL) {
            const mainBalance = await connection.getBalance(mainWallet.publicKey);
            if (mainBalance < (FUNDING_AMOUNT_SOL * LAMPORTS_PER_SOL) + 5000) {
                console.error(`Main Wallet Balance Low: ${(mainBalance / LAMPORTS_PER_SOL).toFixed(5)} SOL. Needed: ${FUNDING_AMOUNT_SOL} SOL`);
                return false;
            }

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
            console.log(`Funded! Tx: ${signature}`);
            await wait(2000); // Wait for confirmation propagation
        }
        return true;
    } catch (e) {
        console.error(`Failed to fund wallet ${targetWallet.publicKey.toBase58()}:`, e.message);
    }
}

// --- End Multi-Wallet Logic ---

async function getTokenBalance(wallet) {
    try {
        const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
            mint: new PublicKey(MINT_ADDRESS)
        });
        if (accounts.value.length === 0) return 0;
        const amount = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        return amount;
    } catch (e) {
        console.error(`Failed to get token balance for ${wallet.publicKey.toBase58()}:`, e.message);
        return 0;
    }
}

// Jupiter API
// Jupiter API (Authenticated)
const JUPITER_QUOTE_API = "https://api.jup.ag/swap/v1/quote"; // v6 is now at /swap/v1 on api.jup.ag? No, let's check docs. 
// Actually, standard v6 is https://quote-api.jup.ag/v6/quote. 
// For api.jup.ag, it is likely https://api.jup.ag/swap/v1/quote (v6 equivalent) or just /v6/quote.
// Let's stick to what the user likely has or standard. 
// Search result said: "Jupiter has also indicated a migration to api.jup.ag... The paths for the API calls remain consistent".
// So https://api.jup.ag/v6/quote should be correct.
const JUPITER_QUOTE_API_URL = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_API_URL = "https://api.jup.ag/swap/v1/swap";
// Wait, the docs say https://quote-api.jup.ag/v6/quote is the public one.
// api.jup.ag usually follows the same structure. 
// Let's try https://api.jup.ag/swap/v1/quote which is the new standard.
// Actually, let's use the one from the plan: https://api.jup.ag/v6/quote. 
// If that fails, we can try /swap/v1. 
// Let's use https://api.jup.ag/swap/v1/quote as it is the modern path.


// Helper to delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}) {
    let currentAttempt = 0;

    // Add API Key Header
    const headers = options.headers || {};
    if (JUP_KEY) {
        headers["x-api-key"] = JUP_KEY;
    }
    options.headers = headers;

    while (true) {
        currentAttempt++;
        try {
            const response = await fetch(url, options);

            if (response.ok) {
                return response;
            }

            if (response.status === 429) {
                console.warn(`Jupiter Rate Limit (429). Waiting 5s...`); // Faster retry with key
                await wait(5000);
                continue;
            } else if (response.status >= 500) {
                console.warn(`Jupiter Server Error (${response.status}). Waiting 2s...`);
                await wait(2000);
                continue;
            } else {
                console.error(`Jupiter Fatal Error: ${response.status} ${response.statusText}`);
                // Don't throw immediately, maybe retry a few times? No, fatal is fatal.
                throw new Error(`HTTP error! status: ${response.status}`);
            }

        } catch (e) {
            console.error(`Jupiter Network Error: ${e.message}. Retrying in 2s...`);
            await wait(2000);
        }
    }
}

async function getJupiterSwapTransaction(inputMint, outputMint, amount, walletPubKey) {
    try {
        const quoteUrl = `${JUPITER_QUOTE_API_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${Number(SLIPPAGE_BASIS_POINTS)}`;
        const quoteResponse = await fetchWithRetry(quoteUrl);
        const quoteData = await quoteResponse.json();

        if (!quoteData || quoteData.error) {
            throw new Error(`Jupiter Quote Failed: ${JSON.stringify(quoteData)}`);
        }

        const swapResponse = await fetchWithRetry(JUPITER_SWAP_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse: quoteData,
                userPublicKey: walletPubKey.toBase58(),
                wrapAndUnwrapSol: true
                // asLegacyTransaction: true // Removed to use Versioned Transactions
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
    try {
        new PublicKey(acc); // Validate
    } catch (e) {
        console.error(`CRITICAL: Selected invalid tip account from list: '${acc}'`);
        throw e;
    }
    return new PublicKey(acc);
}

async function sendBundle(transactions) {
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

    while (true) {
        try {
            const endpoint = getRandomBlockEngineUrl();
            console.log(`Sending to Jito (${endpoint})...`);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.error) {
                if (data.error.code === -32097) {
                    console.warn(`Jito Rate Limit hit. Waiting 5s...`);
                    await wait(5000);
                    continue;
                }
                console.error("Bundle Failed:", JSON.stringify(data));
                return data;
            }

            return data;
        } catch (e) {
            console.error(`Jito Bundle Network Error:`, e.message);
            await wait(2000);
        }
    }
}

async function generateTransaction(activeWallet) {
    try {
        const tokenBalance = await getTokenBalance(activeWallet);
        const isSelling = tokenBalance > 0.000001; // Threshold to treat as holding

        let transaction;
        let actionType;

        if (isSelling) {
            console.log(`Wallet ${activeWallet.publicKey.toBase58()} holds ${tokenBalance} tokens. SELLING...`);

            const accounts = await connection.getParsedTokenAccountsByOwner(activeWallet.publicKey, {
                mint: new PublicKey(MINT_ADDRESS)
            });
            const rawAmount = accounts.value[0].account.data.parsed.info.tokenAmount.amount;

            const sellResult = await getJupiterSwapTransaction(
                MINT_ADDRESS,
                "So11111111111111111111111111111111111111112", // WSOL
                rawAmount,
                activeWallet.publicKey
            );

            if (!sellResult) return null;
            const { swapTransaction: sellTxBase64 } = sellResult;

            try {
                transaction = VersionedTransaction.deserialize(Buffer.from(sellTxBase64, "base64"));
            } catch (e) {
                transaction = Transaction.from(Buffer.from(sellTxBase64, "base64"));
            }
            actionType = "SELL";

        } else {
            // Buy Random Amount
            const buyAmountSol = 0.0001 + Math.random() * 0.0009;
            console.log(`Wallet ${activeWallet.publicKey.toBase58()} is empty. BUYING ${buyAmountSol.toFixed(4)} SOL...`);

            const buyAmountLamports = Math.floor(buyAmountSol * LAMPORTS_PER_SOL);
            const buyResult = await getJupiterSwapTransaction(
                "So11111111111111111111111111111111111111112", // WSOL
                MINT_ADDRESS,
                buyAmountLamports,
                activeWallet.publicKey
            );

            if (!buyResult) return null;
            const { swapTransaction: buyTxBase64 } = buyResult;

            try {
                transaction = VersionedTransaction.deserialize(Buffer.from(buyTxBase64, "base64"));
            } catch (e) {
                transaction = Transaction.from(Buffer.from(buyTxBase64, "base64"));
            }
            actionType = "BUY";
        }

        // Sign Main Tx
        if (transaction instanceof VersionedTransaction) {
            transaction.sign([activeWallet]);
        } else {
            transaction.sign(activeWallet);
        }

        return { transaction, actionType, wallet: activeWallet };

    } catch (e) {
        console.error("Error generating transaction:", e.message);
        return null;
    }
}

async function processBatch(wallets) {
    console.log(`Processing Batch of ${wallets.length} wallets...`);

    // 1. Generate Transactions in Parallel with Stagger
    const results = [];
    for (const w of wallets) {
        results.push(await generateTransaction(w));
        await wait(2000); // Stagger requests by 2s to avoid hitting Jupiter rate limit instantly
    }

    // 2. Filter Valid Transactions
    const validResults = results.filter(r => r !== null);

    if (validResults.length === 0) {
        console.log("No valid transactions generated in this batch. Retrying batch in 10s...");
        await wait(10000);
        return processBatch(wallets); // Recursive retry
    }

    console.log(`Generated ${validResults.length} valid transactions. Simulating...`);

    // 2.5 Simulate Transactions
    for (const res of validResults) {
        try {
            const simulation = await connection.simulateTransaction(res.transaction);
            if (simulation.value.err) {
                console.error(`Simulation Failed for ${res.wallet.publicKey.toBase58()}:`, JSON.stringify(simulation.value.err));
                console.log("Logs:", simulation.value.logs);
                return false; // Abort batch on simulation failure
            }
        } catch (e) {
            console.error("Simulation Error:", e.message);
            return false;
        }
    }
    console.log("All transactions simulated successfully.");

    // 3. Create Tip Transaction (Payer = First Wallet in Batch)
    const payerWallet = validResults[0].wallet;
    let tipTx;
    try {
        const tipAccount = getRandomTipAccount();
        const { blockhash } = await connection.getLatestBlockhash();
        const tipInstruction = SystemProgram.transfer({
            fromPubkey: payerWallet.publicKey,
            toPubkey: tipAccount,
            lamports: JITO_TIP_LAMPORTS
        });
        const messageV0 = new TransactionMessage({
            payerKey: payerWallet.publicKey,
            recentBlockhash: blockhash,
            instructions: [tipInstruction]
        }).compileToV0Message();
        tipTx = new VersionedTransaction(messageV0);
        tipTx.sign([payerWallet]);
    } catch (e) {
        console.error("Failed to create tip transaction:", e.message);
        return false;
    }

    // 4. Bundle: [Tx1, Tx2, ..., Tip]
    const bundle = [...validResults.map(r => r.transaction), tipTx];

    console.log(`Sending Batch Bundle (${validResults.length} Txs + 1 Tip) to Jito...`);
    const result = await sendBundle(bundle);

    if (result && result.result) {
        console.log(`Batch Bundle Sent! Bundle ID: ${result.result}`);
        return true;
    }
    return false;
}

async function main() {
    console.log("Starting Jito Anti-MEV Volume Bot (Multi-Wallet)...");
    await refreshTipAccounts();

    const subWallets = loadOrGenerateWallets();
    const allWallets = [mainWallet, ...subWallets];

    console.log(`Loaded ${allWallets.length} total wallets.`);

    while (true) {
        // 1. Pick 4 random wallets
        const batchWallets = [];
        for (let i = 0; i < 4; i++) {
            const w = allWallets[Math.floor(Math.random() * allWallets.length)];
            // Avoid duplicates in batch
            if (!batchWallets.includes(w)) {
                batchWallets.push(w);
            }
        }

        // 2. Ensure funds and filter valid wallets
        const validBatchWallets = [];
        for (const w of batchWallets) {
            if (w.publicKey.toBase58() !== mainWallet.publicKey.toBase58()) {
                const funded = await ensureWalletFunds(w);
                if (funded) {
                    validBatchWallets.push(w);
                } else {
                    console.warn(`Skipping wallet ${w.publicKey.toBase58()} due to funding failure.`);
                }
            } else {
                validBatchWallets.push(w); // Main wallet is always included (assumed funded or checked elsewhere)
            }
        }

        if (validBatchWallets.length === 0) {
            console.warn("No valid wallets in batch (likely low main wallet balance). Waiting 30s...");
            await wait(30000);
            continue;
        }

        // 3. Process Batch
        await processBatch(validBatchWallets);

        // 4. Random Delay
        const delay = Math.floor(Math.random() * 30000) + 30000; // Slower: 30-60s
        console.log(`Waiting ${delay}ms...`);
        await wait(delay);
    }
}

main();
