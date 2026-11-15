import axios from "axios";
import { getCachedSolPrice } from "@/services/top-holders";
import { getSwapTransactionsPage, heliusRpc, SWAP_PAGE_SIZE } from "@/lib/helius";
import type { AssetsByOwnerResult, NativeTransfer } from "@/types/helius";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  uiAmount: number;
  usdValue: number;
  logoURI: string;
}

export interface WalletPortfolio {
  solBalance: number;
  solUsdValue: number;
  totalUsdValue: number;
  tokenCount: number;
  tokens: TokenHolding[];
}

export interface PnlWindow {
  windowLabel: string;
  windowSeconds: number;
  realisedUsd: number;
  unrealisedUsd: number;
  totalUsd: number;
  totalPct: number | null;
  totalCostBasisUsd: number;
}

export interface WalletOverview {
  portfolio: WalletPortfolio;
  pnlWindows: PnlWindow[];
}

const DAY = 24 * 60 * 60;

export const PNL_WINDOWS = [
  { label: "1 Month", seconds: 30 * DAY },
  { label: "3 Months", seconds: 90 * DAY },
  { label: "6 Months", seconds: 180 * DAY },
  { label: "1 Year", seconds: 365 * DAY },
] as const;

const MIN_SWAP_LAMPORTS = 1_000_000;

// ─── Jupiter multi-price ──────────────────────────────────────────────────────
// Current USD prices for many mints, 100 per request, run sequentially to
// stay under rate limits. Mints Jupiter doesn't know are left out.
const getJupiterPrices = async (mints: string[]): Promise<Map<string, number>> => {
  const priceMap = new Map<string, number>();

  for (let i = 0; i < mints.length; i += 100) {
    const chunk = mints.slice(i, i + 100);
    try {
      const res = await axios.get<Record<string, { usdPrice?: number }>>(
        "https://api.jup.ag/price/v3",
        { params: { ids: chunk.join(",") } }
      );
      for (const [mint, info] of Object.entries(res.data ?? {})) {
        const price = info?.usdPrice ?? 0;
        if (price > 0) priceMap.set(mint, price);
      }
    } catch (e) {
      console.warn("Jupiter price fetch failed:", e);
    }
  }

  return priceMap;
};

// ─── 1. Get wallet portfolio ──────────────────────────────────────────────────
// Helius for balances; Jupiter fills in prices Helius doesn't have.
export const getWalletPortfolio = async (
  walletAddress: string
): Promise<WalletPortfolio> => {
  const solPrice = await getCachedSolPrice();

  const [assets, solBalanceRes] = await Promise.all([
    heliusRpc<AssetsByOwnerResult>("get-assets", "getAssetsByOwner", {
      ownerAddress: walletAddress,
      page: 1,
      limit: 1000,
      displayOptions: {
        showFungiblePrice: true,
        showNativeBalance: true,
        showZeroBalance: false,
      },
    }),
    heliusRpc<{ value: number }>("get-sol-balance", "getBalance", [
      walletAddress,
      { commitment: "finalized" },
    ]),
  ]);

  const nativeBalanceLamports =
    assets?.nativeBalance?.lamports ?? solBalanceRes?.value ?? 0;
  const solBalance = nativeBalanceLamports / 1e9;
  const solUsdValue = solBalance * solPrice;

  const fungible = (assets?.items ?? []).filter(
    (a) => a.interface === "FungibleToken" || a.interface === "FungibleAsset"
  );

  const rawTokens: TokenHolding[] = fungible.map((a) => {
    const info = a.token_info ?? {};
    const decimals = info.decimals ?? 6;
    return {
      mint: a.id,
      symbol: info.symbol ?? a.content?.metadata?.symbol ?? "?",
      name: a.content?.metadata?.name ?? info.symbol ?? "Unknown",
      uiAmount: info.balance ? info.balance / Math.pow(10, decimals) : 0,
      usdValue: info.price_info?.total_price ?? 0,
      logoURI: a.content?.links?.image ?? "",
    };
  });

  const unpricedMints = rawTokens
    .filter((t) => t.usdValue === 0 && t.uiAmount > 0)
    .map((t) => t.mint);
  const jupiterPrices = await getJupiterPrices(unpricedMints);

  const tokens = rawTokens
    .map((t) => {
      const jupiterPrice = jupiterPrices.get(t.mint);
      return t.usdValue === 0 && jupiterPrice
        ? { ...t, usdValue: t.uiAmount * jupiterPrice }
        : t;
    })
    .filter((t) => t.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue);

  const totalTokenUsdValue = tokens.reduce((s, t) => s + t.usdValue, 0);

  return {
    solBalance,
    solUsdValue,
    totalUsdValue: solUsdValue + totalTokenUsdValue,
    tokenCount: fungible.length,
    tokens: tokens.slice(0, 20),
  };
};

const largestTransfer = (transfers: NativeTransfer[]): number =>
  transfers.length > 0
    ? transfers.reduce((max, t) => (t.amount > max.amount ? t : max), transfers[0])
        .amount / 1e9
    : 0;

