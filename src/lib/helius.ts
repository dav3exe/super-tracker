import axios from "axios";
import type { EnhancedTransaction, RpcResponse } from "@/types/helius";

const HELIUS_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

export const heliusRpc = async <T>(
  id: string,
  method: string,
  params: unknown
): Promise<T | undefined> => {
  const res = await axios.post<RpcResponse<T>>(RPC_URL, {
    jsonrpc: "2.0",
    id,
    method,
    params,
  });
  return res.data.result;
};

export const SWAP_PAGE_SIZE = 100;

// One page (newest first) of a wallet's SWAP transactions.
export const getSwapTransactionsPage = async (
  walletAddress: string,
  before?: string
): Promise<EnhancedTransaction[]> => {
  const params: Record<string, string | number> = {
    "api-key": HELIUS_KEY ?? "",
    limit: SWAP_PAGE_SIZE,
    type: "SWAP",
  };
  if (before) params.before = before;

  const res = await axios.get<EnhancedTransaction[]>(
    `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions`,
    { params }
  );
  return res.data ?? [];
};
