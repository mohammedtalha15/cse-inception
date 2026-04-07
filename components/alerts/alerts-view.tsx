"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Copy,
  RefreshCw,
  Search,
  TriangleAlert,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { fetchAlerts, fetchLatest } from "@/lib/api";
import type { AlertItem, Reading } from "@/lib/types";
import { getStoredChatPatientId, setStoredChatPatientId } from "@/lib/chat-patient-id";

const PATIENTS = ["P001", "P002", "P003"] as const;

function band(score: number) {
  if (score < 40) {
    return {
      label: "Early / watch",
      emoji: "⚠️",
      cls: "border-amber-500/50 bg-amber-500/10",
      kind: "early" as const,
    };
  }
  return {
    label: "Critical",
    emoji: "🚨",
    cls: "border-red-500/60 bg-red-500/10",
    kind: "critical" as const,
  };
}

function relTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(diffMs)) return "Unknown";
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function predictionLevelFromRiskPercent(riskPercent: number): "Low" | "Medium" | "High" {
  if (riskPercent < 30) return "Low";
  if (riskPercent <= 70) return "Medium";
  return "High";
}

function coreReasonForPrediction(
  latestReading: Reading | null,
  predictionLevel: "Low" | "Medium" | "High" | null,
): string {
  if (!latestReading || !predictionLevel) {
    return "Add a fresh vitals entry to compute a clear reason for the current prediction level.";
  }

  const topFactors = [...(latestReading.factors ?? [])]
    .sort((a, b) => b.points - a.points)
    .slice(0, 2)
    .map((f) => f.label)
    .filter(Boolean);

  const trendText =
    latestReading.glucose_trend < -1.5
      ? "fast downward glucose trend"
      : latestReading.glucose_trend < -0.5
        ? "downward glucose trend"
        : latestReading.glucose_trend > 1
          ? "rising glucose trend"
          : "stable glucose trend";

  if (topFactors.length > 0) {
    return `${predictionLevel} prediction is mainly driven by ${topFactors.join(" and ")} with ${trendText}.`;
  }

  return `${predictionLevel} prediction is based on glucose ${latestReading.glucose_mgdl} mg/dL and ${trendText}.`;
}

