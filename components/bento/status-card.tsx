"use client";

import { useEffect, useState } from "react";

const SCENARIOS = [
  { name: "POST_EXERCISE", status: "WATCH", note: "↓ trend" },
  { name: "NIGHT_INSULIN", status: "WATCH", note: "IOB" },
  { name: "SKIPPED_MEAL", status: "ARMED", note: "gap>3h" },
  { name: "STEADY_BASELINE", status: "OK", note: "flat" },
];

export function StatusCard() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          scenarios.engine
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {`TICK:${String(tick).padStart(4, "0")}`}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-0 p-4">
        <div className="mb-2 grid grid-cols-3 gap-2 border-b border-border pb-2">
          <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            Scenario
          </span>
          <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            State
          </span>
          <span className="text-right text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            Hint
          </span>
        </div>
        {SCENARIOS.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-3 gap-2 border-b border-border py-2 last:border-none"
          >
            <span className="font-mono text-xs text-foreground">{row.name}</span>
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5"
                style={{
                  backgroundColor:
                    row.status === "ARMED"
                      ? "#ea580c"
                      : row.status === "WATCH"
                        ? "#f59e0b"
                        : "hsl(var(--muted-foreground))",
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">{row.status}</span>
            </div>
            <span className="text-right font-mono text-xs text-foreground">{row.note}</span>
          </div>
        ))}
        <div className="mt-auto pt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Simulator throughput
            </span>
            <span className="font-mono text-[9px] text-foreground">12 Hz</span>
          </div>
          <div className="h-2 w-full border border-foreground">
            <div className="h-full bg-foreground" style={{ width: "72%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
