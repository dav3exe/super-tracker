"use client";

import { ArrowUpRight } from "lucide-react";
import { CopyAddress } from "@/components/copy-address";
import { Stat } from "@/components/stat";
import { TokenLogo } from "@/components/token-logo";
import { formatCompact, formatTokenPrice } from "@/lib/format";
import type { TokenOverview } from "@/types/birdeye";

export function TokenSummary({ token }: { token: TokenOverview }) {
  return (
    <section
      aria-label={`${token.name} overview`}
      className="glass flex flex-col gap-5 rounded-2xl p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <TokenLogo key={token.logoURI} src={token.logoURI} symbol={token.symbol} size={48} />
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold tracking-tight">
            <span className="truncate">{token.name}</span>
            <span className="text-sm font-medium text-muted-foreground">{token.symbol}</span>
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <CopyAddress address={token.address} chars={5} />
            <a
              href={`https://solscan.io/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Solscan
              <ArrowUpRight aria-hidden className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-x-6 gap-y-3 sm:gap-x-10">
        <Stat label="Price" value={`$${formatTokenPrice(token.price)}`} size="md" />
        <Stat
          label="Market cap"
          value={token.marketCap ? `$${formatCompact(token.marketCap)}` : "N/A"}
          size="md"
        />
        <Stat label="Liquidity" value={`$${formatCompact(token.liquidity)}`} size="md" />
      </dl>
    </section>
  );
}
