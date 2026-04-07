"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Minus } from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

function ScramblePrice({ target, prefix = "" }: { target: string; prefix?: string }) {
  const [display, setDisplay] = useState(target.replace(/[0-9]/g, "0"));

  useEffect(() => {
    let iterations = 0;
    const maxIterations = 18;
    const interval = setInterval(() => {
      if (iterations >= maxIterations) {
        setDisplay(target);
        clearInterval(interval);
        return;
      }
      setDisplay(
        target
          .split("")
          .map((char, i) => {
            if (!/[0-9]/.test(char)) return char;
            if (iterations > maxIterations - 5 && i < iterations - (maxIterations - 5))
              return char;
            return String(Math.floor(Math.random() * 10));
          })
          .join(""),
      );
      iterations++;
    }, 50);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <span className="font-mono font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display}
    </span>
  );
}

function StatusLine() {
  const [load, setLoad] = useState("0.0");

  useEffect(() => {
    const interval = setInterval(() => {
      setLoad((Math.random() * 15 + 8).toFixed(1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <span className="h-1.5 w-1.5 bg-[#ea580c]" />
      <span>api load: {load}%</span>
    </div>
  );
}

function BlinkDot() {
  return <span className="inline-block h-2 w-2 animate-blink bg-[#ea580c]" />;
}

interface Tier {
  id: string;
  name: string;
  price: string;
  period: string;
  tag: string | null;
  description: string;
  features: { text: string; included: boolean }[];
  cta: string;
  href: string;
  highlighted: boolean;
}

const TIERS: Tier[] = [
  {
    id: "observer",
    name: "OBSERVER",
    price: "0",
    period: "/ month",
    tag: null,
    description: "Simulated vitals, dashboard, and risk bands for demos and coursework.",
    features: [
      { text: "5s simulator + POST /reading", included: true },
      { text: "Rule + hybrid score view", included: true },
      { text: "24h history strip", included: true },
      { text: "Gemini explanations", included: false },
      { text: "Multi-patient", included: false },
      { text: "HIPAA / BAA", included: false },
    ],
    cta: "Open demo",
    href: "/dashboard",
    highlighted: false,
  },
  {
    id: "clinical",
    name: "CARE_TEAM",
    price: "999",
    period: "/ month",
    tag: "RECOMMENDED",
    description: "Alerts, AI narratives on high risk, and profile capture for real workflows.",
    features: [
      { text: "Everything in Observer", included: true },
      { text: "GET /alerts + explain cards", included: true },
      { text: "Gemini when risk > 50", included: true },
      { text: "POST /profile habits", included: true },
      { text: "Email / webhook hooks", included: true },
      { text: "On-prem option", included: false },
    ],
    cta: "Talk to us",
    href: "/enter-data",
    highlighted: true,
  },
  {
    id: "research",
    name: "LAB",
    price: "CUSTOM",
    period: "",
    tag: null,
    description: "Custom ML heads, air-gapped deploy, and dedicated scenario authoring.",
    features: [
      { text: "Custom model integration", included: true },
      { text: "Dataset export + labeling", included: true },
      { text: "SLA + security review", included: true },
      { text: "White-label UI", included: true },
      { text: "On-prem or VPC", included: true },
      { text: "Dedicated support", included: true },
    ],
    cta: "Contact research",
    href: "/profile",
    highlighted: false,
  },
];

function PricingCard({ tier, index }: { tier: Tier; index: number }) {
  const isCustom = tier.price === "CUSTOM";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.12, duration: 0.6, ease }}
      className={`flex h-full flex-col ${
        tier.highlighted
          ? "border-2 border-foreground bg-foreground text-background"
          : "border-2 border-foreground bg-background text-foreground"
      }`}
    >
      <div
        className={`flex items-center justify-between border-b-2 px-5 py-3 ${
          tier.highlighted ? "border-background/20" : "border-foreground"
        }`}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{tier.name}</span>
        <div className="flex items-center gap-2">
          {tier.tag && (
            <span className="bg-[#ea580c] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-background">
              {tier.tag}
            </span>
          )}
          <span className="font-mono text-[10px] opacity-50">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="px-5 pb-4 pt-6">
        <div className="flex items-baseline gap-1">
          {isCustom ? (
            <span className="font-mono text-3xl font-bold tracking-tight lg:text-4xl">CUSTOM</span>
          ) : (
            <span className="text-3xl lg:text-4xl">
              <ScramblePrice target={tier.price} prefix="₹" />
            </span>
          )}
          {tier.period && (
            <span
              className={`font-mono text-xs uppercase tracking-widest ${
                tier.highlighted ? "text-background/50" : "text-muted-foreground"
              }`}
            >
              {tier.period}
            </span>
          )}
        </div>
        <p
          className={`mt-3 font-mono text-xs leading-relaxed ${
            tier.highlighted ? "text-background/60" : "text-muted-foreground"
          }`}
        >
          {tier.description}
        </p>
      </div>

      <div
        className={`flex-1 border-t-2 px-5 py-4 ${
          tier.highlighted ? "border-background/20" : "border-foreground"
        }`}
      >
        <div className="flex flex-col gap-3">
          {tier.features.map((feature, fi) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 + 0.3 + fi * 0.04, duration: 0.35, ease }}
              className="flex items-start gap-3"
            >
              {feature.included ? (
                <Check size={12} strokeWidth={2.5} className="mt-0.5 shrink-0 text-[#ea580c]" />
              ) : (
                <Minus
                  size={12}
                  strokeWidth={2}
                  className={`mt-0.5 shrink-0 ${
                    tier.highlighted ? "text-background/30" : "text-muted-foreground/40"
                  }`}
                />
              )}
              <span
                className={`font-mono text-xs leading-relaxed ${
                  feature.included
                    ? ""
                    : tier.highlighted
                      ? "text-background/30 line-through"
                      : "text-muted-foreground/40 line-through"
                }`}
              >
                {feature.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5 pt-3">
        <Link href={tier.href} className="block">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`group flex w-full items-center justify-center gap-0 font-mono text-xs uppercase tracking-wider ${
              tier.highlighted
                ? "bg-background text-foreground"
                : "bg-foreground text-background"
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center bg-[#ea580c]">
              <ArrowRight size={14} strokeWidth={2} className="text-background" />
            </span>
            <span className="flex-1 py-2.5">{tier.cta}</span>
          </motion.span>
        </Link>
      </div>
    </motion.div>
  );
}

export function PricingSection() {
  return (
    <section className="w-full px-6 py-20 lg:px-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex items-center gap-4"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {"// SECTION: DEPLOYMENT_MODES"}
        </span>
        <div className="flex-1 border-t border-border" />
        <BlinkDot />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          004
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease }}
        className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="flex max-w-lg flex-col gap-3">
          <h2 className="text-balance font-mono text-2xl font-bold uppercase tracking-tight text-foreground lg:text-3xl">
            Pick how you run Sugarfree
          </h2>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground lg:text-sm">
            Same core engine — simulator, hybrid risk, optional Gemini layer — packaged for demos,
            clinical pilots, or research environments. Adjust copy and endpoints to match your IRB or
            ops review.
          </p>
        </div>
        <StatusLine />
      </motion.div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
        {TIERS.map((tier, i) => (
          <PricingCard key={tier.id} tier={tier} index={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="mt-6 flex items-center gap-3"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          * Not a medical device. For research and decision support unless cleared for your
          jurisdiction.
        </span>
        <div className="flex-1 border-t border-border" />
      </motion.div>
    </section>
  );
}
