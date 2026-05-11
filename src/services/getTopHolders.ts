import axios from "axios";
import { formatRelativeTime } from "../hooks/formatTime";

const HELIUS_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

// ─── 1. Get top holders ──────────────────────────────────────────────────────
export const getTopHolders = async (mintAddress: string) => {
  const mintInfo = await axios.post(RPC_URL, {
    jsonrpc: "2.0",
    id: "get-decimals",
    method: "getAccountInfo",
    params: [mintAddress, { encoding: "jsonParsed" }],
  });

  const decimals = mintInfo.data.result?.value?.data?.parsed?.info?.decimals ?? 6;

  const oldRes = await axios.post(RPC_URL, {
    jsonrpc: "2.0",
    id: "top-holders",
    method: "getTokenLargestAccounts",
    params: [mintAddress, { commitment: "finalized" }],
  });

  const oldAccounts = oldRes.data.result?.value ?? [];

  if (oldAccounts.length > 0) {
    console.log("using getTokenLargestAccounts");
    return oldAccounts;
  }

  console.log("falling back to DAS getTokenAccounts");
  const dasRes = await axios.post(RPC_URL, {
    jsonrpc: "2.0",
    id: "top-holders-das",
    method: "getTokenAccounts",
    params: {
      mint: mintAddress,
      limit: 10,
      options: { showZeroBalance: false },
    },
  });

  const dasAccounts = dasRes.data.result?.token_accounts ?? [];

  return dasAccounts.map((acc: any) => ({
    address: acc.address,
    amount: acc.amount,
    uiAmount: acc.amount / Math.pow(10, decimals),
  }));
};

// ─── 2. Get all pool addresses for this mint via Helius DAS ─────────────────
// Fetches every token account that holds this mint, then resolves their owners.
// Any owner that is NOT a system wallet (i.e. controlled by a DEX program) = LP.
export const getPoolAddressesForMint = async (
  mintAddress: string
): Promise<Set<string>> => {
  const poolOwners = new Set<string>();

  let cursor: string | undefined = undefined;

  // paginate through ALL token accounts for this mint
  while (true) {
    const params: any = {
      mint: mintAddress,
      limit: 1000,
      options: { showZeroBalance: false },
    };

    if (cursor) params.cursor = cursor;

    const res = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      id: "get-all-token-accounts",
      method: "getTokenAccounts",
      params,
    });

    const accounts = res.data.result?.token_accounts ?? [];
    if (accounts.length === 0) break;

    // collect all owner addresses from this page
    const ownerAddresses = accounts.map((acc: any) => acc.owner);

    // batch fetch all owner account infos to check if they are programs
    const ownerRes = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      id: "check-owners",
      method: "getMultipleAccounts",
      params: [ownerAddresses, { encoding: "jsonParsed" }],
    });

    const ownerInfos = ownerRes.data.result?.value ?? [];

    ownerInfos.forEach((info: any, i: number) => {
      const systemProgram = "11111111111111111111111111111111";
      const tokenProgram = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

      // if the owner is NOT a regular wallet and NOT the token program = it's a pool
      if (
        info &&
        info.owner !== systemProgram &&
        info.owner !== tokenProgram
      ) {
        poolOwners.add(ownerAddresses[i]); // add the pool's address
      }
    });

    cursor = res.data.result?.cursor;
    if (!cursor || accounts.length < 1000) break;
  }

  return poolOwners;
};

// ─── 3. Resolve all token accounts in ONE request ───────────────────────────
export const getMultipleAccountOwners = async (
  tokenAccounts: string[]
): Promise<{ address: string; owner: string }[]> => {
  const res = await axios.post(RPC_URL, {
    jsonrpc: "2.0",
    id: "get-multiple-accounts",
    method: "getMultipleAccounts",
    params: [tokenAccounts, { encoding: "jsonParsed" }],
  });

  const accounts = res.data.result?.value ?? [];

  return tokenAccounts.map((address, i) => {
    const value = accounts[i];
    const owner = value?.data?.parsed?.info?.owner ?? address;
    return { address, owner };
  });
};

