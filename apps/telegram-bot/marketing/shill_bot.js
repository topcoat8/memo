import 'dotenv/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { tweets } from './shill_messages.js';

puppeteer.use(StealthPlugin());

// --- CONFIGURATION ---
const HISTORY_FILE = path.join(process.cwd(), 'marketing', 'shill_history.json');
const COOKIES_FILE = path.join(process.cwd(), 'marketing', 'twitter_cookies.json');
const INTERVAL_MINUTES = 5;
const DEXSCREENER_API = 'https://api.dexscreener.com/token-boosts/latest/v1';

// We run non-headless by default for debugging/visual presence, unless specified
const HEADLESS = process.env.HEADLESS === 'true';

// Check for Credentials
const USERNAME = process.env.TWITTER_USERNAME;
const PASSWORD = process.env.TWITTER_PASSWORD;
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!USERNAME || !PASSWORD) {
    console.error("❌ Missing TWITTER_USERNAME or TWITTER_PASSWORD in .env.");
    if (!DRY_RUN) process.exit(1);
}

// --- STATE MANAGEMENT ---
function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        }
    } catch (e) { console.error("Error loading history:", e); }
    return { contacted: [] };
}

function saveHistory(history) {
    try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2)); }
    catch (e) { console.error("Error saving history:", e); }
}

// --- LOGIC ---
async function fetchNewTokens() {
    try {
        console.log(`🔎 Fetching boosted tokens from DexScreener...`);
        const response = await axios.get(DEXSCREENER_API);
        const tokensWithTwitter = response.data.filter(item => {
            return item.links && item.links.some(link => link.type === 'twitter');
        });
        console.log(`✅ Found ${tokensWithTwitter.length} boosted tokens with Twitter links.`);
        return tokensWithTwitter;
    } catch (e) {
        console.error("❌ Error fetching from DexScreener:", e.message);
        return [];
    }
}

function extractTwitterHandle(links) {
    const twitterLink = links.find(l => l.type === 'twitter');
    if (!twitterLink) return null;
    const cleanUrl = twitterLink.url.split('?')[0];
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1];
}

function getRandomTweet(handle) {
    const template = tweets[Math.floor(Math.random() * tweets.length)];
    return template.replace('{handle}', handle);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- PUPPETEER ACTIONS ---

async function setupBrowser() {
    console.log("🖥 Launching Browser...");
    const browser = await puppeteer.launch({
        headless: HEADLESS,
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Load cookies if available
    if (fs.existsSync(COOKIES_FILE)) {
        const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE));
        await page.setCookie(...cookies);
        console.log("🍪 Loaded cookies.");
    }

    return { browser, page };
}

async function login(page) {
    console.log("🔑 Checking login status...");
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });

    // Check if we are redirected to login or stay on home
    if (!page.url().includes('home')) {
        console.log("⚠️ Not on home page. Attempting login...");
        await page.goto('https://x.com/i/flow/login', { waitUntil: 'networkidle2' });

        // --- STEP 1: USERNAME ---
        try {
            console.log("👉 Waiting for username input...");
            const usernameInput = await page.waitForSelector('input[autocomplete="username"]', { visible: true, timeout: 10000 });
            await usernameInput.type(USERNAME, { delay: 100 });

            // Find and click "Next" button strictly
            console.log("👉 Clicking Next...");
            const buttons = await page.$$('button[role="button"]');
            let nextClicked = false;
            for (const btn of buttons) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text.includes('Next')) {
                    await btn.click();
                    nextClicked = true;
                    break;
                }
            }
            if (!nextClicked) {
                console.log("⚠️ 'Next' button not found, trying Enter key...");
                await page.keyboard.press('Enter');
            }
        } catch (e) {
            console.error("❌ Failed at username step:", e.message);
            throw e;
        }

        // --- STEP 2: PASSWORD or UNUSUAL ACTIVITY ---
        // Wait for *either* password input or some other field (like email/phone)
        try {
            console.log("⏳ Waiting for password input...");
            // We wait for the password input to become visible. 
            // If there's an intermediate page (unusual activity), this might timeout, so we should handle that.

            // Wait up to 5s for password. If not found, check for other inputs.
            try {
                await page.waitForSelector('input[name="password"]', { visible: true, timeout: 5000 });
            } catch (pwdErr) {
                console.log("🤔 Password input not found immediately. Checking for verification challenge...");
                // Check for email/phone input
                const challengeInput = await page.$('input[name="text"]');
                if (challengeInput) {
                    console.log("⚠️ Verification challenge detected! Please enter email/phone/username manually in the browser window if HEADLESS=false.");
                    // For now, if automated, we might fail here. 
                    // Let's assume user might have 2FA and needs to interact.
                    if (HEADLESS) throw new Error("Verification challenge in headless mode. Run with HEADLESS=false.");
                    // wait longer
                    await page.waitForSelector('input[name="password"]', { visible: true, timeout: 60000 });
                } else {
                    throw pwdErr;
                }
            }

            console.log("👉 Entering password...");
            await page.type('input[name="password"]', PASSWORD, { delay: 100 });

            console.log("👉 Clicking Log in...");
            const loginButtons = await page.$$('button[role="button"]');
            let loginClicked = false;
            for (const btn of loginButtons) {
                const text = await page.evaluate(el => el.textContent, btn);
                if (text.includes('Log in')) {
                    await btn.click();
                    loginClicked = true;
                    break;
                }
            }
            if (!loginClicked) await page.keyboard.press('Enter');

        } catch (e) {
            console.error("❌ Failed at password step:", e.message);
            throw e;
        }

        // --- STEP 3: WAIT FOR HOME ---
        console.log("⏳ Waiting for successful login...");
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        // Save Cookies
        const cookies = await page.cookies();
        fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
        console.log("💾 Saved new cookies.");
    } else {
        console.log("✅ Already logged in.");
    }
}

