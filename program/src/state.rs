use borsh::{BorshDeserialize, BorshSerialize};
use codama::CodamaAccount;
use solana_pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, CodamaAccount)]
#[codama(pda = "piano")]
#[codama(seed(type = string(utf8), value = "piano"))]
#[codama(seed(name = "payer", type = public_key))]
pub struct Piano {
    pub bump: u8,
    pub payer: Pubkey,
    pub notes: Vec<u8>,
}

impl Piano {
    pub const LEN: usize = 1 + 32 + 4 + 10;
}
