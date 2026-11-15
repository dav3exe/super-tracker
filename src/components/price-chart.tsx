"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePriceChart } from "@/hooks/use-price-chart";
import { cn } from "@/lib/utils";
import type { OhlcvItem } from "@/types/birdeye";

const INTERVALS = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1H", label: "1H" },
  { value: "4H", label: "4H" },
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
];

const DAY = 86_400;
const RANGES = [
  { value: DAY, label: "1D" },
  { value: 5 * DAY, label: "5D" },
  { value: 30 * DAY, label: "1M" },
  { value: 90 * DAY, label: "3M" },
  { value: 180 * DAY, label: "6M" },
];

const UP = "#4ade80";
const DOWN = "#f87171";

// Enough decimals to show the smallest price on screen with ~4 significant digits.
const priceFormatFor = (items: OhlcvItem[]) => {
  const min = Math.min(...items.map((i) => i.l).filter((v) => v > 0));
  const precision = Number.isFinite(min)
    ? Math.min(Math.max(2, Math.ceil(-Math.log10(min)) + 3), 14)
    : 2;
  return { type: "price" as const, precision, minMove: 10 ** -precision };
};

export function PriceChart({ mintAddress }: { mintAddress: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [candleInterval, setCandleInterval] = useState("15m");
  const [range, setRange] = useState(DAY);
  const { data: items, isPending, isError, isFetching, refetch } = usePriceChart(
    mintAddress,
    candleInterval,
    range
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.55)",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255, 255, 255, 0.25)", labelBackgroundColor: "#2b2b2b" },
        horzLine: { color: "rgba(255, 255, 255, 0.25)", labelBackgroundColor: "#2b2b2b" },
      },
      // The wheel scrolls the page, not the chart; drag and pinch still pan and zoom.
      handleScroll: { mouseWheel: false },
      handleScale: { mouseWheel: false },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.08)" },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !items) return;

    series.applyOptions({ priceFormat: priceFormatFor(items) });
    series.setData(
      items.map((c) => ({
        time: c.unix_time as UTCTimestamp,
        open: Number(c.o),
        high: Number(c.h),
        low: Number(c.l),
        close: Number(c.c),
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [items]);

  const isEmpty = !isPending && !isError && items?.length === 0;

  return (
    <Panel
      title="Price"
      aria-busy={isFetching}
      actions={
        <>
          <ToggleGroup
            type="single"
            size="sm"
            spacing={0}
            value={candleInterval}
            onValueChange={(v) => v && setCandleInterval(v)}
            aria-label="Candle interval"
            className="glass-inset rounded-lg p-0.5"
          >
            {INTERVALS.map((i) => (
              <ToggleGroupItem
                key={i.value}
                value={i.value}
                className="h-7 rounded-md! px-2 text-xs text-muted-foreground data-[state=on]:bg-white/10 data-[state=on]:text-foreground"
              >
                {i.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            type="single"
            size="sm"
            spacing={0}
            value={String(range)}
            onValueChange={(v) => v && setRange(Number(v))}
            aria-label="Time range"
            className="glass-inset rounded-lg p-0.5"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem
                key={r.value}
                value={String(r.value)}
                className="h-7 rounded-md! px-2 text-xs text-muted-foreground data-[state=on]:bg-white/10 data-[state=on]:text-foreground"
              >
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </>
      }
    >
      <div className="relative h-[320px] sm:h-[420px]">
        <div
          ref={containerRef}
          className={cn("absolute inset-0 transition-opacity", (isError || isEmpty) && "opacity-0")}
        />

        {isPending && <Skeleton className="absolute inset-0 rounded-xl bg-white/[0.04]" />}

        {(isError || isEmpty) && (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="max-w-xs space-y-3">
              <p className="text-sm font-medium">
                {isError ? "Couldn't load the chart" : "No trades in this range"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? "The price service didn't respond. Try again in a moment."
                  : "Pick a longer range or a larger interval."}
              </p>
              {isError && (
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  <RotateCw aria-hidden />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
