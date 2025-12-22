# Memo Protocol Bot - Project Context & Rules

This document provides a comprehensive technical overview of the `memo-tg` project. It is intended to guide LLMs and developers in understanding the architecture, data models, and business logic of the bot.

## 1. Project Overview
**Memo Protocol Bot** is a Telegram bot that enables **Token-Gated Communities** on Solana.
It focuses on a "No-Connect" user experience:
1.  **Safety**: Users verify ownership by sending a "Magic Transaction" (Self-Transfer) instead of connecting their wallet to a web dApp.
2.  **Decentralization**: Community rules are stored **on-chain** (in the Memo field of a transaction to a "Burned Wallet").
3.  **Persistance**: The bot acts as an indexer/enforcer of these on-chain rules.

### Core Tech Stack
-   **Runtime**: Node.js (ES Modules)
-   **Framework**: `telegraf` (Telegram Bot API)
-   **Blockchain**: `@solana/web3.js` (RPC interactions)
-   **Storage**: Dual-Strategy (Redis for Prod, JSON File for Dev)
-   **Deployment**: Vercel Serverless (Webhooks)

---

## 2. Architecture & Data Models

### A. Storage Architecture (`src/storage.js`)
The project uses a custom abstraction layer that switches backend based on `REDIS_URL`. All data access **MUST** go through `src/storage.js`.

**Data Schemas (Redis Keys / JSON Objects):**
| Entity | Key Pattern | Type | Description |
| :--- | :--- | :--- | :--- |
| **Links** | `links` (Hash) | `chatId -> communityAddress` | Maps a Telegram Group ID to a Solana Community Address. |
| **Users** | `users` (Hash) | `userId -> JSON Array["addr1", ...]` | Maps Telegram User ID to list of verified Wallet Addresses. |
| **Members** | `chatMembers` (Hash) | `chatId -> JSON Array["uid1", ...]` | Tracks which users are in which group (for auditing). |
| **Polls** | `poll:{pollId}` | String (JSON) | Stores poll question, options, and metadata. |
| **Votes** | `poll_votes:{pollId}` | Hash (`userId -> optionIndex`) | Stores individual votes to prevent duplicates. |
| **Poll Map** | `poll_map:{chatId}:{msgId}` | String | Maps a message ID to its unique Poll ID (for reply handling). |
| **Locked** | `locked_amounts` (Hash) | `chatId -> JSON Array` | Stores manual "Locked Amount" entries (Admin managed). |
| **Pending** | `pending:{userId}` | String (JSON) | Temporary state for user verification ({wallet, amount}). |
| **Join Context**| `join:{userId}` | String | Tracks which group a user was trying to join (Deep Link context). |

### B. User Verification Flows (`src/commands/verify.js`)
The bot supports **two** methods to verify wallet ownership without connecting a wallet.

#### 1. Memo Verification (Primary)
-   **Logic**: User sends **0.000001 SOL** (or 1 MEMO) to **Themselves**.
-   **Proof**: The `Memo` field of the transaction must contain the user's **Telegram ID**.
-   **Pros**: Deterministic, uses standard Solana Memo program.

#### 2. Amount Verification (Backup/Mobile-Friendly)
-   **Logic**: Used when a wallet apps (like Phantom Mobile) makes it hard to edit the Memo field.
-   **Mechanism**:
    1.  Bot generates a unique "Dust Amount" (e.g., `0.0019283 SOL`).
    2.  User must send **EXACTLY** that amount to **Themselves**.
    3.  Bot scans for a self-transfer of that exact micro-lamport value.
-   **Pros**: Easier UX on mobile.

---

## 3. Command Reference

### User Commands
| Command | File | Description |
| :--- | :--- | :--- |
| `/start [verify_addr]` | `start.js` | Welcome message. Handles Deep Links for joining specific groups. |
| `/verify <address>` | `verify.js` | Starts verification. Checks invalid inputs, enforces DM if needed. |
| `/sent` | `verify.js` | **Trigger**: User claims they sent the tx. **Action**: Bot scans blockchain for Memo/Amount. |
| `/mystatus` | `info.js` | Shows user's linked wallets and current balance for the group's token. |
| `/locked` | `locked.js` | Lists manually added "Locked Amounts" (e.g. vesting contracts). |
| `/supply` | `supply.js` | Calculates total group holdings vs total supply ("Group Ownership %"). |
| `/help` | `help.js` | Lists available commands. |

### Admin Commands
| Command | File | Description |
| :--- | :--- | :--- |
| `/create` | `admin.js` | **Wizard**: Interactively creates a new Community (Rules) to be saved on-chain. |
| `/link <address>` | `admin.js` | Links the current Telegram Group to a specific Community Address. |
| `/audit` | `admin.js` | Scans all tracked members. Reports who fails requirements (does not kick). |
| `/kick` | `admin.js` | **Enforcement**: Scans members and **removes/bans** those who fail requirements. |
| `/check` | `admin.js` | (Reply Only) Checks the status/balance of a specific user. |
| `/addlocked <amt> <link>`| `admin.js` | Adds a "Locked Amount" entry for the community (display only). |
| `/removelocked <id>` | `admin.js` | Removes a locked amount entry. |
| `/poll "Q" "O1" "O2"` | `poll.js` | Creates a token-weighted poll. |
| `/tally` | `tally.js` | (Reply Only) Calculates the weighted results of a poll based on current balances. |
| `/export` | `admin.js` | Generates a CSV file of all members and their balances. |

---

## 4. Coding Standards & Guidelines

### A. Message Handling (`src/messages.js`)
**Rule:** NEVER hardcode user-facing strings in command files.
-   All text MUST be defined in `src/messages.js`.
-   **Pattern**: `ctx.reply(MESSAGES.ADMIN.KICK_START)`
-   **Why**: Ensures consistent tone and centralized updates.

### B. Deployment & Environment
-   **Production**: Vercel. Database is **Redis**.
-   **Development**: Local Node via `npm run dev`. Database is **local JSON file** (`/tmp/db.json`).
-   **Switching**: Controlled by existence of `REDIS_URL` env var.

### C. Tone & Persona
-   **Tone**: Automated, Efficient, Secure, yet Helpful.
-   **Style**: Use Emojis for visual scanning (e.g., ✅, ❌, ⚠️, 🔐).
-   **Markdown**: Always use `parse_mode: 'Markdown'` for bolding keys/values.

### D. Critical Business Logic Rules
1.  **Exemptions**: `config.EXEMPT_USER_ID` acts as a super-admin/whitelist (never kicked).
2.  **RPC Handling**: If Solana RPC fails during an `/audit` or `/kick`, **FAIL OPEN** (Do not kick). Log the error but do not remove the user to prevent false positives.
3.  **Polls**: Polls are weighted by **Token Balance** at the time of tallying (not time of voting).

---

## 5. Directory Roadmap
-   `src/index.js`: App Entry (Middleware setup).
-   `src/bot.js`: Command registration.
-   `src/solana.js`: **ALL** blockchain interaction logic (RPC calls, balance parsing) lives here.
-   `src/storage.js`: **ALL** database logic lives here.
-   `src/utils/rulesManager.js`: Caching/Fetching of on-chain community rules.