// ─── 2. Get wallet PnL for a single time window ───────────────────────────────
// Per mint in the window:
//   Realised   = (solReceived × solPrice) − (costBasis × fractionSold)
//   Unrealised = (netTokensHeld × currentPrice) − remainingCostBasis
export const getWalletPnlWindow = async (
  walletAddress: string,
  windowSeconds: number,
  windowLabel: string,
  solPrice: number
): Promise<PnlWindow> => {
  const cutoff = Math.floor(Date.now() / 1000) - windowSeconds;

  type MintData = {
    solSpent: number;
    solReceived: number;
    tokensBought: number;
    tokensSold: number;
  };
  const mintMap = new Map<string, MintData>();

  const getOrCreate = (mint: string): MintData => {
    let entry = mintMap.get(mint);
    if (!entry) {
      entry = { solSpent: 0, solReceived: 0, tokensBought: 0, tokensSold: 0 };
      mintMap.set(mint, entry);
    }
    return entry;
  };

  let lastSignature: string | undefined;

  outer: while (true) {
    const txns = await getSwapTransactionsPage(walletAddress, lastSignature);
    if (txns.length === 0) break;

    for (const tx of txns) {
      if (tx.timestamp < cutoff) break outer;

      const native = tx.nativeTransfers ?? [];
      // Largest single transfer = the swap amount (excludes fees/rent).
      const solOut = largestTransfer(
        native.filter(
          (t) => t.fromUserAccount === walletAddress && t.amount > MIN_SWAP_LAMPORTS
        )
      );
      const solIn = largestTransfer(
        native.filter(
          (t) => t.toUserAccount === walletAddress && t.amount > MIN_SWAP_LAMPORTS
        )
      );

      const tokensReceived = (tx.tokenTransfers ?? []).filter(
        (t) => t.toUserAccount === walletAddress
      );
      const tokensSent = (tx.tokenTransfers ?? []).filter(
        (t) => t.fromUserAccount === walletAddress
      );

      if (solOut > 0 && tokensReceived.length > 0) {
        for (const tt of tokensReceived) {
          const d = getOrCreate(tt.mint);
          d.solSpent += solOut / tokensReceived.length;
          d.tokensBought += tt.tokenAmount ?? 0;
        }
      }

      if (solIn > 0 && tokensSent.length > 0) {
        for (const tt of tokensSent) {
          const d = getOrCreate(tt.mint);
          d.solReceived += solIn / tokensSent.length;
          d.tokensSold += tt.tokenAmount ?? 0;
        }
      }
    }

    lastSignature = txns[txns.length - 1].signature;
    if (txns.length < SWAP_PAGE_SIZE) break;
  }

  if (mintMap.size === 0) {
    return {
      windowLabel,
      windowSeconds,
      realisedUsd: 0,
      unrealisedUsd: 0,
      totalUsd: 0,
      totalPct: null,
      totalCostBasisUsd: 0,
    };
  }

  const mintsStillHeld = Array.from(mintMap.entries())
    .filter(([, d]) => d.tokensBought > d.tokensSold && d.tokensBought > 0)
    .map(([mint]) => mint);
  const currentPrices = await getJupiterPrices(mintsStillHeld);

  let totalRealisedUsd = 0;
  let totalUnrealisedUsd = 0;
  let totalCostBasisUsd = 0;

  for (const [mint, d] of mintMap.entries()) {
    const costBasisUsd = d.solSpent * solPrice;
    totalCostBasisUsd += costBasisUsd;

    const fractionSold =
      d.tokensBought > 0 ? Math.min(d.tokensSold / d.tokensBought, 1) : 0;
    totalRealisedUsd += d.solReceived * solPrice - costBasisUsd * fractionSold;

    const netTokens = Math.max(d.tokensBought - d.tokensSold, 0);
    if (netTokens > 0) {
      const currentValue = netTokens * (currentPrices.get(mint) ?? 0);
      totalUnrealisedUsd += currentValue - costBasisUsd * (1 - fractionSold);
    }
  }

  const totalUsd = totalRealisedUsd + totalUnrealisedUsd;

  return {
    windowLabel,
    windowSeconds,
    realisedUsd: totalRealisedUsd,
    unrealisedUsd: totalUnrealisedUsd,
    totalUsd,
    totalPct: totalCostBasisUsd > 0 ? (totalUsd / totalCostBasisUsd) * 100 : null,
    totalCostBasisUsd,
  };
};

// ─── 3. Get full wallet overview ──────────────────────────────────────────────
// Windows run one after another: each makes its own price call and firing
// all four at once hits rate limits.
export const getWalletOverview = async (
  walletAddress: string
): Promise<WalletOverview> => {
  const solPrice = await getCachedSolPrice();
  const portfolio = await getWalletPortfolio(walletAddress);

  const pnlWindows: PnlWindow[] = [];
  for (const w of PNL_WINDOWS) {
    pnlWindows.push(await getWalletPnlWindow(walletAddress, w.seconds, w.label, solPrice));
  }

  return { portfolio, pnlWindows };
};
