use anchor_lang::prelude::*;
use crate::error::MemoError;
use crate::state::{MessageAccount, UserMessageIndex};
use crate::utils::pda::get_message_index_pda;

#[derive(Accounts)]
pub struct DeleteMemo<'info> {
    #[account(mut)]
    pub sender: Signer,
    
    #[account(
        mut,
        seeds = [
            b"memo",
            message_account.sender.as_ref(),
            message_account.recipient.as_ref(),
            &[] // Counter would be needed, but we'll use close instead
        ],
        bump,
        constraint = message_account.sender == sender.key() @ MemoError::UnauthorizedDeletion,
        constraint = !message_account.deleted @ MemoError::MessageAlreadyDeleted
    )]
    pub message_account: Account<'info, MessageAccount>,
    
    #[account(mut)]
    pub sender_index: Account<'info, UserMessageIndex>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DeleteMemo>) -> Result<()> {
    // Mark message as deleted
    ctx.accounts.message_account.deleted = true;

    // Remove from sender's index (optional - could keep for history)
    // For now, we'll just mark as deleted rather than removing from index
    // This allows for "undo" functionality and maintains message history

    // Emit event
    emit!(MemoDeleted {
        message_account: ctx.accounts.message_account.key(),
        sender: ctx.accounts.sender.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct MemoDeleted {
    pub message_account: Pubkey,
    pub sender: Pubkey,
    pub timestamp: i64,
}

