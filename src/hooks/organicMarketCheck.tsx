export const detectOrganicMarket = ({
  totalFees,
  marketCap,
  uniqueTraders,
  totalVolume,
}: {
  totalFees: number;
  marketCap: number;
  uniqueTraders: number;
  totalVolume: number;
}) => {
  const safeMarketCap = Math.max(marketCap, 1000);

  const feeToMcapRatio = totalFees / safeMarketCap;
  const traderRatio =
    uniqueTraders / Math.max(totalVolume / 100000, 1);

  let organicScore = 0;

  // Fee strength (tiered)
  if (feeToMcapRatio > 0.05) organicScore += 60;
  else if (feeToMcapRatio > 0.02) organicScore += 40;
  else if (feeToMcapRatio > 0.01) organicScore += 20;

  // Trader diversity (tiered)
  if (traderRatio > 0.2) organicScore += 40;
  else if (traderRatio > 0.1) organicScore += 20;

  organicScore = Math.min(organicScore, 100);

  let label = "Inorganic";

  if (organicScore >= 70) label = "Highly Organic";
  else if (organicScore >= 40) label = "Moderately Organic";

  return {
    organicScore,
    label,
    feeToMcapRatio,
    traderRatio,
  };
};