"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Reading } from "@/lib/types";
import { riskBucket } from "@/lib/risk";

type Row = {
  label: string;
  gSafe: number | null;
  gWatch: number | null;
  gAlert: number | null;
  gFuture: number | null;
};

function bucket(h: number) {
  return riskBucket(h);
}

function buildRows(readings: Reading[], futureSteps = 10): Row[] {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const rows: Row[] = sorted.map((r) => {
    const d = new Date(r.timestamp);
    const label = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const b = bucket(r.hybrid_score);
    const g = r.glucose_mgdl;
    return {
      label,
      gSafe: b === "safe" ? g : null,
      gWatch: b === "watch" ? g : null,
      gAlert: b === "alert" ? g : null,
      gFuture: null,
    };
  });

  if (sorted.length === 0) return rows;

  const last = sorted[sorted.length - 1];
  let g = last.glucose_mgdl;
  const trend = last.glucose_trend;
  let t = new Date(last.timestamp).getTime();

  for (let i = 1; i <= futureSteps; i++) {
    t += 5 * 60 * 1000;
    g += trend * 5;
    const label = new Date(t).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    rows.push({
      label,
      gSafe: null,
      gWatch: null,
      gAlert: null,
      gFuture: Math.max(40, Math.min(260, g)),
    });
  }

  return rows;
}

export function GlucoseChart({ readings }: { readings: Reading[] }) {
  const data = buildRows(readings);

  if (readings.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center border-2 border-dashed border-border bg-muted/20 font-mono text-xs text-muted-foreground">
        No samples yet — log vitals for this patient or use the live stream.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="relative h-[300px] w-full min-w-0">
        <span
          className="pointer-events-none absolute left-0 top-1/2 z-[1] -translate-y-1/2 pl-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"
          style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)" }}
          aria-hidden
        >
          mg/dL
        </span>
        <div className="h-full w-full pl-7">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: 4, bottom: 4 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["dataMin - 12", "dataMax + 12"]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "2px solid hsl(var(--foreground))",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 11,
                }}
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return Number.isFinite(n) ? `${Math.round(n)} mg/dL` : "";
                }}
                labelFormatter={(l) => l}
              />
              <Line
                type="monotone"
                dataKey="gSafe"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="gWatch"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="gAlert"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="gFuture"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="relative z-10 mt-3 border-t border-border bg-background pt-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 shrink-0 bg-green-500" /> Safe
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 shrink-0 bg-amber-500" /> Watch
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 shrink-0 bg-red-500" /> Alert
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 shrink-0 border-t-2 border-dashed border-accent" />{" "}
            Forecast
          </span>
        </div>
      </div>
    </div>
  );
}
