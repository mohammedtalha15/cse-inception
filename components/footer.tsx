"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const FOOTER_LINKS = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Status", href: "#" },
  { label: "GitHub", href: "#" },
];

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease }}
      className="w-full border-t-2 border-foreground px-6 py-8 lg:px-12"
    >
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
            AYUQ
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            Context-aware hypoglycemia risk intelligence · demo UI
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          {FOOTER_LINKS.map((link, i) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease }}
            >
              <Link
                href={link.href}
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.footer>
  );
}
