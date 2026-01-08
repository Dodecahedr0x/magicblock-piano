"use client";

import {
  address,
  appendTransactionMessageInstruction,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { UiWalletAccount } from "@wallet-standard/react";
import { useCallback, useState } from "react";
import { useRpc } from "./useRpc";
import { usePianoContext } from "../contexts/PianoContext";
import {
  findPianoPda,
  getDelegateInstruction,
  getInitializeInstruction,
  getPlayNotesInstruction,
  getUndelegateInstruction,
  MAGICBLOCK_PIANO_PROGRAM_ADDRESS,
} from "magicblock-piano-client";
import { useWalletAccountTransactionSigner } from "@solana/react";
import { useSendTransaction } from "./useSendTransaction";
import { useLocalKeypair } from "./useLocalKeypair";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";
import {
  DELEGATION_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
} from "@magicblock-labs/ephemeral-rollups-kit";

type UsePianoProps = Readonly<{
  wallet: UiWalletAccount;
  setStatus: (status: string | null) => void;
}>;

const VALIDATOR_ADDRESS = address(
  "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e"
);

const SEMITONES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

function noteToIndex(noteLabel: string) {
  const match = noteLabel.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    return 0;
  }
  const [, note, octaveRaw] = match;
  const semitoneIndex = SEMITONES.indexOf(note as (typeof SEMITONES)[number]);
  const octave = Number.parseInt(octaveRaw, 10);
  return octave * 12 + Math.max(semitoneIndex, 0);
}

export function usePiano({ wallet, setStatus }: UsePianoProps) {
  const { rpc, rpcSubscriptions, rpcEphemeral, rpcSubscriptionsEphemeral } =
    useRpc();
  const { pianoAddress, isPianoInitialized } = usePianoContext();
  const signer = useWalletAccountTransactionSigner(wallet, "solana:devnet");
  const { localKeypair } = useLocalKeypair({ wallet, setStatus });
  const sendTransaction = useSendTransaction({ rpc, rpcSubscriptions });
  const sendTransactionEphemeral = useSendTransaction({
    rpc: rpcEphemeral,
    rpcSubscriptions: rpcSubscriptionsEphemeral,
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isUndelegating, setIsUndelegating] = useState(false);

  const initialize = useCallback(async () => {
    if (isInitializing || isPianoInitialized) {
      return;
    }
    if (!wallet) {
      setStatus("Connect a wallet to initialize the piano.");
      return;
    }
    setIsInitializing(true);
    setStatus(null);
    try {
      const [derivedAddress] = await findPianoPda({
        payer: signer.address,
      });
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayer(signer.address, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) =>
          appendTransactionMessageInstruction(
            getInitializeInstruction({
              payer: signer,
              piano: derivedAddress,
              systemProgram: SYSTEM_PROGRAM_ADDRESS,
            }),
            m
          )
      );
      const signedTransaction =
        await signTransactionMessageWithSigners(message);
      await sendTransaction({
        ...signedTransaction,
        lifetimeConstraint: latestBlockhash,
      });
      setStatus("Piano initialized.");
    } catch (error) {
      console.error("Initialize failed", error);
      setStatus("Initialize failed. Try again.");
    } finally {
      setIsInitializing(false);
    }
  }, [
    isInitializing,
    isPianoInitialized,
    signer,
    sendTransaction,
    rpc,
    setStatus,
  ]);

  const sendNotes = useCallback(
    async (notes: string[]) => {
      try {
        if (!pianoAddress || !isPianoInitialized) {
          setStatus("Piano not initialized.");
          return;
        }
        if (!localKeypair) {
          setStatus("No local keypair found.");
          return;
        }
        const { value: latestBlockhash } = await rpcEphemeral
          .getLatestBlockhash()
          .send();
        const noteIndexes = Array.from(
          new Set(notes.map((noteLabel) => noteToIndex(noteLabel)))
        );
        const message = pipe(
          createTransactionMessage({ version: 0 }),
          (m) => setTransactionMessageFeePayerSigner(localKeypair, m),
          (m) =>
            setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
          (m) =>
            appendTransactionMessageInstruction(
              getPlayNotesInstruction({
                piano: pianoAddress,
                notes: noteIndexes,
              }),
              m
            )
        );

        const signedTransaction =
          await signTransactionMessageWithSigners(message);
        const transactionForConfirm = {
          ...signedTransaction,
          lifetimeConstraint: latestBlockhash,
        };
        await sendTransactionEphemeral(transactionForConfirm);
      } catch (error) {
        console.error("Failed to send transaction", error);
        setStatus(
          "Transaction failed. Check wallet balance and devnet status."
        );
      }
    },
    [
      pianoAddress,
      isPianoInitialized,
      sendTransactionEphemeral,
      localKeypair,
      rpcEphemeral,
    ]
  );

  const delegate = useCallback(async () => {
    if (!pianoAddress || !isPianoInitialized) {
      setStatus("Piano not initialized.");
      return;
    }
    if (!localKeypair) {
      setStatus("No local keypair found.");
      return;
    }

    const bufferAddress =
      await delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
        pianoAddress,
        MAGICBLOCK_PIANO_PROGRAM_ADDRESS
      );
    const delegationRecordAddress =
      await delegationRecordPdaFromDelegatedAccount(pianoAddress);
    const delegationMetadataAddress =
      await delegationMetadataPdaFromDelegatedAccount(pianoAddress);

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(localKeypair, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) =>
        appendTransactionMessageInstruction(
          getDelegateInstruction({
            payer: localKeypair,
            piano: pianoAddress,
            ownerProgram: MAGICBLOCK_PIANO_PROGRAM_ADDRESS,
            systemProgram: SYSTEM_PROGRAM_ADDRESS,
            buffer: bufferAddress,
            delegationRecord: delegationRecordAddress,
            delegationMetadata: delegationMetadataAddress,
            delegationProgram: DELEGATION_PROGRAM_ID,
            validator: VALIDATOR_ADDRESS,
          }),
          m
        )
    );
    const signedTransaction = await signTransactionMessageWithSigners(message);
    const transactionForConfirm = {
      ...signedTransaction,
      lifetimeConstraint: latestBlockhash,
    };
    await sendTransaction(transactionForConfirm);
  }, [pianoAddress, isPianoInitialized, sendTransaction, localKeypair, rpc]);

  const undelegate = useCallback(async () => {
    if (!pianoAddress || !isPianoInitialized) {
      setStatus("Piano not initialized.");
      return;
    }

    const { value: latestBlockhash } = await rpcEphemeral
      .getLatestBlockhash()
      .send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) =>
        appendTransactionMessageInstruction(
          getUndelegateInstruction({
            payer: signer,
            piano: pianoAddress,
            magicContext: MAGIC_CONTEXT_ID,
            magicProgram: MAGIC_PROGRAM_ID,
          }),
          m
        )
    );
    const signedTransaction = await signTransactionMessageWithSigners(message);
    const transactionForConfirm = {
      ...signedTransaction,
      lifetimeConstraint: latestBlockhash,
    };
    await sendTransactionEphemeral(transactionForConfirm);
  }, [
    pianoAddress,
    isPianoInitialized,
    sendTransactionEphemeral,
    localKeypair,
    rpcEphemeral,
  ]);

  return {
    sendNotes,
    initialize,
    delegate,
    undelegate,
    isInitializing,
    isDelegating,
    isUndelegating,
  };
}
