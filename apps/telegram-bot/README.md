# 📘 Memo Protocol Bot User Manual

The **Memo Verification Bot** serves as the bridge between Telegram communities and the Solana blockchain. It enforces token-gating rules defined on the Memo Protocol, ensuring that every member in your group holds the required assets.

---

## 👥 For Group Members

### 🚀 Getting Started (How to Join)
If you are trying to join a Memo-gated group, follow this flow:
1.  **Request to Join**: Click the group's invite link.
2.  **Check DMs**: The bot will send you a private message saying "Access Denied" with a verification link.
3.  **Click the Link**: This starts a secure session with the bot.
4.  **Verify**: Follow the bot's instructions to send a "Magic Transaction" on Solana.
    *   *Note: This transaction proves you own the wallet without exposing your private keys.*

### 💬 Member Commands
Use these commands in the group chat or in a DM with the bot.

#### `/mystatus`
**Description:** Checks your current verification status. It will show:
*   Your linked Wallet Address.
*   Your current Token Balance for the group.
*   Whether you meet the Minimum Balance requirements.
*   *Use this if you think you were kicked by mistake!*

#### `/verify`
**Description:** Starts the verification process.
*   Generates a unique "Magic Transaction" link for you.
*   **Click to Verify**: Most users can simply click the link to verify via Solana Pay.
*   **Manual**: Provides the **Community Address** to send **$MEMO** to (if manual verification is preferred).
*   Tells you the **Memo ID** you **MUST** include in your transaction to prove ownership.

#### `/sent`
**Description:** Tells the bot to look for your transaction on the blockchain.
*   Run this AFTER you have sent the "Magic Transaction".
*   If successful, the bot will verify you and instantly approve your request to join the group.

#### `/rules`
**Description:** Displays the current on-chain rules for this group.
*   Shows the required Token Mint.
*   Shows the Minimum Holding needed (% of Supply).

#### `/leaderboard`
**Description:** Shows the Top 50 holders in the current chat.

#### `/supply`
**Description:** Shows the total token holdings of the group and the percentage of the total supply owned.

---

## 👑 For Group Admins

### 🛠 Setup & Management

#### 1. Add Bot to Group
*   Add **@memo_verification_bot** to your Telegram Group.
*   **Promote to Admin**: The bot requires **"Ban Users"** and **"Invite Users via Link"** permissions to function.

#### 2. Configure "Request Admin Approval"
*   Go to **Group Settings** -> **Group Type**.
*   **Create a New Invite Link** (or edit existing).
*   Toggle **ON**: "Request Admin Approval".
*   *Why?* This allows the bot to intercept join requests and check wallets *before* the user enters the chat.

#### `/link <address>`
**Usage:** `/link 7Xw...`
**Description:** Links the current Telegram group to a Memo Protocol Community Address.
*   **Permissions Required:** Admin or Creator.
*   **Effect:** The bot begins enforcing the rules found on-chain for that address.

#### `/create`
**Usage:** `/create` (DM Only)
**Description:** Launches the **Community Creation Wizard**.
*   **Requirement:** *You must hold at least 50,000 $MEMO to create a community.*
*   The bot will interview you to set up rules:
    *   **Token Mint**: The token you want to gate access with.
    *   **Min Holding**: The **% of Total Supply** a user must hold (e.g., 1%).
*   **Activation**: Requires sending **1 $MEMO** to the new community address to publish the rules on-chain.


### 📊 Monitoring & Moderation

#### `/audit`
**Usage:** `/audit`
**Description:** Scans the group for non-compliant members.
*   Lists users who do not have a verified wallet.
*   Lists users who have insufficient balance based on current rules.
*   *Does not kick users, only reports them.*

#### `/kick`
**Usage:** `/kick`
**Description:** Manually triggers a **Full Compliance Sweep & Cleanup**.
*   **Permissions Required:** Admin Only.
*   **Effect:** The bot scans every tracked user. If they no longer meet requirements (e.g., sold tokens), they are **removed from the group**.
*   *Use this periodically to ensure your group remains exclusive.*

#### `/check` (Reply)
**Usage:** Reply to a user's message with `/check`
**Description:** Checks a specific user's status.
*   Shows their Wallet Address.
*   Shows their current Balance.
*   Tells you if they are currently passing/failing the rules.

---

## ❓ Troubleshooting

**"I sent the transaction but it says 'Could not find transaction'."**
*   **Wait:** Solana can take 30-60 seconds to confirm. Wait a minute and try `/sent` again.
*   **Check Memo:** Did you include your Telegram ID in the memo field? This is crucial!
*   **Check Token:** Did you send *tokens* or just SOL? Read the `/verify` instructions carefully.

**"The bot isn't letting legitimate users in."**
*   **Admin Check:** Ensure the bot is an Admin with "Ban Users" and "Invite Users" permissions.
*   **Invite Link:** Ensure users are joining via a link with **"Request Admin Approval"** enabled. The bot cannot intercept open joins.
