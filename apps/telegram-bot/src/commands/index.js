
import { handleStart } from './start.js';
import { handleVerify, handleSent, handleVerifyAmount } from './verify.js';
import { handleLink, handleCheck, handleCreate, handleAudit, handleKick, handleExport, handleAddLocked, handleRemoveLocked } from './admin.js';
import { handleRules, handleMyStatus, handleLeaderboard } from './info.js';
import { handleHelp } from './help.js';
import { handleLocked } from './locked.js';
import { handleSupply } from './supply.js';
import { handleChatJoinRequest } from '../events/joinRequest.js';
import { handleMessage } from '../events/messageHandler.js';
import { handleLeftChatMember, handleNewChatMembers } from '../events/memberUpdates.js';

// Polls
import { pollCommand, handleVote } from './poll.js';
import { tallyCommand } from './tally.js'; // Will create next

export function registerCommands(bot, connection) {
    // Commands
    bot.command('start', (ctx) => handleStart(ctx));
    bot.command('verify', (ctx) => handleVerify(ctx));
    bot.command('sent', (ctx) => handleSent(ctx, connection));
    bot.command('help', (ctx) => handleHelp(ctx));

    // Polls
    // Matches: /poll "Question" ...
    // Note: Telegraf's .command() splits args automatically in ctx.args? 
    // But pollCommand uses regex on match[1].
    // We should use .hears? Or just .command and handle ctx.message.text manually?
    // Using RegExp for command to capture everything after /poll
    bot.hears(/^\/poll\s+(.+)/, pollCommand);

    // Fallback if they just type /poll without args
    bot.command('poll', (ctx) => ctx.reply("Usage: /poll \"Question\" \"Option1\" \"Option2\""));

    bot.command('tally', (ctx) => tallyCommand(ctx, connection));

    // Callback Actions
    // Handle Votes: Matches literal `{"t":"v"` in JSON string
    bot.action(/{"t":"v"/, (ctx) => handleVote(ctx));

    bot.action(/^verify_amount:(.+)$/, async (ctx) => {
        const wallet = ctx.match[1];
        await handleVerifyAmount(ctx, wallet);
        return ctx.answerCbQuery();
    });

    bot.command('link', (ctx) => handleLink(ctx, connection));
    // bot.command('unverified', (ctx) => handleUnverified(ctx)); // Deprecated
    bot.command('check', (ctx) => handleCheck(ctx, connection));
    bot.command('create', (ctx) => handleCreate(ctx, connection));

    // Updated Admin commands
    bot.command('audit', (ctx) => handleAudit(ctx, connection));
    bot.command('kick', (ctx) => handleKick(ctx, connection));
    bot.command('export', (ctx) => handleExport(ctx, connection));

    // Locked Amounts
    bot.command('locked', (ctx) => handleLocked(ctx));
    bot.command('addlocked', (ctx) => handleAddLocked(ctx));
    bot.command('removelocked', (ctx) => handleRemoveLocked(ctx));
    bot.command('supply', (ctx) => handleSupply(ctx, connection));

    bot.command('rules', (ctx) => handleRules(ctx, connection));
    bot.command('mystatus', (ctx) => handleMyStatus(ctx, connection));
    bot.command('leaderboard', (ctx) => handleLeaderboard(ctx, connection));
    bot.command('ping', (ctx) => ctx.reply('Pong! 🏓 (Bot is alive)'));

    // Events
    bot.on('chat_join_request', (ctx) => handleChatJoinRequest(ctx, connection));
    bot.on('left_chat_member', (ctx) => handleLeftChatMember(ctx));
    bot.on('new_chat_members', (ctx) => handleNewChatMembers(ctx, connection));

    // Message Handler (Wizard + Enforcement)
    // Note: 'text' matches text messages. 'message' matches all messages including media.
    // 'text' is safer for wizard, 'message' needed for "Images Only" enforcement.
    // Telegraf middleware chain:
    bot.on('message', (ctx, next) => handleMessage(ctx, next, connection));
}
