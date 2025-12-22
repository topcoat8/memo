
import { checkVerification } from './verification_monitor.js';
import { PublicKey } from '@solana/web3.js';

const mockTx = {
    transaction: {
        message: {
            accountKeys: [],
            instructions: []
        }
    },
    meta: {
        innerInstructions: [],
        err: null
    }
};

const mockConnection = {
    callCount: 0,
    getSignaturesForAddress: async () => {
        console.log("Mock: getSignaturesForAddress called");
        return [{ signature: 'sig1' }];
    },
    getParsedTransaction: async (sig) => {
        console.log(`Mock: getParsedTransaction called for ${sig}`);
        mockConnection.callCount++;

        if (mockConnection.callCount === 1) {
            console.log("Mock: Simulating 429 Error");
            throw new Error("429 Too Many Requests");
        }

        console.log("Mock: Returning success");
        return mockTx;
    }
};

async function runTest() {
    console.log("Starting Retry Test...");
    // Use valid public key strings to avoid validation errors
    const community = 'GTkXcd3Pg9TwoeKShhAGD9qdUJ3J9fbP8sjRFZhbv54u';
    const user = '3zCwfVsAZWxRfFDV9QsVHCXZtpSFsqfn6qrAkoCe8xxQ';

    try {
        await checkVerification(mockConnection, community, 'user123', user);
    } catch (e) {
        // We expect it to finish without throwing, effectively returning null
    }

    if (mockConnection.callCount > 1) {
        console.log("PASS: Retry logic worked (called " + mockConnection.callCount + " times)");
    } else {
        console.error("FAIL: Retry logic did not trigger. Call count: " + mockConnection.callCount);
        process.exit(1);
    }
}

runTest();
