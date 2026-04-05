"use client";

import { motion } from "framer-motion";

export function DualAiStrip({
  rule,
  ml,
  hybrid,
}: {
  rule: number;
  ml: number;
  hybrid: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-0 border-2 border-foreground font-mono text-xs">
      <motion.div
        key={rule}
        initial={{ backgroundColor: "hsl(var(--muted))" }}
        animate={{ backgroundColor: "transparent" }}
        className="border-b-2 border-foreground p-3 md:border-b-0 md:border-r-2"
      >
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Rule engine
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{rule}</p>
      </motion.div>
      <div className="border-b-2 border-foreground p-3 md:border-b-0 md:border-r-2">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          ML head (demo)
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{ml}</p>
      </div>
      <div className="p-3">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Final hybrid
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-accent">{hybrid}</p>
      </div>
    </div>
  );
}