// ─── 4. Get wallet transaction history ──────────────────────────────────────
export const getWalletHistory = async (walletAddress: string) => {
  const res = await axios.get(
    `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions`,
    {
      params: {
        "api-key": HELIUS_KEY,
        limit: 10,
        type: "SWAP",
      },
    }
  );
  return res.data;
};

// ─── 5. Bundle detection logic ───────────────────────────────────────────────
export const detectBundling = (holders: any[]) => {
  // Step 1: remove LP wallets because they distort real holder distribution
  const realHolders = holders.filter((h) => !h.isLP);

  if (realHolders.length === 0) return holders;

  // Step 2: sort wallets by amount held (largest to smallest)
  const sorted = [...realHolders].sort(
    (a, b) => b.uiAmount - a.uiAmount
  );

  // Step 3: total supply held by non LP wallets
  const totalSupplyHeld = sorted.reduce(
    (sum, h) => sum + h.uiAmount,
    0
  );

  // Step 4: remove the top whale from similarity checks
  // This prevents one large wallet from distorting clustering logic
  const trimmed = sorted.slice(1);

  // ─────────────────────────────────────────────
  // 1. concentration analysis (whale dominance)
  // ─────────────────────────────────────────────

  const top5Holdings = sorted
    .slice(0, 5)
    .reduce((sum, h) => sum + h.uiAmount, 0);

  const top10Holdings = sorted
    .slice(0, 10)
    .reduce((sum, h) => sum + h.uiAmount, 0);

  const top5Ratio = top5Holdings / totalSupplyHeld;
  const top10Ratio = top10Holdings / totalSupplyHeld;

  // ─────────────────────────────────────────────
  // 2. similarity clustering (detect bundled wallets)
  // ─────────────────────────────────────────────

  const similarityThreshold = 0.03; // 3 percent tolerance

  const similarityClusters: string[] = [];

  // Compare every wallet with every other wallet
  // If balances are too similar, they may be controlled by same entity
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = i + 1; j < trimmed.length; j++) {
      const a = trimmed[i].uiAmount;
      const b = trimmed[j].uiAmount;

      const similarity =
        Math.abs(a - b) / Math.max(a, b);

      if (similarity < similarityThreshold) {
        similarityClusters.push(trimmed[i].walletAddress);
        similarityClusters.push(trimmed[j].walletAddress);
      }
    }
  }

  // Remove duplicates so each wallet appears once
  const clusteredWallets = [...new Set(similarityClusters)];

  // ─────────────────────────────────────────────
  // 3. entropy analysis (distribution randomness)
  // ─────────────────────────────────────────────

  const entropy = -sorted.reduce((sum, h) => {
    const p = h.uiAmount / totalSupplyHeld;

    if (p <= 0) return sum;

    // Shannon entropy formula
    return sum + p * Math.log2(p);
  }, 0);

  // p = wallet share of total supply
  
  // Meaning
  // High entropy = healthy distribution
  // Low entropy = concentrated / controlled supply
  
  // Scoring rules:
  
  // entropy < 2 → suspicious
  // entropy < 1.5 → very suspicious


  // ─────────────────────────────────────────────
  // 4. global token bundling score
  // ─────────────────────────────────────────────
  let globalScore = 0;

  // High concentration means risk of manipulation
  if (top5Ratio > 0.50) globalScore += 25;
  if (top5Ratio > 0.70) globalScore += 40;

  if (top10Ratio > 0.80) globalScore += 20;

  // Clustered wallets suggest coordinated buying or bundling
  if (clusteredWallets.length >= 3) globalScore += 25;
  if (clusteredWallets.length >= 5) globalScore += 40;

  // Low entropy means uneven or controlled distribution
  if (entropy < 2) globalScore += 20;
  if (entropy < 1.5) globalScore += 35;

  // Ensure score stays within bounds
  globalScore = Math.min(globalScore, 100);

  // ─────────────────────────────────────────────
  // 5. assign per wallet risk scores
  // ─────────────────────────────────────────────

  return holders.map((holder) => {
    // LP wallets are automatically safe in this system
    if (holder.isLP) {
      return {
        ...holder,
        bundlingScore: 0,
        bundlingRisk: "LP",
        isSuspected: false,
      };
    }

    let walletScore = 0;

    // If wallet is part of clustering group, increase suspicion
    if (clusteredWallets.includes(holder.walletAddress)) {
      walletScore += 40;
    }

    // Whale behavior check (percentage of total supply)
    const ownershipRatio =
      holder.uiAmount / totalSupplyHeld;

    if (ownershipRatio > 0.10) walletScore += 20;
    if (ownershipRatio > 0.20) walletScore += 35;

    // Add global token risk influence
    // If token itself is suspicious, every wallet inherits part of that risk
    walletScore += globalScore * 0.5;

    // Clamp final score
    walletScore = Math.min(walletScore, 100);

    // Convert score into risk label
    let bundlingRisk = "Low";

    if (walletScore >= 70) bundlingRisk = "High";
    else if (walletScore >= 40) bundlingRisk = "Medium";

    return {
      ...holder,
      bundlingScore: walletScore,
      bundlingRisk,
      isSuspected: walletScore >= 40,
    };
  });
};

