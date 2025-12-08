const fetch = require("node-fetch");

async function test() {
    console.log("Testing connection to Jupiter via fallback IP...");
    const url = "https://172.67.163.235/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50";
    try {
        const res = await fetch(url, {
            headers: { "Host": "quote-api.jup.ag" }
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text.substring(0, 100));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
