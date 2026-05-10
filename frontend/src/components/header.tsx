"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/solana/solana-provider";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black group-hover:scale-110 transition-transform">S</div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline-block">SolanaDEX</span>
          </Link>
          {/* <nav className="flex items-center gap-8 text-sm font-bold">
            <Link
              href="/"
              className={cn(
                "transition-all hover:text-primary",
                pathname === "/" ? "text-slate-900 dark:text-slate-100 scale-105" : "text-slate-400"
              )}
            >
              Swap
            </Link>
            <Link
              href="/liquidity"
              className={cn(
                "transition-all hover:text-primary",
                pathname === "/liquidity" ? "text-slate-900 dark:text-slate-100 scale-105" : "text-slate-400"
              )}
            >
              Pool
            </Link>
          </nav> */}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-xs font-bold text-slate-500">
            <div className="size-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Devnet
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