async function followUser(page, handle) {
    try {
        console.log(`👤 Navigating to profile: @${handle}`);
        await page.goto(`https://x.com/${handle}`, { waitUntil: 'networkidle2' });
        await sleep(2000);

        // Look for Follow button
        // The text might be "Follow" or "Following"
        const followButton = await page.$('button[aria-label^="Follow"]');
        if (followButton) {
            const label = await page.evaluate(el => el.getAttribute('aria-label'), followButton);
            if (label.includes(`Follow @${handle}`)) {
                console.log(`➕ Clicking Follow button...`);
                await followButton.click();
                await sleep(1000);
            } else {
                console.log(`ℹ️ Already following.`);
            }
        } else {
            console.log(`⚠️ Could not find explicit Follow button (maybe already following or blocked).`);
        }
    } catch (e) {
        console.error(`❌ Error in followUser: ${e.message}`);
    }
}

async function tweetAtUser(page, tweetText) {
    try {
        console.log(`📝 Composing tweet...`);
        // Navigate directly to compose? Or use the button?
        // Using intent URL is safer/easier
        const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        await page.goto(intentUrl, { waitUntil: 'networkidle2' });

        // Wait for Post button
        const postSelector = '[data-testid="tweetButton"]';
        await page.waitForSelector(postSelector, { visible: true, timeout: 15000 });

        // Click Post
        await page.click(postSelector);
        console.log("📨 Tweet posted successfully.");
        await sleep(3000); // Wait for post to send
    } catch (e) {
        console.error(`❌ Error in tweetAtUser: ${e.message}`);
    }
}

async function processQueue() {
    const history = loadHistory();
    let { browser, page } = await setupBrowser();

    // Only try login if not DRY RUN
    if (!DRY_RUN) {
        await login(page);
    }

    let queue = await fetchNewTokens();

    while (true) {
        if (queue.length === 0) {
            console.log("Empty queue. Fetching more...");
            const newTokens = await fetchNewTokens();
            const freshTokens = newTokens.filter(t => !history.contacted.includes(`${t.chainId}:${t.tokenAddress}`));

            if (freshTokens.length === 0) {
                console.log("💤 No new tokens. Sleeping 2 mins...");
                await sleep(2 * 60 * 1000);
                continue;
            }
            queue = freshTokens;
        }

        const token = queue.shift();
        const id = `${token.chainId}:${token.tokenAddress}`;

        if (history.contacted.includes(id)) continue;

        const handle = extractTwitterHandle(token.links);
        if (!handle) {
            history.contacted.push(id); saveHistory(history); continue;
        }

        const tweetText = getRandomTweet(handle);

        console.log(`\n-----------------------------------`);
        console.log(`🎯 Targeting: ${handle}`);

        if (DRY_RUN) {
            console.log(`[DRY RUN] Would follow & tweet: "${tweetText}"`);
            history.contacted.push(id);
            saveHistory(history);
        } else {
            // Execute Actions
            await followUser(page, handle);
            await tweetAtUser(page, tweetText);

            history.contacted.push(id);
            saveHistory(history);
        }

        console.log(`⏳ Waiting ${INTERVAL_MINUTES} minutes...`);
        await sleep(INTERVAL_MINUTES * 60 * 1000);

        // Reload page to keep session alive?
        if (!DRY_RUN) await page.reload();
    }
}

console.log(`🚀 Shill Bot (Puppeteer) Starting...`);
processQueue().catch(console.error);
