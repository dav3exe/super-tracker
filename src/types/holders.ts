export interface RawHolder {
  address: string;
  uiAmount: number;
}

export interface Holder {
  tokenAccount: string;
  walletAddress: string;
  uiAmount: number;
  isLP: boolean;
}

export type BundlingRisk = "LP" | "High" | "Medium" | "Low";

export interface AnalyzedHolder extends Holder {
  bundlingScore: number;
  bundlingRisk: BundlingRisk;
  isSuspected: boolean;
}
