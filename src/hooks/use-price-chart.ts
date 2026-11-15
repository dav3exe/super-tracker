"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getPriceChart } from "@/services/price-chart";

export const usePriceChart = (mintAddress: string, interval: string, rangeSeconds: number) =>
  useQuery({
    queryKey: queryKeys.priceChart(mintAddress, interval, rangeSeconds),
    queryFn: async () => {
      const now = Math.floor(Date.now() / 1000);
      const res = await getPriceChart(mintAddress, interval, now - rangeSeconds, now);
      return res.data?.items ?? [];
    },
    enabled: !!mintAddress,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
