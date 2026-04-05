"use client";

import { motion } from "framer-motion";
import { LogIn } from "lucide-react";

export function GoogleAuthButton() {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 border border-foreground/20 bg-background/50 px-3 py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:border-foreground/40 hover:text-foreground"
    >
      <LogIn size={14} strokeWidth={1.5} />
      <span>Sign in</span>
    </motion.button>
  );
}
