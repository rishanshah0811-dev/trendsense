"use client";

interface ThresholdSliderProps {
  bullishThreshold: number;
  bearishThreshold: number;
  onBullishChange: (value: number) => void;
  onBearishChange: (value: number) => void;
}

export default function ThresholdSlider({
  bullishThreshold,
  bearishThreshold,
  onBullishChange,
  onBearishChange,
}: ThresholdSliderProps) {
  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-4">
        Confidence Thresholds
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-[family-name:var(--font-display)] text-xs text-[#555555] uppercase tracking-wider">
              Bullish
            </span>
            <span className="font-[family-name:var(--font-mono)] text-sm text-[#00e676]">
              {Math.round(bullishThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.40"
            max="0.75"
            step="0.01"
            value={bullishThreshold}
            onChange={(e) => onBullishChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-[family-name:var(--font-display)] text-xs text-[#555555] uppercase tracking-wider">
              Bearish
            </span>
            <span className="font-[family-name:var(--font-mono)] text-sm text-[#ff1744]">
              {Math.round(bearishThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.40"
            max="0.75"
            step="0.01"
            value={bearishThreshold}
            onChange={(e) => onBearishChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
