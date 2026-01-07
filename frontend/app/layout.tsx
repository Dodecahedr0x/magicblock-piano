import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Magicblock Piano",
  description: "Two-octave piano controller",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
