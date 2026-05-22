"use client";

import { Metrics } from "@/lib/types";

interface ModelMetricsProps {
  metrics: Metrics;
}

export default function ModelMetrics({ metrics }: ModelMetricsProps) {
  const report = metrics.classification_report;
  const classNames = Object.keys(report).filter(
    (k) => !["accuracy", "macro avg", "weighted avg"].includes(k)
  );

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-4">
        Model Performance
      </h3>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Test Acc", value: metrics.test_accuracy },
          { label: "Test F1", value: metrics.test_f1 },
          { label: "Val Acc", value: metrics.val_accuracy },
          { label: "Val F1", value: metrics.val_f1 },
        ].map((m) => (
          <div key={m.label} className="text-center">
            <p className="font-[family-name:var(--font-mono)] text-xl font-bold text-[#e8e8e8]">
              {(m.value * 100).toFixed(1)}%
            </p>
            <p className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-[#555555] mt-1">
              {m.label}
            </p>
          </div>
        ))}
      </div>

      <table className="w-full font-[family-name:var(--font-mono)] text-xs">
        <thead>
          <tr className="text-[#555555] border-b border-[#1a1a1a]">
            <th className="text-left py-2 font-normal">Class</th>
            <th className="text-right py-2 font-normal">Precision</th>
            <th className="text-right py-2 font-normal">Recall</th>
            <th className="text-right py-2 font-normal">F1</th>
            <th className="text-right py-2 font-normal">Support</th>
          </tr>
        </thead>
        <tbody>
          {classNames.map((cls) => {
            const row = report[cls];
            if (!row || typeof row.precision !== "number") return null;
            const precisionColor =
              row.precision >= 0.7
                ? "#00e676"
                : row.precision >= 0.5
                ? "#ffab00"
                : "#ff1744";
            const recallColor =
              row.recall >= 0.7
                ? "#00e676"
                : row.recall >= 0.5
                ? "#ffab00"
                : "#ff1744";

            return (
              <tr key={cls} className="border-b border-[#1a1a1a]">
                <td className="py-2 text-[#e8e8e8]">{cls}</td>
                <td className="py-2 text-right" style={{ color: precisionColor }}>
                  {(row.precision * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right" style={{ color: recallColor }}>
                  {(row.recall * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right text-[#e8e8e8]">
                  {(row["f1-score"] * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right text-[#555555]">
                  {row.support}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
