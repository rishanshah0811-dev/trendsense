"use client";

import { useState, useCallback, useEffect } from "react";
import TickerInput from "@/components/TickerInput";
import PipelineProgress from "@/components/PipelineProgress";
import CandlestickChart from "@/components/CandlestickChart";
import SignalSummary from "@/components/SignalSummary";
import ModelMetrics from "@/components/ModelMetrics";
import ROCChart from "@/components/ROCChart";
import SHAPChart from "@/components/SHAPChart";
import SignalsTable from "@/components/SignalsTable";
import ThresholdSlider from "@/components/ThresholdSlider";
import { useSSE } from "@/hooks/useSSE";
import { filterSignals } from "@/lib/api";
import { AnalysisResult, Signal, SignalSummary as SignalSummaryType } from "@/lib/types";

export default function Home() {
  const { events, isStreaming, error, startStream, stopStream } = useSSE();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [filteredSignals, setFilteredSignals] = useState<Signal[] | null>(null);
  const [filteredSummary, setFilteredSummary] = useState<SignalSummaryType | null>(null);
  const [bullishThreshold, setBullishThreshold] = useState(0.55);
  const [bearishThreshold, setBearishThreshold] = useState(0.55);
  const [lastRequest, setLastRequest] = useState<{
    ticker: string;
    startDate: string;
    endDate: string;
    bullishThreshold: number;
    bearishThreshold: number;
  } | null>(null);

  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (lastEvent?.stage === 8 && lastEvent.data) {
      setResult(lastEvent.data);
      setFilteredSignals(null);
      setFilteredSummary(null);
      setBullishThreshold(lastRequest?.bullishThreshold || 0.55);
      setBearishThreshold(lastRequest?.bearishThreshold || 0.55);
    }
  }, [events, lastRequest]);

  const handleAnalyse = useCallback(
    (
      ticker: string,
      startDate: string,
      endDate: string,
      bullish: number,
      bearish: number
    ) => {
      setResult(null);
      setFilteredSignals(null);
      setFilteredSummary(null);
      setLastRequest({ ticker, startDate, endDate, bullishThreshold: bullish, bearishThreshold: bearish });
      startStream(ticker, startDate, endDate, bullish, bearish);
    },
    [startStream]
  );

  const handleRetry = useCallback(() => {
    if (lastRequest) {
      handleAnalyse(
        lastRequest.ticker,
        lastRequest.startDate,
        lastRequest.endDate,
        lastRequest.bullishThreshold,
        lastRequest.bearishThreshold
      );
    }
  }, [lastRequest, handleAnalyse]);

  const handleThresholdChange = useCallback(
    async (newBullish: number, newBearish: number) => {
      if (!result) return;
      setBullishThreshold(newBullish);
      setBearishThreshold(newBearish);

      try {
        const res = await filterSignals(
          result.raw_probas,
          newBullish,
          newBearish,
          result.look_ahead
        );
        setFilteredSignals(res.signals);
        setFilteredSummary(res.signal_summary);
      } catch {
        // keep current signals on error
      }
    },
    [result]
  );

  const showInput = !isStreaming && !result;
  const showProgress = isStreaming;
  const showResults = !isStreaming && result !== null;

  const displaySignals = filteredSignals || result?.signals || [];
  const displaySummary = filteredSummary || result?.signal_summary;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      {showInput && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <TickerInput onAnalyse={handleAnalyse} isLoading={false} />
        </div>
      )}

      {showProgress && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-xl">
            <PipelineProgress events={events} error={error} onRetry={handleRetry} />
          </div>
        </div>
      )}

      {showResults && result && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-wider">
                {result.ticker}
              </h2>
              <p className="font-[family-name:var(--font-mono)] text-xs text-[#555555] mt-1">
                {result.date_range.start} to {result.date_range.end} | look_ahead={result.best_label_config.look_ahead} threshold={result.best_label_config.threshold}
              </p>
            </div>
            <button
              onClick={() => {
                setResult(null);
                setFilteredSignals(null);
                setFilteredSummary(null);
              }}
              className="px-4 py-2 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-wider border border-[#1a1a1a] text-[#555555] hover:text-[#ffab00] hover:border-[#ffab00] transition-colors cursor-pointer"
            >
              New Analysis
            </button>
          </div>

          <CandlestickChart
            candles={result.candles}
            signals={displaySignals}
            ticker={result.ticker}
          />

          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
            <div className="space-y-4">
              {displaySummary && <SignalSummary summary={displaySummary} />}
              <ModelMetrics metrics={result.metrics} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ROCChart metrics={result.metrics} />
                <SHAPChart data={result.shap_importance} />
              </div>
              <SignalsTable signals={displaySignals} />
            </div>
            <div className="space-y-4">
              <ThresholdSlider
                bullishThreshold={bullishThreshold}
                bearishThreshold={bearishThreshold}
                onBullishChange={(v) => handleThresholdChange(v, bearishThreshold)}
                onBearishChange={(v) => handleThresholdChange(bullishThreshold, v)}
              />
              <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4">
                <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-3">
                  Model Config
                </h3>
                <div className="space-y-2 font-[family-name:var(--font-mono)] text-xs">
                  {result.best_params &&
                    Object.entries(result.best_params).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-[#555555]">{key}</span>
                        <span className="text-[#e8e8e8]">{String(val)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
