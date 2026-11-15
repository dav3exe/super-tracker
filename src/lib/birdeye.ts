import axios from "axios";

export const birdeyeApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BIRDEYE_API_URL,
  headers: {
    accept: "application/json",
    "x-api-key": process.env.NEXT_PUBLIC_BIRDEYE_API_KEY,
    "x-chain": "solana",
  },
});
