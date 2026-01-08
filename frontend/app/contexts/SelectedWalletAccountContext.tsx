import { KeyPairSigner } from "@solana/kit";
import type { UiWalletAccount } from "@wallet-standard/react";
import { createContext } from "react";

export type SelectedWalletAccountState = UiWalletAccount | undefined;

export const SelectedWalletAccountContext = createContext<{
  walletAccount?: UiWalletAccount;
  selectedWalletAccount?: SelectedWalletAccountState;
  setSelectedWalletAccount: React.Dispatch<
    React.SetStateAction<SelectedWalletAccountState>
  >;
}>({
  setSelectedWalletAccount: () => {
    /* empty */
  },
});
