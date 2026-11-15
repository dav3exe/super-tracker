"use client";

import { useQuery } from "@tanstack/react-query";
import { useToken } from "@/context/token-context";
import { queryKeys } from "@/lib/query-keys";
import { isUsableToken } from "@/lib/token-validation";
import { getTokenOverview } from "@/services/token-overview";
import type { TokenOverview } from "@/types/birdeye";

const FIVE_MINUTES = 5 * 60 * 1000;

export type ActiveTokenStatus = "idle" | "loading" | "error" | "invalid" | "ready";

/**
 * The single Birdeye overview request for the submitted mint. Every
 * component reads the token from here (React Query dedupes and caches it),
 * so there is never more than one request per address.
 */
export const useActiveToken = () => {
  const { tokenAddress } = useToken();

  const query = useQuery({
    queryKey: queryKeys.tokenOverview(tokenAddress),
    queryFn: () => getTokenOverview(tokenAddress),
    enabled: !!tokenAddress,
    // Keep the price fresh only while a valid token is on screen.
    refetchInterval: (q) => (isUsableToken(q.state.data?.data) ? FIVE_MINUTES : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const raw = query.data?.data;
  const token: TokenOverview | undefined = isUsableToken(raw) ? raw : undefined;

  let status: ActiveTokenStatus = "idle";
  if (tokenAddress) {
    if (query.isPending) status = "loading";
    else if (query.isError) status = "error";
    else status = token ? "ready" : "invalid";
  }

  return { tokenAddress, token, status, query };
};
