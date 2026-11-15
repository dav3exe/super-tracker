import axios from "axios";
import { formatRelativeTime } from "@/lib/format-time";
import { getSwapTransactionsPage, heliusRpc, SWAP_PAGE_SIZE } from "@/lib/helius";
import type {
  AccountInfo,
  DasTokenAccountsResult,
  EnhancedTransaction,
  LargestTokenAccount,
  ParsedMintAccount,
  SignatureInfo,
} from "@/types/helius";
import type { AnalyzedHolder, Holder, RawHolder } from "@/types/holders";

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

// Native transfers at or below this many lamports are fees/rent, not swaps.
const MIN_SWAP_LAMPORTS = 1_000_000;

// ─── 1. Get top holders ──────────────────────────────────────────────────────
export const getTopHolders = async (mintAddress: string): Promise<RawHolder[]> => {
  const mintInfo = await heliusRpc<ParsedMintAccount>(
    "get-decimals",
    "getAccountInfo",
    [mintAddress, { encoding: "jsonParsed" }]
  );
  const decimals = mintInfo?.value?.data?.parsed?.info?.decimals ?? 6;

  const largest = await heliusRpc<{ value: LargestTokenAccount[] }>(
    "top-holders",
    "getTokenLargestAccounts",
    [mintAddress, { commitment: "finalized" }]
  );
  const largestAccounts = largest?.value ?? [];
  if (largestAccounts.length > 0) {
    return largestAccounts.map((acc) => ({
      address: acc.address,
      uiAmount: acc.uiAmount ?? 0,
    }));
  }

  // Some mints (e.g. very large holder sets) fail getTokenLargestAccounts.
  const das = await heliusRpc<DasTokenAccountsResult>(
    "top-holders-das",
    "getTokenAccounts",
    { mint: mintAddress, limit: 10, options: { showZeroBalance: false } }
  );
  return (das?.token_accounts ?? []).map((acc) => ({
    address: acc.address,
    uiAmount: acc.amount / Math.pow(10, decimals),
  }));
};

// ─── 2. Get pool addresses for this mint ────────────────────────────────────
// A token account whose owner is itself a program-owned account (not a
// wallet) is treated as a liquidity pool.
export const getPoolAddressesForMint = async (
  mintAddress: string
): Promise<Set<string>> => {
  const poolOwners = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const params: Record<string, unknown> = {
      mint: mintAddress,
      limit: 1000,
      options: { showZeroBalance: false },
    };
    if (cursor) params.cursor = cursor;

    const page = await heliusRpc<DasTokenAccountsResult>(
      "get-all-token-accounts",
      "getTokenAccounts",
      params
    );
    const accounts = page?.token_accounts ?? [];
    if (accounts.length === 0) break;

    const ownerAddresses = accounts.map((acc) => acc.owner);
    const owners = await heliusRpc<{ value: (AccountInfo | null)[] }>(
      "check-owners",
      "getMultipleAccounts",
      [ownerAddresses, { encoding: "jsonParsed" }]
    );

    (owners?.value ?? []).forEach((info, i) => {
      if (info && info.owner !== SYSTEM_PROGRAM && info.owner !== TOKEN_PROGRAM) {
        poolOwners.add(ownerAddresses[i]);
      }
    });

    cursor = page?.cursor;
    if (!cursor || accounts.length < 1000) break;
  }

  return poolOwners;
};

// ─── 3. Resolve token account → wallet owner in one batch call ──────────────
export const getMultipleAccountOwners = async (
  tokenAccounts: string[]
): Promise<{ address: string; owner: string }[]> => {
  const res = await heliusRpc<{ value: (AccountInfo | null)[] }>(
    "get-multiple-accounts",
    "getMultipleAccounts",
    [tokenAccounts, { encoding: "jsonParsed" }]
  );
  const accounts = res?.value ?? [];

  return tokenAccounts.map((address, i) => {
    const data = accounts[i]?.data;
    const owner = data && !Array.isArray(data) ? data.parsed?.info?.owner : undefined;
    return { address, owner: owner ?? address };
  });
};

// ─── 4. Get mint creation timestamp ─────────────────────────────────────────
export const getMintCreationTimestamp = async (
  mintAddress: string
): Promise<number | null> => {
  let lastSignature: string | undefined;
  let oldestBlockTime: number | null = null;

  while (true) {
    const params: Record<string, unknown> = { limit: 1000, commitment: "finalized" };
    if (lastSignature) params.before = lastSignature;

    const sigs =
      (await heliusRpc<SignatureInfo[]>("mint-sigs", "getSignaturesForAddress", [
        mintAddress,
        params,
      ])) ?? [];
    if (sigs.length === 0) break;

    const last = sigs[sigs.length - 1];
    if (last.blockTime) oldestBlockTime = last.blockTime;

    lastSignature = last.signature;
    if (sigs.length < 1000) break;
  }

  return oldestBlockTime;
};

