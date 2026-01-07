use std::path::Path;

use litesvm::LiteSVM;
use magicblock_piano_client::{
    accounts::Piano,
    instructions::{InitializeBuilder, PlayNotesBuilder},
};
use solana_keypair::Keypair;
use solana_program::{native_token::LAMPORTS_PER_SOL, system_program};
use solana_signer::Signer;
use solana_transaction::Transaction;

#[test]
fn test_initialize() {
    let mut svm = LiteSVM::new();

    svm.add_program_from_file(
        magicblock_piano::ID,
        Path::new("../target/deploy/magicblock_piano.so"),
    )
    .unwrap();

    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), LAMPORTS_PER_SOL).unwrap();

    let piano_pda = Piano::find_pda(&payer.pubkey()).0;

    let initialize_ix = InitializeBuilder::new()
        .payer(payer.pubkey())
        .piano(piano_pda)
        .system_program(system_program::ID)
        .instruction();
    svm.send_transaction(Transaction::new_signed_with_payer(
        &[initialize_ix],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    ))
    .unwrap();

    let piano_acc = svm.get_account(&piano_pda).unwrap();
    let piano_data = Piano::from_bytes(&piano_acc.data).unwrap();
    assert_eq!(piano_data.payer, payer.pubkey());
    assert_eq!(piano_data.notes, Vec::<u8>::new());

    eprintln!("piano_pda: {:?}", piano_acc);
    eprintln!("payer: {:?}", payer.pubkey());
    eprintln!("latest_blockhash: {:?}", svm.latest_blockhash());
    eprintln!("signers: {:?}", [&payer]);
    let play_notes_ix = PlayNotesBuilder::new()
        .piano(piano_pda)
        .notes(vec![1, 2, 3])
        .instruction();
    svm.send_transaction(Transaction::new_signed_with_payer(
        &[play_notes_ix],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    ))
    .unwrap();

    let piano_acc = svm.get_account(&piano_pda).unwrap();
    let piano_data = Piano::from_bytes(&piano_acc.data).unwrap();
    assert_eq!(piano_data.notes, vec![1, 2, 3]);
}
