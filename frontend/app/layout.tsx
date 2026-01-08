"use client";

import "./globals.css";
import { useEffect } from "react";
import { SelectedWalletAccountContextProvider } from "./contexts/SelectedWalletAccountContextProvider";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    document.title = "Magicblock Piano";
  }, []);

  return (
    <html lang="en">
      <body>
        <Toaster />
        <SelectedWalletAccountContextProvider>
          {children}
        </SelectedWalletAccountContextProvider>
      </body>
    </html>
  );
}
