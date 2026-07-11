import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted at build (next/font) — satisfies the Lighthouse>=95 perf gate (D7) and the
// 'self'-only CSP; no Google CDN request at runtime.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DealRadar — flight deals, verified",
  description:
    "Flight search with price-intelligence verdicts: know instantly if a fare is actually a deal. We track fares daily so you know a good price when you see one.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
