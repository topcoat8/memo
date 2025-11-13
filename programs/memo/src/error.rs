use anchor_lang::prelude::*;

#[error_code]
pub enum MemoError {
    #[msg("Message content is too long. Maximum 500 bytes after compression.")]
    MessageTooLong,
    
    #[msg("Invalid recipient address.")]
    InvalidRecipient,
    
    #[msg("PDA derivation failed.")]
    PdaDerivationFailed,
    
    #[msg("Account creation failed.")]
    AccountCreationFailed,
    
    #[msg("Message counter overflow.")]
    CounterOverflow,
    
    #[msg("Failed to update message index.")]
    IndexUpdateFailed,
    
    #[msg("Message is already deleted.")]
    MessageAlreadyDeleted,
    
    #[msg("Unauthorized: Only the sender can delete this message.")]
    UnauthorizedDeletion,
    
    #[msg("Invalid message account.")]
    InvalidMessageAccount,
}

