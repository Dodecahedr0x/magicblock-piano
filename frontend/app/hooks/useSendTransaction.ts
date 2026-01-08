import {
  sendAndConfirmTransactionFactory,
  SolanaRpcSubscriptionsApi,
  SolanaRpcApiMainnet,
  Rpc,
  RpcSubscriptions,
  FullySignedTransaction,
  TransactionWithBlockhashLifetime,
  getSignatureFromTransaction,
  SignaturesMap,
  TransactionMessageBytes,
  TransactionWithinSizeLimit,
} from "@solana/kit";
import { useCallback } from "react";
import { toast } from "sonner";

type UseSendTransactionProps = Readonly<{
  rpc: Rpc<SolanaRpcApiMainnet>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
}>;

export function useSendTransaction({
  rpc,
  rpcSubscriptions,
}: UseSendTransactionProps) {
  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
  });

  const sendTransaction = useCallback(
    async (
      tx: FullySignedTransaction &
        TransactionWithinSizeLimit &
        Readonly<{
          messageBytes: TransactionMessageBytes;
          signatures: SignaturesMap;
        }> &
        TransactionWithBlockhashLifetime
    ) => {
      await sendAndConfirmTransaction(
        {
          ...tx,
          "__transactionSignedness:@solana/kit": "fullySigned",
          "__transactionSize:@solana/kit": "withinLimit",
        },
        {
          commitment: "confirmed",
        }
      );

      // Display toast with first signature
      const sig = getSignatureFromTransaction(tx);
      toast.success("Transaction sent", {
        description: sig.toString(),
      });

      return sig;
    },
    [sendAndConfirmTransaction]
  );

  return sendTransaction;
}
