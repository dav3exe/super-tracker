import React, { useState } from "react";
import { getTokenOverview } from "../services/getTokenOverview";
import { getPriceChart } from "../services/getChart";
import { useToken } from "../context/TokenContext";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "../hooks/formatNumberDisplay";


export const Input = () => {
  let { tokenAddress, setTokenAddress, setChartPrice } = useToken();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false)

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tokenOverview", tokenAddress],
    queryFn: () => getTokenOverview(tokenAddress),
    enabled: !!tokenAddress,
    // polling every ** minutes if polling is true
    refetchInterval: polling ? 300000 : false,
    // avoids extra API calls when tab refocuses
    refetchOnWindowFocus: false,
    // keep polling even when tab inactive ...set to false for now
    refetchIntervalInBackground: false,
    // → cache stays fresh for 30s
    staleTime: 30000

  });
  
  const isValidSolanaAddress = (address: string): boolean => {
  if (!address) return false;

  // Solana addresses are base58, no 0x, usually 32–44 chars
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  if (!base58Regex.test(address)) return false;

  // extra safety: must NOT be Ethereum format
  if (address.startsWith("0x")) return false;

  return true;
};

const validateToken = (apiData: any): boolean => {
  if (!apiData) return false;

  // must have identity
  if (!apiData.address || !apiData.symbol || !apiData.name) return false;

  // must have price
  if (!apiData.price || apiData.price <= 0) return false;

  // must have liquidity
  if (!apiData.liquidity || apiData.liquidity <= 0) return false;

  return true;
};

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  const address = inputValue.trim();

  
  if (!address) {
    setError("Input a valid Token Mint Address");
    return;
  }

  if ((address.startsWith("0x")) && (address.length === 42) ) {
    setError("This is an EVM address. Paste a Solana mint address.");
    return;
  }

  if (!isValidSolanaAddress(address)) {
    setError("Invalid Solana mint address format");
    return;
  }


    const response = await getTokenOverview(address);

    if (!validateToken(response.data)) {
      setError("Invalid token mint address or unsupported token");
      return;
    }

    setError("");
    setTokenAddress(address);
    setChartPrice(response.data.price.toFixed(7));
    setPolling(true);


};

  const handleClear = (e: React.FormEvent<HTMLFormElement>)=> {
    e.preventDefault();
    setInputValue("")
    setTokenAddress("");
    setChartPrice("")
    setPolling(false)
    setError("")
  }

  return (
    <div >
      <div className=" justify-center flex mt-20">
      <form onSubmit={data ? handleClear : error ? handleClear : handleSubmit} className="flex flex-col gap-5 items-center text-start w-120 bg-[hsl(0,0%,12%)] p-5 rounded-lg">
        <input
          type="text"
          placeholder="paste token mint address"
          className={`w-100 h-[45px] p-2 border-2 rounded-lg my-2 bg-[hsl(0,0%,40%)] text-white font-semibold ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />

        <div className="font-semibold text-white flex flex-col gap-5">
        <p className={error ? `text-red-500 block` : `hidden`}>{error}</p>
        {isError && (
          <p className="text-red-500">
            Failed to fetch token details from API
          </p>
        )}

      {data?.data.name && (
        <div className="flex flex-col gap-1 ">
          <div className="self-center">
          <img
            src={data.data.logoURI}
            alt={data.data.symbol}
            className="w-20 h-20"
          />
          </div>

          <p className="text-center">
            {data.data.name} ({data.data.symbol})
          </p>

          <p>
            Price: $
            {Number(data.data.price).toFixed(7)}
          </p>

          <p>
            Market Cap: $
            {formatNumber(data.data.marketCap)}
          </p>
        </div>
      )}
        
      </div>
        

        <button
          disabled={isLoading}
          className={isLoading ?  `w-50 h-[40px] bg-[hsl(0,0%,20%)] hover:bg-[hsl(0,0%,20%)] rounded-lg text-white font-bold block my-2`: `w-50 h-[40px] bg-[hsl(0,0%,20%)] hover:bg-[hsl(75,94%,57%)] rounded-lg text-white font-bold block my-2` }
        >
          {isLoading ? "loading..." : data ? "clear" : error ? "clear" : "submit"}
        </button>
      </form>
    </div>
    </div>
  );
};

export default Input;
