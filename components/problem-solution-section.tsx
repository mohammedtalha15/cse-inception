"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  Clock,
  MessageCircle,
  ShieldAlert,
  TrendingDown,
  Zap,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const FAILURES = [
  {
    icon: TrendingDown,
    title: "Glucose in isolation",
    body: "CGMs show a number, not the rate of change or what else is happening in your day.",
  },
  {
    icon: Clock,
    title: "Alerts after the fact",
    body: "Threshold alarms fire when you are already low — the preventive window is gone.",
  },
  {
    icon: ShieldAlert,
    title: "No context",
    body: "Meals, insulin timing, activity, and sleep change risk — most systems ignore them.",
  },
  {
    icon: MessageCircle,
    title: "No explainability",
    body: "Generic buzzes do not say why risk rose or what to do next.",
  },
] as const;

const SOLUTIONS = [
  {
    icon: Zap,
    title: "Predictive risk",
    body: "Hybrid rule + model score plus time-to-threshold from trend — see danger forming early.",
  },
  {
    icon: Activity,
    title: "Full context",
    body: "Every reading carries meals, insulin, activity, and time of day — aligned with your saved profile.",
  },
  {
    icon: Brain,
    title: "Transparent factors",
    body: "Each +point maps to a plain-language reason you can audit and trust.",
  },
  {
    icon: MessageCircle,
    title: "Actionable language",
    body: "Above the alert line, Gemini turns the signal into calm, short guidance — not jargon.",
  },
] as const;

export function ProblemSolutionSection() {
  return (
    <section
      id="problem"
      className="w-full scroll-mt-24 border-y-2 border-foreground bg-card/40 px-6 py-20 backdrop-blur-sm lg:px-12"
    >
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto mb-12 max-w-5xl"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {"// PROBLEM_STATEMENT.md"}
        </span>
        <h2 className="mt-3 font-mono text-2xl font-bold uppercase tracking-tight text-foreground md:text-3xl lg:text-4xl">
          Reactive monitoring fails people with diabetes
        </h2>
        <p className="mt-4 max-w-3xl font-mono text-sm leading-relaxed text-muted-foreground md:text-base">
          Hypoglycemia is dangerous and often <span className="text-foreground">unpredictable</span> when
          you only react to a single glucose snapshot. Sugarfree is built to shift care from{" "}
          <span className="text-destructive line-through decoration-foreground/40">after the low</span>{" "}
          to <span className="text-accent">before the crisis</span> — using context, trend, and clear
          explanations so intervention can happen in time.
        </p>
      </motion.div>

      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease }}
          className="border-2 border-foreground bg-background p-6 md:p-8"
        >
          <h3 className="mb-6 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-2 w-2 bg-destructive" />
            Why current systems fail
          </h3>
          <ul className="space-y-6">
            {FAILURES.map((f, i) => (
              <motion.li
                key={f.title}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4, ease }}
                className="flex gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-foreground/30 bg-muted/30">
                  <f.icon size={18} strokeWidth={1.5} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-tight text-foreground">
                    {f.title}
                  </p>
                  <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, delay: 0.08, ease }}
          className="border-2 border-foreground bg-foreground p-6 text-background md:p-8"
        >
          <h3 className="mb-6 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-background/70">
            <span className="inline-block h-2 w-2 bg-accent" />
            How Sugarfree addresses it
          </h3>
          <ul className="space-y-6">
            {SOLUTIONS.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, x: 8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4, ease }}
                className="flex gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-background/30 bg-background/10">
                  <s.icon size={18} strokeWidth={1.5} className="text-accent" />
                </div>
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-tight">{s.title}</p>
                  <p className="mt-1 font-mono text-xs leading-relaxed text-background/75">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.15, ease }}
        className="mx-auto mt-14 max-w-5xl border-2 border-dashed border-border bg-muted/20 p-6 md:p-8"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Impact
        </p>
        <p className="mt-3 font-mono text-sm leading-relaxed text-foreground md:text-base">
          Fewer surprise lows, safer nights, and clearer decisions — a foundation for the next generation
          of <span className="text-accent">context-aware</span>,{" "}
          <span className="text-accent">predictive</span> digital health systems that pair devices you
          already wear with intelligence that respects clinical reality.
        </p>
      </motion.div>
    </section>
  );
}
