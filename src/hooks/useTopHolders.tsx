import { useQuery } from "@tanstack/react-query";
import { getTopHolders, getAccountOwner, detectBundling } from "../services/getTopHolders";

const fetchHoldersWithOwners = async (mintAddress: string) => {
  // 1. get top token accounts
  const rawHolders = await getTopHolders(mintAddress);

  // 2. resolve each token account → real wallet address
  const withOwners = await Promise.all(
    rawHolders.map(async (h: any) => {
      const walletAddress = await getAccountOwner(h.address);
      return {
        tokenAccount: h.address,
        walletAddress,
        uiAmount: h.uiAmount,
      };
    })
  );

  // 3. flag suspected bundles
  return detectBundling(withOwners);
};

export const useTopHolders = (mintAddress: string) => {
  return useQuery({
    queryKey: ["topHolders", mintAddress],
    queryFn: () => fetchHoldersWithOwners(mintAddress),
    enabled: !!mintAddress,      // only runs when address is pasted
    staleTime: 1000 * 60 * 2,   // cache for 2 minutes
    retry: 2,
  });
};