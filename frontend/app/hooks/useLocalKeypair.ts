import {
  appendTransactionMessageInstruction,
  createKeyPairSignerFromPrivateKeyBytes,
  createTransactionMessage,
  KeyPairSigner,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  useWalletAccountMessageSigner,
  useWalletAccountTransactionSigner,
} from "@solana/react";
import { useCallback, useEffect, useState } from "react";
import { useSelectedWallet } from "./useSelectedWallet";
import { useRpc } from "./useRpc";
import { getTransferSolInstruction } from "@solana-program/system";
import { UiWalletAccount } from "@wallet-standard/react";
import { useSendTransaction } from "./useSendTransaction";

const LOCAL_KEYPAIR_STORAGE = "magicblock_piano:local_keypair";

function loadStoredKeypairBytes() {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(LOCAL_KEYPAIR_STORAGE);
  if (!stored) {
    return;
  }
  try {
    const parsed = JSON.parse(stored) as number[];
    return new Uint8Array(parsed);
  } catch (error) {
    console.error("Failed to parse local keypair", error);
    return;
  }
}

function getOrCreateLocalSigner() {
  let bytes = loadStoredKeypairBytes();
  if (!bytes) {
    bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    window.localStorage.setItem(
      LOCAL_KEYPAIR_STORAGE,
      JSON.stringify(Array.from(bytes))
    );
  }
  return createKeyPairSignerFromPrivateKeyBytes(bytes);
}

interface UseLocalKeypairProps {
  setStatus?: (status: string | null) => void;
  wallet: UiWalletAccount;
}

export function useLocalKeypair({ setStatus, wallet }: UseLocalKeypairProps) {
  const [localKeypair, setLocalKeypair] = useState<KeyPairSigner | undefined>();
  const [isFunding, setIsFunding] = useState(false);
  const signer = useWalletAccountTransactionSigner(wallet, "solana:devnet");
  const { rpc, rpcSubscriptions } = useRpc();
  const sendTransaction = useSendTransaction({ rpc, rpcSubscriptions });

  useEffect(() => {
    const signer = async () => {
      const signer = await getOrCreateLocalSigner();
      setLocalKeypair(signer);
    };
    signer();
  }, [setLocalKeypair]);

  const handleFund = useCallback(async () => {
    if (isFunding) {
      return;
    }
    if (!localKeypair) {
      setStatus?.("No local keypair found.");
      return;
    }
    if (!wallet) {
      setStatus?.("Connect a wallet to fund the local keypair.");
      return;
    }
    setIsFunding(true);
    setStatus?.(null);
    try {
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const payerAddress = wallet.address;
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayer(signer.address, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) =>
          appendTransactionMessageInstruction(
            getTransferSolInstruction({
              source: signer,
              destination: localKeypair.address,
              amount: lamports(100000000n),
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
      setStatus?.(`Funded ${signer.address.slice(0, 4)}...`);
    } catch (error) {
      console.error("Transfer failed", error);
      setStatus?.("Transfer failed. Check your wallet balance.");
    } finally {
      setIsFunding(false);
    }
  }, [
    isFunding,
    localKeypair,
    signer,
    wallet,
    sendTransaction,
    setStatus,
    rpc,
  ]);

  return { localKeypair, handleFund, isFunding };
}
