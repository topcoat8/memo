use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token};
use crate::state::MemoTokenMint;

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(mut)]
    pub payer: Signer,
    
    #[account(
        init,
        payer = payer,
        space = MemoTokenMint::SPACE,
        seeds = [b"memo", b"mint"],
        bump
    )]
    pub memo_mint_config: Account<'info, MemoTokenMint>,
    
    /// The SPL token mint for $MEMO tokens
    /// This should be created separately using SPL Token program
    /// Then this instruction stores the mint address in the config
    #[account(mut)]
    pub memo_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitializeMint>) -> Result<()> {
    // Store the mint address in the config
    ctx.accounts.memo_mint_config.mint = ctx.accounts.memo_mint.key();
    ctx.accounts.memo_mint_config.initialized = true;
    
    msg!("$MEMO token mint initialized: {}", ctx.accounts.memo_mint.key());
    
    Ok(())
}
