
import { Connection } from '@solana/web3.js';
import { checkVerification } from './verification_monitor.js';
import { config } from './config.js';

async function verifySpecificTransaction() {
    const SIGNATURE = '3x2j7qPX5JqNSsqmwYK371Lqmk4HacTcWvifgxgPLzvtRwXrPeoTPnatJofnet1iF73Ejf6mVAnNuDX2qiYt5xkT';
    const USER_WALLET = '3zCwfVsAZWxRfFDV9QsVHCXZtpSFsqfn6qrAkoCe8xxQ';
    const COMMUNITY_WALLET = 'GTkXcd3Pg9TwoeKShhAGD9qdUJ3J9fbP8sjRFZhbv54u';
    const EXPECTED_AMOUNT = '1.160862';

    console.log(`Connecting to RPC: ${config.RPC_URL}`);
    const connection = new Connection(config.RPC_URL, 'confirmed');

    // We will wrap the connection to mock getSignaturesForAddress
    // but pass through getParsedTransaction to the real RPC to verify parsing logic on real data.
    const mockConnection = {
        // Mock this to return ONLY our target signature
        getSignaturesForAddress: async (pubkey) => {
            console.log(`[Mock] Returning target signature for ${pubkey.toString()}`);
            return [{ signature: SIGNATURE, blockTime: Date.now() / 1000 }];
        },
        // Pass through everything else
        getParsedTransaction: async (sig, opts) => {
            console.log(`[RealRPC] Fetching transaction ${sig}...`);
            const tx = await connection.getParsedTransaction(sig, opts);
            if (tx) {
                console.log("--- DEBUG TX STRUCTURE ---");
                try {
                    const instructions = tx.transaction.message.instructions;
                    instructions.forEach((ix, i) => {
                        console.log(`Instruction ${i}:`, JSON.stringify(ix, null, 2));
                    });
                } catch (e) { console.log("Could not log instructions"); }
                console.log("--------------------------");
            }
            return tx;
        }
    };

    console.log(`Running checkVerification for amount: ${EXPECTED_AMOUNT}`);

    // arguments: connection, communityAddress, userId, findingWallet, expectedAmount
    const result = await checkVerification(
        mockConnection,
        COMMUNITY_WALLET,
        'test_user_id',
        USER_WALLET,
        EXPECTED_AMOUNT
    );

    if (result) {
        console.log("✅ SUCCESS: Found validation match!");
        console.log("Result:", result);
    } else {
        console.error("❌ FAILED: Transaction not found or amount did not match.");
        console.log("Please check if the amount 1.160862 exactly matches the on-chain data.");
    }
}

verifySpecificTransaction().catch(console.error);
