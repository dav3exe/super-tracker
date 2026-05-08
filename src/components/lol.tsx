// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { createChart, CandlestickSeries } from "lightweight-charts";
// import { useToken } from "../context/TokenContext";
// import { getPriceChart } from "../services/getChart";
// // import Input from "./Input";

// export const Chart = () => {
//   const chartContainerRef = useRef<HTMLDivElement | null>(null);
//   const chartRef = useRef<any>(null);
//   const seriesRef = useRef<any>(null);

//   const { tokenAddress } = useToken();

//   const [timeFrame, setTimeFrame] = useState("15m");
//   const [range, setRange]= useState(86400);

//   useEffect(() => {
//     if (!tokenAddress || !chartContainerRef.current) return;

//     // destroy old chart if exists
//     if (chartRef.current) {
//       chartRef.current.remove();
//     }

//     const chart = createChart(chartContainerRef.current, {
//       width: 600,
//       height: 300,
//     });

//     const series = chart.addSeries(CandlestickSeries);

//     chartRef.current = chart;
//     seriesRef.current = series;

//     const fetchData = async () => {
//       const res = await getPriceChart(
//         tokenAddress,
//        timeFrame,
//         Math.floor(Date.now() / 1000) - range,
//         Math.floor(Date.now() / 1000)
//       );

//       const items = res?.data?.items || [];

//       const formatted = items.map((c: any) => ({
//         time: c.unix_time,
//         open: c.o,
//         high: c.h,
//         low: c.l,
//         close: c.c,
//       }));

//       series.setData(formatted);
//     };

//       const timeout = setTimeout(() => {
//       fetchData();
//     }, 800);

//     // cleanup
//     return () => {
//       clearTimeout(timeout); // important
//       chart.remove();
//       chartRef.current = null;
//     }
//   }, [tokenAddress]);
// console.log("token is", tokenAddress);

//   return (
//     <div className="flex flex-col items-center space-y-4  ">
//       {/* DroPDown for timeframe */}
//       <select value={timeFrame}
//       onChange={(e)=> setTimeFrame(e.target.value)}
//       className="p-2 rounded bg-gray-700 text-white">
        
//         <option value="1s"> 1 Second</option>
//         <option value="15s">15 Seconds</option>
//         <option value="30s">30 Seconds</option>
//         <option value="1m">1 Minute</option>
//         <option value="3m">3 Minutes</option>
//         <option value="5m">5 Minutes</option>
//         <option value="15m">15 Minutes</option>
//         <option value="30m">30 Minutes</option>
//         <option value="1H">1 Hour</option>
//         <option value="2h">2 Hours</option>
//         <option value="4H">4 Hours</option>
//         <option value="8H">8  Hours</option>
//         <option value="12H">12 Hours</option>
//         <option value="1d">1 Day</option>
//         <option value="3d">3 Days</option>
//         <option value="1w">1 Week</option>
//         <option value="1M">1 Month</option>
//       </select>

//       {/* <Input/> */}

//       {/* DropDown for Range */}

//       <select value={range}
//       onChange={(e)=>setRange(Number(e.target.value))}
//       className="p-2 rounded bg-gray-700 text-white">

//         <option value={86400}>1d</option>
//         <option value={432000}> 5d</option>
//         <option value={2592999}>1M</option>
//         <option value={7776000}>3M</option>
//         <option value={15552000}>6M</option>
//         <option value={31536000}>1Y</option>
//         <option value={189216000}>6Y</option>
//       </select>
    
//      <div ref={chartContainerRef} className="bg-[hsl(0,0%,20%)]" />
//     </div>
//   )
// };

// export default Chart;