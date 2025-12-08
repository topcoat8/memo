const { Connection, PublicKey } = require("@solana/web3.js");

const RPC_URL = "https://api.mainnet-beta.solana.com";
const MINT_ADDRESS = "8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump";

async function checkMint() {
    const connection = new Connection(RPC_URL);
    const mint = new PublicKey(MINT_ADDRESS);
    const info = await connection.getAccountInfo(mint);

    if (info) {
        console.log("Mint Owner:", info.owner.toBase58());
        if (info.owner.toBase58() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
            console.log("Type: Standard SPL Token");
        } else if (info.owner.toBase58() === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
            console.log("Type: Token-2022");
        } else {
            console.log("Type: Unknown");
        }
    } else {
        console.log("Mint account not found!");
    }
}

checkMint();
