import { birdeyeApi } from "../api/birdeye.ts";

export const getPriceChart = async (
    address: string,
    type: string,
    time_from: number,
    time_to: number
) => {
  const res = await birdeyeApi.get("/defi/v3/ohlcv", {
    params: {
      address,
      type,
      time_from,
      time_to,
    //   ui_amount_mode: "raw",
    },
  });

  return res.data;
};