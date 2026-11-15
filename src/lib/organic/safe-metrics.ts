/**
 * getSafeMetrics.ts
 *
 * METRIC PREPARATION LAYER
 * ─────────────────────────────────────────────────────────────────
 * This file's ONLY job is to take a raw token object from the API
 * and extract clean, reliable numbers before any scoring happens.
 *
 * KEY PROBLEMS THIS FILE SOLVES:
 *
 * 1. API BACKFILLING (the biggest trap for new tokens)
 *    When a token is only a few minutes old, the API has no real
 *    historical data for 1h, 4h, 24h windows — so it copies the
 *    same number into all of them. A 7-minute-old token showing
 *    identical volume across 1h, 4h, and 24h is NOT real data.
 *
 *    HOW WE DETECT IT:
 *    The API sets ChangePercent fields to `null` when a window has
 *    no real prior period to compare against. We use these null
 *    flags to know which windows are real vs backfilled.
 *
 * 2. VOLUME + TRADERS ALWAYS FROM THE SAME WINDOW
 *    Both must come from the same time window or any ratio between
 *    them is meaningless.
 *
 * 3. ALL OUTPUT VALUES ARE GUARANTEED TO BE REAL NUMBERS
 *    Never undefined or null — so the scoring layer needs zero
 *    defensive checks.
 *
 * 4. DATA QUALITY FLAGS
 *    A `dataQuality` object tells the UI exactly what was reliable,
 *    so it can show appropriate warnings to the user.
 */

import type { TokenOverview } from "@/types/birdeye";

// ─── Types ────────────────────────────────────────────────────────────────────

/** How old the token is — drives which time window we use */
export type TokenStage = "very new" | "new" | "young" | "mature";

/** One time window's worth of volume data */
export type VolumeWindow = {
  volume: number;
  buy: number;
  sell: number;
  windowLabel: "5m" | "1h" | "4h" | "24h";
};

/**
 * How much should we trust the metrics we extracted?
 * These flags are advisory — the scoring layer and UI decide what
 * to do with them (skip scoring, show warning, etc.)
 */
export type DataQuality = {
  /**
   * Was token age calculated from a real creation timestamp?
   *   true  → age is trustworthy
   *   false → no creation time found in API response; age is unknown
   */
  ageIsReal: boolean;

  /**
   * Is the volume/traders window we selected actually real data?
   *   true  → the chosen window has a non-null ChangePercent,
   *            meaning the API had real historical data for it
   *   false → ChangePercent was null, meaning the API backfilled
   *            this window by copying data from a smaller window.
   *            Volume and trader numbers here are NOT trustworthy.
   */
  windowIsReal: boolean;

  /**
   * Was the volume consistency check (Signal 4) able to run?
   *   true  → both 1m and 5m windows had real non-backfilled data
   *   false → one or both windows were backfilled or missing,
   *            so the consistency signal was skipped (contributes 0 pts)
   */
  consistencyCheckAvailable: boolean;
};

/** Everything the scoring layer needs — clean, safe, validated */
export type SafeMetrics = {
  stage: TokenStage;
  tokenAgeHours: number;
  volume: number;
  traders: number;
  buy: number;
  sell: number;
  windowLabel: VolumeWindow["windowLabel"];

  /**
   * Volume consistency: 0.0 → 1.0
   *
   *   1.0 = volume is evenly spread across the 5m window (organic)
   *   0.0 = nearly all volume happened in a single 1m burst (suspicious)
   *
   * Calculated by comparing 1m volume against 5m volume.
   * These two windows are almost always real (non-backfilled) even
   * for very new tokens, making them the most reliable pair to compare.
   *
   * Set to 0 when consistencyCheckAvailable = false.
   */
  volumeConsistency: number;

  dataQuality: DataQuality;
};

// ─── Step 1: Detect which windows the API actually has real data for ──────────

