const {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
} = require("@solana/web3.js");
const {
    getAssociatedTokenAddress,
    createTransferInstruction,
    createAssociatedTokenAccountInstruction,
    getAccount,
    TokenAccountNotFoundError,
    TokenInvalidAccountOwnerError,
    TOKEN_2022_PROGRAM_ID
} = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const bs58 = require("bs58");

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Configuration
const RPC_URL = process.env.VITE_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const PRIVATE_KEY_STRING = process.env.PRIVATE_KEY;
const MINT_ADDRESS = "8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump";
const WALLETS_FILE_PATH = path.resolve(__dirname, "volume_wallets.json");

if (!PRIVATE_KEY_STRING) {
    console.error("Error: PRIVATE_KEY not found in .env");
    process.exit(1);
}

// ... (imports)

// Setup Connection and Main Wallet
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

console.log(`Main Wallet (Recipient): ${mainWallet.publicKey.toBase58()}`);

// Load Sub-Wallets
let subWallets = [];
if (fs.existsSync(WALLETS_FILE_PATH)) {
    try {
        const data = JSON.parse(fs.readFileSync(WALLETS_FILE_PATH, "utf-8"));
        subWallets = data.map(secretKeyArr => Keypair.fromSecretKey(Uint8Array.from(secretKeyArr)));
        console.log(`Loaded ${subWallets.length} sub-wallets.`);
    } catch (e) {
        console.error("Failed to load wallets file:", e.message);
        process.exit(1);
    }
} else {
    console.error("No wallets file found.");
    process.exit(1);
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function reclaimFunds() {
    console.log("Starting Fund Reclamation (Token-2022)...");

    const mintPubkey = new PublicKey(MINT_ADDRESS);

    // Ensure Main Wallet has ATA (Token-2022)
    const mainAta = await getAssociatedTokenAddress(
        mintPubkey,
        mainWallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
    );

    try {
        await getAccount(connection, mainAta, undefined, TOKEN_2022_PROGRAM_ID);
    } catch (e) {
        if (e instanceof TokenAccountNotFoundError || e instanceof TokenInvalidAccountOwnerError) {
            console.log("Creating ATA for Main Wallet...");
            const tx = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    mainWallet.publicKey,
                    mainAta,
                    mainWallet.publicKey,
                    mintPubkey,
                    TOKEN_2022_PROGRAM_ID
                )
            );
            await sendAndConfirmTransaction(connection, tx, [mainWallet]);
            console.log("Main Wallet ATA created.");
        }
    }

    for (let i = 0; i < subWallets.length; i++) {
        const wallet = subWallets[i];
        console.log(`[${i + 1}/${subWallets.length}] Checking Wallet: ${wallet.publicKey.toBase58()}`);

        try {
            // 1. Reclaim MEMO (SPL Token - Token-2022)
            const walletAta = await getAssociatedTokenAddress(
                mintPubkey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );
            try {
                const account = await getAccount(connection, walletAta, undefined, TOKEN_2022_PROGRAM_ID);
                const amount = Number(account.amount);

                if (amount > 0) {
                    console.log(`  Found ${amount} raw tokens (MEMO). Sending to Main Wallet...`);
                    const tx = new Transaction().add(
                        createTransferInstruction(
                            walletAta,
                            mainAta,
                            wallet.publicKey,
                            amount,
                            [],
                            TOKEN_2022_PROGRAM_ID
                        )
                    );
                    const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
                    console.log(`  MEMO Sent! Sig: ${sig}`);
                } else {
                    console.log("  No MEMO found.");
                }
            } catch (e) {
                // ATA likely doesn't exist, ignore
                console.log("  No Token Account found.");
            }

            // 2. Reclaim SOL
            const balance = await connection.getBalance(wallet.publicKey);
            const feeReserve = 5000;
            const amountToSend = balance - feeReserve;

            if (amountToSend > 0) {
                console.log(`  Found ${(balance / LAMPORTS_PER_SOL).toFixed(5)} SOL. Sending ${(amountToSend / LAMPORTS_PER_SOL).toFixed(5)} SOL...`);
                const tx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: wallet.publicKey,
                        toPubkey: mainWallet.publicKey,
                        lamports: amountToSend
                    })
                );
                const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
                console.log(`  SOL Sent! Sig: ${sig}`);
            } else {
                console.log("  No reclaimable SOL found.");
            }

        } catch (e) {
            console.error(`  Failed to reclaim from ${wallet.publicKey.toBase58()}:`, e.message);
        }

        await wait(500); // Rate limit protection
    }

    console.log("Reclamation Complete!");
}

reclaimFunds();
