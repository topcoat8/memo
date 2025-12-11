# Memo Protocol Telegram Bot

This bot bridges Memo Protocol communities to Telegram groups. It fetches rules from the Solana blockchain and enforces them in your Telegram chat (e.g., deleting messages with banned words, enforcing token gating).

## Setup

1.  **Create a Bot**:
    *   Open Telegram and search for **@BotFather**.
    *   Send the command `/newbot`.
    *   Follow the prompts to name your bot.
    *   Copy the **HTTP API Token** provided.

2.  **Configuration**:
    *   Create a `.env` file in this directory:
        ```bash
        cp .env.example .env
        ```
    *   Add your token and public URL:
        ```
        BOT_TOKEN=your_token_from_botfather
        RPC_URL=https://api.mainnet-beta.solana.com
        PUBLIC_URL=http://your-server-domain.com # Or ngrok URL for dev
        ```

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Run the Bot**:
    ```bash
    npm start
    ```

## Usage

1.  **Add the Bot to your Group**:
    *   Go to your Telegram group settings.
    *   Add the bot as a member.
    *   **Promote the bot to Admin** (it needs "Delete Messages" permission to enforce rules).

2.  **Link to Memo Community**:
    *   In the group chat, run:
        ```
        /link <SOLANA_COMMUNITY_ADDRESS>
        ```
    *   Example:
        ```
        /link 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin
        ```

3.  **Client Verification**:
    *   If the community has `minTokenBalance` rules, users will trigger a "Verify Wallet" warning when they try to speak.
    *   They click the link, connect their wallet (Phantom), and sign a message.
    *   Once verified, the bot allows them to chat if they hold enough tokens.

## Troubleshooting

*   **Verification Link Broken?** Ensure `PUBLIC_URL` is accessible from the user's browser (use ngrok if running locally).
*   **Bot not deleting messages?** Make sure it is an Admin.
*   **Rules not updating?** Wait ~1 minute for the cache to expire after a new on-chain transaction.
