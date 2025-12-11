import fs from 'fs';
import path from 'path';

const DB_FILE = 'db.json';


// Initialize DB file if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ links: {}, users: {}, chatMembers: {} }));
}

export function saveLink(chatId, communityAddress) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    data.links[chatId] = communityAddress;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function getLink(chatId) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return data.links[chatId];
}

export function getAllLinks() {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return data.links;
}

export function saveUserWallet(userId, walletAddress) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.users) data.users = {};
    data.users[userId] = walletAddress;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function getUserWallet(userId) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return data.users ? data.users[userId] : null;
}

export function saveChatMember(chatId, userId) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.chatMembers) data.chatMembers = {};
    if (!data.chatMembers[chatId]) data.chatMembers[chatId] = [];

    // Avoid duplicates
    if (!data.chatMembers[chatId].includes(userId.toString())) {
        data.chatMembers[chatId].push(userId.toString());
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    }
}

export function removeChatMember(chatId, userId) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.chatMembers || !data.chatMembers[chatId]) return;

    data.chatMembers[chatId] = data.chatMembers[chatId].filter(id => id !== userId.toString());
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function getChatMembers(chatId) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return (data.chatMembers && data.chatMembers[chatId]) ? data.chatMembers[chatId] : [];
}

export function removeUserWallet(userId) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (data.users && data.users[userId]) {
        delete data.users[userId];
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    }
}
