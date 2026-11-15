import { birdeyeApi } from "@/lib/birdeye";
import type { BirdeyeResponse, OhlcvData } from "@/types/birdeye";

export const getPriceChart = async (
  address: string,
  type: string,
  timeFrom: number,
  timeTo: number
): Promise<BirdeyeResponse<OhlcvData>> => {
  const res = await birdeyeApi.get<BirdeyeResponse<OhlcvData>>("/defi/v3/ohlcv", {
    params: { address, type, time_from: timeFrom, time_to: timeTo },
  });
  return res.data;
};
