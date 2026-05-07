import React, { useEffect, useMemo, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { useToken } from "../context/TokenContext";
import { getPriceChart } from "../services/getChart";

export const Chart = () => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const { tokenAddress } = useToken();

  useEffect(() => {
    if (!tokenAddress || !chartContainerRef.current) return;

    // destroy old chart if exists
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      width: 600,
      height: 300,
    });

    const series = chart.addSeries(CandlestickSeries);

    chartRef.current = chart;
    seriesRef.current = series;

    const fetchData = async () => {
      const res = await getPriceChart(
        tokenAddress,
        "15m",
        Math.floor(Date.now() / 1000) - 86400,
        Math.floor(Date.now() / 1000)
      );

      const items = res?.data?.items || [];

      const formatted = items.map((c: any) => ({
        time: c.unix_time,
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
      }));

      series.setData(formatted);
    };

      const timeout = setTimeout(() => {
      fetchData();
    }, 800);

    // cleanup
    return () => {
      clearTimeout(timeout); // important
      chart.remove();
      chartRef.current = null;
    }
  }, [tokenAddress]);
console.log("token is", tokenAddress);

  return (
    <div className="flex flex-col items-center  ">
    <div ref={chartContainerRef} className="bg-[hsl(0,0%,20%)]" />
    </div>
  )
};

export default Chart;