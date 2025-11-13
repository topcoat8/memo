use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

#[account]
pub struct MessageAccount {
    pub sender: Pubkey,           // 32 bytes
    pub recipient: Pubkey,        // 32 bytes
    pub encrypted_content: Vec<u8>, // Variable length, max ~500 bytes
    pub timestamp: i64,           // 8 bytes
    pub nonce: [u8; 24],          // 24 bytes for TweetNaCl
    pub deleted: bool,            // 1 byte
}

impl MessageAccount {
    pub const MAX_CONTENT_SIZE: usize = 500;
    pub const DISCRIMINATOR: usize = 8;
    pub const SENDER_SIZE: usize = 32;
    pub const RECIPIENT_SIZE: usize = 32;
    pub const TIMESTAMP_SIZE: usize = 8;
    pub const NONCE_SIZE: usize = 24;
    pub const DELETED_SIZE: usize = 1;
    pub const VEC_PREFIX: usize = 4; // Vec length prefix

    pub const SPACE: usize = Self::DISCRIMINATOR
        + Self::SENDER_SIZE
        + Self::RECIPIENT_SIZE
        + Self::VEC_PREFIX
        + Self::MAX_CONTENT_SIZE
        + Self::TIMESTAMP_SIZE
        + Self::NONCE_SIZE
        + Self::DELETED_SIZE;
}

#[account]
pub struct UserMessageCounter {
    pub user: Pubkey,    // 32 bytes
    pub counter: u64,    // 8 bytes
}

impl UserMessageCounter {
    pub const DISCRIMINATOR: usize = 8;
    pub const USER_SIZE: usize = 32;
    pub const COUNTER_SIZE: usize = 8;

    pub const SPACE: usize = Self::DISCRIMINATOR
        + Self::USER_SIZE
        + Self::COUNTER_SIZE;
}

#[account]
pub struct UserMessageIndex {
    pub user: Pubkey,              // 32 bytes
    pub message_pdas: Vec<Pubkey>, // Variable length - array of message account PDAs
    pub total_count: u32,           // 4 bytes
    pub last_updated: i64,          // 8 bytes
}

impl UserMessageIndex {
    pub const DISCRIMINATOR: usize = 8;
    pub const USER_SIZE: usize = 32;
    pub const TOTAL_COUNT_SIZE: usize = 4;
    pub const LAST_UPDATED_SIZE: usize = 8;
    pub const VEC_PREFIX: usize = 4; // Vec length prefix
    pub const MAX_MESSAGES: usize = 1000; // Limit to prevent account size issues

    pub const SPACE: usize = Self::DISCRIMINATOR
        + Self::USER_SIZE
        + Self::VEC_PREFIX
        + (Self::MAX_MESSAGES * 32) // Max 1000 message PDAs
        + Self::TOTAL_COUNT_SIZE
        + Self::LAST_UPDATED_SIZE;
}

#[account]
pub struct MemoTokenMint {
    pub mint: Pubkey,    // 32 bytes - The SPL token mint address
    pub initialized: bool, // 1 byte
}

impl MemoTokenMint {
    pub const DISCRIMINATOR: usize = 8;
    pub const MINT_SIZE: usize = 32;
    pub const INITIALIZED_SIZE: usize = 1;

    pub const SPACE: usize = Self::DISCRIMINATOR
        + Self::MINT_SIZE
        + Self::INITIALIZED_SIZE;
}
