const {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
    TransactionInstruction,
} = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Configuration
const RPC_URL = process.env.VITE_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const PRIVATE_KEY_STRING = process.env.PRIVATE_KEY;
const MINT_ADDRESS = "8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump";
const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const GLOBAL_STATE_SEED = "global";
const BONDING_CURVE_SEED = "bonding-curve";

// Constants
const LAMPORTS_PER_SOL = 1_000_000_000;
const SLIPPAGE_BASIS_POINTS = 500n; // 5%
const PRIORITY_FEE_MICRO_LAMPORTS = 50000; // 0.00005 SOL - Balance between cost and reliability

if (!PRIVATE_KEY_STRING) {
    console.error("Error: PRIVATE_KEY not found in .env");
    process.exit(1);
}

// Setup Connection and Wallet
const connection = new Connection(RPC_URL, "confirmed");
let wallet;

const bs58 = require("bs58");

try {
    if (PRIVATE_KEY_STRING.includes("[")) {
        // Try parsing as JSON array
        const secretKey = Uint8Array.from(JSON.parse(PRIVATE_KEY_STRING));
        wallet = Keypair.fromSecretKey(secretKey);
    } else {
        // Assume base58 string
        const secretKey = bs58.decode(PRIVATE_KEY_STRING);
        wallet = Keypair.fromSecretKey(secretKey);
    }
} catch (e) {
    console.error("Failed to parse PRIVATE_KEY. Ensure it is a JSON array or Base58 string.");
    console.error(e);
    process.exit(1);
}

console.log(`Bot running with wallet: ${wallet.publicKey.toBase58()}`);
console.log(`Target Token: ${MINT_ADDRESS}`);

// Helper: Get PDAs
function getGlobalPDA() {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_STATE_SEED)],
        new PublicKey(PUMP_FUN_PROGRAM_ID)
    );
    return pda;
}

function getBondingCurvePDA(mint) {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
        new PublicKey(PUMP_FUN_PROGRAM_ID)
    );
    return pda;
}

function getAssociatedTokenAddress(mint, owner) {
    return PublicKey.findProgramAddressSync(
        [owner.toBuffer(), new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer()],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    )[0];
}

// Instruction Builders (Manual construction to avoid IDL dependency if possible, or use a simple layout)
// Note: For a robust bot, using the IDL is better, but for a simple script, we can construct the buffer manually if we know the layout.
// However, without the exact layout (discriminator + args), it's risky.
// Let's assume we need to use a library or define the layout.
// Since we don't have the IDL file, we will try to use a generic approach or look for the specific discriminators.


// Known Accounts
const FEE_RECIPIENT = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEPGzq1VV7AbicfcvJJy8u5d");
const EVENT_AUTHORITY = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const RENT_PROGRAM_ID = new PublicKey("SysvarRent111111111111111111111111111111111");

// Buy Discriminator: 66063d1201daebea (hex) -> [102, 6, 61, 18, 1, 218, 235, 234]
// Sell Discriminator: 33e685a4017f83ad (hex) -> [51, 230, 133, 164, 1, 127, 131, 173]

const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);


// Memo Program ID
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb");

// Load Memos
let memos = [];
try {
    const memosContent = fs.readFileSync(path.resolve(__dirname, "bullish_memos.txt"), "utf-8");
    memos = memosContent.split("\n").filter(line => line.trim() !== "");
} catch (e) {
    console.warn("Could not load bullish_memos.txt, using default memos.");
    memos = ["LFG!", "To the moon!", "Pump it!"];
}

function getRandomMemo() {
    return memos[Math.floor(Math.random() * memos.length)];
}

function createMemoInstruction(memo) {
    return new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, "utf-8"),
    });
}

function createPriorityFeeInstruction() {
    return ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: PRIORITY_FEE_MICRO_LAMPORTS
    });
}

const fetch = require("node-fetch"); // Need to install node-fetch

