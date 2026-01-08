"use client";

import { Address, getBase58Encoder, isAddress } from "@solana/kit";
import {
  fetchPiano,
  findPianoPda,
  getPianoDecoder,
  Piano,
} from "magicblock-piano-client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useSelectedWallet } from "../hooks/useSelectedWallet";
import { useRpc } from "../hooks/useRpc";
import { DELEGATION_PROGRAM_ID } from "@magicblock-labs/ephemeral-rollups-kit";

type PianoContextValue = Readonly<{
  isPianoInitialized: boolean;
  pianoAddress: Address | null;
  manualPianoAddress: Address | null;
  setManualPianoAddress: (address: Address | null) => void;
  pianoEphemeral: Piano | null;
  pianoMainnet: Piano | null;
  pianoMainnetOwner: Address | null;
  pianoEphemeralOwner: Address | null;
  isDelegated: boolean;
}>;

export const PianoContext = createContext<PianoContextValue | null>(null);

export function PianoProvider({ children }: { children: React.ReactNode }) {
  const { rpc, rpcSubscriptions, rpcEphemeral, rpcSubscriptionsEphemeral } =
    useRpc();
  const [isPianoInitialized, setIsPianoInitialized] = useState(false);
  const [pianoAddress, setPianoAddress] = useState<Address | null>(null);
  const [manualPianoAddress, setManualPianoAddress] = useState<Address | null>(
    null
  );
  const { selectedWalletAccount } = useSelectedWallet();
  const [pianoEphemeral, setPianoEphemeral] = useState<Piano | null>(null);
  const [pianoMainnet, setPianoMainnet] = useState<Piano | null>(null);
  const [pianoMainnetOwner, setPianoMainnetOwner] = useState<Address | null>(
    null
  );
  const [pianoEphemeralOwner, setPianoEphemeralOwner] =
    useState<Address | null>(null);

  const isDelegated = useMemo(() => {
    return pianoMainnetOwner === DELEGATION_PROGRAM_ID;
  }, [pianoEphemeral]);

  useEffect(() => {
    async function pda() {
      if (manualPianoAddress && isAddress(manualPianoAddress)) {
        setPianoAddress(manualPianoAddress);
        return;
      }

      if (!selectedWalletAccount?.address) {
        return;
      }

      const [pda] = await findPianoPda({
        payer: selectedWalletAccount.address as Address,
      });
      setPianoAddress(pda);
    }
    pda();
  }, [manualPianoAddress, selectedWalletAccount]);

  useEffect(() => {
    async function fetch() {
      if (!pianoAddress) {
        return;
      }

      try {
        const piano = await fetchPiano(rpc, pianoAddress);
        setPianoMainnetOwner(piano.programAddress);
        setPianoMainnet(piano.data);
        setIsPianoInitialized(true);
      } catch (error) {
        setIsPianoInitialized(false);
        console.log("Error fetching piano", error);
      }

      try {
        const pianoEphemeral = await fetchPiano(rpcEphemeral, pianoAddress);
        setPianoEphemeralOwner(pianoEphemeral.programAddress);
        setPianoEphemeral(pianoEphemeral.data);
      } catch (error) {
        console.log("Error fetching piano ephemeral", error);
      }
    }

    fetch();
  }, [pianoAddress]);

  useEffect(() => {
    const abortController = new AbortController();

    async function subscribeToPianoEphemeral() {
      if (!pianoAddress) {
        return;
      }

      let subscription = await rpcSubscriptionsEphemeral
        .accountNotifications(pianoAddress)
        .subscribe({ abortSignal: abortController.signal });
      for await (const accountInfo of subscription) {
        setPianoEphemeralOwner(accountInfo.value.owner);
        if (accountInfo.value?.data) {
          const str =
            typeof accountInfo.value.data === "string"
              ? accountInfo.value.data
              : accountInfo.value.data[0];
          toast.success("Piano ephemeral updated", { position: "bottom-left" });
          setIsPianoInitialized(true);
          setPianoEphemeral(
            getPianoDecoder().decode(getBase58Encoder().encode(str))
          );
        }
      }
    }

    subscribeToPianoEphemeral();

    return () => {
      abortController.abort();
    };
  }, [pianoAddress]);

  useEffect(() => {
    const abortController = new AbortController();

    async function subscribeToPianoMainnet() {
      if (!pianoAddress) {
        return;
      }

      let subscription = await rpcSubscriptions
        .accountNotifications(pianoAddress)
        .subscribe({ abortSignal: abortController.signal });
      for await (const accountInfo of subscription) {
        setPianoMainnetOwner(accountInfo.value.owner);
        if (accountInfo.value?.data) {
          const str =
            typeof accountInfo.value.data === "string"
              ? accountInfo.value.data
              : accountInfo.value.data[0];
          toast.success("Piano mainnet updated", { position: "bottom-left" });
          setIsPianoInitialized(true);
          setPianoMainnet(
            getPianoDecoder().decode(getBase58Encoder().encode(str))
          );
        }
      }
    }

    subscribeToPianoMainnet();

    return () => {
      abortController.abort();
    };
  }, [pianoAddress]);

  return (
    <PianoContext.Provider
      value={{
        isPianoInitialized,
        pianoAddress,
        manualPianoAddress,
        setManualPianoAddress,
        pianoMainnet,
        pianoEphemeral,
        pianoMainnetOwner,
        pianoEphemeralOwner,
        isDelegated,
      }}
    >
      {children}
    </PianoContext.Provider>
  );
}

export function usePianoContext() {
  const context = useContext(PianoContext);
  if (!context) {
    throw new Error("usePianoContext must be used within PianoProvider");
  }
  return context;
}
