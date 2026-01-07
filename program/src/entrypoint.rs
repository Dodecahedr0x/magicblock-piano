use borsh::BorshDeserialize;
use solana_account_info::AccountInfo;
use solana_program::entrypoint::entrypoint;
use solana_program::msg;
use solana_program_error::ProgramResult;
use solana_pubkey::Pubkey;

use crate::instructions::MagicblockPianoInstruction;
use crate::processor::{
    process_delegate, process_initialize, process_play_notes, process_undelegate,
};

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = MagicblockPianoInstruction::try_from_slice(instruction_data)?;
    msg!("Instruction: {:?}", instruction);

    match instruction {
        MagicblockPianoInstruction::Initialize => process_initialize(accounts, instruction_data),
        MagicblockPianoInstruction::PlayNotes { notes } => process_play_notes(accounts, notes),
        MagicblockPianoInstruction::Delegate => process_delegate(accounts),
        MagicblockPianoInstruction::Undelegate => process_undelegate(accounts),
    }
}
