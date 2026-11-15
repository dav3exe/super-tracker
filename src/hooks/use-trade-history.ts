"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getFullTradeHistory, getTradeHistory } from "@/services/top-holders";
import type { TradeHistory } from "@/services/top-holders";
import type { EnhancedTransaction } from "@/types/helius";

type TradeHistoryArgs = {
  walletAddress: string;
  mintAddress: string;
  currentBalance: number;
  mintCreatedAt: number | null;
  totalSupply: number | null;
};

const tradeHistoryKey = ({
  walletAddress,
  mintAddress,
  currentBalance,
  mintCreatedAt,
  totalSupply,
}: TradeHistoryArgs) =>
  queryKeys.tradeHistory(walletAddress, mintAddress, { currentBalance, mintCreatedAt, totalSupply });

/**
 * Quick scan: up to 500 of the wallet's swaps. Runs only when the holder row
 * is expanded. `scanIncomplete` means no buy was found in that window.
 */
export const useTradeHistory = (args: TradeHistoryArgs & { enabled: boolean }) => {
  const { walletAddress, mintAddress, currentBalance, mintCreatedAt, totalSupply, enabled } = args;

  return useQuery<TradeHistory | null>({
    queryKey: queryKeys.tradeHistory(walletAddress, mintAddress, {
      currentBalance,
      mintCreatedAt,
      totalSupply,
    }),
    queryFn: () =>
      getTradeHistory(walletAddress, mintAddress, currentBalance, mintCreatedAt, totalSupply),
    enabled: !!walletAddress && !!mintAddress && enabled,
    staleTime: Infinity,
    retry: 1,
  });
};

/**
 * Full scan, triggered by "Load full history". Resumes where the quick scan
 * stopped and writes its result over the quick scan's cache entry, so the
 * row re-renders with complete data.
 */
export const useFullTradeHistory = (args: TradeHistoryArgs) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resumeFromSignature,
      previousSells,
    }: {
      resumeFromSignature: string | undefined;
      previousSells: EnhancedTransaction[];
    }) =>
      getFullTradeHistory(
        args.walletAddress,
        args.mintAddress,
        args.currentBalance,
        args.mintCreatedAt,
        previousSells,
        resumeFromSignature,
        args.totalSupply
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(tradeHistoryKey(args), result);
    },
  });
};
