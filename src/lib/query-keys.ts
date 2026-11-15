export const queryKeys = {
  tokenOverview: (mint: string) => ["tokenOverview", mint] as const,
  priceChart: (mint: string, interval: string, rangeSeconds: number) =>
    ["priceChart", mint, interval, rangeSeconds] as const,
  topHolders: (mint: string) => ["topHolders", mint] as const,
  mintCreatedAt: (mint: string) => ["mintCreatedAt", mint] as const,
  tradeHistory: (
    wallet: string,
    mint: string,
    params: { currentBalance: number; mintCreatedAt: number | null; totalSupply: number | null }
  ) => ["tradeHistory", wallet, mint, params] as const,
  walletOverview: (wallet: string) => ["walletOverview", wallet] as const,
  solPrice: () => ["solPrice"] as const,
};
