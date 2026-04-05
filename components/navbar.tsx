"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/#problem", label: "Why Ayuq" },
  { href: "/#product", label: "Product" },
  { href: "/enter-data", label: "Enter Data" },
  { href: "/dashboard", label: "Live Dashboard" },
  { href: "/alerts", label: "Alerts & AI" },
  { href: "/profile", label: "Profile" },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

export function Navbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="w-full px-4 pt-4 lg:px-6 lg:pt-6"
    >
      <nav className="w-full border border-foreground/20 bg-background/80 px-6 py-3 backdrop-blur-sm lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex shrink-0 items-center gap-3"
          >
            <Activity size={16} strokeWidth={1.5} className="text-accent" />
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-[0.15em] font-mono"
            >
              AYUQ
            </Link>
          </motion.div>

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="flex items-center gap-6 lg:gap-8">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease }}
                >
                  <Link
                    href={link.href}
                    className="whitespace-nowrap text-xs font-mono uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex shrink-0 items-center gap-3 lg:gap-4"
          >
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="hidden text-xs font-mono uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Sign In
            </Link>
            <Link href="/enter-data">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-block bg-foreground px-3 py-2 text-xs font-mono uppercase tracking-widest text-background"
              >
                Start
              </motion.span>
            </Link>
          </motion.div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/50 pt-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </motion.div>
  );
}