// ─── 5. Bundle detection ─────────────────────────────────────────────────────
export const detectBundling = (holders: Holder[]): AnalyzedHolder[] => {
  const realHolders = holders.filter((h) => !h.isLP);
  if (realHolders.length === 0) {
    return holders.map((h) => ({
      ...h,
      bundlingScore: 0,
      bundlingRisk: "LP",
      isSuspected: false,
    }));
  }

  const sorted = [...realHolders].sort((a, b) => b.uiAmount - a.uiAmount);
  const totalSupplyHeld = sorted.reduce((sum, h) => sum + h.uiAmount, 0);
  const trimmed = sorted.slice(1);

  const top5Ratio =
    sorted.slice(0, 5).reduce((s, h) => s + h.uiAmount, 0) / totalSupplyHeld;
  const top10Ratio =
    sorted.slice(0, 10).reduce((s, h) => s + h.uiAmount, 0) / totalSupplyHeld;

  const similarityThreshold = 0.03;
  const similarityClusters: string[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = i + 1; j < trimmed.length; j++) {
      const a = trimmed[i].uiAmount;
      const b = trimmed[j].uiAmount;
      if (Math.abs(a - b) / Math.max(a, b) < similarityThreshold) {
        similarityClusters.push(trimmed[i].walletAddress, trimmed[j].walletAddress);
      }
    }
  }
  const clusteredWallets = [...new Set(similarityClusters)];

  const entropy = -sorted.reduce((sum, h) => {
    const p = h.uiAmount / totalSupplyHeld;
    return p <= 0 ? sum : sum + p * Math.log2(p);
  }, 0);

  let globalScore = 0;
  if (top5Ratio > 0.5) globalScore += 25;
  if (top5Ratio > 0.7) globalScore += 40;
  if (top10Ratio > 0.8) globalScore += 20;
  if (clusteredWallets.length >= 3) globalScore += 25;
  if (clusteredWallets.length >= 5) globalScore += 40;
  if (entropy < 2) globalScore += 20;
  if (entropy < 1.5) globalScore += 35;
  globalScore = Math.min(globalScore, 100);

  return holders.map((holder): AnalyzedHolder => {
    if (holder.isLP) {
      return { ...holder, bundlingScore: 0, bundlingRisk: "LP", isSuspected: false };
    }

    let walletScore = 0;
    if (clusteredWallets.includes(holder.walletAddress)) walletScore += 40;

    const ownershipRatio = holder.uiAmount / totalSupplyHeld;
    if (ownershipRatio > 0.1) walletScore += 20;
    if (ownershipRatio > 0.2) walletScore += 35;

    walletScore += globalScore * 0.5;
    walletScore = Math.min(walletScore, 100);

    return {
      ...holder,
      bundlingScore: walletScore,
      bundlingRisk: walletScore >= 70 ? "High" : walletScore >= 40 ? "Medium" : "Low",
      isSuspected: walletScore >= 40,
    };
  });
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SellEvent {
  tokensSold: number;
  solReceived: number;
  usdReceived: number;
  date: string;
  signature: string;
}

export interface TradeHistory {
  // Entry, aggregated across all buys. Prices are weighted averages;
  // entryDate/signature belong to the earliest buy.
  tokensBought: number;
  solSpent: number;
  usdSpent: number;
  entryPriceInSol: number;
  entryPriceUSD: number;
  entryDate: string;
  signature: string;

  // entryPriceUSD × total supply; null when supply is unknown.
  avgEntryMarketCapUSD: number | null;

  sells: SellEvent[];
  totalTokensSold: number;
  totalSolReceived: number;
  totalUsdReceived: number;

  realisedUsdPnl: number;
  realisedPnlPercent: number;
  costBasisRemaining: number;

  currentBalance: number;

  // True when the quick scan hit its limit without finding a buy.
  scanIncomplete: boolean;
  resumeFromSignature: string | undefined;
  // Raw sell transactions seen so far, so a full scan can resume.
  rawSells: EnhancedTransaction[];
}

const QUICK_SCAN_LIMIT = 500;

