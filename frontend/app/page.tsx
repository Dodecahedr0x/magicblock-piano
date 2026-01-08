"use client";

import { PianoProvider } from "./contexts/PianoContext";
import { useSelectedWallet } from "./hooks/useSelectedWallet";
import { PianoView } from "./components/PianoView";
import { LocalKeypairView } from "./components/LocalKeypairView";

function PianoPage() {
  const { selectedWalletAccount: wallet } = useSelectedWallet();
  return (
    <main className="page">
      <header className="title-bar">
        <h1>Magicblock Piano</h1>
        {wallet ? <LocalKeypairView wallet={wallet} /> : null}
        {wallet ? <PianoView wallet={wallet} /> : null}
      </header>
    </main>
  );
}

export default function Home() {
  return (
    <PianoProvider>
      <PianoPage />
    </PianoProvider>
  );
}
