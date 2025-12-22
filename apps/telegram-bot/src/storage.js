import fs from 'fs'; // Keep for local dev
import Redis from 'ioredis';

// Initialize Redis client if REDIS_URL exists
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

const DB_FILE = '/tmp/db.json';

// Simple Mutex for Local File Access
class Mutex {
    constructor() { this.queue = Promise.resolve(); }
    lock(callback) {
        const next = this.queue.then(callback);
        this.queue = next.catch(() => { });
        return next;
    }
}
const dbLock = new Mutex();

/**
 * Access local DB file safely.
 * @param {Function} callback - (data) => Promise<any> or any
 * @param {boolean} write - save data back to file?
 */
async function withLocalLock(callback, write = false) {
    return dbLock.lock(async () => {
        let data = { links: {}, users: {}, chatMembers: {}, polls: {}, poll_votes: {}, poll_map: {}, locked_amounts: {}, pending: {}, pendingJoin: {}, wizard: {} };
        if (fs.existsSync(DB_FILE)) {
            try {
                data = { ...data, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) };
            } catch (e) { console.error("DB Read Error:", e); }
        }

        const result = await callback(data);

        if (write) {
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        }
        return result;
    });
}




export async function saveLink(chatId, communityAddress) {
    if (redis) {
        await redis.hset('links', chatId.toString(), communityAddress);
    } else {
        await withLocalLock(data => {
            data.links[chatId] = communityAddress;
        }, true);
    }
}

export async function getLink(chatId) {
    if (redis) {
        return await redis.hget('links', chatId.toString());
    } else {
        return await withLocalLock(data => data.links[chatId]);
    }
}

export async function getAllLinks() {
    if (redis) {
        return await redis.hgetall('links') || {};
    } else {
        return await withLocalLock(data => data.links);
    }
}

export async function saveUserWallet(userId, walletAddress) {
    const uid = userId.toString();
    // Get existing wallets
    let wallets = await getUserWallets(uid);

    // Add if not exists
    if (!wallets.includes(walletAddress)) {
        wallets.push(walletAddress);

        // Save back as JSON string
        const value = JSON.stringify(wallets);

        if (redis) {
            await redis.hset('users', uid, value);
        } else {
            await withLocalLock(data => {
                data.users[uid] = value;
            }, true);
        }
    }
}

/**
 * Returns the primary wallet (first one) for backward compatibility.
 */
export async function getUserWallet(userId) {
    const wallets = await getUserWallets(userId);
    return wallets.length > 0 ? wallets[0] : null;
}

/**
 * Returns all linked wallets for a user.
 * Handles both legacy (string) and new (JSON array) formats.
 */
export async function getUserWallets(userId) {
    let raw;
    if (redis) {
        raw = await redis.hget('users', userId.toString());
    } else {
        raw = await withLocalLock(data => data.users[userId]);
    }

    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch (e) {
        // Not JSON, assume legacy string (single wallet)
    }

    return [raw];
}

export async function unlinkWallet(userId, walletAddress) {
    const uid = userId.toString();
    let wallets = await getUserWallets(uid);

    // Filter out the wallet to remove
    const newWallets = wallets.filter(w => w !== walletAddress);

    if (newWallets.length === wallets.length) return; // No change

    if (newWallets.length === 0) {
        // If no wallets left, remove the user entry entirely?
        // Or keep empty array? Let's remove user entry to mock 'unverified' state.
        await removeUserWallet(uid);
    } else {
        const value = JSON.stringify(newWallets);
        if (redis) {
            await redis.hset('users', uid, value);
        } else {
            await withLocalLock(data => {
                data.users[uid] = value;
            }, true);
        }
    }
}

export async function saveChatMember(chatId, userId) {
    const uid = userId.toString();
    const cid = chatId.toString();

    if (redis) {
        // chatMembers: { chatId: "[uid1, uid2]" } -> Stored as JSON string
        // Get current members
        let membersStr = await redis.hget('chatMembers', cid);
        let members = [];
        try {
            members = membersStr ? JSON.parse(membersStr) : [];
        } catch (e) { }

        if (!members.includes(uid)) {
            members.push(uid);
            await redis.hset('chatMembers', cid, JSON.stringify(members));
        }
    } else {
        await withLocalLock(data => {
            if (!data.chatMembers[cid]) data.chatMembers[cid] = [];
            if (!data.chatMembers[cid].includes(uid)) {
                data.chatMembers[cid].push(uid);
            }
        }, true);
    }
}

