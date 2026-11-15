import type { TokenOverview } from "@/types/birdeye";

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Returns an error message for a malformed mint address, or null if it looks valid. */
export const getMintAddressError = (raw: string): string | null => {
  const address = raw.trim();
  if (!address) return "Paste a token mint address to analyze.";
  if (address.startsWith("0x") && address.length === 42) {
    return "That's an EVM address. Paste a Solana mint address instead.";
  }
  if (!BASE58_ADDRESS.test(address)) {
    return "That doesn't look like a Solana mint address. Check for missing or extra characters.";
  }
  return null;
};

/** A token is usable only if Birdeye returned identity, a price and liquidity. */
export const isUsableToken = (token: TokenOverview | undefined): token is TokenOverview =>
  Boolean(
    token &&
      token.address &&
      token.symbol &&
      token.name &&
      token.price > 0 &&
      token.liquidity > 0
  );
