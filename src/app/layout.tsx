import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Bridge — Give It a Second Life",
  description: "One-tap second life for your products",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-50 border-b border-neutral-800 bg-[#0f0f0f]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🌉</span>
              <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                The Bridge
              </span>
            </a>
            <div className="flex items-center gap-3">
              <a
                href="/dashboard"
                className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-amber-500/30 hover:text-[var(--text-primary)]"
              >
                📊 Dashboard
              </a>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                Hackathon Prototype
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
