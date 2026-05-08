// import { createContext, useContext, useState } from "react";

// type PriceContextType = {
//   chartPrice: string;
//   setChartPrice: (value: string) => void;
// };

// const PriceContext = createContext<PriceContextType | null>(null);

// export const PriceProvider = ({ children }: { children: React.ReactNode }) => {
//   const [chartPrice, setChartPrice] = useState("");

//   return (
//     <PriceContext.Provider value={{ chartPrice, setChartPrice }}>
//       {children}
//     </PriceContext.Provider>
//   );
// };

// export const usePrice = () => {
//   const context = useContext(PriceContext);

//   if (!context) {
//     throw new Error("useToken must be used inside PriceProvider");
//   }

//   return context;
// };