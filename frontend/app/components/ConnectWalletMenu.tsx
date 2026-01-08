"use client";

import { useContext, useMemo, useState } from "react";
import type { UiWallet, UiWalletAccount } from "@wallet-standard/react";
import {
  uiWalletAccountBelongsToUiWallet,
  uiWalletAccountsAreSame,
  useConnect,
  useDisconnect,
  useWallets,
} from "@wallet-standard/react";

import { SelectedWalletAccountContext } from "../contexts/SelectedWalletAccountContext";
import { useSelectedWallet } from "../hooks/useSelectedWallet";

type Props = Readonly<{
  children?: React.ReactNode;
}>;

type WalletRowProps = Readonly<{
  wallet: UiWallet;
  selectedWalletAccount: UiWalletAccount | undefined;
  onAccountSelect(account: UiWalletAccount | undefined): void;
  onDisconnect(wallet: UiWallet): void;
  onError(message: string): void;
}>;

function formatAddress(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function WalletRow({
  wallet,
  selectedWalletAccount,
  onAccountSelect,
  onDisconnect,
  onError,
}: WalletRowProps) {
  const [isConnecting, connect] = useConnect(wallet);
  const [isDisconnecting, disconnect] = useDisconnect(wallet);
  const isPending = isConnecting || isDisconnecting;
  const isConnected = wallet.accounts.length > 0;

  const handleConnectClick = async () => {
    try {
      const existingAccounts = [...wallet.accounts];
      const nextAccounts = await connect();
      for (const nextAccount of nextAccounts) {
        if (
          !existingAccounts.some((existingAccount) =>
            uiWalletAccountsAreSame(nextAccount, existingAccount)
          )
        ) {
          onAccountSelect(nextAccount);
          return;
        }
      }
      if (nextAccounts[0]) {
        onAccountSelect(nextAccounts[0]);
      }
    } catch (err) {
      console.error("Wallet connect failed", err);
      onError("Wallet connect failed. Check the wallet popup.");
    }
  };

  const handleDisconnectClick = async () => {
    try {
      await disconnect();
      onDisconnect(wallet);
    } catch (err) {
      console.error("Wallet disconnect failed", err);
      onError("Wallet disconnect failed.");
    }
  };

  return (
    <div className="wallet-row">
      <div className="wallet-row-header">
        <span className="wallet-meta">{wallet.name}</span>
        {isConnected ? <span className="wallet-meta">Connected</span> : null}
      </div>
      {isConnected ? (
        <>
          <div className="wallet-accounts">
            {wallet.accounts.map((account) => (
              <label key={account.address} className="wallet-account-option">
                <input
                  type="radio"
                  name={`wallet-${wallet.name}`}
                  checked={selectedWalletAccount?.address === account.address}
                  onChange={() => onAccountSelect(account)}
                />
                {formatAddress(account.address)}
              </label>
            ))}
          </div>
          <div className="wallet-row-actions">
            <button
              type="button"
              className="ghost small"
              onClick={handleConnectClick}
              disabled={isPending}
            >
              Connect more
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={handleDisconnectClick}
              disabled={isPending}
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="solid small"
          onClick={handleConnectClick}
          disabled={isPending}
        >
          Connect
        </button>
      )}
    </div>
  );
}

export function ConnectWalletMenu({ children }: Props) {
  const wallets = useWallets();
  const { selectedWalletAccount, setSelectedWalletAccount } =
    useSelectedWallet();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedUiWallet = useMemo(() => {
    if (!selectedWalletAccount) {
      return null;
    }
    return (
      wallets.find((candidate) =>
        uiWalletAccountBelongsToUiWallet(selectedWalletAccount, candidate)
      ) ?? null
    );
  }, [selectedWalletAccount, wallets]);
  const connectableWallets = useMemo(
    () =>
      wallets.filter(
        (wallet) =>
          wallet.features.includes("standard:connect") &&
          wallet.features.includes("standard:disconnect") &&
          wallet.features.includes("solana:signAndSendTransaction") &&
          wallet.features.includes("solana:signTransaction") &&
          wallet.chains.includes("solana:devnet")
      ),
    [wallets]
  );

  const handleAccountSelect = (account: UiWalletAccount | undefined) => {
    setSelectedWalletAccount(account);
    setIsOpen(false);
  };

  const handleDisconnect = (wallet: UiWallet) => {
    if (
      selectedWalletAccount &&
      uiWalletAccountBelongsToUiWallet(selectedWalletAccount, wallet)
    ) {
      setSelectedWalletAccount(undefined);
    }
  };

  if (connectableWallets.length === 0) {
    return <span className="wallet-meta">No devnet wallet available</span>;
  }

  return (
    <div className="wallet-menu">
      <button
        type="button"
        className="solid"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selectedWalletAccount
          ? formatAddress(selectedWalletAccount.address)
          : (children ?? "Connect")}
      </button>
      {isOpen ? (
        <div className="wallet-menu-panel">
          {connectableWallets.map((wallet, index) => (
            <WalletRow
              key={`${wallet.name}-${index}`}
              wallet={wallet}
              selectedWalletAccount={selectedWalletAccount}
              onAccountSelect={handleAccountSelect}
              onDisconnect={handleDisconnect}
              onError={setError}
            />
          ))}
          {selectedUiWallet ? (
            <span className="wallet-meta">Active {selectedUiWallet.name}</span>
          ) : null}
          {error ? <span className="wallet-meta">{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
