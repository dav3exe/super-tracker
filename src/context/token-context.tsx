"use client";

import { createContext, useContext, useState } from "react";

type TokenContextValue = {
  /** The mint address the user submitted ("" when nothing is being analyzed). */
  tokenAddress: string;
  setTokenAddress: (value: string) => void;
};

const TokenContext = createContext<TokenContextValue | null>(null);

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const [tokenAddress, setTokenAddress] = useState("");

  return (
    <TokenContext.Provider value={{ tokenAddress, setTokenAddress }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) throw new Error("useToken must be used inside TokenProvider");
  return context;
};
