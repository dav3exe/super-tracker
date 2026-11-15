/**
 * detectOrganicMarketCheck.ts
 *
 * SCORING / DECISION LAYER
 * ─────────────────────────────────────────────────────────────────
 * This file's ONLY job is to take clean metrics from getSafeMetrics
 * and produce an organic-market score from 0–100.
 *
 * THE FOUR SIGNALS (each measures something different and independent):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ Signal 1 — Fee / Market Cap Ratio        (max 30 pts)            │
 * │   Real trading costs real money in fees. High fees relative to   │
 * │   market cap = genuine economic activity is happening.           │
 * │   Alone it can be gamed, but not cheaply.                        │
 * │                                                                  │
 * │ Signal 2 — Trader Density                (max 30 pts)            │
 * │   How many UNIQUE wallets are generating the volume?             │
 * │   Bots and wash traders reuse a small number of wallets.         │
 * │   Real humans each bring their own wallet.                       │
 * │                                                                  │
 * │ Signal 3 — Buy / Sell Balance            (max 20 pts)            │
 * │   Organic markets have friction — people always take profits.    │
 * │   A token with near-zero sell pressure after the first few       │
 * │   minutes suggests coordinated buying or locked sellers.         │
 * │                                                                  │
 * │ Signal 4 — Volume Consistency            (max 20 pts)            │
 * │   Is volume arriving steadily, or did it all spike in one burst? │
 * │   Compares 1m volume vs 5m volume. A healthy token sees ~20%     │
 * │   of its 5m volume in any given minute. A spike where 80%+       │
 * │   arrives in the last minute is a classic bot/pump signature.    │
 * │                                                                  │
 * │   WHY THIS REPLACED "ACTIVITY RECENCY":                          │
 * │   Memecoins almost always have recent transactions — bots make   │
 * │   microtransactions continuously on even dying tokens. Recency   │
 * │   tells you nothing meaningful in this context.                  │
 * │   Volume consistency asks a harder question: is the PATTERN of   │
 * │   activity consistent with how real humans trade?                │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * ⚠ THRESHOLDS ARE NOT YET EMPIRICALLY CALIBRATED
 * The scoring bands below are reasonable DeFi heuristics, but have
 * NOT been back-tested on a labelled dataset of Solana memecoins.
 * Before using this for automated decisions:
 *   1. Collect known organic vs inorganic tokens as ground truth.
 *   2. Plot each signal's distribution for each class.
 *   3. Adjust the bands to maximise class separation.
 */

import { calculateFees } from "./safe-metrics";
import type { DataQuality, VolumeWindow } from "./safe-metrics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrganicLabel =
  | "Highly Organic"
  | "Moderately Organic"
  | "Likely Inorganic";

export type OrganicMarketResult = {
  /**
   * Composite score: integer 0–100.
   * Made up of four signals:
   *   feeScore:         max 30 pts
   *   traderScore:      max 30 pts
   *   balanceScore:     max 20 pts
   *   consistencyScore: max 20 pts
   *   ──────────────────────────
   *   Total:            max 100 pts
   */
  organicScore: number;
  label: OrganicLabel;

  // ── Raw signal values (show these in the UI so the score isn't a black box) ──
  feeToMcapRatio:   number; // Signal 1: fees ÷ market cap
  traderDensity:    number; // Signal 2: unique wallets per $1k volume
  buySellBalance:   number; // Signal 3: -1 (all sells) to +1 (all buys)
  volumeConsistency: number; // Signal 4: 0 (all in 1 burst) to 1 (even spread)

  // ── Points each signal contributed ───────────────────────────────
  feeScore: number;
  traderScore: number;
  balanceScore: number;
  consistencyScore: number;

  // ── Supporting data ───────────────────────────────────────────────
  totalFees: number;
  feeRateUsed: number;
  dataQuality: DataQuality;
  windowLabel: VolumeWindow["windowLabel"];
};

// ─── Signal 1: Fee-to-MarketCap Ratio ────────────────────────────────────────

