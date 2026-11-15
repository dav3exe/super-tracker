"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  detectBundling,
  getMintCreationTimestamp,
  getMultipleAccountOwners,
  getPoolAddressesForMint,
  getTopHolders,
} from "@/services/top-holders";
import type { AnalyzedHolder } from "@/types/holders";

const fetchHoldersWithOwners = async (mintAddress: string): Promise<AnalyzedHolder[]> => {
  const [rawHolders, poolOwners] = await Promise.all([
    getTopHolders(mintAddress),
    getPoolAddressesForMint(mintAddress),
  ]);

  const accountInfos = await getMultipleAccountOwners(rawHolders.map((h) => h.address));

  return detectBundling(
    rawHolders.map((h, i) => {
      const { owner } = accountInfos[i];
      return {
        tokenAccount: h.address,
        walletAddress: owner,
        uiAmount: h.uiAmount,
        // The holder's owner is a program account we identified as a pool.
        isLP: poolOwners.has(owner),
      };
    })
  );
};

export const useTopHolders = (mintAddress: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.topHolders(mintAddress),
    queryFn: () => fetchHoldersWithOwners(mintAddress),
    enabled: !!mintAddress && enabled,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

// Fetched once per token and shared by every holder row, so expanding a row
// never triggers its own full scan of the mint's signatures.
export const useMintCreatedAt = (mintAddress: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.mintCreatedAt(mintAddress),
    queryFn: () => getMintCreationTimestamp(mintAddress),
    enabled: !!mintAddress && enabled,
    staleTime: Infinity,
    retry: 1,
  });
