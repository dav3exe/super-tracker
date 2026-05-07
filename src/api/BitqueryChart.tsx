// ignore this

import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import axios from "axios";
import { CandlestickSeries } from "lightweight-charts";
import { useToken } from "../context/TokenContext";

const BitqueryChart = () => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const { tokenAddress } = useToken();
console.log(tokenAddress);

  useEffect(() => {
  console.log("Chart effect running:", tokenAddress);

  if (!tokenAddress) return;
  if (!chartContainerRef.current) return;

  const fetchData = async () => {
    try {
      const res = await axios.post(
        "https://streaming.bitquery.io/graphql",
        {
          query: `
          {
            Trading {
              Pairs(
                limit: {count: 50}
                orderBy: {descending: Block_Time}
                where: {
                  Interval: {Time: {Duration: {eq: 1}}},
                  Token: {Address: {is: "${tokenAddress}"}}
                }
              ) {
                Interval {
                  Time {
                    Start
                  }
                }
                Price {
                  Ohlc {
                    Open
                    High
                    Low
                    Close
                  }
                }
              }
            }
          }
        `,
        },
        {
          headers: {
            Authorization: "Bearer ory_at_43zb2cSyzFa1H9SNfrvXo5uEmOWs1I71QP9jouqV174.8QcfbvsHnZe87LFNd9DwXmpXMP-H25jZZLwYxIJDB48",
            "Content-Type": "application/json"
          },
        }
      );

      const raw = res.data.data.Trading.Pairs;
      console.log("RAW:", raw);

      if (!raw.length) return;

      const formatted = raw.map((item: any) => ({
        time: Math.floor(new Date(item.Interval.Time.Start).getTime() / 1000),
        open: item.Price.Ohlc.Open,
        high: item.Price.Ohlc.High,
        low: item.Price.Ohlc.Low,
        close: item.Price.Ohlc.Close,
      })).reverse();

      const chart = createChart(chartContainerRef.current!, {
        width: 600,
        height: 400,
      });

      const candleSeries = chart.addSeries(CandlestickSeries);
      candleSeries.setData(formatted);

      return () => chart.remove();
    } catch (err) {
      console.error(err);
    }
  };

  fetchData();
}, [tokenAddress]);


  return <div ref={chartContainerRef} className="w-full h-[500px]"/>
};

export default BitqueryChart;