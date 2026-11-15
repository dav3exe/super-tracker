"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getWalletOverview } from "@/services/wallet-overview";

/** Portfolio + 1M/3M/6M/1Y PnL for a holder. Runs only when the row is expanded. */
export const useWalletOverview = (walletAddress: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.walletOverview(walletAddress),
    queryFn: () => getWalletOverview(walletAddress),
    enabled: !!walletAddress && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