export async function removeChatMember(chatId, userId) {
    const uid = userId.toString();
    const cid = chatId.toString();

    if (redis) {
        let membersStr = await redis.hget('chatMembers', cid);
        let members = [];
        try {
            members = membersStr ? JSON.parse(membersStr) : [];
        } catch (e) { }

        const newMembers = members.filter(id => id !== uid);
        await redis.hset('chatMembers', cid, JSON.stringify(newMembers));
    } else {
        await withLocalLock(data => {
            if (data.chatMembers && data.chatMembers[cid]) {
                data.chatMembers[cid] = data.chatMembers[cid].filter(id => id !== uid);
            }
        }, true);
    }
}

export async function getChatMembers(chatId) {
    const cid = chatId.toString();
    if (redis) {
        let membersStr = await redis.hget('chatMembers', cid);
        try {
            return membersStr ? JSON.parse(membersStr) : [];
        } catch (e) {
            return [];
        }
    } else {
        return await withLocalLock(data => (data.chatMembers && data.chatMembers[cid]) ? data.chatMembers[cid] : []);
    }
}

export async function removeUserWallet(userId) {
    const uid = userId.toString();
    if (redis) {
        await redis.hdel('users', uid);
    } else {
        await withLocalLock(data => {
            if (data.users && data.users[uid]) {
                delete data.users[uid];
            }
        }, true);
    }
}

// Locked Amounts Storage
export async function saveLockedAmount(chatId, amount, link) {
    const cid = chatId.toString();
    const entry = { amount, link, date: Date.now() };

    // Get existing to append
    let currentLocked = await getLockedAmounts(cid);
    currentLocked.push(entry);

    const value = JSON.stringify(currentLocked);

    if (redis) {
        await redis.hset('locked_amounts', cid, value);
    } else {
        await withLocalLock(data => {
            if (!data.locked_amounts) data.locked_amounts = {};
            data.locked_amounts[cid] = value;
        }, true);
    }
}

export async function getLockedAmounts(chatId) {
    const cid = chatId.toString();
    let raw;
    if (redis) {
        raw = await redis.hget('locked_amounts', cid);
    } else {
        raw = await withLocalLock(data => data.locked_amounts ? data.locked_amounts[cid] : null);
    }

    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

export async function removeLockedAmount(chatId, index) {
    const cid = chatId.toString();
    let currentLocked = await getLockedAmounts(cid);

    if (index >= 0 && index < currentLocked.length) {
        currentLocked.splice(index, 1);

        const value = JSON.stringify(currentLocked);
        if (redis) {
            await redis.hset('locked_amounts', cid, value);
        } else {
            await withLocalLock(data => {
                if (!data.locked_amounts) data.locked_amounts = {};
                data.locked_amounts[cid] = value;
            }, true);
        }
        return true;
    }
    return false;
}

// Temporary pending verification storage (for creator flow)
export async function savePendingVerification(userId, walletAddress, amount = null) {
    const value = JSON.stringify({ wallet: walletAddress, amount });
    if (redis) {
        await redis.set(`pending:${userId}`, value, 'EX', 3600); // Expire in 1 hour
    } else {
        await withLocalLock(data => {
            if (!data.pending) data.pending = {};
            data.pending[userId] = value;
        }, true);
    }
}

export async function getPendingVerification(userId) {
    let raw;
    if (redis) {
        raw = await redis.get(`pending:${userId}`);
    } else {
        raw = await withLocalLock(data => data.pending ? data.pending[userId] : null);
    }

    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        // Check if it's our new object format
        if (typeof parsed === 'object' && parsed.wallet) {
            return parsed; // Returns { wallet, amount }
        }
        return { wallet: raw, amount: null }; // Fallback for old string format
    } catch (e) {
        return { wallet: raw, amount: null }; // Fallback for raw string
    }
}

// Pending Join Context (Community Address) - Persistent for Serverless
export async function savePendingJoin(userId, communityAddress) {
    if (redis) {
        await redis.set(`join:${userId}`, communityAddress, 'EX', 3600); // 1 hour TTL
    } else {
        await withLocalLock(data => {
            if (!data.pendingJoin) data.pendingJoin = {};
            data.pendingJoin[userId] = communityAddress;
        }, true);
    }
}

export async function getPendingJoin(userId) {
    if (redis) {
        return await redis.get(`join:${userId}`);
    } else {
        return await withLocalLock(data => data.pendingJoin ? data.pendingJoin[userId] : null);
    }
}

