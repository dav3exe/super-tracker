export const formatNumber = (amount: number) => {
  if (amount == null || isNaN(amount)) return "N/A";

  const abs = Math.abs(amount);

  const units = [
    { value: 1e12, symbol: "T" },
    { value: 1e9, symbol: "B" },
    { value: 1e6, symbol: "M" },
    { value: 1e3, symbol: "K" },
  ];

  for (const unit of units) {
    if (abs >= unit.value) {
      const value = amount / unit.value;
      return `${parseFloat(value.toFixed(2))}${unit.symbol}`;
    }
  }

  return parseFloat(amount.toFixed(2)).toString();
};