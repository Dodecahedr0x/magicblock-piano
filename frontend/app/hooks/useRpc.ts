import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  devnet,
} from "@solana/kit";
import { useMemo } from "react";

export function useRpc() {
  const rpc = useMemo(
    () => createSolanaRpc(devnet("https://api.devnet.solana.com")),
    []
  );
  const rpcSubscriptions = useMemo(
    () => createSolanaRpcSubscriptions(devnet("wss://api.devnet.solana.com")),
    []
  );
  const rpcEphemeral = useMemo(
    () => createSolanaRpc(devnet("https://devnet-eu.magicblock.app")),
    []
  );
  const rpcSubscriptionsEphemeral = useMemo(
    () =>
      createSolanaRpcSubscriptions(devnet("wss://devnet-eu.magicblock.app")),
    []
  );

  return { rpc, rpcSubscriptions, rpcEphemeral, rpcSubscriptionsEphemeral };
}
