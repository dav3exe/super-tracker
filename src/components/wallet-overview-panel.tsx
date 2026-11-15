"use client";

import { Notice } from "@/components/notice";
import { Stat, StatGrid, pnlTone } from "@/components/stat";
import { TokenLogo } from "@/components/token-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletOverview } from "@/hooks/use-wallet-overview";
import { formatCompact, formatSignedPct, formatSignedUsd, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The holder's whole wallet: value, top holdings and PnL across all tokens. */
export function WalletOverviewPanel({ walletAddress }: { walletAddress: string }) {
  const { data, isPending, isError } = useWalletOverview(walletAddress, true);

  return (
    <section aria-labelledby={`wallet-${walletAddress}`} className="space-y-3">
      <h4 id={`wallet-${walletAddress}`} className="text-sm font-medium">
        Whole wallet
        <span className="ml-2 font-normal text-muted-foreground">all tokens, not just this one</span>
      </h4>

      {isPending && (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy>
          <Skeleton className="h-40 rounded-xl bg-white/[0.04]" />
          <Skeleton className="h-40 rounded-xl bg-white/[0.04]" />
        </div>
      )}

      {isError && (
        <Notice tone="negative" title="Couldn't load this wallet">
          The wallet lookup failed. Collapse and reopen the row to try again.
        </Notice>
      )}

      {data && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="glass-inset space-y-4 rounded-xl p-3.5">
            <StatGrid>
              <Stat label="Wallet value" value={formatUsd(data.portfolio.totalUsdValue)} />
              <Stat
                label="SOL balance"
                value={`${data.portfolio.solBalance.toFixed(3)} SOL`}
                hint={`≈ ${formatUsd(data.portfolio.solUsdValue)}`}
              />
              <Stat label="Tokens held" value={data.portfolio.tokenCount} />
            </StatGrid>

            {data.portfolio.tokens.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Largest holdings</p>
                <ul className="space-y-2">
                  {data.portfolio.tokens.slice(0, 5).map((token) => (
                    <li key={token.mint} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <TokenLogo src={token.logoURI} symbol={token.symbol} size={18} />
                        <span className="truncate font-medium">{token.symbol}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatCompact(token.uiAmount)}
                        </span>
                      </span>
                      <span className="tabular-nums">{formatUsd(token.usdValue)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="glass-inset rounded-xl p-3.5">
            <p className="mb-1 text-xs text-muted-foreground">Trading PnL, all tokens</p>
            <ul className="divide-y divide-white/[0.06]">
              {data.pnlWindows.map((w) => (
                <li key={w.windowLabel} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{w.windowLabel}</span>
                    <span className={cn("text-sm font-semibold tabular-nums", w.totalUsd >= 0 ? "text-positive" : "text-negative")}>
                      {formatSignedUsd(w.totalUsd)}
                      {w.totalPct !== null && (
                        <span className="ml-1.5 text-xs font-medium">{formatSignedPct(w.totalPct, 1)}</span>
                      )}
                    </span>
                  </div>
                  <dl className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground tabular-nums">
                    <div className="flex gap-1">
                      <dt>Realised</dt>
                      <dd className={pnlTone(w.realisedUsd) === "positive" ? "text-positive" : "text-negative"}>
                        {formatSignedUsd(w.realisedUsd)}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Unrealised</dt>
                      <dd className="text-foreground/80">{formatSignedUsd(w.unrealisedUsd)}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Deployed</dt>
                      <dd>{formatUsd(w.totalCostBasisUsd)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