/**
 * Checks which time windows the API genuinely populated vs backfilled.
 *
 * The API signals backfilling by setting ChangePercent to null —
 * because it has no "previous period" to compare against when a
 * window is too new to have real historical data.
 *
 * Real example from a 7-minute-old token:
 *   v5mChangePercent:  -58.78  ← REAL (has a prior 5m window to compare)
 *   v1mChangePercent:  -42.87  ← REAL
 *   v1hChangePercent:  null    ← BACKFILLED (no real 1h history exists yet)
 *   v4hChangePercent:  null    ← BACKFILLED
 *   v24hChangePercent: null    ← BACKFILLED
 */
const getWindowAvailability = (token: TokenOverview | undefined) => ({
  has1m:  token?.v1mChangePercent  !== null && token?.v1mChangePercent  !== undefined,
  has5m:  token?.v5mChangePercent  !== null && token?.v5mChangePercent  !== undefined,
  has1h:  token?.v1hChangePercent  !== null && token?.v1hChangePercent  !== undefined,
  has4h:  token?.v4hChangePercent  !== null && token?.v4hChangePercent  !== undefined,
  has24h: token?.v24hChangePercent !== null && token?.v24hChangePercent !== undefined,
});

// ─── Step 2: Classify the token's age into a lifecycle stage ─────────────────

/**
 * Maps token age in hours to a lifecycle stage label.
 *
 * WHY this matters:
 * A 10-minute-old token with $5k in 5m volume is very active.
 * That same $5k in 24h volume would make it look completely dead —
 * because it hasn't existed long enough to fill a 24h window.
 * We always compare volume against the window that matches the
 * token's actual lifespan.
 *
 * Stage is also shown in the UI with a note about analysis reliability.
 * Scores for tokens under ~1 hour old should be treated with caution.
 */
export const getTokenStage = (ageHours: number): TokenStage => {
  if (ageHours < 1)  return "very new"; // ideal window: 5m
  if (ageHours < 6)  return "new";      // ideal window: 1h
  if (ageHours < 24) return "young";    // ideal window: 4h
  return "mature";                       // ideal window: 24h
};

// ─── Step 3: Select the best REAL volume window for this token ────────────────

/**
 * Picks the most appropriate volume window, but ONLY if the API
 * has real (non-backfilled) data for it.
 *
 * Logic:
 *   - Start with the ideal window for the token's age.
 *   - If that window is backfilled (null ChangePercent), step down
 *     to the next smaller window that is real.
 *   - Ultimate fallback is always 5m, which is available from minute one.
 *
 * Returns `isReal: true` when we found a non-backfilled window,
 * `isReal: false` when even the fallback window is suspect.
 * The scorer uses this to decide whether to trust the numbers.
 */
export const getBestVolumeWindow = (
  tokenAgeHours: number,
  token: TokenOverview | undefined,
  availability: ReturnType<typeof getWindowAvailability>
): VolumeWindow & { isReal: boolean } => {

  // Build a window object cleanly
  const make = (
    label: VolumeWindow["windowLabel"],
    volume: number,
    buy: number,
    sell: number,
    isReal: boolean
  ) => ({ volume, buy, sell, windowLabel: label, isReal });

  // Try the ideal window for the token's age, then fall back if backfilled
  if (tokenAgeHours >= 24 && availability.has24h) {
    return make("24h", token?.v24hUSD ?? 0, token?.vBuy24hUSD ?? 0, token?.vSell24hUSD ?? 0, true);
  }
  if (tokenAgeHours >= 6 && availability.has4h) {
    return make("4h",  token?.v4hUSD  ?? 0, token?.vBuy4hUSD  ?? 0, token?.vSell4hUSD  ?? 0, true);
  }
  if (tokenAgeHours >= 1 && availability.has1h) {
    return make("1h",  token?.v1hUSD  ?? 0, token?.vBuy1hUSD  ?? 0, token?.vSell1hUSD  ?? 0, true);
  }

  // 5m is the final fallback — real for almost all tokens from launch
  return make(
    "5m",
    token?.v5mUSD    ?? 0,
    token?.vBuy5mUSD ?? 0,
    token?.vSell5mUSD ?? 0,
    availability.has5m
  );
};