// Jupiter API for swapping (since token is likely on Raydium now)
// Reverting to v6 public endpoint. If ENOTFOUND persists, it's a DNS issue.
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap";

// Helper to delay
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Manual DNS Resolution Helper
const dns = require("dns");
const { promisify } = require("util");
const resolve4 = promisify(dns.resolve4);

let jupiterIp = null;

async function resolveJupiterIp() {
    if (jupiterIp) return jupiterIp;
    try {
        console.log("Resolving quote-api.jup.ag...");
        const ips = await resolve4("quote-api.jup.ag");
        console.log("Resolved IPs:", ips);
        if (ips && ips.length > 0) {
            jupiterIp = ips[0];
            return jupiterIp;
        }
    } catch (e) {
        console.error("DNS Resolution failed:", e.message);
    }

    // Fallback to known Cloudflare IPs for jup.ag (Risky but necessary if DNS fails)
    console.log("Using fallback IP...");
    return "172.67.163.235";
}

async function fetchWithRetry(url, options = {}, retries = 3) {
    // Try to replace hostname with IP if available
    let fetchUrl = url;
    let headers = options.headers || {};

    // Parse URL
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === "quote-api.jup.ag") {
        const ip = await resolveJupiterIp();
        if (ip) {
            // Construct URL with IP
            fetchUrl = url.replace("quote-api.jup.ag", ip);
            // Add Host header
            headers["Host"] = "quote-api.jup.ag";
            options.headers = headers;
        }
    }

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Fetching: ${fetchUrl}`);
            const response = await fetch(fetchUrl, options);
            return response;
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Fetch failed (${err.code || err.message}), retrying (${i + 1}/${retries})...`);
            // Force re-resolve on failure
            jupiterIp = null;
            await wait(1000);
        }
    }
}

async function getJupiterSwapTransaction(inputMint, outputMint, amount, walletPubKey) {
    try {
        // 1. Get Quote
        const quoteUrl = `${JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${Number(SLIPPAGE_BASIS_POINTS)}`;
        const quoteResponse = await fetchWithRetry(quoteUrl);
        const quoteData = await quoteResponse.json();


        if (!quoteData || quoteData.error) {
            throw new Error(`Jupiter Quote Failed: ${JSON.stringify(quoteData)}`);
        }

        // 2. Get Swap Transaction
        const swapResponse = await fetchWithRetry(JUPITER_SWAP_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse: quoteData,
                userPublicKey: walletPubKey.toBase58(),
                wrapAndUnwrapSol: true,
                prioritizationFeeLamports: PRIORITY_FEE_MICRO_LAMPORTS
            })
        });
        const swapData = await swapResponse.json();

        if (!swapData || !swapData.swapTransaction) {
            throw new Error(`Jupiter Swap Construction Failed: ${JSON.stringify(swapData)}`);
        }

        return swapData.swapTransaction;
    } catch (e) {
        console.error("Jupiter Error:", e.message);
        return null;
    }
}


