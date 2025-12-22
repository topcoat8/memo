import { escapeMarkdown } from './utils/formatting.js';

export const MESSAGES = {
    ERRORS: {
        GENERIC: "❌ *System Error*\nAn internal error occurred. Please try again later.",
        INVALID_ADDRESS: "❌ *Invalid Address*\nThe Solana address you entered is not valid. Please check and try again.",
        ONLY_ADMINS: "❌ *Admin Access Only*\nThis command is reserved for group administrators.",
        ONLY_GROUP: "❌ *Group Command*\nThis command can only be used inside a group chat.",
        ONLY_DM: "❌ *Private Message Required*\nFor your privacy/security, please run this command in a private DM with me.",
        NO_WALLET: "❌ *Wallet Not Linked*\nYou must verify your wallet first.\n\n👉 Reply with `/verify <YOUR_WALLET_ADDRESS>` to start.",
        INVALID_NUMBER: "❌ *Invalid Number*\nPlease enter a valid positive number.",
        INVALID_PERCENTAGE: "❌ *Invalid Percentage*\nPercentage must be between 0 and 100.",
        UNKNOWN_CONTEXT: "⚠️ *Session Expired*\nI lost track of which group you are trying to join. Please go back to the group link and click 'Verify' again."
    },
    START: {
        WELCOME_DEEP_LINK: (address) => `👋 **Welcome to Memo Protocol**\n\nI see you are here to join the community:\n\`${escapeMarkdown(address)}\`\n\n👇 **To Get Access:**\nReply with: \`/verify <YOUR_WALLET_ADDRESS>\`\n\n*Example: /verify 8ZQ...*`,
        WELCOME_GENERAL: `👋 **Welcome to Memo Protocol**\n\n` +
            `I am your gateway to exclusive, token-gated communities on Solana.\n\n` +
            `👇 **What would you like to do?**\n\n` +
            `👤 **I want to Join a Group**\n` +
            `To join a group, you must prove you own the required tokens.\n` +
            `👉 **Action:** Reply with \`/verify <YOUR_WALLET_ADDRESS>\` to link your wallet securely.\n\n` +
            `👑 **I want to Create a Community**\n` +
            `Admins can gate their groups with $MEMO or any SPL token.\n` +
            `👉 **Action:** Reply with \`/create\` to start the setup wizard.`
    },
    VERIFY: {
        ARGUMENT_REQUIRED: '⚠️ **Missing Wallet Address**\n\nPlease reply with your wallet address to verify.\n\nUsage:\n`/verify <YOUR_WALLET_ADDRESS>`\n\n*Example: /verify 8ZQme...*',
        INSTRUCTIONS_COMMUNITY: (userWallet, communityAddress, tokenAddress, code) =>
            `🔐 **Secure Wallet Verification**\n\n` +
            `To prove you own wallet \`${userWallet}\`, we ask you to make a **Self-Transfer**.\n\n` +
            `❓ **What is a Self-Transfer?**\n` +
            `You send a tiny amount of $MEMO **to yourself**.\n` +
            `✅ Your funds never leave your wallet.\n` +
            `✅ It is 100% safe and costs almost nothing.\n\n` +
            `👇 **Step-by-Step Instructions:**\n\n` +
            `1️⃣ **Copy your Wallet Address:**\n` +
            `\`${userWallet}\`\n\n` +
            `2️⃣ **Open your Wallet App**.\n\n` +
            `3️⃣ **Send 1 $MEMO** to **YOURSELF** (paste the address above).\n\n` +
            `4️⃣ 📝 **MEMO FIELD REQUIRED**\n` +
            `You **MUST** paste this code in the "Memo" or "Note" field before sending:\n\n` +
            `\`${code}\`  👈 **COPY THIS CODE**\n\n` +
            `🚨 *If you forget the Memo, verification will fail.*\n\n` +
            `5️⃣ **Once sent, reply here with:** \`/sent\`\n\n` +
            `ℹ️ *Did you know?*\n` +
            `• Once verified, this wallet works for **any** Memo-gated group.\n` +
            `• You can verify **multiple wallets** to combine your holdings!`,
        INSTRUCTIONS_GENERAL: (userWallet, tokenAddress, code) =>
            `🔐 **Secure Wallet Verification**\n\n` +
            `To prove you own wallet \`${userWallet}\`, we ask you to make a **Self-Transfer**.\n\n` +
            `❓ **What is a Self-Transfer?**\n` +
            `You send a tiny amount of $MEMO **to yourself**.\n` +
            `✅ Your funds never leave your wallet.\n` +
            `✅ It is 100% safe and costs almost nothing.\n\n` +
            `👇 **Step-by-Step Instructions:**\n\n` +
            `1️⃣ **Copy your Wallet Address:**\n` +
            `\`${userWallet}\`\n\n` +
            `2️⃣ **Open your Wallet App**.\n\n` +
            `3️⃣ **Send 1 $MEMO** to **YOURSELF** (paste the address above).\n\n` +
            `4️⃣ 📝 **MEMO FIELD REQUIRED**\n` +
            `You **MUST** paste this code in the "Memo" or "Note" field before sending:\n\n` +
            `\`${code}\`  👈 **COPY THIS CODE**\n\n` +
            `🚨 *If you forget the Memo, verification will fail.*\n\n` +
            `5️⃣ **Once sent, reply here with:** \`/sent\`\n\n` +
            `ℹ️ *Did you know?*\n` +
            `• Once verified, this wallet works for **any** Memo-gated group.\n` +
            `• You can verify **multiple wallets** to combine your holdings!`,
        INSTRUCTIONS_AMOUNT: (userWallet, amount, communityLine = '') =>
            `🔐 **Secure Wallet Verification (Amount Method)**\n\n` +
            `Verifying: \`${userWallet}\`\n${communityLine}` +
            `This method uses a specific, unique amount of SOL to identify you, instead of a Memo.\n\n` +
            `👇 **Instructions:**\n\n` +
            `1️⃣ **Open your Wallet App**\n\n` +
            `2️⃣ **Send EXACTLY this amount to yourself**:\n` +
            `\`${amount}\` SOL\n` +
            `*(Copy that exact number)*\n\n` +
            `3️⃣ **Recipient:** Paste your OWN address (\`${userWallet}\`).\n\n` +
            `4️⃣ **Wait 30s and reply:** \`/sent\``,
        NO_PENDING: '❌ **No Verification in Progress**\n\nPlease run `/verify <YOUR_WALLET_ADDRESS>` to start.',
        SEARCHING_AMOUNT: (amount) => `🔍 **Scanning Blockchain...**\nLooking for a self-transfer of **${amount} SOL**...`,
        SEARCHING_MEMO: "🔍 **Scanning Blockchain...**\nChecking recent transactions for your Memo ID...",
        SUCCESS_SELF: (wallet) =>
            `✅ **Verified Successfully!**\n\n` +
            `Wallet: \`${wallet}\`\n\n` +
            `You have successfully linked your wallet to your account.\n\n` +
            `👉 **What's Next?**\n` +
            `• **Admins:** Run \`/create\` to start your own community.\n` +
            `• **Members:** You can now click "Join" on any Memo-gated group link.`,
        SUCCESS_GROUP: (wallet) =>
            `✅ **Access Granted!**\n\n` +
            `Wallet: \`${wallet}\`\n` +
            `Verification successful. You now have access to the community.`,
        SUCCESS_GROUP_FALLBACK: (wallet) =>
            `✅ **Verified Successfully!**\n\n` +
            `Wallet: \`${wallet}\`\n\n` +
            `Please go back to the group invite link and click **"Request to Join"** again.\n` +
            `I will automatically approve you this time!`,
        FAIL_AMOUNT: (amount, wallet) =>
            `❌ **Verification Failed**\n\n` +
            `I could not find a transfer of exactly **${amount} SOL** from \`${wallet}\`.\n\n` +
            `• Did you send the **exact** amount?\n` +
            `• Did you send it to **yourself**?\n` +
            `• Please try again or run \`/verify\` to restart.`,
        FAIL_MEMO: (wallet, userId) =>
            `❌ **Verification Failed**\n\n` +
            `I could not find the Memo code in your recent transactions.\n\n` +
            `• Wallet: \`${wallet}\`\n` +
            `• Required Memo: \`${userId}\`\n\n` +
            `Please ensure you pasted the code in the "Memo" field and sent the transaction to yourself.\n\n` +
            `👉 Run \`/verify\` to try again.`
    },
    ADMIN: {
        LINK_WRONG_CHAT: (botName) =>
            `⚠️ **Setup Step: Group Link**\n\n` +
            `You are currently in a DM. To link a community, you must be in the **Telegram Group** you want to gate.\n\n` +
            `1️⃣ **Go to your Group Chat**.\n` +
            `2️⃣ **Add me** (@${botName}) as an **Admin**.\n` +
            `3️⃣ **Type:** \`/link <YOUR_COMMUNITY_ADDRESS>\``,
        LINK_USAGE: 'Usage: `/link <community_address>`',
        RULES_NOT_FOUND: (address) =>
            `❌ **Community Not Found**\n\n` +
            `I could not find any rules for address: \`${address}\`\n\n` +
            `**Troubleshooting:**\n` +
            `• Did you paste the **Community Address** (not the token address)?\n` +
            `• Did you complete the "Activate" transaction in the wizard?\n\n` +
            `👉 Please check and try again.`,
        LINK_SUCCESS: (name) =>
            `✅ **Group Linked Successfully!**\n\n` +
            `This group is now connected to: **${escapeMarkdown(name)}**\n\n` +
            `🛠 **Critical Configuration Steps:**\n\n` +
            `1️⃣ **Restrict Invites**\n` +
            `Go to Group Permissions and **Turn OFF** "User can invite users".\n` +
            `*(Only admins and the bot should be able to add members)*\n\n` +
            `2️⃣ **Create a Secure Invite Link**\n` +
            `Create a new invite link and enable **"Request Admin Approval"**.\n\n` +
            `3️⃣ **How it works:**\n` +
            `• Share this new link with your community.\n` +
            `• If an unverified user (or someone with low balance) tries to join, I will **automatically DM them** with verification instructions.\n` +
            `• Once they verify/top-up, they can request to join again and I will auto-approve them.\n\n` +
            `View Settings: \`/rules\``,
        AUDIT_START: "🔍 **Auditing Members...**\nChecking token balances for all tracked users...",
        AUDIT_NO_MEMBERS: "ℹ️ No tracked members found in this group yet.",
        AUDIT_ERROR_RULES: "❌ **Error:** Could not fetch community rules.",
        AUDIT_PASSED: "✅ **Audit Passed**\nAll tracked members meet the token requirements.",
        AUDIT_REPORT_HEADER: (count) => `⚠️ **Compliance Report**\nFound ${count} members who no longer meet requirements:\n\n`,
        AUDIT_REPORT_FOOTER: (remaining) => `\n...and ${remaining} more.\n👉 Run \`/kick\` to remove these users.`,
        KICK_START: "🧹 **Starting Cleanup**\nRemoving non-compliant users...",
        KICK_COMPLETE: (count) => `✅ **Cleanup Complete**\nRemoved ${count} users from the group.`,
        KICK_DM: (groupName, reason) =>
            `⚠️ **Membership Update: ${groupName}**\n\n` +
            `You have been removed from the group because you no longer meet the requirements:\n` +
            `"${reason}"\n\n` +
            `You are welcome to rejoin once you acquire the required tokens!`,
        CHECK_REPLY: '⚠️ **Usage:** Please reply to a user\'s message to check their status.',
        CHECK_USER_NO_WALLET: (name) => `❌ **Status:** ${name} has not linked a wallet yet.`,
        CHECK_RESULT_HEADER: (name) => `👤 **User Report:** ${name}\n\n`,
        CHECK_RESULT_BALANCE: (balance) => `💎 **Held Balance:** ${balance}\n`,
        CHECK_RESULT_PASSED: "result: ✅ **Eligible**",
        CHECK_RESULT_FAILED: "Result: ❌ **Ineligible**"
    },
    WIZARD: {
        INSUFFICIENT_MEMO: (min, balance) =>
            `❌ **Insufficient Balance**\n\n` +
            `You need at least **${min} $MEMO** to create a community.\n` +
            `Your Balance: ${balance}`,
        START: `🛠 **Community Setup Wizard**\n\n` +
            `I will guide you through creating a decentralized Token Gated community.\n\n` +
            `ℹ️ **How it works:**\n` +
            `• We will save your community rules **on-chain** (Solana).\n` +
            `• This creates a permanent, permissionless "Burned Wallet" record.\n` +
            `• You will then link this on-chain record to your Telegram or Discord group.\n\n` +
            `🚀 *Powered by Memo Protocol*\n\n` +
            `*Type "cancel" at any time to exit.*\n\n` +
            `1️⃣ **First, what is the name of your community?**`,
        CANCEL: "❌ Setup cancelled.",
        STEP_NAME_SAVED: (name) =>
            `✅ Name: **${escapeMarkdown(name)}**\n\n` +
            `2️⃣ **What is the Token Mint Address?**\n` +
            `(This is the contract address of the token you want to require users to hold)`,
        STEP_MINT_SAVED: "✅ Token Mint saved.\n\n" +
            "3️⃣ **Set Minimum Requirement:**\n" +
            "How many tokens must a user hold to join?\n\n" +
            "• Type a number for a **Fixed Amount** (e.g., `1000`)\n" +
            "• Type a percentage for **% of Supply** (e.g., `0.5%`)",
        STEP_REQUIREMENT_SAVED: (value) =>
            `✅ Requirement: **${value}**\n\n` +
            "4️⃣ **Jeet Mode 📉**\n" +
            "If enabled, the bot will call out users who speak with a lower balance than the last time they spoke.\n\n" +
            "Reply with `Yes` or `No`.",
        STEP_JEET_SAVED: (enabled) =>
            `✅ Jeet Mode: **${enabled ? 'ON' : 'OFF'}**\n\n` +
            "5️⃣ **Whale Badge (Optional)**\n" +
            "Users holding more than this % will get a special 🐋 badge.\n" +
            "Enter a percentage (0-100), or `0` to skip.",
        INVALID_RANGE: "❌ Please enter a number between 0 and 100.",
        COMPLETE: (address, jsonString) =>
            "🎉 **Configuration Ready!**\n\n" +
            "To activate your community, you must save these rules on-chain.\n\n" +
            "👇 **Activation Instruction:**\n\n" +
            "1️⃣ **Copy Community Address:**\n" +
            `\`${address}\`\n\n` +
            "2️⃣ **Copy Rule Data:**\n" +
            `\`${jsonString}\`\n\n` +
            "3️⃣ **Send 1 $MEMO** to the Community Address.\n" +
            "⚠️ **IMPORTANT:** You **MUST** paste the Rule Data into the **Memo** field of this transaction.\n\n" +
            "------------------------------------------------\n\n" +
            "✅ **After you send the transaction:**\n" +
            "1. Go to your Telegram Group.\n" +
            "2. Make me an Admin.\n" +
            "3. Run: `/link ${address}`\n\n" +
            "👉 **Need Help?** Run `/help` in the chat for a full list of admin commands."
    },
    ENFORCEMENT: {
        VERIFY_WARNING: (chatTitle, verifyUrl, requirementText) =>
            `⚠️ **Verification Required**\n\n` +
            `To chat in **${escapeMarkdown(chatTitle)}**, you must verify your holdings.\n` +
            `**Requirement:** ${requirementText}\n\n` +
            `👉 [Click here to Verify](${verifyUrl})`,
        INSUFFICIENT_BALANCE: (required, isPercent) =>
            `⚠️ **Insufficient Balance**\n\n` +
            `Your wallet is verified, but you need more tokens to speak here.\n\n` +
            `**Required:** ${required} ${isPercent ? '% of supply' : 'tokens'}\n` +
            `Please top up your wallet!`,
        BANNED_WORD: (word) => `⚠️ Message deleted. Contains banned word: "${escapeMarkdown(word)}"`,
        IMAGES_ONLY: `⚠️ Message deleted. This channel is for images/media only.`,
        JEET_ALERT: (mention, oldBalance, newBalance) =>
            `📉 **JEET ALERT:** ${mention}\n\n` +
            `You are poorer than the last time you spoke.\n` +
            `Last Balance: ${oldBalance}\n` +
            `Current Balance: ${newBalance}\n\n` +
            `*Do better.*`
    },
    JOIN: {
        DENIED_DM: (chatTitle, verifyUrl, requirementText) =>
            `🚫 **Access Denied: ${escapeMarkdown(chatTitle)}**\n\n` +
            `You need to verify your wallet to join this group.\n` +
            `**Requirement:** ${requirementText}\n\n` +
            `1️⃣ [Click here to Verify](${verifyUrl})\n` +
            `2️⃣ Complete the self-transfer instructions.\n` +
            `3️⃣ Request to join again!`,
        APPROVED: (chatTitle) => `✅ **Approved!**\nWelcome to ${escapeMarkdown(chatTitle)}!`,
        DENIED_REASON: (chatTitle, reason) =>
            `🚫 **Access Denied: ${escapeMarkdown(chatTitle)}**\n\n` +
            `You do not meet the requirements:\n` +
            `${reason}`,
        REASON_PERCENT: (reqPercent, reqAmount, userBalance) => `• Required: ${reqPercent}% (${reqAmount} tokens)\n• You have: ${userBalance}`,
        REASON_AMOUNT: (reqAmount, userBalance) => `• Required: ${reqAmount} tokens\n• You have: ${userBalance}`
    },
    WELCOME: {
        BALANCE: (amount) => `\n💰 **Balance:** ${amount}`,
        WHALE: `\n🐋 **WHALE DETECTED** 🐋`,
        UNVERIFIED: (required, isPercent) =>
            `\n⚠️ **Unverified**\n` +
            `You cannot chat until you match the requirements:\n` +
            `Required: ${required} ${isPercent ? '% of supply' : 'tokens'}\n\n` +
            `👉 DM me with \`/verify\` to link your wallet.`,
        MAIN: (mention, balanceMsg) => `👋 Welcome ${mention}!${balanceMsg}`
    }
};
