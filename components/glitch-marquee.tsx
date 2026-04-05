"use client";

import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const STRIP = [
  "GLUCOSE_TREND",
  "CONTEXT",
  "FASTAPI",
  "GEMINI",
  "HYBRID_SCORE",
  "EDGE",
  "OBSERVABILITY",
  "SIMULATOR",
  "RULES",
  "ML_HEAD",
  "ALERTS",
];

function LogoBlock({ name, glitch }: { name: string; glitch: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center border-r-2 border-foreground px-8 py-4 ${
        glitch ? "animate-glitch" : ""
      }`}
    >
      <span className="whitespace-nowrap font-mono text-sm uppercase tracking-[0.15em] text-foreground">
        {name}
      </span>
    </div>
  );
}

export function GlitchMarquee() {
  const glitchIndices = [2, 7];

  return (
    <section className="w-full px-6 py-16 lg:px-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex items-center gap-4"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {"// SIGNALS: DATA_PLANE"}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          005
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.6, ease }}
        className="overflow-hidden border-2 border-foreground"
      >
        <div className="flex animate-marquee" style={{ width: "max-content" }}>
          {[...STRIP, ...STRIP].map((name, i) => (
            <LogoBlock
              key={`${name}-${i}`}
              name={name}
              glitch={glitchIndices.includes(i % STRIP.length)}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
