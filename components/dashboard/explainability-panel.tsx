"use client";

import { motion } from "framer-motion";
import type { RiskFactor } from "@/lib/types";

export function ExplainabilityPanel({ factors }: { factors: RiskFactor[] }) {
  if (!factors.length) {
    return (
      <div className="border-2 border-dashed border-border bg-muted/10 p-4 font-mono text-xs text-muted-foreground">
        No risk contributors at this moment — context looks stable relative to rules.
      </div>
    );
  }

  const max = Math.max(...factors.map((f) => f.points), 1);

  return (
    <div className="space-y-3 border-2 border-foreground bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Why this score — factor breakdown
      </p>
      <ul className="space-y-3">
        {factors.map((f, i) => (
          <motion.li
            key={`${f.key}-${i}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="space-y-1"
          >
            <div className="flex justify-between gap-2 font-mono text-[11px]">
              <span className="leading-snug text-foreground">{f.label}</span>
              <span className="shrink-0 tabular-nums text-accent">+{f.points}</span>
            </div>
            <div className="h-1.5 w-full bg-muted">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(f.points / max) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
