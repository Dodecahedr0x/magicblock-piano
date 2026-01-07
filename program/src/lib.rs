#[cfg(not(feature = "no-entrypoint"))]
mod entrypoint;
mod instructions;
mod processor;
mod state;

use solana_pubkey::declare_id;

declare_id!("H4TeeQbcMo6b8UMfYzHtFo99KNi8qoH5aLTbEZQSSsAu");
