import { useContext } from "react";
import { SelectedWalletAccountContext } from "../contexts/SelectedWalletAccountContext";

export function useSelectedWallet() {
  return useContext(SelectedWalletAccountContext);
}
