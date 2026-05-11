import { useQuery } from "@tanstack/react-query";
import { getEntryPrice, getSolPrice } from "../services/getTopHolders";

export const useEntryPrice = (
  walletAddress: string,
  mintAddress: string,
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["entryPrice", walletAddress, mintAddress],
    queryFn: async () => {
      const [entry, solPrice] = await Promise.all([
        getEntryPrice(walletAddress, mintAddress),
        getSolPrice(),
      ]);

      if (!entry) return null;

      // convert SOL price → USD price
      const entryPriceUSD = entry.entryPriceInSol * solPrice;

      return {
        ...entry,
        entryPriceUSD,   // ← this is now same unit as chartPrice
        solPrice,
      };
    },
    enabled: !!walletAddress && !!mintAddress && enabled,
    staleTime: Infinity,
    retry: 1,
  });
};