// ─── 6. Get entry price ──────────────────────────────────────────────────────
export const getEntryPrice = async (walletAddress: string, mintAddress: string) => {
  let lastSignature: string | undefined = undefined;
  let found = null;

  while (true) {
    const params: any = {
      "api-key": HELIUS_KEY,
      limit: 100,
      type: "SWAP",
    };

    if (lastSignature) params.before = lastSignature;

    const res = await axios.get(
      `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions`,
      { params }
    );

    const txns = res.data;
    if (!txns || txns.length === 0) break;

    const buy = txns.find((tx: any) => {
      const receivedToken = tx.tokenTransfers?.some(
        (t: any) => t.mint === mintAddress && t.toUserAccount === walletAddress
      );
      const spentSol = tx.nativeTransfers?.some(
        (t: any) => t.fromUserAccount === walletAddress && t.amount > 1000000
      );
      return receivedToken && spentSol;
    });

    if (buy) found = buy;
    lastSignature = txns[txns.length - 1].signature;
    if (txns.length < 100) break;
  }

  if (!found) return null;

  const transfer = found.tokenTransfers.find(
    (t: any) => t.mint === mintAddress && t.toUserAccount === walletAddress
  );

  const solSpent =
    found.nativeTransfers
      .filter((t: any) => t.fromUserAccount === walletAddress)
      .reduce((sum: number, t: any) => sum + t.amount, 0) / 1e9;

  const tokenAmount = transfer?.tokenAmount ?? 1;
  if (!solSpent || !tokenAmount) return null;
  

  const solPrice = await getCachedSolPrice();

  return {
    entryPriceInSol: solSpent / tokenAmount,
    entryPriceUsd: (solSpent / tokenAmount) * solPrice,
    entryDate: `${new Date(found.timestamp * 1000).toLocaleDateString()}  (${formatRelativeTime(found.timestamp)})`,
    signature: found.signature,
    tokenAmount,
    solSpent,
    usdSpent: solSpent * solPrice,
  };

};

let cachedSolPrice: number | null = null;

export const getCachedSolPrice = async () => {
  if (cachedSolPrice) return cachedSolPrice;

  const price = await getSolPrice();
  cachedSolPrice = price;

  return price;
};

export const getUsdSpent = async (solSpent: number) => {
  const solPrice = await getCachedSolPrice();

  return solSpent * solPrice;
};

// ─── 7. Get SOL price ────────────────────────────────────────────────────────
export const getSolPrice = async (): Promise<number> => {
  try {
    const res = await axios.get(
      "https://api.jup.ag/price/v3?ids=SOL"
    );

    const price = res.data?.SOL?.usdPrice;

    if (price) return price;
  } catch (err) {
    console.log("Jupiter failed, falling back to CoinGecko");
  }

  // fallback
  const fallback = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
  );

  return fallback.data?.solana?.usd ?? 0;
};