use borsh::{BorshDeserialize, BorshSerialize};
use codama::CodamaInstructions;

#[derive(BorshSerialize, BorshDeserialize, Debug, CodamaInstructions)]
pub enum MagicblockPianoInstruction {
    #[codama(account(name = "payer", writable, signer))]
    #[codama(account(name = "piano", writable))]
    #[codama(account(name = "system_program"))]
    Initialize,

    #[codama(account(name = "piano", writable))]
    PlayNotes { notes: Vec<u8> },

    #[codama(account(name = "payer", writable, signer))]
    #[codama(account(name = "piano", writable))]
    #[codama(account(name = "owner_program"))]
    #[codama(account(name = "system_program"))]
    #[codama(account(name = "buffer", writable))]
    #[codama(account(name = "delegation_record", writable))]
    #[codama(account(name = "delegation_metadata", writable))]
    #[codama(account(name = "delegation_program"))]
    #[codama(account(name = "validator", writable, optional))]
    Delegate,

    #[codama(account(name = "payer", writable, signer))]
    #[codama(account(name = "piano", writable))]
    #[codama(account(name = "magic_context"))]
    #[codama(account(name = "magic_program"))]
    Undelegate,
}