export function AlertsView() {
  const [patientId, setPatientId] = useState<string>("P001");
  const [isHydrated, setIsHydrated] = useState(false);
  const [items, setItems] = useState<AlertItem[]>([]);
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<"all" | "critical" | "early">("all");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "highest">("newest");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [data, latest] = await Promise.all([
        fetchAlerts(patientId),
        fetchLatest(patientId),
      ]);
      setItems(data);
      setLatestReading(latest);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load alerts");
      setItems([]);
      setLatestReading(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    setIsHydrated(true);
    if (typeof window === "undefined") return;
    setPatientId(getStoredChatPatientId());
  }, []);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void load();
    };
    queueMicrotask(() => {
      tick();
    });
    const id = setInterval(() => queueMicrotask(() => tick()), 8000);
    return () => clearInterval(id);
  }, [load]);

  const computed = useMemo(() => {
    const withBand = items.map((a) => ({ ...a, b: band(a.hybrid_score) }));
    const searched = withBand.filter((a) => {
      if (severity !== "all" && a.b.kind !== severity) return false;
      if (!query.trim()) return true;
      return a.explanation.toLowerCase().includes(query.trim().toLowerCase());
    });
    const sorted = [...searched].sort((a, b) => {
      if (sortMode === "highest") return b.hybrid_score - a.hybrid_score;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    const criticalCount = withBand.filter((a) => a.b.kind === "critical").length;
    const latest = [...withBand].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];
    const riskPercent =
      latestReading?.diabetes_ml_probability != null
        ? Math.round(latestReading.diabetes_ml_probability * 100)
        : null;
    const avgPredictionScore =
      latestReading && riskPercent != null
        ? Math.round((latestReading.hybrid_score + riskPercent) / 2)
        : latestReading
          ? Math.round(latestReading.hybrid_score)
          : null;
    const predictionLevel =
      riskPercent != null
        ? predictionLevelFromRiskPercent(riskPercent)
        : null;
    return {
      all: withBand,
      visible: sorted,
      criticalCount,
      avgScore:
        withBand.length > 0
          ? Math.round(
              withBand.reduce((acc, a) => acc + a.hybrid_score, 0) / withBand.length,
            )
          : null,
      latest: latest ?? null,
      riskPercent,
      avgPredictionScore,
      predictionLevel,
    };
  }, [items, severity, query, sortMode, latestReading]);

  async function copyAlertSummary(a: AlertItem) {
    const txt = [
      `Patient: ${a.patient_id}`,
      `Score: ${a.hybrid_score}`,
      `Time: ${new Date(a.timestamp).toLocaleString()}`,
      `Summary: ${a.explanation}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedId(a.id);
      setTimeout(() => setCopiedId((prev) => (prev === a.id ? null : prev)), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen dot-grid-bg pb-20">
      <main className="mx-auto max-w-4xl px-6 py-16 lg:px-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
        <div className="mb-6 border-2 border-foreground bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-mono text-2xl font-bold uppercase tracking-tight">
                Alerts & AI
              </h1>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                Smart warning center for{" "}
                <span className="text-foreground" suppressHydrationWarning>
                  {isHydrated ? patientId : "P001"}
                </span>
                . We
                generate alerts when hybrid risk is 40 or above and store an AI-ready narrative from{" "}
                <span className="text-foreground">Gemini</span> (or built-in guidance if{" "}
                <code className="text-accent">GEMINI_API_KEY</code> is unset).
              </p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground/90">
                {latestReading
                  ? `Latest vitals found (${latestReading.glucose_mgdl} mg/dL, hybrid ${latestReading.hybrid_score}/100).`
                  : "No vitals found yet for this patient — log vitals first to activate live alerts."}
              </p>
            </div>
            <Sparkles className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.25} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<TriangleAlert size={14} />}
              label="Critical"
              value={String(computed.criticalCount)}
              tone="text-red-500"
            />
            <StatCard
              icon={<Activity size={14} />}
              label="Avg score"
              value={
                computed.avgPredictionScore == null
                  ? "—"
                  : `${computed.avgPredictionScore}`
              }
              hint={
                computed.predictionLevel && computed.riskPercent != null
                  ? `${computed.predictionLevel} · Risk ${computed.riskPercent}%`
                  : undefined
              }
              tone="text-accent"
            />
            <StatCard
              icon={<ShieldCheck size={14} />}
              label="Latest"
              value={computed.latest ? relTime(computed.latest.timestamp) : "No alerts"}
              tone="text-foreground"
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {PATIENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPatientId(p);
                  if (typeof window !== "undefined") {
                    setStoredChatPatientId(p);
                  }
                }}
                className={`border-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  patientId === p
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 border-2 border-foreground px-3 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="relative flex items-center">
              <Search size={13} className="pointer-events-none absolute left-2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search alert explanation..."
                className="form-input pl-8 py-2 text-xs"
              />
            </label>
            <button
              type="button"
              onClick={() => setSeverity("all")}
              className={`border-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
                severity === "all" ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSeverity("critical")}
              className={`border-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
                severity === "critical" ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              Critical
            </button>
            <button
              type="button"
              onClick={() => setSeverity("early")}
              className={`border-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
                severity === "early" ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              Early
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setSortMode("newest")}
              className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${
                sortMode === "newest" ? "border-foreground text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              Newest first
            </button>
            <button
              type="button"
              onClick={() => setSortMode("highest")}
              className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${
                sortMode === "highest" ? "border-foreground text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              Highest score
            </button>
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

        {computed.latest && (
          <div className="mb-4 border border-accent/35 bg-accent/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              AI triage insight
            </p>
            <p className="mt-2 font-mono text-xs leading-relaxed text-foreground">
              Latest signal is <span className="text-accent">{computed.latest.hybrid_score}/100</span>.{" "}
              {computed.latest.hybrid_score >= 40
                ? "This is in critical band. Contact your doctor immediately and keep fast-acting carbs ready while you monitor closely."
                : "Prioritize trend confirmation and follow your care plan; use the summary below to share with caregiver/doctor quickly."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="border border-foreground/15 bg-background/40 p-3 font-mono text-[11px] text-muted-foreground">
                <p className="uppercase tracking-widest text-[10px]">Recommended next step</p>
                <p className="mt-1 text-foreground">
                  {computed.latest.hybrid_score >= 40
                    ? "Call doctor now, share alert details, re-check vitals in 10-15 min."
                    : "Re-check vitals in 20-30 min and consult doctor if symptoms worsen."}
                </p>
              </div>
              <div className="border border-foreground/15 bg-background/40 p-3 font-mono text-[11px] text-muted-foreground">
                <p className="uppercase tracking-widest text-[10px]">Share-ready details</p>
                <p className="mt-1 text-foreground">
                  Glucose {computed.latest.glucose_mgdl} mg/dL, trend {computed.latest.glucose_trend} mg/dL/min, score{" "}
                  {computed.latest.hybrid_score}/100.
                </p>
              </div>
            </div>
            <div className="mt-3 border border-foreground/20 bg-background/40 p-3 font-mono text-[11px]">
              <p className="uppercase tracking-widest text-[10px] text-muted-foreground">
                Core reason for prediction level
              </p>
              <p className="mt-1 text-foreground">
                {coreReasonForPrediction(latestReading, computed.predictionLevel)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="border border-foreground/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                Contact doctor from dashboard
              </Link>
              <Link
                href="/enter-data"
                className="border border-foreground/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                Log fresh vitals
              </Link>
            </div>
          </div>
        )}

        {!loading && !latestReading && (
          <div className="mb-4 border-2 border-dashed border-foreground/30 bg-card/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Setup needed
            </p>
            <p className="mt-2 font-mono text-xs text-foreground">
              This section is live, but there are no vitals stored for <strong>{patientId}</strong> yet.
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Log one reading first, then alerts and AI explanations will start appearing automatically.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/enter-data"
                className="border-2 border-foreground bg-foreground px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-background"
              >
                Log vitals now
              </Link>
              <Link
                href="/dashboard"
                className="border-2 border-foreground px-3 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {computed.visible.length === 0 && !loading && (
            <div className="border-2 border-dashed border-border p-8 text-center font-mono text-xs text-muted-foreground">
              No active alerts right now. Keep monitoring and log fresh vitals every few hours. If you
              feel symptoms (dizziness, sweating, confusion), contact doctor support immediately even
              without an active alert.
            </div>
          )}
          {computed.visible.map((a, i) => {
            const b = a.b;
            return (
              <motion.article
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border-2 p-5 ${b.cls}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/20 pb-3 font-mono text-[10px] uppercase tracking-widest">
                  <span className="text-muted-foreground" suppressHydrationWarning>
                    {new Date(a.timestamp).toLocaleString()} · {isHydrated ? relTime(a.timestamp) : "Just now"}
                  </span>
                  <span>
                    {b.emoji} {b.label} · score {a.hybrid_score}
                  </span>
                </div>
                <p className="mt-4 font-mono text-sm leading-relaxed text-foreground">
                  {a.explanation}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyAlertSummary(a)}
                    className="inline-flex items-center gap-1.5 border border-foreground/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
                  >
                    <Copy size={11} />
                    {copiedId === a.id ? "Copied" : "Copy summary"}
                  </button>
                  <Link
                    href="/dashboard"
                    className="inline-flex border border-foreground/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
                  >
                    Open dashboard
                  </Link>
                </div>
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

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className="border border-foreground/15 bg-background/60 p-3">
      <div className={`mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${tone}`}>
        {icon}
        {label}
      </div>
      <p className="font-mono text-lg font-bold tabular-nums text-foreground">{value}</p>
      {hint && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
