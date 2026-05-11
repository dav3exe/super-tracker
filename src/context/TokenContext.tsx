import { createContext, useContext, useState } from "react";

type TokenContextType = {
  tokenAddress: string;
  setTokenAddress: (value: string) => void;
  chartPrice: string
  setChartPrice: (value: string) => void;
  polling: boolean;
  setPolling: (value: boolean) => void;
};

const TokenContext = createContext<TokenContextType | null>(null);

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [chartPrice, setChartPrice] = useState("");
  const [polling, setPolling] = useState(false)

  return (
    <TokenContext.Provider value={{ tokenAddress, setTokenAddress, chartPrice, setChartPrice, polling, setPolling }}>
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