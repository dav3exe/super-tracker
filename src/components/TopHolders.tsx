import { useState } from "react";
import { useToken } from "../context/TokenContext";
import { useTopHolders } from "../hooks/useTopHolders";
import { useEntryPrice } from "../hooks/useEntryPrice";
import { formatNumber } from "../hooks/formatNumberDisplay";

// ── individual row with expandable PnL ──────────────────────────────────────
const HolderRow = ({ holder, rank, mintAddress, currentPrice }: {
  holder: any;
  rank: number;
  mintAddress: string;
  currentPrice: number;
}) => {
  const [expanded, setExpanded] = useState(false);

  const { data: entry, isLoading: entryLoading } = useEntryPrice(
    holder.walletAddress,
    mintAddress,
    expanded
  );

  const pnlPercent =
    entry?.entryPriceUSD && currentPrice
      ? ((currentPrice - entry.entryPriceUSD) / entry.entryPriceUSD) * 100
      : null;

  const isInsider = !entryLoading && expanded && !entry && !holder.isLP;

  return (
    <div className={`rounded-lg p-4 border ${
      holder.isLP
        ? "bg-[hsl(220,30%,10%)] border-blue-800"
        : isInsider
        ? "bg-[hsl(0,0%,10%)] border-red-800"
        : "bg-[hsl(0,0%,12%)] border-gray-700"
    }`}>
      {/* ── Main Row ── */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <div>
            <span className="text-gray-400 text-sm">#{rank} </span>
            <span
                onClick={() => navigator.clipboard.writeText(holder.walletAddress)}
                className="text-white font-mono text-sm cursor-pointer hover:text-green-400 transition"
                title="Click to copy"
                >
              {holder.walletAddress.slice(0, 6)}...{holder.walletAddress.slice(-6)}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {holder.isLP && (
              <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full">
                💧 Liquidity Pool
              </span>
            )}
            {holder.isSuspected && !holder.isLP && (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                ⚠ {holder.bundlingRisk} Bundle Risk {" "} ({holder.bundlingScore.toFixed(0)}/100)
              </span>
            )}
            {isInsider && (
              <span className="text-xs bg-orange-700 text-white px-2 py-0.5 rounded-full">
                👁 Possible Insider / Team Wallet
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-green-400 font-semibold">
            {formatNumber(holder.uiAmount)} tokens
          </p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-400 hover:underline mt-1"
          >
            {expanded ? "Hide" : "View Details"}
          </button>
        </div>
      </div>

      {/* ── Expanded Section ── */}
      {expanded && (
        <div className="mt-3 border-t border-gray-600 pt-3">
          {entryLoading ? (
            <p className="text-gray-400 text-sm">Fetching entry price...</p>

          ) : holder.isLP ? (
            // ── Liquidity Pool ──
            <div className="bg-blue-950 border border-blue-700 rounded-lg p-3">
              <p className="text-blue-400 font-semibold text-sm mb-1">
                💧 Liquidity Pool
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                This is not a real holder. This is the trading pool that
                holds tokens so people can buy and sell. The more tokens
                in the pool, the healthier the liquidity.
              </p>
              <div className="mt-2 flex gap-4">
                <div>
                  <p className="text-gray-400 text-xs">Tokens In Pool</p>
                  <p className="text-blue-300 text-sm font-semibold">
                    {formatNumber(holder.uiAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Pool Value</p>
                  <p className="text-blue-300 text-sm font-semibold">
                    ${(holder.uiAmount * currentPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

          ) : !entry ? (
            // ── Insider / No Swap Found ──
            <div className="bg-orange-950 border border-orange-700 rounded-lg p-3">
              <p className="text-orange-400 font-semibold text-sm mb-1">
                👁 No swap transaction found
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                This wallet never bought this token on the open market.
                They likely received tokens via team allocation, airdrop,
                or direct transfer. This could be a team wallet or early
                insider — treat with caution.
              </p>
              <div className="mt-2 flex gap-4">
                <div>
                  <p className="text-gray-400 text-xs">Currently Holding</p>
                  <p className="text-white text-sm font-semibold">
                    {formatNumber(holder.uiAmount)} tokens
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Current Value</p>
                  <p className="text-white text-sm font-semibold">
                    ${(holder.uiAmount * currentPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

          ) : (
            // ── Normal Swap Data ──
            <div className="flex gap-6 flex-wrap">
              <div>
                <p className="text-gray-400 text-xs">Entry</p>
                <p className="text-white text-sm">
                  ${entry.entryPriceUSD?.toFixed(10)}
                </p>
                <p className="text-gray-500 text-xs">{entry.entryDate}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">USD Spent</p>
                <p className="text-white text-sm">
                  ${entry.usdSpent?.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">SOL Spent</p>
                <p className="text-white text-sm">
                  {entry.solSpent?.toFixed(4)} SOL
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Tokens Bought</p>
                <p className="text-white text-sm">
                  {formatNumber(entry.tokenAmount)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Current Value</p>
                <p className="text-white text-sm">
                  ${(holder.uiAmount * currentPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">PnL</p>
                <p className={`text-sm font-bold ${
                  pnlPercent === null
                    ? "text-gray-400"
                    : pnlPercent > 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}>
                  {pnlPercent !== null ? `${pnlPercent.toFixed(2)}%` : "N/A"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};



// ── main TopHolders component ────────────────────────────────────────────────
export const TopHolders = () => {
  const { tokenAddress, chartPrice } = useToken();
  const { data: holders, isLoading, isError } = useTopHolders(tokenAddress);

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
          <HolderRow
            key={holder.walletAddress}
            holder={holder}
            rank={i + 1}
            mintAddress={tokenAddress}
            currentPrice={Number(chartPrice)}
          />
        ))}
      </div>
    </div>
  );
};

export default TopHolders;











// import { useToken } from "../context/TokenContext";
// import { useTopHolders } from "../hooks/useTopHolders";

// export const TopHolders = () => {
//   const { tokenAddress } = useToken();
//   const { data: holders, isLoading, isError } = useTopHolders(tokenAddress);
// console.log(holders);

//   if (!tokenAddress) return null;

//   if (isLoading)
//     return <p className="text-white text-center mt-6">Loading holders...</p>;

//   if (isError)
//     return <p className="text-red-500 text-center mt-6">Failed to fetch holders</p>;

//   const formatHolderAmount = (holderAmount: number) => {

//   if (holderAmount == null || isNaN(holderAmount)) {
//     return "N/A";
//   }

//   if (holderAmount >= 1_000_000) {
//     return `${(holderAmount / 1_000_000).toFixed(2)}M`;
//   }

//   if (holderAmount >= 1_000) {
//     return `${(holderAmount / 1_000).toFixed(2)}K`;
//   }

//   return holderAmount.toFixed(2);
// };

//   return (
    
//     <div className="my-5 px-4 max-w-3xl mx-auto">
//       { holders?.indexOf(0) && (
//       <h2 className="text-white font-bold text-xl mb-4">Top 10 Holders</h2>
//         )}
//       <div className="flex flex-col gap-3 bg-[hsl(0,0%,12%)] rounded-lg p-4">
//         {holders?.slice(0, 10).map((holder: any, i: number) => (
//           <div
//             key={holder.walletAddress}
//             className="flex justify-between items-center gap-5"
//           >
//             <div className="flex gap-5">
//               <span className="text-gray-400 text-sm">#{i + 1} </span>
//               <span
//                   onClick={() => navigator.clipboard.writeText(holder.walletAddress)}
//                   className="text-white font-mono text-sm cursor-pointer hover:text-green-400 transition"
//                   title="Click to copy"
//                 >
//                   {holder.walletAddress.slice(0, 6)}...
//                   {holder.walletAddress.slice(-6)}
//                 </span>
//               {holder.isSuspected && (
//                 <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
//                   ⚠ Bundle Suspected
//                 </span>
//               )}
//             </div>
//             <p className="text-green-400 font-semibold">
//               {formatHolderAmount(holder.uiAmount)} tokens
//             </p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };