"use client";

import { Activity, ChartCandlestick, Users } from "lucide-react";
import { OrganicMarketCheck } from "@/components/organic-market-check";
import { PriceChart } from "@/components/price-chart";
import { TokenSearch } from "@/components/token-search";
import { TokenSummary } from "@/components/token-summary";
import { TopHolders } from "@/components/top-holders";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveToken } from "@/hooks/use-token-overview";
import { cn } from "@/lib/utils";

const CHECKS = [
  {
    icon: ChartCandlestick,
    title: "Price chart",
    body: "Candles from 1 minute to 1 week, with price, market cap and liquidity.",
  },
  {
    icon: Activity,
    title: "Organic score",
    body: "Fees, unique wallets, buy and sell balance and volume spikes, scored out of 100.",
  },
  {
    icon: Users,
    title: "Top holders",
    body: "Pools, bundled wallets and insiders flagged, with each holder's entry and PnL.",
  },
];

function Intro() {
  return (
    <ul className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
      {CHECKS.map(({ icon: Icon, title, body }) => (
        <li key={title} className="bg-background/70 p-4 backdrop-blur-xl sm:p-5">
          <Icon aria-hidden className="size-4 text-primary" />
          <p className="mt-3 text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </li>
      ))}
    </ul>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy aria-label="Loading token">
      <Skeleton className="h-[104px] rounded-2xl bg-white/[0.04]" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[420px] rounded-2xl bg-white/[0.04] sm:h-[500px]" />
        <Skeleton className="h-[420px] rounded-2xl bg-white/[0.04] sm:h-[500px]" />
      </div>
    </div>
  );
}

export function TokenDashboard() {
  const { token, status } = useActiveToken();
  const isIdle = status === "idle" || status === "invalid" || status === "error";

  return (
    <div className="space-y-6">
      <section className={cn("mx-auto w-full", isIdle ? "max-w-2xl pt-10 sm:pt-20" : "max-w-none")}>
        <h1
          className={cn(
            isIdle
              ? "text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
              : "sr-only"
          )}
        >
          Check a Solana memecoin before you buy
        </h1>
        {isIdle && (
          <p className="mt-3 mb-8 max-w-xl text-base text-muted-foreground">
            Paste a token address and get the chart, how real its trading looks and who holds it,
            on one page.
          </p>
        )}
        <TokenSearch />
      </section>

      {isIdle && (
        <div className="mx-auto max-w-2xl">
          <Intro />
        </div>
      )}

      {status === "loading" && <DashboardSkeleton />}

      {status === "ready" && token && (
        <div className="space-y-4">
          <TokenSummary token={token} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <PriceChart key={token.address} mintAddress={token.address} />
            <OrganicMarketCheck token={token} />
          </div>
          <TopHolders key={token.address} mintAddress={token.address} currentPrice={token.price} />
        </div>
      )}
    </div>
  );
}
