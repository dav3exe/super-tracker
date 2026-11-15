"use client";

import { Notice } from "@/components/notice";
import { Panel } from "@/components/panel";
import { detectOrganicMarket } from "@/lib/organic/detect-organic-market";
import { getBuySellPressure, getSafeMetrics } from "@/lib/organic/safe-metrics";
import { cn } from "@/lib/utils";
import type { TokenOverview } from "@/types/birdeye";

// ─── Signal row ──────────────────────────────────────────────────────────────

type SignalRowProps = {
  label: string;
  value: string;
  points: number;
  maxPoints: number;
  hint: string;
  unavailable?: boolean;
};

function SignalRow({ label, value, points, maxPoints, hint, unavailable = false }: SignalRowProps) {
  const pct = unavailable ? 0 : (points / maxPoints) * 100;

  return (
    <li className={cn("space-y-2 py-3", unavailable && "opacity-60")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          <span className="text-sm font-semibold text-foreground">{unavailable ? "–" : points}</span>
          {" / "}
          {maxPoints}
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${label} score`}
        aria-valuemin={0}
        aria-valuemax={maxPoints}
        aria-valuenow={unavailable ? 0 : points}
        className="h-1 overflow-hidden rounded-full bg-white/[0.07]"
      >
        <div className="h-full rounded-full bg-primary/80" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-foreground/85">
        {unavailable ? "Not enough data in this window" : value}
      </p>
      <p className="text-xs text-muted-foreground">{unavailable ? "Adds 0 points" : hint}</p>
    </li>
  );
}

// ─── Reliability note ────────────────────────────────────────────────────────
// For tokens under ~1 hour old the API backfills the larger windows with
// copied data, so the score is directional at best. Tell the user how much
// to trust it.

function ReliabilityNote({ tokenAgeHours, ageIsReal }: { tokenAgeHours: number; ageIsReal: boolean }) {
  if (!ageIsReal) {
    return (
      <Notice title="Token age unknown">
        We can&apos;t tell how old this token is, so we can&apos;t say how reliable the score is.
        It&apos;s meaningful once a token is at least 1 hour old and most reliable after 6 hours.
      </Notice>
    );
  }

  if (tokenAgeHours < 1) {
    const minutes = Math.round(tokenAgeHours * 60);
    return (
      <Notice tone="warning" title="Early token: treat the score with caution">
        This token is {minutes} minute{minutes !== 1 ? "s" : ""} old. Only the 1m and 5m windows have
        real data yet, so the score reflects the last few minutes. Check again after 1 hour, and
        after 6 hours for a reliable read.
      </Notice>
    );
  }

  if (tokenAgeHours < 6) {
    return (
      <Notice tone="info" title="Developing score">
        This token is {tokenAgeHours.toFixed(1)} hours old. The 1h window now has real data. The
        score gets more reliable after 6 hours, when the 4h window fills in.
      </Notice>
    );
  }

  return (
    <Notice tone="positive" title={tokenAgeHours < 24 ? "Good reliability" : "High reliability"}>
      This token is {tokenAgeHours.toFixed(1)} hours old.{" "}
      {tokenAgeHours < 24
        ? "The 4h window has real data. Full reliability after 24 hours."
        : "Every time window has full history."}
    </Notice>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const verdictStyle = {
  "Highly Organic": { text: "text-positive", bar: "bg-positive" },
  "Moderately Organic": { text: "text-warning", bar: "bg-warning" },
  "Likely Inorganic": { text: "text-negative", bar: "bg-negative" },
} as const;

export function OrganicMarketCheck({ token }: { token: TokenOverview }) {
  const description = "How likely the trading is real, from fees, wallets and volume patterns.";

  if (!token.marketCap || token.marketCap <= 0) {
    return (
      <Panel title="Organic market score" description={description}>
        <Notice title="Can't score this token">
          Market cap isn&apos;t available. The token may not have a live price feed yet or may not be
          listed on a DEX.
        </Notice>
      </Panel>
    );
  }

  const metrics = getSafeMetrics(token);
  const buySellBalance = getBuySellPressure(metrics.buy, metrics.sell);
  const result = detectOrganicMarket({
    volume: metrics.volume,
    buy: metrics.buy,
    sell: metrics.sell,
    marketCap: token.marketCap,
    uniqueTraders: metrics.traders,
    buySellBalance,
    volumeConsistency: metrics.volumeConsistency,
    windowLabel: metrics.windowLabel,
    dataQuality: metrics.dataQuality,
  });

  const style = verdictStyle[result.label];

  const totalSides = metrics.buy + metrics.sell;
  const buyPct = totalSides > 0 ? ((metrics.buy / totalSides) * 100).toFixed(0) : "–";
  const sellPct = totalSides > 0 ? ((metrics.sell / totalSides) * 100).toFixed(0) : "–";

  const balanceLabel =
    Math.abs(buySellBalance) < 0.3 ? "Roughly balanced"
    : buySellBalance > 0.85 ? "Almost all buys, very suspicious"
    : buySellBalance > 0.6 ? "Heavy buy pressure"
    : buySellBalance > 0.3 ? "Leaning towards buys"
    : buySellBalance < -0.85 ? "Almost all sells, a mass exit signal"
    : buySellBalance < -0.6 ? "Heavy sell pressure"
    : "Leaning towards sells";

  const consistencyLabel =
    metrics.volumeConsistency > 0.8 ? "Evenly spread, an organic pattern"
    : metrics.volumeConsistency > 0.6 ? "Mostly even, with a mild spike"
    : metrics.volumeConsistency > 0.4 ? "A noticeable volume spike"
    : "A sharp spike, a suspicious burst";

  const age =
    metrics.tokenAgeHours < 1
      ? `${Math.round(metrics.tokenAgeHours * 60)} min`
      : `${metrics.tokenAgeHours.toFixed(1)} hrs`;

  return (
    <Panel title="Organic market score" description={description}>
      <div className="glass-inset rounded-xl p-4">
        <div className="flex items-end justify-between gap-4">
          <p className="tabular-nums">
            <span className="text-5xl font-semibold tracking-tight">{result.organicScore}</span>
            <span className="ml-1 text-base text-muted-foreground">/ 100</span>
          </p>
          <p className={cn("pb-1.5 text-right text-sm font-semibold", style.text)}>{result.label}</p>
        </div>
        <div
          role="meter"
          aria-label="Organic market score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={result.organicScore}
          aria-valuetext={`${result.organicScore} out of 100, ${result.label}`}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", style.bar)}
            style={{ width: `${result.organicScore}%` }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Stage</dt>
            <dd className="mt-0.5 capitalize">{metrics.stage}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Age</dt>
            <dd className="mt-0.5 tabular-nums">
              {result.dataQuality.ageIsReal ? age : <span className="text-warning">Unknown</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Data window</dt>
            <dd className="mt-0.5">
              {result.windowLabel}
              {!result.dataQuality.windowIsReal && (
                <span className="ml-1 text-xs text-negative">(backfilled)</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 space-y-2">
        <ReliabilityNote
          tokenAgeHours={metrics.tokenAgeHours}
          ageIsReal={result.dataQuality.ageIsReal}
        />
        {!result.dataQuality.windowIsReal && (
          <Notice tone="negative" title={`The ${result.windowLabel} window is backfilled`}>
            The API copied data into this window instead of reporting real activity. Volume and
            wallet counts here are unreliable, so the score may be far off.
          </Notice>
        )}
      </div>

      <h3 className="mt-5 text-sm font-medium text-muted-foreground">How the score is built</h3>
      <ul className="divide-y divide-white/[0.06]">
        <SignalRow
          label="Fee activity"
          value={`Fees equal ${(result.feeToMcapRatio * 100).toFixed(3)}% of market cap`}
          points={result.feeScore}
          maxPoints={30}
          hint={`About $${result.totalFees.toLocaleString("en-US", { maximumFractionDigits: 2 })} in fees at a ${(result.feeRateUsed * 100).toFixed(2)}% rate`}
        />
        <SignalRow
          label="Trader diversity"
          value={`${result.traderDensity.toFixed(2)} unique wallets per $1k of volume`}
          points={result.traderScore}
          maxPoints={30}
          hint={`${metrics.traders.toLocaleString("en-US")} wallets on $${metrics.volume.toLocaleString("en-US", { maximumFractionDigits: 0 })} volume (${result.windowLabel})`}
        />
        <SignalRow
          label="Buy and sell balance"
          value={balanceLabel}
          points={result.balanceScore}
          maxPoints={20}
          hint={`${buyPct}% buys and ${sellPct}% sells by volume`}
        />
        <SignalRow
          label="Volume consistency"
          value={consistencyLabel}
          points={result.consistencyScore}
          maxPoints={20}
          hint="Compares the last 1m of volume with the last 5m. Sudden spikes suggest bots or a pump."
          unavailable={!result.dataQuality.consistencyCheckAvailable}
        />
      </ul>
    </Panel>
  );
}
