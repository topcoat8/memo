# 🤖 Memo Bot Setup Guide

Follow these steps to gate your Telegram Group with Memo Protocol verification.

## Prerequisites
- A **Memo Community Address** (Solana Wallet Address with rules).
- A **Telegram Group** where you are an Admin.
- The Bot Username: **@memo_verification_bot**

---

## Step 1: Add & Promote the Bot
1.  Open your Telegram Group.
2.  Add **@memo_verification_bot** as a member.
3.  Go to **Group Info** > **Edit** > **Administrators**.
4.  Adding the bot as Admin. **Crucial Permissions:**
    - ✅ Ban Users
    - ✅ Delete Messages
    - ✅ Invite Users via Link (Manage Invite Links)

## Step 2: Link Your Community
1.  Inside the group chat, type:
    ```
    /link <YOUR_COMMUNITY_SOLANA_ADDRESS>
    ```
    *Example:* `/link 2tUqgsS2XspKfEPHKqBVgkPZaRxVpsXd4JBcUdMGHJRy`
2.  The bot should reply: "✅ Successfully linked...". It will show the rules it found on-chain.

## Step 3: Enable Gated Entry (The "Magic" Step)
1.  Go to **Group Info** > **Edit** > **Invite Links**.
2.  Click **Create a New Link**.
3.  **Toggle ON** "Request Admin Approval".
4.  Give it a name (e.g., "Verification Link").
5.  Click **Create**.
6.  **Copy this link**. THIS is the link you share with your community.

## Step 4: Testing the Flow
1.  Ask a friend (or use an alt account) to join using that **Invite Link**.
2.  They will see "Join Request Sent".
3.  The Bot will intercept this request and DM them:
    > "🚫 Access Denied... Click here to verify"
4.  They click the link, run `/verify`, send the transaction, and run `/i_sent_it`.
5.  Once verified, the Bot will **automatically approve** their join request!
