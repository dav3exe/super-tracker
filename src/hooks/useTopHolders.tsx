import { useQuery } from "@tanstack/react-query";
import {
  getTopHolders,
  getMultipleAccountOwners,
  getPoolAddressesForMint,
  detectBundling,
  getSolPrice
} from "../services/getTopHolders";


const fetchHoldersWithOwners = async (mintAddress: string) => {
  // run in parallel — top holders + all pool addresses for this mint
  const [rawHolders, poolOwners] = await Promise.all([
    getTopHolders(mintAddress),
    getPoolAddressesForMint(mintAddress),
  ]);

  const tokenAccounts = rawHolders.map((h: any) => h.address);
  const accountInfos = await getMultipleAccountOwners(tokenAccounts);

  return detectBundling(
    rawHolders.map((h: any, i: number) => {
      const { owner } = accountInfos[i];

      // if the owner of this token account is in our pool owners set = LP
      const isLP = poolOwners.has(owner);

      console.log(h ,"token:", h.address, "| owner:", owner, "| isLP:", isLP);

      return {
        tokenAccount: h.address,
        walletAddress: owner,
        uiAmount: h.uiAmount,
        isLP,
      };
    })
  );
};

export const useTopHolders = (mintAddress: string) => {
  return useQuery({
    queryKey: ["topHolders", mintAddress],
    queryFn: () => fetchHoldersWithOwners(mintAddress),
    enabled: !!mintAddress,
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });
};

export const useSolPrice = () => {
  return useQuery({
    queryKey: ["solPrice"],
    queryFn: getSolPrice,
    staleTime: 1000 * 30, // 30s cache
    refetchInterval: 1000 * 60,
  });
};