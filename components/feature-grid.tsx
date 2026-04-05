"use client";

import { TerminalCard } from "@/components/bento/terminal-card";
import { DitherCard } from "@/components/bento/dither-card";
import { MetricsCard } from "@/components/bento/metrics-card";
import { StatusCard } from "@/components/bento/status-card";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.6, ease },
  }),
};

export function FeatureGrid() {
  return (
    <section id="product" className="w-full px-6 py-20 lg:px-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex items-center gap-4"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {"// SECTION: LIVE_STACK"}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          002
        </span>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid grid-cols-1 border-2 border-foreground md:grid-cols-2"
      >
        <motion.div
          custom={0}
          variants={cardVariants}
          className="min-h-[280px] border-b-2 border-foreground md:border-b-0 md:border-r-2"
        >
          <TerminalCard />
        </motion.div>

        <motion.div
          custom={1}
          variants={cardVariants}
          className="min-h-[280px] border-b-2 border-foreground md:border-b-0"
        >
          <DitherCard />
        </motion.div>

        <motion.div
          custom={2}
          variants={cardVariants}
          className="min-h-[280px] border-t-2 border-r-2 border-foreground"
        >
          <MetricsCard />
        </motion.div>

        <motion.div
          custom={3}
          variants={cardVariants}
          className="min-h-[280px] border-t-2 border-foreground"
        >
          <StatusCard />
        </motion.div>
      </motion.div>
    </section>
  );
}
