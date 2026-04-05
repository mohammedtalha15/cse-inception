"use client";

import Link from "next/link";
import { WorkflowDiagram } from "@/components/workflow-diagram";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative w-full px-6 pb-12 pt-6 lg:px-24 lg:pb-16 lg:pt-10">
      <div className="flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="font-pixel mb-2 select-none text-4xl tracking-tight text-foreground sm:text-6xl lg:text-7xl xl:text-8xl"
        >
          PREDICT. EXPLAIN.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="my-4 w-full max-w-2xl lg:my-6"
        >
          <WorkflowDiagram />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
          className="font-pixel mb-4 select-none text-4xl tracking-tight text-foreground sm:text-6xl lg:text-7xl xl:text-8xl"
          aria-hidden="true"
        >
          PROTECT.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
          className="mb-6 max-w-lg text-xs leading-relaxed text-muted-foreground lg:text-sm font-mono"
        >
          <strong className="text-foreground">Ayuq</strong> moves diabetes support from reactive CGM
          thresholds to <strong className="text-foreground">predictive, context-aware</strong>{" "}
          intelligence: trend, meals, insulin, activity, time of day — plus your saved habits — so
          risk surfaces <strong className="text-accent">before</strong> a low, with factor-by-factor
          transparency and Claude explanations when escalation matters.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease }}
        >
          <Link href="/enter-data" className="group inline-flex items-center gap-0 bg-foreground text-sm font-mono uppercase tracking-wider text-background">
            <span className="flex h-10 w-10 items-center justify-center bg-[#ea580c]">
              <motion.span
                className="inline-flex"
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <ArrowRight size={16} strokeWidth={2} className="text-background" />
              </motion.span>
            </span>
            <span className="px-5 py-2.5">Enter vitals</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
