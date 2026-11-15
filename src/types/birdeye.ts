// Only the fields this app reads. Birdeye sets a `*ChangePercent` field to
// null when that window has no real prior period (it was backfilled).
export interface TokenOverview {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number;
  liquidity: number;
  marketCap?: number | null;

  v1mUSD?: number;
  v5mUSD?: number;
  v1hUSD?: number;
  v4hUSD?: number;
  v24hUSD?: number;

  vBuy5mUSD?: number;
  vBuy1hUSD?: number;
  vBuy4hUSD?: number;
  vBuy24hUSD?: number;

  vSell5mUSD?: number;
  vSell1hUSD?: number;
  vSell4hUSD?: number;
  vSell24hUSD?: number;

  v1mChangePercent?: number | null;
  v5mChangePercent?: number | null;
  v1hChangePercent?: number | null;
  v4hChangePercent?: number | null;
  v24hChangePercent?: number | null;

  uniqueWallet5m?: number;
  uniqueWallet1h?: number;
  uniqueWallet4h?: number;
  uniqueWallet24h?: number;

  tokenAgeHours?: number;
  createdUnixTime?: number;
}

export interface BirdeyeResponse<T> {
  success: boolean;
  data: T;
}

export interface OhlcvItem {
  unix_time: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface OhlcvData {
  items: OhlcvItem[];
}