/**
 * Scores the ratio of estimated fees to market cap.
 *
 * WHY fees and not raw volume?
 * Fees represent real cost. If a $30k market cap token is generating
 * $1,500 in fees within its window, significant real money is moving.
 * That's expensive to fake at scale.
 *
 * A wash trader does pay their own fees, so this signal alone can be
 * gamed — but it becomes much harder to fake when Signal 2 (diverse
 * wallets) is also required to score well.
 *
 * Max: 30 points
 */
const scoreFeeToMcapRatio = (ratio: number): number => {
  if (ratio > 0.05) return 30; // Fees > 5% of mcap — very high economic activity
  if (ratio > 0.02) return 20; // Fees > 2% of mcap — meaningful activity
  if (ratio > 0.01) return 10; // Fees > 1% of mcap — mild activity
  return 0;                    // Negligible fees relative to market size
};

// ─── Signal 2: Trader Density ─────────────────────────────────────────────────

/**
 * Scores how many unique wallets are responsible for the volume.
 *
 * METRIC: Unique wallets per $1,000 of volume
 *   < 0.5  → 1 wallet per $2,000+ → concentrated, suspicious
 *   0.5–2  → moderate participation
 *   > 2.0  → many small wallets → strong organic diversity signal
 *
 * WHY per $1k?
 * The old formula used volume / 100,000 as the denominator, which
 * clamped everything under $100k to the same divisor of 1 — making
 * a $500 token look identical to a $99k token. Per-$1k gives a
 * meaningful comparison at any volume level.
 *
 * Max: 30 points
 */
const scoreTraderDensity = (density: number): number => {
  if (density > 2.0) return 30; // Strong organic signal — many diverse wallets
  if (density > 0.5) return 15; // Moderate — some diversity but not conclusive
  return 0;                     // Concentrated — few wallets driving all volume
};

// ─── Signal 3: Buy/Sell Balance ───────────────────────────────────────────────

/**
 * Scores how balanced buying and selling activity is.
 *
 * WHAT WE'RE LOOKING FOR:
 * Organic markets always have two-way flow. Even in a bull run,
 * some holders sell to take profits. One-sided activity is a flag:
 *
 *   Nearly all buys:
 *     → Could be a coordinated pump, locked sellers, or bot farm
 *     → Normal in the first 1–2 minutes of launch, suspicious after that
 *
 *   Nearly all sells:
 *     → Mass exit, rug pull, or dying token
 *
 *   Slight buy imbalance (55–65% buys):
 *     → Normal healthy uptrend with real participants
 *
 * buySellBalance range: -1.0 (all sells) to +1.0 (all buys)
 * We reward values close to zero (balanced) and penalise extremes.
 *
 * Max: 20 points
 */
const scoreBuySellBalance = (balance: number): number => {
  const abs = Math.abs(balance);
  if (abs < 0.3)  return 20; // Within ~65/35 split — healthy balance
  if (abs < 0.6)  return 10; // Noticeable lean but not alarming
  if (abs < 0.85) return 5;  // Strong one-sided pressure — worth flagging
  return 0;                  // Almost entirely one-sided — red flag
};

// ─── Signal 4: Volume Consistency ────────────────────────────────────────────

/**
 * Scores whether volume is arriving steadily or in sudden spikes.
 *
 * The volumeConsistency value (0→1) comes from getSafeMetrics,
 * where the full spike-detection logic lives with its explanation.
 *
 * Short summary:
 *   1.0 = last 1m was ~20% of 5m volume (perfectly even spread)
 *   0.0 = last 1m was nearly ALL of the 5m volume (extreme spike)
 *
 * If the consistency check was unavailable (data missing), this
 * function receives 0 and returns 0. The UI shows a warning in that
 * case via dataQuality.consistencyCheckAvailable.
 *
 * Max: 20 points
 */
