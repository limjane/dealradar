import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealRadar — flight deals, verified",
  description:
    "Flight search with price-intelligence verdicts: know instantly if a fare is actually a deal.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
