use borsh::{BorshDeserialize, BorshSerialize};
use ephemeral_rollups_sdk::{
    cpi::{delegate_account, DelegateAccounts, DelegateConfig},
    ephem::commit_and_undelegate_accounts,
};
use solana_account_info::{next_account_info, AccountInfo};
use solana_program::{program::invoke_signed, rent::Rent, sysvar::Sysvar};
use solana_program_error::{ProgramError, ProgramResult};
use solana_pubkey::Pubkey;
use solana_system_interface::instruction;

use crate::state::Piano;

pub fn process_initialize(accounts: &[AccountInfo], _instruction_data: &[u8]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let payer = next_account_info(accounts_iter)?;
    let piano = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    let (pda, bump) = Pubkey::find_program_address(&[b"piano", payer.key.as_ref()], &crate::ID);
    if *piano.key != pda {
        return Err(ProgramError::InvalidSeeds);
    }

    let piano_data = Piano {
        bump,
        payer: *payer.key,
        notes: vec![],
    };

    let rent = Rent::get()?;
    let rent_exempt_balance = rent.minimum_balance(Piano::LEN);
    let create_account_ix = instruction::create_account(
        payer.key,
        piano.key,
        rent_exempt_balance,
        Piano::LEN as u64,
        &crate::ID,
    );

    let signer_seeds = [b"piano".as_ref(), payer.key.as_ref(), &[piano_data.bump]];
    invoke_signed(
        &create_account_ix,
        &[payer.clone(), piano.clone(), system_program.clone()],
        &[&signer_seeds],
    )?;

    borsh::to_writer(&mut piano.data.borrow_mut()[..], &piano_data)?;

    Ok(())
}

pub fn process_play_notes(accounts: &[AccountInfo], notes: Vec<u8>) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let piano = next_account_info(accounts_iter)?;

    let mut piano_data = Piano::deserialize(&mut &piano.data.borrow()[..])?;
    let pda = Pubkey::create_program_address(
        &[b"piano", piano_data.payer.as_ref(), &[piano_data.bump]],
        &crate::ID,
    )?;
    if *piano.key != pda {
        return Err(ProgramError::InvalidSeeds);
    }

    piano_data.notes = notes;
    piano_data.serialize(&mut &mut piano.data.borrow_mut()[..])?;

    Ok(())
}

pub fn process_delegate(accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let payer = next_account_info(accounts_iter)?;
    let piano = next_account_info(accounts_iter)?;
    let owner_program = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    let buffer = next_account_info(accounts_iter)?;
    let delegation_record = next_account_info(accounts_iter)?;
    let delegation_metadata = next_account_info(accounts_iter)?;
    let delegation_program = next_account_info(accounts_iter)?;
    let validator = next_account_info(accounts_iter)?;

    let piano_data = Piano::deserialize(&mut &piano.data.borrow()[..])?;
    let pda = Pubkey::create_program_address(
        &[b"piano", piano_data.payer.as_ref(), &[piano_data.bump]],
        &crate::ID,
    )?;
    if *piano.key != pda {
        return Err(ProgramError::InvalidSeeds);
    }

    delegate_account(
        DelegateAccounts {
            payer,
            pda: piano,
            owner_program,
            buffer,
            delegation_record,
            delegation_metadata,
            delegation_program,
            system_program,
        },
        &[b"piano", piano_data.payer.as_ref()],
        DelegateConfig {
            commit_frequency_ms: 0,
            validator: Some(*validator.key),
        },
    )?;

    Ok(())
}

pub fn process_undelegate(accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let payer = next_account_info(accounts_iter)?;
    let piano = next_account_info(accounts_iter)?;
    let magic_context = next_account_info(accounts_iter)?;
    let magic_program = next_account_info(accounts_iter)?;

    let piano_data = Piano::deserialize(&mut &piano.data.borrow()[..])?;
    let pda = Pubkey::create_program_address(
        &[b"piano", piano_data.payer.as_ref(), &[piano_data.bump]],
        &crate::ID,
    )?;
    if *piano.key != pda {
        return Err(ProgramError::InvalidSeeds);
    }

    commit_and_undelegate_accounts(payer, vec![piano], magic_context, magic_program)?;

    Ok(())
}
