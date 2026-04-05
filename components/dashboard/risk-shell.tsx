"use client";

import { useEffect, useRef } from "react";
import { riskBucket } from "@/lib/risk";

export function RiskShell({
  hybridScore,
  children,
}: {
  hybridScore: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const b = riskBucket(hybridScore);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--risk-hybrid", String(hybridScore));
    el.dataset.risk = b;
  }, [hybridScore, b]);

  return (
    <div
      ref={ref}
      data-risk={b}
      className="risk-atmosphere transition-[box-shadow] duration-700 ease-out"
    >
      {children}
    </div>
  );
}