async function addMemoToJupiterTransaction(swapTransactionBase64, memo) {
    const { VersionedTransaction, TransactionMessage } = require("@solana/web3.js");

    const swapTransactionBuf = Buffer.from(swapTransactionBase64, "base64");
    let vTx = VersionedTransaction.deserialize(swapTransactionBuf);

    // Decompile the message to add instruction
    const addressLookupTableAccounts = [];
    if (vTx.message.addressLookupTables && vTx.message.addressLookupTables.length > 0) {
        for (const lookup of vTx.message.addressLookupTables) {
            // Try to fetch ALT with retry
            let result = await connection.getAddressLookupTable(lookup);
            if (!result.value) {
                // Retry once
                await new Promise(r => setTimeout(r, 1000));
                result = await connection.getAddressLookupTable(lookup);
            }

            if (result.value) {
                addressLookupTableAccounts.push(result.value);
            } else {
                // Try fallback RPCs
                const rpcs = [
                    "https://api.mainnet-beta.solana.com",
                    "https://solana-api.projectserum.com"
                ];

                let found = false;
                for (const rpc of rpcs) {
                    try {
                        const fallbackConnection = new Connection(rpc, "confirmed");
                        const fallbackResult = await fallbackConnection.getAddressLookupTable(lookup);
                        if (fallbackResult.value) {
                            addressLookupTableAccounts.push(fallbackResult.value);
                            found = true;
                            break;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }

                if (found) continue;

                throw new Error(`Missing ALT: ${lookup.toBase58()}`);
            }
        }
    }

    const message = TransactionMessage.decompile(vTx.message, { addressLookupTableAccounts });

    // Add Memo Instruction
    const memoIx = createMemoInstruction(memo);
    message.instructions.push(memoIx);

    // Recompile
    vTx.message = message.compileToV0Message(addressLookupTableAccounts);

    return vTx;
}

async function buy(amountSol) {
    try {
        const inputMint = "So11111111111111111111111111111111111111112"; // WSOL
        const outputMint = MINT_ADDRESS;
        const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

        console.log(`Requesting Buy Quote for ${amountSol} SOL...`);
        const swapTransactionBase64 = await getJupiterSwapTransaction(inputMint, outputMint, amountLamports, wallet.publicKey);

        if (!swapTransactionBase64) return;

        // Try to add Memo
        const memo = getRandomMemo();
        console.log(`Adding memo: "${memo}"`);

        let vTx;
        let memoAttached = false;
        const { VersionedTransaction, Transaction } = require("@solana/web3.js");

        try {
            vTx = await addMemoToJupiterTransaction(swapTransactionBase64, memo);
            memoAttached = true;
        } catch (e) {
            if (e.message.startsWith("Missing ALT")) {
                console.warn(`Warning: ${e.message}. Will send memo in separate transaction.`);
            } else {
                console.warn(`Could not attach memo to swap. Will send separate transaction. Error: ${e.message}`);
            }
            // Fallback to original transaction
            vTx = VersionedTransaction.deserialize(Buffer.from(swapTransactionBase64, "base64"));
        }

        vTx.sign([wallet]);

        const signature = await connection.sendTransaction(vTx, { skipPreflight: true });
        console.log(`BUY Sent: https://solscan.io/tx/${signature}`);

        const confirmation = await connection.confirmTransaction(signature, "confirmed");
        if (confirmation.value.err) {
            console.error("Transaction failed on chain:", confirmation.value.err);
            try {
                const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
                if (tx && tx.meta && tx.meta.logMessages) {
                    console.error("Transaction Logs:", tx.meta.logMessages);
                }
            } catch (e) {
                console.error("Could not fetch failed transaction logs:", e.message);
            }
            throw new Error("Transaction failed on chain");
        }
        console.log("BUY Confirmed!");

        // Send separate Memo transaction if not attached
        if (!memoAttached) {
            try {
                console.log("Sending separate Memo transaction...");
                const memoTx = new Transaction().add(createMemoInstruction(memo));
                const memoSig = await connection.sendTransaction(memoTx, [wallet], { skipPreflight: true });
                await connection.confirmTransaction(memoSig, "confirmed");
                console.log(`Memo Sent: https://solscan.io/tx/${memoSig}`);
            } catch (e) {
                console.error("Failed to send separate memo:", e.message);
            }
        }

    } catch (err) {
        console.error("Buy failed:", err.message);
    }
}

async function getTokenBalance(mint) {
    try {
        const associatedUser = getAssociatedTokenAddress(mint, wallet.publicKey);
        const account = await connection.getTokenAccountBalance(associatedUser);
        return account.value.uiAmount;
    } catch (e) {
        return 0;
    }
}

async function getSolBalance() {
    try {
        const balance = await connection.getBalance(wallet.publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (e) {
        return 0;
    }
}

async function sell(amountToken) {
    try {
        // Check balance first
        const currentBalance = await getTokenBalance(new PublicKey(MINT_ADDRESS));
        if (currentBalance < amountToken) {
            console.log(`Insufficient token balance to sell. Have: ${currentBalance}, Want to sell: ${amountToken}`);
            // Adjust sell amount to max available or skip
            if (currentBalance > 100) { // Lower threshold
                console.log(`Adjusting sell amount to ${currentBalance} (Max)`);
                amountToken = currentBalance;
            } else {
                console.log("Skipping sell due to low balance.");
                return;
            }
        }

        const inputMint = MINT_ADDRESS;
        const outputMint = "So11111111111111111111111111111111111111112"; // WSOL
        const amountLamports = Math.floor(amountToken * 1000000); // 6 decimals

        console.log(`Requesting Sell Quote for ${amountToken} tokens...`);
        const swapTransactionBase64 = await getJupiterSwapTransaction(inputMint, outputMint, amountLamports, wallet.publicKey);

        if (!swapTransactionBase64) return;

        // Try to add Memo
        const memo = getRandomMemo();
        console.log(`Adding memo: "${memo}"`);

        let vTx;
        let memoAttached = false;
        const { VersionedTransaction, Transaction } = require("@solana/web3.js");

        try {
            vTx = await addMemoToJupiterTransaction(swapTransactionBase64, memo);
            memoAttached = true;
        } catch (e) {
            if (e.message.startsWith("Missing ALT")) {
                console.warn(`Warning: ${e.message}. Will send memo in separate transaction.`);
            } else {
                console.warn(`Could not attach memo to swap. Will send separate transaction. Error: ${e.message}`);
            }
            // Fallback to original transaction
            vTx = VersionedTransaction.deserialize(Buffer.from(swapTransactionBase64, "base64"));
        }

        vTx.sign([wallet]);

        const signature = await connection.sendTransaction(vTx, { skipPreflight: true });
        console.log(`SELL Sent: https://solscan.io/tx/${signature}`);

        const confirmation = await connection.confirmTransaction(signature, "confirmed");
        if (confirmation.value.err) {
            console.error("Transaction failed on chain:", confirmation.value.err);
            try {
                const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
                if (tx && tx.meta && tx.meta.logMessages) {
                    console.error("Transaction Logs:", tx.meta.logMessages);
                }
            } catch (e) {
                console.error("Could not fetch failed transaction logs:", e.message);
            }
            throw new Error("Transaction failed on chain");
        }
        console.log("SELL Confirmed!");

        // Send separate Memo transaction if not attached
        if (!memoAttached) {
            try {
                console.log("Sending separate Memo transaction...");
                const memoTx = new Transaction().add(createMemoInstruction(memo));
                const memoSig = await connection.sendTransaction(memoTx, [wallet], { skipPreflight: true });
                await connection.confirmTransaction(memoSig, "confirmed");
                console.log(`Memo Sent: https://solscan.io/tx/${memoSig}`);
            } catch (e) {
                console.error("Failed to send separate memo:", e.message);
            }
        }

    } catch (err) {
        console.error("Sell failed:", err.message);
    }
}



async function main() {
    console.log("Starting Volume Bot with Memos...");
    while (true) {
        const action = Math.random() > 0.5 ? "BUY" : "SELL";
        const delay = Math.floor(Math.random() * 5000) + 2000; // 2-7 seconds

        if (action === "BUY") {
            // Randomize SOL amount: 0.0005 to 0.001 SOL (Approx $0.10 - $0.20)
            // Reduced to conserve user funds
            const amount = 0.0005 + Math.random() * 0.0005;
            await buy(amount);
        } else {
            // Randomize Token amount: 10k to 20k tokens
            // Reduced to match buy amount
            const amount = 10000 + Math.random() * 10000;
            await sell(amount);
        }

        console.log(`Waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
}

main();