const classifyTrade = (
  tx: EnhancedTransaction,
  walletAddress: string,
  mintAddress: string
) => {
  const receivedThisToken = tx.tokenTransfers?.some(
    (t) => t.mint === mintAddress && t.toUserAccount === walletAddress
  );
  const sentSolOut = tx.nativeTransfers?.some(
    (t) => t.fromUserAccount === walletAddress && t.amount > MIN_SWAP_LAMPORTS
  );
  const sentThisToken = tx.tokenTransfers?.some(
    (t) => t.mint === mintAddress && t.fromUserAccount === walletAddress
  );
  const receivedSolIn = tx.nativeTransfers?.some(
    (t) => t.toUserAccount === walletAddress && t.amount > MIN_SWAP_LAMPORTS
  );
  return {
    isBuy: Boolean(receivedThisToken && sentSolOut),
    isSell: Boolean(sentThisToken && receivedSolIn),
  };
};

// ─── 6. Get trade history (quick scan — default) ─────────────────────────────
// Walks the wallet's swaps newest → oldest, collecting every buy and sell of
// this mint. Stops early at the mint's creation time, or after
// QUICK_SCAN_LIMIT transactions if no buy has been found yet.
export const getTradeHistory = async (
  walletAddress: string,
  mintAddress: string,
  currentBalance: number,
  mintCreatedAt: number | null,
  totalSupply?: number | null
): Promise<TradeHistory | null> => {
  let lastSignature: string | undefined;
  const allBuyTxns: EnhancedTransaction[] = [];
  const allSellTxns: EnhancedTransaction[] = [];
  let totalFetched = 0;
  let scanIncomplete = false;

  outer: while (true) {
    const txns = await getSwapTransactionsPage(walletAddress, lastSignature);
    if (txns.length === 0) break;

    for (const tx of txns) {
      if (mintCreatedAt && tx.timestamp < mintCreatedAt) break outer;
      const { isBuy, isSell } = classifyTrade(tx, walletAddress, mintAddress);
      if (isBuy) allBuyTxns.push(tx);
      if (isSell) allSellTxns.push(tx);
    }

    totalFetched += txns.length;
    lastSignature = txns[txns.length - 1].signature;

    if (totalFetched >= QUICK_SCAN_LIMIT && allBuyTxns.length === 0) {
      scanIncomplete = true;
      break;
    }
    if (txns.length < SWAP_PAGE_SIZE) break;
  }

  return buildTradeHistory(
    allBuyTxns,
    allSellTxns,
    mintAddress,
    walletAddress,
    currentBalance,
    scanIncomplete,
    scanIncomplete ? lastSignature : undefined,
    totalSupply ?? null
  );
};

// ─── 7. Continue with a full scan ───────────────────────────────────────────
export const getFullTradeHistory = async (
  walletAddress: string,
  mintAddress: string,
  currentBalance: number,
  mintCreatedAt: number | null,
  previousSells: EnhancedTransaction[],
  resumeFromSignature: string | undefined,
  totalSupply?: number | null
): Promise<TradeHistory | null> => {
  let lastSignature = resumeFromSignature;
  const allBuyTxns: EnhancedTransaction[] = [];
  const allSellTxns: EnhancedTransaction[] = [...previousSells];

  outer: while (true) {
    const txns = await getSwapTransactionsPage(walletAddress, lastSignature);
    if (txns.length === 0) break;

    for (const tx of txns) {
      if (mintCreatedAt && tx.timestamp < mintCreatedAt) break outer;
      const { isBuy, isSell } = classifyTrade(tx, walletAddress, mintAddress);
      if (isBuy) allBuyTxns.push(tx);
      if (isSell) allSellTxns.push(tx);
    }

    lastSignature = txns[txns.length - 1].signature;
    if (txns.length < SWAP_PAGE_SIZE) break;
  }

  return buildTradeHistory(
    allBuyTxns,
    allSellTxns,
    mintAddress,
    walletAddress,
    currentBalance,
    false,
    undefined,
    totalSupply ?? null
  );
};

const formatTxDate = (timestamp: number) =>
  `${new Date(timestamp * 1000).toLocaleDateString()} (${formatRelativeTime(timestamp)})`;

