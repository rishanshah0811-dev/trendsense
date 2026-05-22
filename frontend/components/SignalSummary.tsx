"use client";

import { SignalSummary as SignalSummaryType } from "@/lib/types";

interface SignalSummaryProps {
  summary: SignalSummaryType;
}

export default function SignalSummary({ summary }: SignalSummaryProps) {
  const cards = [
    {
      label: "Total Signals",
      value: summary.total_signals,
      sub: `${summary.buy_signals} buy / ${summary.sell_signals} sell`,
      color: "#e8e8e8",
    },
    {
      label: "Win Rate",
      value: `${Math.round(summary.win_rate * 100)}%`,
      sub: `${summary.correct_signals} correct`,
      color: summary.win_rate >= 0.5 ? "#00e676" : "#ff1744",
    },
    {
      label: "Avg Confidence",
      value: `${Math.round(summary.avg_confidence * 100)}%`,
      sub: "mean probability",
      color: "#ffab00",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border border-[#1a1a1a] bg-[#0d0d0d] p-4"
        >
          <p className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-[#555555] mb-1">
            {card.label}
          </p>
          <p
            className="font-[family-name:var(--font-mono)] text-2xl font-bold"
            style={{ color: card.color }}
          >
            {card.value}
          </p>
          <p className="font-[family-name:var(--font-mono)] text-xs text-[#555555] mt-1">
            {card.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
