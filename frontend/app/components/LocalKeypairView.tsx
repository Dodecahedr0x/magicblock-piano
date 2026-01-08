"use client";

import { UiWalletAccount } from "@wallet-standard/react";
import { useLocalKeypair } from "../hooks/useLocalKeypair";
import { formatAddress } from "../utils";
import { toast } from "sonner";

interface LocalKeypairViewProps {
  wallet: UiWalletAccount;
}

export function LocalKeypairView({ wallet }: LocalKeypairViewProps) {
  const { localKeypair, isFunding, handleFund } = useLocalKeypair({
    wallet,
  });

  return (
    <div className="local-keypair">
      <button
        type="button"
        className="ghost"
        onClick={handleFund}
        disabled={isFunding}
      >
        {isFunding ? "Funding..." : "Fund keypair"}
      </button>
      <span
        className="wallet-meta"
        onClick={() => {
          navigator.clipboard.writeText(
            localKeypair?.address?.toString() ?? ""
          );
          toast.success("Copied to clipboard");
        }}
      >
        {localKeypair
          ? `Local ${formatAddress(localKeypair.address)}`
          : "No local keypair yet"}
      </span>
    </div>
  );
}
