"use client";

import { motion } from "framer-motion";

export function DualAiStrip({
  rule,
  ml,
  hybrid,
}: {
  rule: number | null;
  ml: number | null;
  hybrid: number | null;
}) {
  const dash = rule === null ? "—" : null;
  return (
    <div className="grid grid-cols-3 gap-0 border-2 border-foreground font-mono text-xs">
      <motion.div
        key={rule ?? "e"}
        initial={{ backgroundColor: "hsl(var(--muted))" }}
        animate={{ backgroundColor: "transparent" }}
        className="border-b-2 border-foreground p-3 md:border-b-0 md:border-r-2"
      >
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Rule engine
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {dash ?? rule}
        </p>
      </motion.div>
      <div className="border-b-2 border-foreground p-3 md:border-b-0 md:border-r-2">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          ML head (demo)
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{dash ?? ml}</p>
      </div>
      <div className="p-3">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Final hybrid
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-accent">{dash ?? hybrid}</p>
      </div>
    </div>
  );
}
