import { useToken } from "../context/TokenContext";
import { useTopHolders } from "../hooks/useTopHolders";

export const TopHolders = () => {
  const { tokenAddress } = useToken();
  const { data: holders, isLoading, isError } = useTopHolders(tokenAddress);
console.log(holders);

  if (!tokenAddress) return null;

  if (isLoading)
    return <p className="text-white text-center mt-6">Loading holders...</p>;

  if (isError)
    return <p className="text-red-500 text-center mt-6">Failed to fetch holders</p>;

  return (
    
    <div className="mt-8 px-4 max-w-3xl mx-auto">
      <h2 className="text-white font-bold text-xl mb-4">Top 10 Holders</h2>
      <div className="flex flex-col gap-3">
        {holders?.slice(0, 10).map((holder: any, i: number) => (
          <div
            key={holder.walletAddress}
            className="bg-[hsl(0,0%,12%)] rounded-lg p-4 border border-gray-700 flex justify-between items-center"
          >
            <div>
              <span className="text-gray-400 text-sm">#{i + 1} </span>
              <span className="text-white font-mono text-sm">
                {holder.walletAddress.slice(0, 6)}...{holder.walletAddress.slice(-6)}
              </span>
              {holder.isSuspected && (
                <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                  ⚠ Bundle Suspected
                </span>
              )}
            </div>
            <p className="text-green-400 font-semibold">
              {holder.uiAmount.toLocaleString()} tokens
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopHolders;