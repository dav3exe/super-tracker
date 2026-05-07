import { createContext, useContext, useState } from "react";

type TokenContextType = {
  tokenAddress: string;
  setTokenAddress: (value: string) => void;
};

const TokenContext = createContext<TokenContextType | null>(null);

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

  if (!context) {
    throw new Error("useToken must be used inside TokenProvider");
  }

  return context;
};