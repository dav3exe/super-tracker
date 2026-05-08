import { createContext, useContext, useState } from "react";

type TokenContextType = {
  tokenAddress: string;
  chartPrice: string
  setTokenAddress: (value: string) => void;
  setChartPrice: (value: string) => void;
};

const TokenContext = createContext<TokenContextType | null>(null);

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [chartPrice, setChartPrice] = useState("");

  return (
    <TokenContext.Provider value={{ tokenAddress, setTokenAddress, chartPrice, setChartPrice }}>
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