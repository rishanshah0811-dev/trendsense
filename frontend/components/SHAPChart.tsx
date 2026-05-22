"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { SHAPItem } from "@/lib/types";

interface SHAPChartProps {
  data: SHAPItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  momentum: "#ffab00",
  trend: "#448aff",
  volatility: "#aa00ff",
  volume: "#00e676",
  other: "#555555",
};

export default function SHAPChart({ data }: SHAPChartProps) {
  const sorted = [...data].sort((a, b) => a.importance - b.importance);

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider text-[#555555]">
          Feature Importance (SHAP)
        </h3>
        <div className="flex items-center gap-3">
          {Object.entries(CATEGORY_COLORS)
            .filter(([k]) => k !== "other")
            .map(([cat, color]) => (
              <span
                key={cat}
                className="flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] text-[#555555]"
              >
                <span
                  className="w-2 h-2 inline-block"
                  style={{ backgroundColor: color }}
                />
                {cat}
              </span>
            ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 60, bottom: 0 }}
        >
          <CartesianGrid stroke="#1a1a1a" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#555555", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            stroke="#1a1a1a"
          />
          <YAxis
            dataKey="feature"
            type="category"
            tick={{ fill: "#e8e8e8", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            stroke="#1a1a1a"
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0d0d0d",
              border: "1px solid #1a1a1a",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: "#e8e8e8",
            }}
            formatter={(value) => [Number(value).toFixed(6), "SHAP"]}
          />
          <Bar dataKey="importance" radius={[0, 2, 2, 0]}>
            {sorted.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
