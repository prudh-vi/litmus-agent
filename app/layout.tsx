import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Litmus — AI Investment Research Agent",
  description: "Invest or pass, with proof.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
