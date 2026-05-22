"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Metrics } from "@/lib/types";

interface ROCChartProps {
  metrics: Metrics;
}

export default function ROCChart({ metrics }: ROCChartProps) {
  const { roc_data } = metrics;

  const maxLen = Math.max(
    roc_data.class_0?.fpr.length || 0,
    roc_data.class_1?.fpr.length || 0,
    roc_data.class_2?.fpr.length || 0
  );

  const chartData = [];

  for (let i = 0; i < maxLen; i++) {
    const point: Record<string, number | undefined> = {};

    if (roc_data.class_0 && i < roc_data.class_0.fpr.length) {
      point.fpr0 = roc_data.class_0.fpr[i];
      point.tpr0 = roc_data.class_0.tpr[i];
    }
    if (roc_data.class_1 && i < roc_data.class_1.fpr.length) {
      point.fpr1 = roc_data.class_1.fpr[i];
      point.tpr1 = roc_data.class_1.tpr[i];
    }
    if (roc_data.class_2 && i < roc_data.class_2.fpr.length) {
      point.fpr2 = roc_data.class_2.fpr[i];
      point.tpr2 = roc_data.class_2.tpr[i];
    }

    chartData.push(point);
  }

  const class0Data = roc_data.class_0
    ? roc_data.class_0.fpr.map((fpr, i) => ({
        fpr,
        tpr: roc_data.class_0!.tpr[i],
      }))
    : [];
  const class1Data = roc_data.class_1
    ? roc_data.class_1.fpr.map((fpr, i) => ({
        fpr,
        tpr: roc_data.class_1!.tpr[i],
      }))
    : [];
  const class2Data = roc_data.class_2
    ? roc_data.class_2.fpr.map((fpr, i) => ({
        fpr,
        tpr: roc_data.class_2!.tpr[i],
      }))
    : [];

  const diagonalData = [
    { fpr: 0, tpr: 0 },
    { fpr: 1, tpr: 1 },
  ];

  const combined = [
    ...class0Data.map((d) => ({ ...d, c0: d.tpr })),
    ...class1Data.map((d) => ({ ...d, c1: d.tpr })),
    ...class2Data.map((d) => ({ ...d, c2: d.tpr })),
  ];

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555] mb-4">
        ROC Curves
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#1a1a1a" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            tick={{ fill: "#555555", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            stroke="#1a1a1a"
            label={{ value: "FPR", position: "bottom", fill: "#555555", fontSize: 10 }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tick={{ fill: "#555555", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            stroke="#1a1a1a"
            label={{ value: "TPR", angle: -90, position: "insideLeft", fill: "#555555", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0d0d0d",
              border: "1px solid #1a1a1a",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: "#e8e8e8",
            }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
            }}
          />
          <Line
            data={diagonalData}
            dataKey="tpr"
            stroke="#333"
            strokeDasharray="4 4"
            dot={false}
            name="Random"
            legendType="none"
          />
          {class0Data.length > 0 && (
            <Line
              data={class0Data}
              dataKey="tpr"
              stroke="#555555"
              strokeWidth={2}
              dot={false}
              name={`Ranging (AUC: ${roc_data.class_0?.auc.toFixed(3)})`}
            />
          )}
          {class1Data.length > 0 && (
            <Line
              data={class1Data}
              dataKey="tpr"
              stroke="#ff1744"
              strokeWidth={2}
              dot={false}
              name={`Bearish (AUC: ${roc_data.class_1?.auc.toFixed(3)})`}
            />
          )}
          {class2Data.length > 0 && (
            <Line
              data={class2Data}
              dataKey="tpr"
              stroke="#00e676"
              strokeWidth={2}
              dot={false}
              name={`Bullish (AUC: ${roc_data.class_2?.auc.toFixed(3)})`}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
