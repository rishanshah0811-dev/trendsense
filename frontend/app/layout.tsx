import type { Metadata } from "next";
import { Space_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "TrendSense — ML Trading Signal Analyser",
  description:
    "Generate buy, sell, and neutral signals for any stock ticker using an XGBoost classifier with probability thresholding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-[#e8e8e8]">
        <header className="w-full border-b border-[#1a1a1a]">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[0.15em] uppercase text-[#e8e8e8]">
              TrendSense
            </h1>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#555555]">
              ML Signal Analysis
            </span>
          </div>
          <div className="h-px bg-[#ffab00]" />
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
