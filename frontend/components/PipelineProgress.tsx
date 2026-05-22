"use client";

import { SSEEvent } from "@/lib/types";

interface PipelineProgressProps {
  events: SSEEvent[];
  error: string | null;
  onRetry: () => void;
}

const STAGES = [
  "Fetching price data",
  "Computing indicators",
  "Label grid search",
  "Training XGBoost",
  "Evaluating model",
  "SHAP analysis",
  "Generating signals",
  "Complete",
];

export default function PipelineProgress({
  events,
  error,
  onRetry,
}: PipelineProgressProps) {
  const latestStage = events.length > 0 ? events[events.length - 1].stage : 0;
  const latestProgress =
    events.length > 0 ? events[events.length - 1].progress : 0;

  return (
    <div className="max-w-xl mx-auto animate-fade-up">
      <div className="w-full h-1 bg-[#1a1a1a] mb-8 overflow-hidden">
        <div
          className="h-full bg-[#ffab00] transition-all duration-500"
          style={{ width: `${latestProgress}%` }}
        />
      </div>

      <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-6 font-[family-name:var(--font-mono)] text-sm">
        {STAGES.map((label, i) => {
          const stageNum = i + 1;
          const completed = latestStage > stageNum;
          const active = latestStage === stageNum;
          const pending = latestStage < stageNum;

          const stageEvent = events.find((e) => e.stage === stageNum);
          const message = stageEvent?.message || label;

          return (
            <div
              key={stageNum}
              className={`flex items-start gap-3 py-2 ${
                pending ? "opacity-30" : ""
              } ${active ? "pulse-active" : ""}`}
            >
              <span
                className={`shrink-0 w-5 text-right ${
                  completed
                    ? "text-[#00e676]"
                    : active
                    ? "text-[#ffab00]"
                    : "text-[#333]"
                }`}
              >
                {completed ? ">" : active ? ">" : " "}
              </span>
              <span
                className={`${
                  completed
                    ? "text-[#555555]"
                    : active
                    ? "text-[#e8e8e8]"
                    : "text-[#333]"
                }`}
              >
                {message}
              </span>
              {completed && (
                <span className="ml-auto text-[#00e676] text-xs">done</span>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 border border-[#ff1744] bg-[#0d0d0d] p-4">
          <p className="font-[family-name:var(--font-mono)] text-sm text-[#ff1744] mb-3">
            {error}
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-wider border border-[#ff1744] text-[#ff1744] hover:bg-[#ff1744] hover:text-[#050505] transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
