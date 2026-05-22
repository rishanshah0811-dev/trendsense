"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  SeriesMarker,
} from "lightweight-charts";
import { Candle, Signal } from "@/lib/types";

interface CandlestickChartProps {
  candles: Candle[];
  signals: Signal[];
  ticker: string;
}

export default function CandlestickChart({
  candles,
  signals,
  ticker,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0d0d0d" },
        textColor: "#555555",
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      crosshair: {
        vertLine: { color: "#ffab00", width: 1, style: 2 },
        horzLine: { color: "#ffab00", width: 1, style: 2 },
      },
      timeScale: {
        borderColor: "#1a1a1a",
        timeVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1a1a1a",
      },
      width: containerRef.current.clientWidth,
      height: 480,
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00e676",
      downColor: "#ff1744",
      borderUpColor: "#00e676",
      borderDownColor: "#ff1744",
      wickUpColor: "#00e676",
      wickDownColor: "#ff1744",
    });

    const chartData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(chartData);

    const buyMarkers: SeriesMarker<Time>[] = signals
      .filter((s) => s.signal_type === "BUY")
      .map((s) => ({
        time: s.date as Time,
        position: "belowBar" as const,
        color: "#00e676",
        shape: "arrowUp" as const,
        text: `${Math.round(s.confidence * 100)}%`,
        size: 1,
      }));

    const sellMarkers: SeriesMarker<Time>[] = signals
      .filter((s) => s.signal_type === "SELL")
      .map((s) => ({
        time: s.date as Time,
        position: "aboveBar" as const,
        color: "#ff1744",
        shape: "arrowDown" as const,
        text: `${Math.round(s.confidence * 100)}%`,
        size: 1,
      }));

    const allMarkers = [...buyMarkers, ...sellMarkers].sort((a, b) =>
      (a.time as string).localeCompare(b.time as string)
    );

    createSeriesMarkers(candleSeries, allMarkers);

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, signals]);

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <span className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wider">
            {ticker}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-xs text-[#555555]">
            Daily
          </span>
        </div>
        <div className="flex items-center gap-4 font-[family-name:var(--font-mono)] text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#00e676] rotate-45 inline-block" />
            <span className="text-[#555555]">
              Buy ({signals.filter((s) => s.signal_type === "BUY").length})
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#ff1744] rotate-45 inline-block" />
            <span className="text-[#555555]">
              Sell ({signals.filter((s) => s.signal_type === "SELL").length})
            </span>
          </span>
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