// Wizard Session Persistence
export async function saveWizardSession(userId, sessionData) {
    if (redis) {
        await redis.set(`wizard:${userId}`, JSON.stringify(sessionData), 'EX', 3600);
    } else {
        await withLocalLock(data => {
            if (!data.wizard) data.wizard = {};
            data.wizard[userId] = sessionData;
        }, true);
    }
}

export async function getWizardSession(userId) {
    if (redis) {
        const data = await redis.get(`wizard:${userId}`);
        return data ? JSON.parse(data) : null;
    } else {
        return await withLocalLock(data => data.wizard ? data.wizard[userId] : null);
    }
}

export async function deleteWizardSession(userId) {
    if (redis) {
        await redis.del(`wizard:${userId}`);
    } else {
        await withLocalLock(data => {
            if (data.wizard && data.wizard[userId]) {
                delete data.wizard[userId];
            }
        }, true);
    }
}

// Rules Caching
export async function cacheRules(communityAddress, rules) {
    if (redis) {
        await redis.set(`rules:${communityAddress}`, JSON.stringify(rules)); // Persistent
    } else {
        // Fallback or no-op for local file?
        // Let's implement an in-memory or file-based cache if needed, 
        // but for now, the original bot.js had in-memory `rulesCache`.
        // We can just rely on the caller to handle in-memory if no redis, 
        // OR we can implement it here.
        // For simplicity and alignment with the plan "Replacing in-memory caches", 
        // let's stick to Redis. If no Redis, maybe we just don't cache persistently here
        // and let the app re-fetch. 
        // ACTUALLY, let's keep it simple: No Redis = No persistent cache = Re-fetch (or rely on existing in-memory in app if we kept it).
        // BUT the plan says "Ensure storage.js supports Redis...".
    }
}

export async function getCachedRulesFromStorage(communityAddress) {
    if (redis) {
        const data = await redis.get(`rules:${communityAddress}`);
        return data ? JSON.parse(data) : null;
    }
    return null;
}


// Polls and Voting Storage
export async function savePoll(pollId, pollData) {
    const value = JSON.stringify(pollData);
    if (redis) {
        await redis.set(`poll:${pollId}`, value);
    } else {
        await withLocalLock(data => {
            data.polls[pollId] = value;
        }, true);
    }
}

export async function getPoll(pollId) {
    let raw;
    if (redis) {
        raw = await redis.get(`poll:${pollId}`);
    } else {
        await withLocalLock(data => {
            raw = data.polls[pollId];
        });
    }
    return raw ? JSON.parse(raw) : null;
}

export async function saveVote(pollId, userId, optionIndex) {
    const key = `poll_votes:${pollId}`;
    if (redis) {
        await redis.hset(key, userId, optionIndex);
    } else {
        await withLocalLock(data => {
            if (!data.poll_votes[pollId]) data.poll_votes[pollId] = {};
            data.poll_votes[pollId][userId] = optionIndex;
        }, true);
    }
}

export async function getPollVotes(pollId) {
    if (redis) {
        return await redis.hgetall(`poll_votes:${pollId}`);
    } else {
        return await withLocalLock(data => {
            return data.poll_votes[pollId] || {};
        });
    }
}

export async function savePollIdMapping(chatId, messageId, pollId) {
    const key = `poll_map:${chatId}:${messageId}`;
    if (redis) {
        await redis.set(key, pollId, 'EX', 604800); // Expire in 7 days
    } else {
        await withLocalLock(data => {
            data.poll_map[`${chatId}:${messageId}`] = pollId;
        }, true);
    }
}


export async function getPollIdFromMessage(chatId, messageId) {
    const key = `poll_map:${chatId}:${messageId}`;
    if (redis) {
        return await redis.get(key);
    } else {
        return await withLocalLock(data => {
            return data.poll_map[`${chatId}:${messageId}`];
        });
    }
}

// Toxic Mode Storage
export async function saveLastSpokeBalance(chatId, userId, balance) {
    const key = `last_balance:${chatId}:${userId}`;
    if (redis) {
        await redis.set(key, balance.toString());
    } else {
        await withLocalLock(data => {
            if (!data.last_balance) data.last_balance = {};
            data.last_balance[`${chatId}:${userId}`] = balance;
        }, true);
    }
}

export async function getLastSpokeBalance(chatId, userId) {
    const key = `last_balance:${chatId}:${userId}`;
    let raw;
    if (redis) {
        raw = await redis.get(key);
    } else {
        raw = await withLocalLock(data => data.last_balance ? data.last_balance[`${chatId}:${userId}`] : null);
    }
    return raw ? parseFloat(raw) : null;
}

