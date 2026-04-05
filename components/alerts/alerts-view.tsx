"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { fetchAlerts } from "@/lib/api";
import type { AlertItem } from "@/lib/types";

const PATIENTS = ["P001", "P002", "P003"] as const;

function band(score: number) {
  if (score <= 60) return { label: "Early / watch", emoji: "⚠️", cls: "border-amber-500/50 bg-amber-500/10" };
  return { label: "Critical", emoji: "🚨", cls: "border-red-500/60 bg-red-500/10" };
}

export function AlertsView() {
  const [patientId, setPatientId] = useState<string>("P001");
  const [items, setItems] = useState<AlertItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchAlerts(patientId);
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load alerts");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
    const id = setInterval(() => queueMicrotask(() => void load()), 8000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="min-h-screen dot-grid-bg pb-20">
      <main className="mx-auto max-w-2xl px-6 py-16 lg:px-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
        <div className="mb-8 border-2 border-foreground bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-mono text-2xl font-bold uppercase tracking-tight">
                Alerts & AI
              </h1>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                High-risk events from <code className="text-foreground">GET /alerts/{"{id}"}</code>.
                When hybrid risk &gt; 60, the API stores a narrative from{" "}
                <span className="text-foreground">Claude</span> (or a calm fallback if{" "}
                <code className="text-accent">ANTHROPIC_API_KEY</code> is unset).
              </p>
            </div>
            <Sparkles className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.25} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {PATIENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPatientId(p)}
                className={`border-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  patientId === p
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Loading…
          </p>
        )}
        {err && (
          <p className="mb-4 font-mono text-xs text-amber-600 dark:text-amber-400">{err}</p>
        )}

        <div className="space-y-4">
          {items.length === 0 && !loading && (
            <div className="border-2 border-dashed border-border p-8 text-center font-mono text-xs text-muted-foreground">
              No alerts for this patient yet. Run the simulator until hybrid risk crosses 60.
            </div>
          )}
          {items.map((a, i) => {
            const b = band(a.hybrid_score);
            return (
              <motion.article
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border-2 p-5 ${b.cls}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/20 pb-3 font-mono text-[10px] uppercase tracking-widest">
                  <span className="text-muted-foreground">
                    {new Date(a.timestamp).toLocaleString()}
                  </span>
                  <span>
                    {b.emoji} {b.label} · score {a.hybrid_score}
                  </span>
                </div>
                <p className="mt-4 font-mono text-sm leading-relaxed text-foreground">
                  {a.explanation}
                </p>
              </motion.article>
            );
          })}
        </div>

        <p className="mt-10 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/dashboard" className="text-accent hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