const scoreVolumeConsistency = (consistency: number): number => {
  if (consistency > 0.8) return 20; // Very even spread — organic pattern
  if (consistency > 0.6) return 12; // Mostly even with a mild lean
  if (consistency > 0.4) return 6;  // Noticeable spike developing
  return 0;                         // Sharp spike — suspicious burst of activity
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Produces an organic market score from clean, pre-validated metrics.
 *
 * All four signals are scored independently then summed.
 * The result is clamped to 100 — a hard contract that ensures the
 * score never exceeds its documented range even if signals are added.
 *
 * @param volume           - Age-appropriate volume in USD
 * @param buy              - Buy-side volume in USD (same window)
 * @param sell             - Sell-side volume in USD (same window)
 * @param marketCap        - Current market cap in USD
 * @param uniqueTraders    - Unique wallet count (same window)
 * @param buySellBalance   - Buy/sell ratio from getBuySellPressure (-1 to +1)
 * @param volumeConsistency - Spike score from getVolumeConsistency (0 to 1)
 * @param windowLabel      - Which timeframe volume/traders came from
 * @param dataQuality      - Reliability flags from getSafeMetrics
 * @param feeRate          - Optional: override default 0.25% fee rate
 */
export const detectOrganicMarket = ({
  volume,
  buy,
  sell,
  marketCap,
  uniqueTraders,
  buySellBalance,
  volumeConsistency,
  windowLabel,
  dataQuality,
  feeRate,
}: {
  volume: number;
  buy: number;
  sell: number;
  marketCap: number;
  uniqueTraders: number;
  buySellBalance: number;
  volumeConsistency: number;
  windowLabel: VolumeWindow["windowLabel"];
  dataQuality: DataQuality;
  feeRate?: number;
}): OrganicMarketResult => {

  // ── Fee estimation ────────────────────────────────────────────────
  const { totalFees, feeRateUsed } = calculateFees({
    buyVolumeUSD:  buy,
    sellVolumeUSD: sell,
    feeRate,
  });

  // ── Market cap guard ──────────────────────────────────────────────
  // Clamp to 1 to avoid dividing by zero. A zero mcap usually means
  // the token isn't listed yet or the API didn't return a price.
  // The score will be unreliable, but the dataQuality.windowIsReal
  // flag will already be false, signalling the UI to show a warning.
  const safeMarketCap = Math.max(marketCap ?? 0, 1);

  // ── Signal 1: Fee-to-MarketCap Ratio ─────────────────────────────
  const feeToMcapRatio = totalFees / safeMarketCap;
  const feeScore = scoreFeeToMcapRatio(feeToMcapRatio);

  // ── Signal 2: Trader Density ──────────────────────────────────────
  // Epsilon of 0.01 prevents divide-by-zero for zero-volume tokens
  // without masking them the way Math.max(..., 1) did at $100k scale.
  const traderDensity = uniqueTraders / Math.max(volume / 1_000, 0.01);
  const traderScore = scoreTraderDensity(traderDensity);

  // ── Signal 3: Buy/Sell Balance ────────────────────────────────────
  const balanceScore = scoreBuySellBalance(buySellBalance);

  // ── Signal 4: Volume Consistency ─────────────────────────────────
  const consistencyScore = scoreVolumeConsistency(volumeConsistency);

  // ── Composite score ───────────────────────────────────────────────
  const organicScore = Math.min(
    feeScore + traderScore + balanceScore + consistencyScore,
    100
  );

  // ── Label ─────────────────────────────────────────────────────────
  // A token needs to do well on at least two signals to reach
  // "Highly Organic" — one signal alone maxing out is insufficient.
  let label: OrganicLabel = "Likely Inorganic";
  if (organicScore >= 65) label = "Highly Organic";
  else if (organicScore >= 35) label = "Moderately Organic";

  return {
    organicScore,
    label,
    feeToMcapRatio,
    traderDensity,
    buySellBalance,
    volumeConsistency,
    feeScore,
    traderScore,
    balanceScore,
    consistencyScore,
    totalFees,
    feeRateUsed,
    dataQuality,
    windowLabel,
  };
};