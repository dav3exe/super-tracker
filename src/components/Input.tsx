import React, { useState } from "react";
import { getTokenOverview } from "../services/getPrice";
import { getPriceChart } from "../services/getChart";
import { useToken } from "../context/TokenContext";
import { useQuery } from "@tanstack/react-query";

export const Input = () => {
  let { tokenAddress, setTokenAddress } = useToken();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [marketCap, setMarketCap] = useState("")
  const [logo, setLogo] = useState("")
  const [symbol, setSymbol] = useState("")
  const [clear, setClear] = useState(false)

  const isValidSolanaAddress = (address: string): boolean => {
  if (!address) return false;

  // Solana addresses are base58, no 0x, usually 32–44 chars
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  if (!base58Regex.test(address)) return false;

  // extra safety: must NOT be Ethereum format
  if (address.startsWith("0x")) return false;

  return true;
};

const validateToken = (data: any) => {
  if (!data) return false;

  // must have identity
  if (!data.address || !data.symbol || !data.name) return false;

  // must have price
  if (!data.price || data.price <= 0) return false;

  // must have liquidity (important for meme tokens)
  if (!data.liquidity || data.liquidity <= 0) return false;

  return true;
};

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  const address = inputValue.trim();

  if (!address) {
    setError("Input a valid Token Mint Address");
    return;
  }

  if (address.startsWith("0x")) {
    setError("This is an EVM address. Paste a Solana mint address.");
    return;
  }

  if (!isValidSolanaAddress(address)) {
    setError("Invalid Solana mint address format");
    return;
  }



    try {
      setLoading(true);
      setError("");

      const { data } = await getTokenOverview(inputValue);
      console.log(data);
      tokenAddress === inputValue
      setTokenAddress(inputValue);
      setName(data.name);
      setPrice(Number(data.price).toFixed(7))
      setMarketCap(data.marketCap)
      setLogo(data.logoURI)
      setSymbol(data.symbol)
      setClear(true)
      
      getPriceChart

      if (!validateToken(data)) {
      setError("Invalid token mint address or unsupported token");
      setLoading(false)
      return;
    }
    } catch (err) {
      setError("Failed to fetch price");
    } finally {
      setLoading(false);
      
    }
  };

  const handleClear = (e: React.FormEvent<HTMLFormElement>)=> {
    e.preventDefault();
    setInputValue("")
    setTokenAddress("");
    setName("");
    setPrice("")
    setMarketCap("")
    setLogo("")
    setSymbol("")
    setClear(false)
  }

  return (
    <div >
      <div className=" justify-center flex">
      <form onSubmit={clear === true ? handleClear : handleSubmit} className="flex flex-col gap-5 items-center text-start w-120 bg-[hsl(0,0%,12%)] p-5 rounded-lg">
        <input
          type="text"
          placeholder="paste token mint address"
          className={`w-100 h-[45px] p-2 border-2 rounded-lg my-2 bg-[hsl(0,0%,40%)] text-white font-semibold ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />

      <div className={logo ? "block" : "hidden"}>
        <img src={logo} alt={symbol} className="w-20 h-20 hover:"/>
      </div>

        <div className="font-semibold text-white">
          <p className="text-red-500">{error}</p>
          <p className="text-red-500">{name && ( `Token Name: ${name}  "${symbol}"`) }</p>
          <p className="text-amber-400">{marketCap && ( `Market Cap: $${marketCap}`)}</p>
          <p className="text-green-500">{price && ( `Token Price: $${price}`)}</p>
          
        </div>
        

        <button
          disabled={loading}
          className="w-50 h-[40px] bg-[hsl(0,0%,20%)] hover:bg-[hsl(75,94%,57%)] rounded-lg text-white font-bold block my-2"
        >
          {loading ? "loading..." : clear ? "clear" : "submit"}
        </button>
      </form>
    </div>
    </div>
  );
};

export default Input;


































// import React from 'react'
// import { useState } from "react";
// import axios from 'axios';

// type TokenInput = {
//     tokenAddress: string
// }



// const Prices = () => {
  


// const [tokenAddressInput, setTokenAddressInput] = useState<TokenInput>({ tokenAddress: "" })

// const [error, setError] = useState<string>("");

// const isValidSolanaAddress = (address: string): boolean => {
//   if (!address) return false;

//   // Solana addresses are base58, no 0x, usually 32–44 chars
//   const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

//   if (!base58Regex.test(address)) return false;

//   // extra safety: must NOT be Ethereum format
//   if (address.startsWith("0x")) return false;

//   return true;
// };

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     const inputFieldName = name as keyof TokenInput;
//     setTokenAddressInput({ ...tokenAddressInput, [inputFieldName]: value });
//   };
//      const getCurrentPrice = async () => {
//       const priceApi = axios.create({
//         baseURL:import.meta.env.VITE_BIRDEYE_API_URL,
//           headers: {
//             "x-chain": "solana",
//             "accept": "application/json",
//             "x-api-key": import.meta.env.VITE_BIRDEYE_API_KEY,
            
//           },
//       })
//       const res = await priceApi.get("/price", {
//         params: {
//           ui_amount_mode: "raw",
//           address: tokenAddressInput.tokenAddress,
//         }
//       })
//     console.log(tokenAddressInput.tokenAddress, res.data);
    
//     setTokenAddressInput({tokenAddress: ""})
//     setError("")      
//       return res.data;
//     }

// const submitTokenAddress = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault()

//       const address = tokenAddressInput.tokenAddress.trim();
//       if (!address) {
//         setError("Input a valid Token Mint Address");
//         return;
//       }

//       if (address.startsWith("0x")) {
//         setError("This is an EVM address. Paste a Solana mint address.");
//         return;
//       }

//       if (!isValidSolanaAddress(address)) {
//         setError("Invalid Solana mint address format");
//         return;
//       } 
//     getCurrentPrice()
//   }


//   return (
//     <div>
//         <form onSubmit={submitTokenAddress}>
//             <input type="text"
//             name='tokenAddress'
//             placeholder='paste token mint address'
//             className={`w-1/2 h-[45px] p-2 border-2 rounded-lg my-2 block ${error ? "border-red-500" : "border-gray-300" }`}
//             value={tokenAddressInput.tokenAddress}
//             onChange={handleChange}
//              />
//              <p className="text-red-500">{error}</p>
//         <button className="w-1/2 h-[40px] bg-amber-400 rounded-lg text-white font-bold block my-2">
//           submit
//         </button>
//         </form>
//     </div>
//   )
// }



// export default Prices