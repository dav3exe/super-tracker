import { TokenDashboard } from "@/components/token-dashboard";
import { TokenProvider } from "@/context/token-context";

export default function Home() {
  return (
    <TokenProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6">
        <header className="flex h-16 items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span aria-hidden className="size-2.5 rounded-full bg-primary shadow-[0_0_12px] shadow-primary/60" />
            Super Tracker
          </span>
          <span className="glass rounded-full px-3 py-1 text-xs text-muted-foreground">Solana</span>
        </header>

        <main className="flex-1 pb-16">
          <TokenDashboard />
        </main>

        <footer className="border-t border-white/[0.06] py-6 text-xs text-muted-foreground">
          Data from Birdeye, Helius and Jupiter. Scores are heuristics, not financial advice.
        </footer>
      </div>
    </TokenProvider>
  );
}
