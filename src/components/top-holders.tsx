"use client";

import Image from "next/image";
import { ArrowUpRight, RotateCw } from "lucide-react";
import { HolderRow } from "@/components/holder-row";
import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMintCreatedAt, useTopHolders } from "@/hooks/use-top-holders";

type TopHoldersProps = {
  mintAddress: string;
  currentPrice: number;
};

export function TopHolders({ mintAddress, currentPrice }: TopHoldersProps) {
  const { data: holders, isPending, isError, refetch, isFetching } = useTopHolders(mintAddress);
  const { data: mintCreatedAt = null } = useMintCreatedAt(mintAddress);

  return (
    <Panel
      title="Top 10 holders"
      description="Open a holder to see their entry, sells, PnL and the rest of their wallet."
      aria-busy={isPending}
      actions={
        <Button variant="outline" size="sm" asChild className="glass-inset gap-2">
          <a
            href={`https://v2.bubblemaps.io/map?address=${mintAddress}&chain=solana&limit=80`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/bubblemaps.png" alt="" width={16} height={16} className="rounded-full" />
            Bubblemaps
            <ArrowUpRight aria-hidden className="text-muted-foreground" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      }
    >
      {isPending && (
        <ul className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-[60px] rounded-xl bg-white/[0.04]" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <Notice tone="negative" title="Couldn't load holders">
          <p>The holder lookup failed. This can happen with very large or brand-new tokens.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw aria-hidden className={isFetching ? "animate-spin" : undefined} />
            Try again
          </Button>
        </Notice>
      )}

      {holders && holders.length === 0 && (
        <Notice title="No holders found">This token has no accounts with a balance yet.</Notice>
      )}

      {holders && holders.length > 0 && (
        <ol className="space-y-2">
          {holders.slice(0, 10).map((holder, i) => (
            <HolderRow
              key={holder.tokenAccount}
              holder={holder}
              rank={i + 1}
              mintAddress={mintAddress}
              currentPrice={currentPrice}
              mintCreatedAt={mintCreatedAt}
              // Total supply isn't wired up yet, so entry market cap stays hidden.
              totalSupply={null}
            />
          ))}
        </ol>
      )}
    </Panel>
  );
}
