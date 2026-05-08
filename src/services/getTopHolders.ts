import axios from "axios";

const HELIUS_KEY = import.meta.env.VITE_HELIUS_API_KEY;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

// ─── 1. Get top 20 holder addresses + amounts ───────────────────────────────
export const getTopHolders = async (mintAddress: string) => {
  const res = await axios.post(RPC_URL, {
    jsonrpc: "2.0",
    id: "top-holders",
    method: "getTokenLargestAccounts",
    params: [mintAddress],
  });
  console.log("check", res.data);

  const accounts = res.data.result?.value ?? [];
  console.log(accounts);
  
  return accounts; // returns [{address, amount, uiAmount}]
  
};

// ─── 2. Resolve token account → actual wallet owner ─────────────────────────
export const getAccountOwner = async (tokenAccount: string) => {
  const res = await axios.post(RPC_URL, {
    jsonrpc: "2.0",
    id: "get-owner",
    method: "getAccountInfo",
    params: [tokenAccount, { encoding: "jsonParsed" }],
  });

  const info = res.data.result?.value?.data?.parsed?.info;
  return info?.owner ?? tokenAccount; // wallet address
};

// ─── 3. Get wallet transaction history ──────────────────────────────────────
export const getWalletHistory = async (walletAddress: string) => {
  const res = await axios.get(
    `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions`,
    {
      params: {
        "api-key": HELIUS_KEY,
        limit: 10,
        type: "SWAP", // only show swap/trade txns
      },
    }
  );
  return res.data;
};

// ─── 4. Bundle detection logic ───────────────────────────────────────────────
export const detectBundling = (holders: any[]) => {
  // Flag wallets that bought in same block or have similar amounts
  const amounts = holders.map((h) => h.uiAmount);
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  return holders.map((holder) => ({
    ...holder,
    isSuspected: Math.abs(holder.uiAmount - avg) < avg * 0.05, // within 5% of avg
  }));
};