// ─── Step 4: Match trader count to the same window ───────────────────────────

/**
 * Returns the unique wallet count for whichever window was selected
 * for volume. This guarantees trader density is never calculated
 * across mismatched timeframes.
 */
const getTraderCountForWindow = (
  windowLabel: VolumeWindow["windowLabel"],
  token: TokenOverview | undefined
): number => {
  switch (windowLabel) {
    case "5m":  return token?.uniqueWallet5m  ?? 0;
    case "1h":  return token?.uniqueWallet1h  ?? 0;
    case "4h":  return token?.uniqueWallet4h  ?? 0;
    case "24h":
    default:    return token?.uniqueWallet24h ?? 0;
  }
};

// ─── Step 5: Buy/sell pressure ────────────────────────────────────────────────

/**
 * Returns buy/sell balance as a value from -1 to +1.
 *
 *  +1.0 = 100% buys, zero sells  (extreme buy pressure)
 *   0.0 = perfectly balanced
 *  -1.0 = 100% sells, zero buys  (extreme sell pressure)
 *
 * Organic markets always have some sell pressure — people take profits.
 * A token with near-zero sells after its first few minutes is worth
 * scrutinising (possible coordinated pump with locked sellers).
 */
export const getBuySellPressure = (buy: number, sell: number): number => {
  const total = buy + sell;
  if (total === 0) return 0;
  return (buy - sell) / total;
};

// ─── Step 6: Volume consistency (1m vs 5m spike detection) ───────────────────

/**
 * Detects whether volume is spreading gradually across time (organic)
 * or all arrived in one sudden burst (bot/coordinated activity).
 *
 * METHOD: Compare 1-minute volume against 5-minute volume.
 *
 * If volume is evenly spread, each 1m slice should be roughly 1/5
 * (20%) of the total 5m volume. A large spike means 80%+ of all
 * 5m volume arrived in just the last minute — a classic bot signature.
 *
 * WHY 1m vs 5m specifically?
 * These are the only two windows that are reliably real (non-backfilled)
 * even for tokens that are only minutes old. Larger windows like 1h
 * are backfilled by the API until the token is old enough to have
 * a real prior period to compare against (confirmed by real API data).
 *
 * RETURNS: 0.0 → 1.0
 *   1.0 = perfectly even spread  (organic signal)
 *   0.0 = extreme spike in last minute  (suspicious)
 *
 * Examples:
 *   5m vol = $50k, 1m vol = $10k → share = 20% → consistency ≈ 1.00 ✓
 *   5m vol = $50k, 1m vol = $25k → share = 50% → consistency ≈ 0.70
 *   5m vol = $50k, 1m vol = $40k → share = 80% → consistency ≈ 0.40 ⚠
 *   5m vol = $50k, 1m vol = $50k → share = 100% → consistency ≈ 0.20 ✗
 */
