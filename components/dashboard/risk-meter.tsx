"use client";

import { motion } from "framer-motion";
import { riskBucket } from "@/lib/risk";

export function RiskMeter({ score }: { score: number | null }) {
  const empty = score === null;
  const safeScore = empty ? 0 : score;
  const b = empty ? ("safe" as const) : riskBucket(safeScore);
  const bar =
    b === "safe"
      ? "bg-green-500"
      : b === "watch"
        ? "bg-amber-500"
        : "bg-red-500";
  const glow = empty
    ? "shadow-none"
    : b === "safe"
      ? "shadow-[0_0_40px_rgba(34,197,94,0.25)]"
      : b === "watch"
        ? "shadow-[0_0_48px_rgba(245,158,11,0.35)]"
        : "shadow-[0_0_56px_rgba(239,68,68,0.45)]";

  return (
    <div
      className={`relative overflow-hidden border-2 border-foreground bg-card p-4 transition-shadow duration-500 ${glow}`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Hybrid risk
          </p>
          {empty ? (
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-muted-foreground">
              No readings
            </p>
          ) : (
            <motion.p
              key={safeScore}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-4xl font-bold tabular-nums tracking-tight"
            >
              {safeScore}
              <span className="text-lg text-muted-foreground">/100</span>
            </motion.p>
          )}
        </div>
        <span
          className={`border-2 border-foreground px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
            empty
              ? "bg-muted text-muted-foreground"
              : b === "safe"
                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                : b === "watch"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "bg-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {empty ? "—" : b}
        </span>
      </div>
      <div className="mt-4 h-3 w-full border border-foreground/40 bg-muted/40">
        <motion.div
          className={`h-full ${empty ? "bg-transparent" : bar}`}
          initial={false}
          animate={{ width: empty ? "0%" : `${Math.min(100, safeScore)}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}
