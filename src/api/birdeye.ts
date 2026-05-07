// api/birdeye.ts
import axios from "axios";

export const birdeyeApi = axios.create({
  baseURL: import.meta.env.VITE_BIRDEYE_API_URL,
  headers: {
    accept: "application/json",
    "x-api-key": import.meta.env.VITE_BIRDEYE_API_KEY,
    "x-chain": "solana",
  },
});