# Memo Volume & Buy Bot

This bot is designed to generate transaction volume and buy pressure for the Memo token on Solana. It utilizes the Jito Block Engine to bundle transactions, ensuring faster execution and resistance to MEV (sandwich attacks).

## Features

- **Volume Mode:** Performs a Buy and immediately Sells the same amount in the same bundle. This generates volume without accumulating tokens.
- **Buy Bot Mode:** Performs multiple small buys in a single bundle without selling. This creates "Buy" transaction streaks on charts.
- **Jito Integration:** Uses Jito bundles to tip validators directly, bypassing some network congestion and ensuring atomic execution (all or nothing).
- **Jupiter Swap:** Fetches the best quotes and swap routes from Jupiter Aggregator.

## Prerequisites

1. **Node.js**: Ensure you have Node.js installed.
2. **Environment Variables**: You must have a `.env` file in the root directory (one level up from this script) with the following variables:

   ```env
   # Your Wallet's Private Key (Array format or Base58 string)
   PRIVATE_KEY=[123, 45, ...]
   
   # The Target Token Mint Address
   VITE_TOKEN_MINT=8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump

   # (Optional) Jupiter API Key for better rate limits
   JUP_KEY=your_jupiter_key
   
   # (Optional) Custom RPC URL
   VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com
   ```

## Configuration

You can tweak the constants at the top of `scripts/volume_bot_jito.ts` to change behavior:

- `TRADE_AMOUNT_SOL`: Amount of SOL to use for the volume (Buy/Sell) cycle.
- `BUY_AMOUNT_SOL`: Amount of SOL to use for each small buy in the Buy Bot cycle.
- `JITO_TIP_AMOUNT`: Tip paid to Jito validators (in Lamports).
- `LOOP_DELAY_MS`: Delay between cycles.

## How to Run

Run the bot using `npx ts-node`:

```bash
npx ts-node scripts/volume_bot_jito.ts
```

## How it Works

The bot runs in an infinite loop, alternating between two modes:

1.  **Volume Cycle**:
    -   Buys `TRADE_AMOUNT_SOL` worth of tokens.
    -   Sells the exact amount of tokens bought.
    -   Bundles these 2 transactions + a Jito Tip into one atomic bundle.

2.  **Buy Cycle**:
    -   Prepares 4 separate buy transactions, each for `BUY_AMOUNT_SOL`.
    -   Bundles these 4 transactions + a Jito Tip.
    -   Executes them all at once to show multiple buys on the chart.
