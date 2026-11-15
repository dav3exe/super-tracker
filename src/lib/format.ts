const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

const toSubscript = (n: number) =>
  String(n)
    .split("")
    .map((d) => SUBSCRIPT_DIGITS[Number(d)])
    .join("");

/** 1_250_000 → "1.25M". Returns "N/A" for missing values. */
export const formatCompact = (amount: number | null | undefined): string => {
  if (amount == null || Number.isNaN(amount)) return "N/A";

  const abs = Math.abs(amount);
  const units = [
    { value: 1e12, symbol: "T" },
    { value: 1e9, symbol: "B" },
    { value: 1e6, symbol: "M" },
    { value: 1e3, symbol: "K" },
  ];

  for (const unit of units) {
    if (abs >= unit.value) {
      return `${parseFloat((amount / unit.value).toFixed(2))}${unit.symbol}`;
    }
  }
  return parseFloat(amount.toFixed(2)).toString();
};

/** 1234.5 → "$1,234.50" */
export const formatUsd = (value: number): string =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** 1234.5 → "+$1,234.50", -12 → "−$12.00" */
export const formatSignedUsd = (value: number): string =>
  `${value >= 0 ? "+" : "−"}${formatUsd(Math.abs(value))}`;

/** 12.345 → "+12.35%" */
export const formatSignedPct = (value: number, digits = 2): string =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}%`;

/** 52000 → "$52.0K", 4_200_000 → "$4.20M" */
export const formatMarketCap = (usd: number): string => {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
};

/**
 * Memecoin prices often have many leading zeros. Collapse them into a
 * subscript count so they stay readable: 0.00000123 → "0.0₅123".
 */
export const formatTokenPrice = (price: number, significant = 4): string => {
  if (!Number.isFinite(price) || price === 0) return "0";
  if (price >= 1) {
    return price.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  if (price >= 0.001) return price.toPrecision(significant);

  // Zeros between the decimal point and the first significant digit.
  const leadingZeros = -Math.floor(Math.log10(price)) - 1;
  const digits = Math.round(price * 10 ** (leadingZeros + significant));
  return `0.0${toSubscript(leadingZeros)}${String(digits).replace(/0+$/, "") || "0"}`;
};

export const shortenAddress = (address: string, chars = 4): string =>
  `${address.slice(0, chars)}…${address.slice(-chars)}`;
