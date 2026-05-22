"use client";

import { Signal } from "@/lib/types";

interface SignalsTableProps {
  signals: Signal[];
}

export default function SignalsTable({ signals }: SignalsTableProps) {
  const recent = signals.slice(-10).reverse();

  if (recent.length === 0) {
    return (
      <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4">
        <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-4">
          Recent Signals
        </h3>
        <p className="font-[family-name:var(--font-mono)] text-sm text-[#555555]">
          No signals meet this confidence threshold. Try lowering the threshold.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-4">
        Recent Signals
      </h3>
      <table className="w-full font-[family-name:var(--font-mono)] text-xs">
        <thead>
          <tr className="text-[#555555] border-b border-[#1a1a1a]">
            <th className="text-left py-2 font-normal">Date</th>
            <th className="text-left py-2 font-normal">Type</th>
            <th className="text-left py-2 font-normal">Confidence</th>
            <th className="text-right py-2 font-normal">Price</th>
            <th className="text-right py-2 font-normal">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((sig, i) => (
            <tr key={`${sig.date}-${i}`} className="border-b border-[#1a1a1a]">
              <td className="py-2 text-[#e8e8e8]">{sig.date}</td>
              <td className="py-2">
                <span
                  className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color:
                      sig.signal_type === "BUY" ? "#050505" : "#050505",
                    backgroundColor:
                      sig.signal_type === "BUY" ? "#00e676" : "#ff1744",
                  }}
                >
                  {sig.signal_type}
                </span>
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-[#1a1a1a] overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${sig.confidence * 100}%`,
                        backgroundColor:
                          sig.signal_type === "BUY" ? "#00e676" : "#ff1744",
                      }}
                    />
                  </div>
                  <span className="text-[#e8e8e8]">
                    {Math.round(sig.confidence * 100)}%
                  </span>
                </div>
              </td>
              <td className="py-2 text-right text-[#e8e8e8]">
                ${sig.price.toFixed(2)}
              </td>
              <td className="py-2 text-right">
                {sig.outcome === "correct" && (
                  <span className="text-[#00e676]">correct</span>
                )}
                {sig.outcome === "incorrect" && (
                  <span className="text-[#ff1744]">incorrect</span>
                )}
                {sig.outcome === "pending" && (
                  <span className="text-[#555555]">pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
