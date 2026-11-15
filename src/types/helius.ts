// Only the fields this app reads from Helius RPC, DAS and the Enhanced
// Transactions API.

export interface RpcResponse<T> {
  result?: T;
}

export interface ParsedMintAccount {
  value: {
    data?: { parsed?: { info?: { decimals?: number } } };
  } | null;
}

export interface LargestTokenAccount {
  address: string;
  amount: string;
  uiAmount: number | null;
}

export interface DasTokenAccount {
  address: string;
  owner: string;
  amount: number;
}

export interface DasTokenAccountsResult {
  token_accounts?: DasTokenAccount[];
  cursor?: string;
}

export interface AccountInfo {
  owner: string;
  data?: { parsed?: { info?: { owner?: string } } } | [string, string];
}

export interface SignatureInfo {
  signature: string;
  blockTime: number | null;
}

export interface TokenTransfer {
  mint: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
}

export interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface EnhancedTransaction {
  signature: string;
  timestamp: number;
  tokenTransfers?: TokenTransfer[];
  nativeTransfers?: NativeTransfer[];
}

export interface DasAsset {
  id: string;
  interface: string;
  content?: {
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string };
  };
  token_info?: {
    symbol?: string;
    decimals?: number;
    balance?: number;
    price_info?: { total_price?: number };
  };
}

export interface AssetsByOwnerResult {
  items?: DasAsset[];
  nativeBalance?: { lamports?: number };
}
