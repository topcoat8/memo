use anchor_lang::prelude::*;

pub fn get_message_counter_pda(user: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"memo", b"counter", user.as_ref()],
        program_id,
    )
}

pub fn get_message_index_pda(user: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"memo", b"index", user.as_ref()],
        program_id,
    )
}

pub fn get_message_pda(
    sender: &Pubkey,
    recipient: &Pubkey,
    counter: u64,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"memo",
            sender.as_ref(),
            recipient.as_ref(),
            &counter.to_le_bytes(),
        ],
        program_id,
    )
}

