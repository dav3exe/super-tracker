"use client";

import { ArrowUpRight, ChevronDown, Droplets, Eye, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { CopyAddress } from "@/components/copy-address";
import { Notice } from "@/components/notice";
import { Stat, StatGrid, pnlTone } from "@/components/stat";
import { WalletOverviewPanel } from "@/components/wallet-overview-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFullTradeHistory, useTradeHistory } from "@/hooks/use-trade-history";
import {
  formatCompact,
  formatMarketCap,
  formatSignedPct,
  formatSignedUsd,
  formatTokenPrice,
  formatUsd,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyzedHolder } from "@/types/holders";

type HolderRowProps = {
  holder: AnalyzedHolder;
  rank: number;
  mintAddress: string;
  currentPrice: number;
  mintCreatedAt: number | null;
  totalSupply: number | null;
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-3 text-sm font-medium">{children}</h4>;
}

export function HolderRow({
  holder,
  rank,
  mintAddress,
  currentPrice,
  mintCreatedAt,
  totalSupply,
}: HolderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAllSells, setShowAllSells] = useState(false);

  const tradeArgs = {
    walletAddress: holder.walletAddress,
    mintAddress,
    currentBalance: holder.uiAmount,
    mintCreatedAt,
    totalSupply,
  };

  const { data: trade, isLoading: tradeLoading, isFetching: tradeFetching } = useTradeHistory({
    ...tradeArgs,
    enabled: expanded,
  });

  const fullScan = useFullTradeHistory(tradeArgs);
  const isFullScanning = fullScan.isPending;
  const isScanning = tradeLoading || tradeFetching || isFullScanning;

  const currentValue = holder.uiAmount * currentPrice;

  const unrealisedUsdPnl =
    trade?.tokensBought && trade.costBasisRemaining != null
      ? currentValue - trade.costBasisRemaining
      : null;
  const unrealisedPnlPercent =
    trade?.costBasisRemaining && trade.costBasisRemaining > 0 && unrealisedUsdPnl != null
      ? (unrealisedUsdPnl / trade.costBasisRemaining) * 100
      : null;
  const totalUsdPnl =
    trade?.tokensBought && unrealisedUsdPnl != null ? trade.realisedUsdPnl + unrealisedUsdPnl : null;
  const totalPnlPercent =
    trade?.usdSpent && trade.usdSpent > 0 && totalUsdPnl != null
      ? (totalUsdPnl / trade.usdSpent) * 100
      : null;

  // No market buy found after a complete scan: tokens arrived some other way.
  const isInsider =
    expanded &&
    !isScanning &&
    !holder.isLP &&
    (!trade || (trade.scanIncomplete === false && trade.tokensBought === 0));

  const visibleSells = trade ? (showAllSells ? trade.sells : trade.sells.slice(0, 3)) : [];

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
      <li
        className={cn(
          "glass-inset rounded-xl transition-colors",
          holder.isLP && "border-info/25 bg-info/[0.04]",
          isInsider && "border-warning/30 bg-warning/[0.04]"
        )}
      >
        <div className="flex items-center gap-3 p-3 sm:px-4">
          <span className="w-6 shrink-0 text-sm text-muted-foreground tabular-nums">{rank}</span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <CopyAddress address={holder.walletAddress} />
            {(holder.isLP || holder.isSuspected || isInsider) && (
              <div className="flex flex-wrap gap-1.5">
                {holder.isLP && (
                  <Badge variant="outline" className="border-info/30 bg-info/10 text-info">
                    <Droplets aria-hidden />
                    Liquidity pool
                  </Badge>
                )}
                {holder.isSuspected && !holder.isLP && (
                  <Badge variant="outline" className="border-negative/30 bg-negative/10 text-negative">
                    <TriangleAlert aria-hidden />
                    {holder.bundlingRisk} bundle risk ({holder.bundlingScore.toFixed(0)}/100)
                  </Badge>
                )}
                {isInsider && (
                  <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                    <Eye aria-hidden />
                    Possible insider or team wallet
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">{formatCompact(holder.uiAmount)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {currentPrice > 0 ? formatUsd(currentValue) : "tokens"}
            </p>
          </div>

          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-muted-foreground hover:text-foreground"
            >
              <span className="hidden sm:inline">{expanded ? "Hide" : "Details"}</span>
              <span className="sr-only sm:hidden">{expanded ? "Hide details" : "Show details"}</span>
              <ChevronDown
                aria-hidden
                className={cn("transition-transform duration-200", expanded && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-5 border-t border-white/[0.06] p-3 sm:p-4">
          {isScanning && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {isFullScanning
                ? "Scanning the wallet's full history. Older wallets can take a while."
                : "Scanning the wallet's last 500 swaps…"}
            </p>
          )}

          {!isScanning && holder.isLP && (
            <Notice tone="info" icon={Droplets} title="This is the trading pool, not a holder">
              <p>
                The pool holds tokens so people can buy and sell. More tokens in the pool means
                deeper liquidity.
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-4 sm:max-w-xs">
                <Stat label="Tokens in pool" value={formatCompact(holder.uiAmount)} tone="info" />
                <Stat label="Pool value" value={formatUsd(currentValue)} tone="info" />
              </dl>
            </Notice>
          )}

          {!isScanning && trade?.scanIncomplete && (
            <Notice tone="warning" title="No buy found in the last 500 swaps">
              <p>
                This wallet may have bought a long time ago. Entry price and PnL stay incomplete
                until you load the full history.
                {trade.sells.length > 0 &&
                  ` ${trade.sells.length} sell${trade.sells.length > 1 ? "s" : ""} found so far.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() =>
                  fullScan.mutate({
                    resumeFromSignature: trade.resumeFromSignature,
                    previousSells: trade.rawSells,
                  })
                }
              >
                Load full history
              </Button>
            </Notice>
          )}

          {fullScan.isError && (
            <Notice tone="negative" title="The full history scan failed">
              The wallet lookup stopped partway. Try loading the full history again.
            </Notice>
          )}

          {!isScanning && isInsider && (
            <Notice tone="warning" icon={Eye} title="Never bought on the open market">
              <p>
                No swap into this token was found. The tokens likely came from a team allocation,
                an airdrop or a direct transfer, which often means a team wallet or an early
                insider.
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-4 sm:max-w-xs">
                <Stat label="Holding" value={formatCompact(holder.uiAmount)} />
                <Stat label="Value" value={formatUsd(currentValue)} />
              </dl>
            </Notice>
          )}

          {!isScanning && trade && trade.tokensBought > 0 && (
            <>
              <section>
                <SectionHeading>Entry</SectionHeading>
                <StatGrid className="lg:grid-cols-5">
                  <Stat
                    label="Avg entry price"
                    value={`$${formatTokenPrice(trade.entryPriceUSD)}`}
                    hint={`First buy ${trade.entryDate}`}
                  />
                  <Stat
                    label="Avg entry (SOL)"
                    value={`${formatTokenPrice(trade.entryPriceInSol)} SOL`}
                    hint={
                      trade.avgEntryMarketCapUSD != null
                        ? `${formatMarketCap(trade.avgEntryMarketCapUSD)} market cap`
                        : "Averaged across all buys"
                    }
                  />
                  <Stat label="Tokens bought" value={formatCompact(trade.tokensBought)} />
                  <Stat label="SOL spent" value={`${trade.solSpent.toFixed(4)} SOL`} />
                  <Stat label="USD spent" value={formatUsd(trade.usdSpent)} hint="At today's SOL price" />
                </StatGrid>
              </section>

              <section>
                <SectionHeading>Current position</SectionHeading>
                <StatGrid className="lg:grid-cols-5">
                  <Stat label="Tokens held" value={formatCompact(holder.uiAmount)} />
                  <Stat label="Current value" value={formatUsd(currentValue)} />
                  <Stat
                    label="Tokens sold"
                    value={trade.totalTokensSold > 0 ? formatCompact(trade.totalTokensSold) : "None"}
                    tone={trade.totalTokensSold > 0 ? "negative" : "muted"}
                  />
                  {trade.totalTokensSold > 0 && (
                    <>
                      <Stat label="SOL received" value={`${trade.totalSolReceived.toFixed(4)} SOL`} />
                      <Stat label="USD received" value={formatUsd(trade.totalUsdReceived)} />
                    </>
                  )}
                </StatGrid>
              </section>

              <section>
                <SectionHeading>Profit and loss on this token</SectionHeading>
                <StatGrid>
                  {trade.totalTokensSold > 0 && (
                    <Stat
                      label="Realised"
                      value={formatSignedUsd(trade.realisedUsdPnl)}
                      hint={formatSignedPct(trade.realisedPnlPercent)}
                      tone={pnlTone(trade.realisedUsdPnl)}
                    />
                  )}
                  <Stat
                    label="Unrealised"
                    value={unrealisedUsdPnl != null ? formatSignedUsd(unrealisedUsdPnl) : "N/A"}
                    hint={unrealisedPnlPercent != null ? formatSignedPct(unrealisedPnlPercent) : "Tokens still held"}
                    tone={pnlTone(unrealisedUsdPnl)}
                  />
                  <Stat
                    label="Total"
                    value={totalUsdPnl != null ? formatSignedUsd(totalUsdPnl) : "N/A"}
                    hint={totalPnlPercent != null ? formatSignedPct(totalPnlPercent) : "Realised + unrealised"}
                    tone={pnlTone(totalUsdPnl)}
                  />
                </StatGrid>
              </section>

              {trade.sells.length > 0 && (
                <section>
                  <SectionHeading>
                    Sells <span className="font-normal text-muted-foreground">({trade.sells.length})</span>
                  </SectionHeading>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm tabular-nums">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th scope="col" className="pb-2 font-normal">Date</th>
                          <th scope="col" className="pb-2 text-right font-normal">Tokens</th>
                          <th scope="col" className="pb-2 text-right font-normal">SOL</th>
                          <th scope="col" className="pb-2 text-right font-normal">USD</th>
                          <th scope="col" className="pb-2 text-right font-normal">
                            <span className="sr-only">Transaction</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {visibleSells.map((sell) => (
                          <tr key={sell.signature}>
                            <td className="py-2 text-muted-foreground">{sell.date}</td>
                            <td className="py-2 text-right text-negative">{formatCompact(sell.tokensSold)}</td>
                            <td className="py-2 text-right">{sell.solReceived.toFixed(4)}</td>
                            <td className="py-2 text-right">{formatUsd(sell.usdReceived)}</td>
                            <td className="py-2 text-right">
                              <a
                                href={`https://solscan.io/tx/${sell.signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                Tx
                                <ArrowUpRight aria-hidden className="size-3.5" />
                                <span className="sr-only">(opens Solscan in a new tab)</span>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {trade.sells.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-muted-foreground"
                      onClick={() => setShowAllSells((s) => !s)}
                    >
                      {showAllSells ? "Show fewer" : `Show all ${trade.sells.length} sells`}
                    </Button>
                  )}
                </section>
              )}
            </>
          )}

          {!holder.isLP && <WalletOverviewPanel walletAddress={holder.walletAddress} />}
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}