export const getVolumeConsistency = (
  v1mUSD: number,
  v5mUSD: number,
  has1m: boolean,
  has5m: boolean
): number => {
  if (!has1m || !has5m) return 0; // data not available — skip
  if (v5mUSD <= 0) return 0;      // no volume — nothing to compare

  const actualShare   = v1mUSD / v5mUSD;  // what fraction arrived in last 1m
  const expectedShare = 1 / 5;            // what we'd expect if perfectly even

  // How far above the expected share is the actual share?
  // Clamp to [0, 1] so the result is always a clean 0→1 value.
  const deviation   = Math.max(0, actualShare - expectedShare);
  const consistency = Math.max(0, 1 - deviation);

  return consistency;
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Takes a raw API token and returns clean metrics for the scoring layer.
 *
 * TOKEN AGE RESOLUTION ORDER:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ 1st → token.tokenAgeHours   (pre-computed from creation time)    │
 * │ 2nd → token.createdUnixTime (raw on-chain creation timestamp)    │
 * │ Fail → ageIsReal = false, tokenAgeHours defaults to 0            │
 * │                                                                  │
 * │ NOTE: lastTradeUnixTime is intentionally NOT used as a fallback. │
 * │ It told us when the last trade happened, not when the token was  │
 * │ created. A dormant token that gets one trade looks brand new —   │
 * │ which completely breaks stage classification and window selection.│
 * └──────────────────────────────────────────────────────────────────┘
 */
export const getSafeMetrics = (token: TokenOverview | undefined): SafeMetrics => {
  const nowInSeconds = Date.now() / 1000;

  // ── Token age ─────────────────────────────────────────────────────
  let tokenAgeHours: number;
  let ageIsReal: boolean;

  if (typeof token?.tokenAgeHours === "number") {
    tokenAgeHours = token.tokenAgeHours;
    ageIsReal = true;
  } else if (typeof token?.createdUnixTime === "number") {
    tokenAgeHours = (nowInSeconds - token.createdUnixTime) / 3600;
    ageIsReal = true;
  } else {
    // No creation time available — we genuinely don't know the age.
    // Default to 0 so we at least use the 5m window (most conservative).
    tokenAgeHours = 0;
    ageIsReal = false;
  }

  // ── Window availability check ─────────────────────────────────────
  const availability = getWindowAvailability(token);

  // ── Stage classification ──────────────────────────────────────────
  const stage = getTokenStage(tokenAgeHours);

  // ── Volume window selection ───────────────────────────────────────
  const window = getBestVolumeWindow(tokenAgeHours, token, availability);

  // ── Trader count (same window as volume) ──────────────────────────
  const traders = getTraderCountForWindow(window.windowLabel, token);

  // ── Volume consistency ────────────────────────────────────────────
  const v1mUSD = token?.v1mUSD ?? 0;
  const v5mUSD = token?.v5mUSD ?? 0;
  const consistencyCheckAvailable =
    availability.has1m && availability.has5m && v5mUSD > 0;
  const volumeConsistency = getVolumeConsistency(
    v1mUSD, v5mUSD,
    availability.has1m, availability.has5m
  );

  return {
    stage,
    tokenAgeHours,
    volume: window.volume,
    buy:    window.buy,
    sell:   window.sell,
    traders,
    windowLabel: window.windowLabel,
    volumeConsistency,
    dataQuality: {
      ageIsReal,
      windowIsReal: window.isReal,
      consistencyCheckAvailable,
    },
  };
};

// ─── Fee estimation ───────────────────────────────────────────────────────────

/**
 * Estimates DEX protocol fees from buy + sell volume.
 * Both sides of a swap pay fees independently, so we sum them.
 *
 * FEE RATES BY PLATFORM:
 *   Raydium AMM v4:      0.25%  → feeRate: 0.0025  ← default
 *   Raydium CLMM (low):  0.04%  → feeRate: 0.0004
 *   Raydium CLMM (high): 1.00%  → feeRate: 0.01
 *   Pump.fun bonding:    1.00%  → feeRate: 0.01
 *   Orca Whirlpool:      varies → check pool config
 *
 * Pass an explicit feeRate if you know the token's launch platform.
 */
export const calculateFees = ({
  buyVolumeUSD,
  sellVolumeUSD,
  feeRate = 0.0025,
}: {
  buyVolumeUSD: number;
  sellVolumeUSD: number;
  feeRate?: number;
}) => {
  const totalVolume = (buyVolumeUSD ?? 0) + (sellVolumeUSD ?? 0);
  const totalFees   = totalVolume * feeRate;
  return { totalVolume, totalFees, feeRateUsed: feeRate };
};