import { birdeyeApi } from "@/lib/birdeye";
import type { BirdeyeResponse, TokenOverview } from "@/types/birdeye";

// Token creation time (/defi/token_creation_info) needs a paid Birdeye plan,
// so token age is usually unknown on the free tier. getSafeMetrics falls back
// to the 5m window and flags ageIsReal: false, which the UI surfaces.
export const getTokenOverview = async (
  address: string
): Promise<BirdeyeResponse<TokenOverview>> => {
  const res = await birdeyeApi.get<BirdeyeResponse<TokenOverview>>(
    "/defi/token_overview",
    { params: { address, ui_amount_mode: "raw" } }
  );
  return res.data;
};
