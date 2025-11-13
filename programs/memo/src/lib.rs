use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod memo {
    use super::*;

    pub fn send_memo(ctx: Context<SendMemo>, encrypted_content: Vec<u8>, nonce: [u8; 24]) -> Result<()> {
        instructions::send_memo::handler(ctx, encrypted_content, nonce)
    }

    pub fn delete_memo(ctx: Context<DeleteMemo>) -> Result<()> {
        instructions::delete_memo::handler(ctx)
    }

    pub fn initialize_mint(ctx: Context<InitializeMint>) -> Result<()> {
        instructions::initialize_mint::handler(ctx)
    }
}

