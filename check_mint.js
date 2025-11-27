import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const MINT_ADDRESS = 'ByBscB8qfFRuzqVSKvREesFMVYCpLpAuimQdf4jWpump';

async function checkMintOwner() {
    const connection = new Connection(RPC_URL);
    const mint = new PublicKey(MINT_ADDRESS);
    const info = await connection.getAccountInfo(mint);

    if (!info) {
        console.log('Mint account not found!');
        return;
    }

    console.log('Mint Owner:', info.owner.toString());

    if (info.owner.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        console.log('Type: Standard Token Program');
    } else if (info.owner.toString() === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') {
        console.log('Type: Token-2022 Program');
    } else {
        console.log('Type: Unknown Program');
    }
}

checkMintOwner();
