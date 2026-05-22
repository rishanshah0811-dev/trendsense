"use client";

import { useState, useCallback } from "react";
import { validateTicker } from "@/lib/api";

interface TickerInputProps {
  onAnalyse: (
    ticker: string,
    startDate: string,
    endDate: string,
    bullishThreshold: number,
    bearishThreshold: number
  ) => void;
  isLoading: boolean;
}

const EXAMPLE_TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "JPM", "GS"];

function defaultStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().split("T")[0];
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function TickerInput({ onAnalyse, isLoading }: TickerInputProps) {
  const [ticker, setTicker] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(todayDate());
  const [bullishThreshold, setBullishThreshold] = useState(0.55);
  const [bearishThreshold, setBearishThreshold] = useState(0.55);
  const [tickerValid, setTickerValid] = useState<boolean | null>(null);
  const [tickerName, setTickerName] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleValidate = useCallback(async (value: string) => {
    if (!value.trim()) {
      setTickerValid(null);
      setTickerName("");
      setValidationError(null);
      return;
    }
    setValidating(true);
    setValidationError(null);
    try {
      const result = await validateTicker(value.trim().toUpperCase());
      setTickerValid(result.valid);
      setTickerName(result.valid ? result.name : "");
      setValidationError(result.valid ? null : "Invalid ticker");
    } catch {
      setTickerValid(null);
      setTickerName("");
      setValidationError("Could not reach server — click Retry");
    }
    setValidating(false);
  }, []);

  const handleSubmit = () => {
    if (!tickerValid || isLoading) return;
    onAnalyse(
      ticker.toUpperCase().trim(),
      startDate,
      endDate,
      bullishThreshold,
      bearishThreshold
    );
  };

  const handleChipClick = (t: string) => {
    setTicker(t);
    handleValidate(t);
  };

  return (
    <div className="max-w-xl mx-auto stagger-1">
      <div className="mb-8 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[0.1em] uppercase mb-2">
          TrendSense
        </h2>
        <p className="font-[family-name:var(--font-mono)] text-sm text-[#555555]">
          ML-powered signal analysis for any ticker
        </p>
      </div>

      <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-6 stagger-2">
        <label className="block font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider text-[#555555] mb-2">
          Ticker Symbol
        </label>
        <div className="relative">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onBlur={(e) => handleValidate(e.target.value)}
            placeholder="AAPL"
            className="w-full bg-[#050505] border border-[#1a1a1a] px-4 py-3 font-[family-name:var(--font-mono)] text-lg text-[#e8e8e8] placeholder-[#333] focus:outline-none focus:border-[#ffab00] transition-colors"
            disabled={isLoading}
          />
          {validating && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-xs text-[#555555]">
              ...
            </span>
          )}
          {tickerValid === true && !validating && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-xs text-[#00e676]">
              {tickerName}
            </span>
          )}
          {tickerValid === false && !validating && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-xs text-[#ff1744]">
              Invalid ticker
            </span>
          )}
        </div>

        {validationError && validationError.startsWith("Could not") && !validating && (
          <div className="flex items-center gap-3 mt-2">
            <span className="font-[family-name:var(--font-mono)] text-xs text-[#ffab00]">
              Server unreachable
            </span>
            <button
              onClick={() => handleValidate(ticker)}
              className="px-3 py-1 font-[family-name:var(--font-mono)] text-xs border border-[#ffab00] text-[#ffab00] hover:bg-[#ffab00] hover:text-[#050505] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          {EXAMPLE_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => handleChipClick(t)}
              disabled={isLoading}
              className="px-3 py-1 font-[family-name:var(--font-mono)] text-xs border border-[#1a1a1a] text-[#555555] hover:text-[#ffab00] hover:border-[#ffab00] transition-colors cursor-pointer"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#050505] border border-[#1a1a1a] px-3 py-2 font-[family-name:var(--font-mono)] text-sm text-[#e8e8e8] focus:outline-none focus:border-[#ffab00] transition-colors"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#050505] border border-[#1a1a1a] px-3 py-2 font-[family-name:var(--font-mono)] text-sm text-[#e8e8e8] focus:outline-none focus:border-[#ffab00] transition-colors"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1">
              Bullish Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.40"
                max="0.75"
                step="0.01"
                value={bullishThreshold}
                onChange={(e) => setBullishThreshold(parseFloat(e.target.value))}
                className="flex-1"
                disabled={isLoading}
              />
              <span className="font-[family-name:var(--font-mono)] text-sm text-[#00e676] w-12 text-right">
                {Math.round(bullishThreshold * 100)}%
              </span>
            </div>
          </div>
          <div>
            <label className="block font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1">
              Bearish Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.40"
                max="0.75"
                step="0.01"
                value={bearishThreshold}
                onChange={(e) => setBearishThreshold(parseFloat(e.target.value))}
                className="flex-1"
                disabled={isLoading}
              />
              <span className="font-[family-name:var(--font-mono)] text-sm text-[#ff1744] w-12 text-right">
                {Math.round(bearishThreshold * 100)}%
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!tickerValid || isLoading}
          className="mt-6 w-full py-3 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.2em] border border-[#ffab00] text-[#ffab00] hover:bg-[#ffab00] hover:text-[#050505] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? "Running..." : "Analyse"}
        </button>
      </div>
    </div>
  );
}
