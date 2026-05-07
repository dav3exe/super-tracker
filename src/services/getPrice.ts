// services/getPrice.ts
import { birdeyeApi } from "../api/birdeye.ts";

export const getTokenOverview = async (address: string) => {
  const res = await birdeyeApi.get("/defi/token_overview", {
    params: {
      address,
      ui_amount_mode: "raw",
    },
  });

  return res.data;
};