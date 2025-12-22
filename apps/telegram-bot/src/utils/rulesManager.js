
import { Connection } from '@solana/web3.js';
import { fetchCommunityRules } from '../solana.js';
import { cacheRules, getCachedRulesFromStorage } from '../storage.js';
import { config } from '../config.js';

// Connection instance (Shared or passed? Ideally passed or singleton)
// For now, let's create a new connection here or export a shared one from a new db/connection file?
// bot.js created the connection. Let's pass it in or import it if we separate it.
// Better: solana.js exports functions that take connection. 
// We should probably have a singleton connection in `src/solanaConnection.js` (new) or just pass it around.
// To keep it simple, I'll assume we pass `connection` to `getRules`.

const rulesCache = {}; // In-memory fallback (process level)

export async function getRules(connection, communityAddress) {
    if (!communityAddress) return null;

    // 1. Try Memory Cache (Fastest - Process Level)
    const now = Date.now();
    if (rulesCache[communityAddress] && (now - rulesCache[communityAddress].lastFetched < config.CACHE_TTL)) {
        return rulesCache[communityAddress].rules;
    }

    // 2. Fetch from Chain (The Truth)
    const rules = await fetchCommunityRules(connection, communityAddress);

    if (rules) {
        // Success: Update All Caches
        rulesCache[communityAddress] = {
            rules,
            lastFetched: now
        };
        await cacheRules(communityAddress, rules); // Persist to Redis
        return rules;
    }

    // 3. Fallback: Try Persistent Cache (Redis) if Chain failed (e.g., traffic flushed history)
    const cached = await getCachedRulesFromStorage(communityAddress);
    if (cached) {
        console.warn(`[RulesManager] Chain fetch failed/empty for ${communityAddress}. Serving from Persistent Cache.`);
        // Refresh memory cache with old data to prevent hammering Redis
        rulesCache[communityAddress] = {
            rules: cached,
            lastFetched: now
        };
        return cached;
    }

    return null;
}

export function formatRules(rules) {
    if (!rules) return "No rules set.";

    let message = `📜 *Community Rules* 📜\n\n`;

    if (rules.name) message += `🏷 *Name:* ${rules.name}\n`;
    if (rules.tokenMint) message += `💎 *Token:* \`${rules.tokenMint}\`\n`;

    if (rules.minTokenPercentage > 0) {
        message += `⚖️ *Min Holding:* ${rules.minTokenPercentage}% of Supply\n`;
    } else if (rules.minTokenBalance) {
        message += `⚖️ *Min Balance:* ${rules.minTokenBalance.toLocaleString()}\n`;
    }

    // Only show whale percentage if it exists and is greater than 0
    if (rules.whalePercentage > 0) message += `🐋 *Whale Threshold:* ${rules.whalePercentage}%\n`;

    if (rules.bannedWords && rules.bannedWords.length > 0) {
        message += `🚫 *Banned Words:* ${rules.bannedWords.join(', ')}\n`;
    }

    if (rules.imagesOnly) {
        message += `🖼 *Images Only mode is active.*\n`;
    }

    return message;
}
