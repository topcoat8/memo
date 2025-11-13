use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use crate::error::MemoError;
use crate::state::{MessageAccount, UserMessageCounter, UserMessageIndex};
use crate::utils::pda::{get_message_counter_pda, get_message_index_pda, get_message_pda};

#[derive(Accounts)]
pub struct SendMemo<'info> {
    #[account(mut)]
    pub sender: Signer,
    
    /// CHECK: Recipient is validated but doesn't need to sign
    pub recipient: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = sender,
        space = MessageAccount::SPACE
    )]
    pub message_account: Account<'info, MessageAccount>,
    
    #[account(
        init_if_needed,
        payer = sender,
        space = UserMessageCounter::SPACE,
        seeds = [b"memo", b"counter", sender.key.as_ref()],
        bump
    )]
    pub counter_account: Account<'info, UserMessageCounter>,
    
    #[account(
        init_if_needed,
        payer = sender,
        space = UserMessageIndex::SPACE,
        seeds = [b"memo", b"index", sender.key.as_ref()],
        bump
    )]
    #[account(mut)]
    pub sender_index: Account<'info, UserMessageIndex>,
    
    #[account(
        init_if_needed,
        payer = sender,
        space = UserMessageIndex::SPACE,
        seeds = [b"memo", b"index", recipient.key.as_ref()],
        bump
    )]
    #[account(mut)]
    pub recipient_index: Account<'info, UserMessageIndex>,
    
    // Token mint and accounts for $MEMO token receipt
    #[account(
        seeds = [b"memo", b"mint"],
        bump
    )]
    pub memo_mint_config: Account<'info, MemoTokenMint>,
    
    #[account(
        mut,
        address = memo_mint_config.mint @ MemoError::InvalidMessageAccount,
    )]
    pub memo_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = sender,
        token::mint = memo_mint,
        token::authority = recipient,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SendMemo>,
    encrypted_content: Vec<u8>,
    nonce: [u8; 24],
) -> Result<()> {
    // Validate message length
    if encrypted_content.len() > MessageAccount::MAX_CONTENT_SIZE {
        return Err(MemoError::MessageTooLong.into());
    }

    // Validate recipient
    if ctx.accounts.recipient.key() == ctx.accounts.sender.key() {
        return Err(MemoError::InvalidRecipient.into());
    }

    // Initialize counter if needed
    if ctx.accounts.counter_account.user == Pubkey::default() {
        ctx.accounts.counter_account.user = ctx.accounts.sender.key();
        ctx.accounts.counter_account.counter = 0;
    }

    // Get current counter value and increment
    let current_counter = ctx.accounts.counter_account.counter;
    ctx.accounts.counter_account.counter = ctx.accounts
        .counter_account
        .counter
        .checked_add(1)
        .ok_or(MemoError::CounterOverflow)?;

    // Verify the message account PDA matches the expected derivation
    let (expected_pda, _bump) = get_message_pda(
        &ctx.accounts.sender.key(),
        &ctx.accounts.recipient.key(),
        current_counter,
        ctx.program_id,
    );
    
    require!(
        ctx.accounts.message_account.key() == expected_pda,
        MemoError::PdaDerivationFailed
    );

    // Initialize sender index if needed
    if ctx.accounts.sender_index.message_pdas.is_empty() {
        ctx.accounts.sender_index.user = ctx.accounts.sender.key();
        ctx.accounts.sender_index.message_pdas = Vec::new();
        ctx.accounts.sender_index.total_count = 0;
    }

    // Initialize recipient index if needed
    if ctx.accounts.recipient_index.message_pdas.is_empty() {
        ctx.accounts.recipient_index.user = ctx.accounts.recipient.key();
        ctx.accounts.recipient_index.message_pdas = Vec::new();
        ctx.accounts.recipient_index.total_count = 0;
    }

    // Update message account
    let clock = Clock::get()?;
    ctx.accounts.message_account.sender = ctx.accounts.sender.key();
    ctx.accounts.message_account.recipient = ctx.accounts.recipient.key();
    ctx.accounts.message_account.encrypted_content = encrypted_content;
    ctx.accounts.message_account.timestamp = clock.unix_timestamp;
    ctx.accounts.message_account.nonce = nonce;
    ctx.accounts.message_account.deleted = false;

    // Add message PDA to sender's index
    if ctx.accounts.sender_index.message_pdas.len() < UserMessageIndex::MAX_MESSAGES {
        ctx.accounts.sender_index.message_pdas.push(ctx.accounts.message_account.key());
        ctx.accounts.sender_index.total_count = ctx.accounts.sender_index.total_count.checked_add(1).unwrap_or(u32::MAX);
    }
    ctx.accounts.sender_index.last_updated = clock.unix_timestamp;

    // Add message PDA to recipient's index
    if ctx.accounts.recipient_index.message_pdas.len() < UserMessageIndex::MAX_MESSAGES {
        ctx.accounts.recipient_index.message_pdas.push(ctx.accounts.message_account.key());
        ctx.accounts.recipient_index.total_count = ctx.accounts.recipient_index.total_count.checked_add(1).unwrap_or(u32::MAX);
    }
    ctx.accounts.recipient_index.last_updated = clock.unix_timestamp;

    // Mint $MEMO token receipt to recipient (1 token per message)
    // The mint authority should be the memo_mint_config PDA
    // First, verify the mint config is initialized
    require!(
        ctx.accounts.memo_mint_config.initialized,
        MemoError::InvalidMessageAccount
    );
    require!(
        ctx.accounts.memo_mint_config.mint == ctx.accounts.memo_mint.key(),
        MemoError::InvalidMessageAccount
    );
    
    // Derive the mint config PDA for signing
    let memo_mint_config_seeds = &[
        b"memo",
        b"mint",
        &[ctx.bumps.get("memo_mint_config").copied().unwrap_or(0)],
    ];
    let signer = &[&memo_mint_config_seeds[..]];
    
    let cpi_accounts = MintTo {
        mint: ctx.accounts.memo_mint.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.memo_mint_config.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::mint_to(cpi_ctx, 1)?; // Mint 1 $MEMO token as receipt

    // Emit event
    emit!(MemoSent {
        sender: ctx.accounts.sender.key(),
        recipient: ctx.accounts.recipient.key(),
        message_account: ctx.accounts.message_account.key(),
        timestamp: clock.unix_timestamp,
        memo_tokens_minted: 1,
    });

    Ok(())
}

#[event]
pub struct MemoSent {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub message_account: Pubkey,
    pub timestamp: i64,
    pub memo_tokens_minted: u64,
}