// ─── 8. Build trade history result ──────────────────────────────────────────
const buildTradeHistory = async (
  allBuyTxns: EnhancedTransaction[],
  allSellTxns: EnhancedTransaction[],
  mintAddress: string,
  walletAddress: string,
  currentBalance: number,
  scanIncomplete: boolean,
  resumeFromSignature: string | undefined,
  totalSupply: number | null
): Promise<TradeHistory | null> => {
  const solPrice = await getCachedSolPrice();

  const sells: SellEvent[] = allSellTxns
    .map((tx): SellEvent | null => {
      const sellTransfer = tx.tokenTransfers?.find(
        (t) => t.mint === mintAddress && t.fromUserAccount === walletAddress
      );
      const tokensSold = sellTransfer?.tokenAmount ?? 0;

      const solReceived =
        (tx.nativeTransfers
          ?.filter((t) => t.toUserAccount === walletAddress)
          .reduce((sum, t) => sum + t.amount, 0) ?? 0) / 1e9;

      if (!tokensSold || !solReceived) return null;

      return {
        tokensSold,
        solReceived,
        usdReceived: solReceived * solPrice,
        date: formatTxDate(tx.timestamp),
        signature: tx.signature,
      };
    })
    .filter((e): e is SellEvent => e !== null);

  const totalTokensSold = sells.reduce((s, e) => s + e.tokensSold, 0);
  const totalSolReceived = sells.reduce((s, e) => s + e.solReceived, 0);
  const totalUsdReceived = sells.reduce((s, e) => s + e.usdReceived, 0);

  if (allBuyTxns.length === 0) {
    return {
      tokensBought: 0,
      solSpent: 0,
      usdSpent: 0,
      entryPriceInSol: 0,
      entryPriceUSD: 0,
      entryDate: "",
      signature: "",
      avgEntryMarketCapUSD: null,
      sells,
      totalTokensSold,
      totalSolReceived,
      totalUsdReceived,
      realisedUsdPnl: 0,
      realisedPnlPercent: 0,
      costBasisRemaining: 0,
      currentBalance,
      scanIncomplete,
      resumeFromSignature,
      rawSells: allSellTxns,
    };
  }

  let totalTokensBought = 0;
  let totalSolSpentLamports = 0;

  for (const tx of allBuyTxns) {
    const buyTransfer = tx.tokenTransfers?.find(
      (t) => t.mint === mintAddress && t.toUserAccount === walletAddress
    );
    totalTokensBought += buyTransfer?.tokenAmount ?? 0;
    totalSolSpentLamports +=
      tx.nativeTransfers
        ?.filter((t) => t.fromUserAccount === walletAddress)
        .reduce((sum, t) => sum + t.amount, 0) ?? 0;
  }

  if (!totalTokensBought) return null;

  const totalSolSpent = totalSolSpentLamports / 1e9;
  if (!totalSolSpent) return null;

  const entryPriceInSol = totalSolSpent / totalTokensBought;
  const entryPriceUSD = entryPriceInSol * solPrice;
  const usdSpent = totalSolSpent * solPrice;

  const avgEntryMarketCapUSD =
    totalSupply && totalSupply > 0 ? entryPriceUSD * totalSupply : null;

  // Walking newest → oldest, so the last buy collected is the earliest.
  const earliestBuy = allBuyTxns[allBuyTxns.length - 1];

  const fractionSold =
    totalTokensBought > 0 ? Math.min(totalTokensSold / totalTokensBought, 1) : 0;
  const costBasisSold = usdSpent * fractionSold;
  const realisedUsdPnl = totalUsdReceived - costBasisSold;
  const realisedPnlPercent =
    costBasisSold > 0 ? (realisedUsdPnl / costBasisSold) * 100 : 0;

  return {
    tokensBought: totalTokensBought,
    solSpent: totalSolSpent,
    usdSpent,
    entryPriceInSol,
    entryPriceUSD,
    entryDate: formatTxDate(earliestBuy.timestamp),
    signature: earliestBuy.signature,
    avgEntryMarketCapUSD,
    sells,
    totalTokensSold,
    totalSolReceived,
    totalUsdReceived,
    realisedUsdPnl,
    realisedPnlPercent,
    costBasisRemaining: usdSpent * (1 - fractionSold),
    currentBalance,
    scanIncomplete: false,
    resumeFromSignature: undefined,
    rawSells: allSellTxns,
  };
};

// ─── SOL price ───────────────────────────────────────────────────────────────
let cachedSolPrice: number | null = null;

export const getCachedSolPrice = async (): Promise<number> => {
  if (cachedSolPrice) return cachedSolPrice;
  const price = await getSolPrice();
  cachedSolPrice = price;
  return price;
};

export const getSolPrice = async (): Promise<number> => {
  try {
    const res = await axios.get<Record<string, { usdPrice?: number }>>(
      "https://api.jup.ag/price/v3?ids=SOL"
    );
    const price = res.data?.SOL?.usdPrice;
    if (price) return price;
  } catch {
    // Fall through to CoinGecko.
  }

  const fallback = await axios.get<{ solana?: { usd?: number } }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
  );
  return fallback.data?.solana?.usd ?? 0;
};
