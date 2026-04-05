"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, Radio, AlertTriangle, Timer } from "lucide-react";
import { fetchLatest, fetchProfile, fetchReadings } from "@/lib/api";
import { computeRiskDetailed, type ProfileContext } from "@/lib/risk";
import type { Reading } from "@/lib/types";
import { GlucoseChart } from "./glucose-chart";
import { RiskMeter } from "./risk-meter";
import { DualAiStrip } from "./dual-ai-strip";
import { ExplainabilityPanel } from "./explainability-panel";
import { ScenarioControls } from "./scenario-controls";
import { RiskShell } from "./risk-shell";

const PATIENTS = ["P001", "P002", "P003"] as const;

function alertEmoji(type: string | null) {
  if (type === "critical") return "🚨";
  if (type === "early") return "⚠️";
  return "✅";
}

function formatTtl(mins: number | null | undefined) {
  if (mins == null || !Number.isFinite(mins)) return null;
  if (mins > 24 * 60) return "Not soon (with current trend)";
  if (mins >= 120) return `~${Math.round(mins / 60)}h ${Math.round(mins % 60)}m`;
  return `~${Math.round(mins)} min`;
}

function bucketTod(hour: number) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function profileForRisk(raw: Record<string, unknown> | null): ProfileContext {
  if (!raw) return null;
  const rest = { ...raw };
  delete rest.patient_id;
  delete rest.updated_at;
  return rest;
}

function buildMockSeries(patientId: string, profile: ProfileContext): Reading[] {
  const now = Date.now();
  const out: Reading[] = [];
  for (let i = 72; i >= 0; i--) {
    const date = new Date(now - i * 5 * 60 * 1000);
    const ts = date.toISOString();
    const hour = date.getHours();
    const phase = i / 10;
    let g = 108 + 22 * Math.sin(phase) - Math.max(0, i - 40) * 0.35;
    let trend = -0.35 + 0.12 * Math.sin(i / 6);
    if (patientId === "P002") {
      g -= 8;
      trend -= 0.25;
    }
    if (patientId === "P003") {
      g -= 5;
      trend -= 0.15;
    }
    g = Math.max(55, Math.min(200, g));
    const base = {
      timestamp: ts,
      glucose_mgdl: Math.round(g * 10) / 10,
      glucose_trend: Math.round(trend * 100) / 100,
      last_meal_mins_ago: Math.min(300, 60 + (i % 50) * 3),
      meal_carbs_g: 40,
      last_insulin_units: 4,
      insulin_mins_ago: Math.min(180, 70 + (i % 40)),
      activity_level: i % 25 < 3 ? "high" : "rest",
      time_of_day: bucketTod(hour),
      patient_id: patientId,
    };
    const d = computeRiskDetailed(base, profile);
    out.push({
      id: 1000 + i,
      ...base,
      rule_score: d.rule_score,
      ml_score: d.ml_score,
      hybrid_score: d.hybrid_score,
      factors: d.factors,
      explanation: d.hybrid_score > 60 ? "Demo fallback: elevated risk from mock stream." : null,
      alert_type: d.alert_type,
      time_to_low_minutes: d.time_to_low_minutes,
    });
  }
  return out;
}

export function DashboardView() {
  const [patientId, setPatientId] = useState<string>("P001");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [live, setLive] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    let savedProfile: ProfileContext = null;
    try {
      const raw = await fetchProfile(patientId);
      savedProfile = profileForRisk(raw);
    } catch {
      savedProfile = null;
    }
    try {
      const [list, latest] = await Promise.all([
        fetchReadings(patientId, 6),
        fetchLatest(patientId),
      ]);
      setApiError(null);
      setLive(true);
      if (list.length > 0) {
        setReadings(list);
      } else if (latest) {
        setReadings([latest]);
      } else {
        setReadings([]);
      }
    } catch {
      setLive(false);
      setApiError("API unreachable — showing deterministic mock stream.");
      setReadings(buildMockSeries(patientId, savedProfile));
    }
  }, [patientId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
    const id = setInterval(() => queueMicrotask(() => void load()), 5000);
    return () => clearInterval(id);
  }, [load]);

  const latest = useMemo(() => {
    if (readings.length === 0) return null;
    return [...readings].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];
  }, [readings]);

  const hybrid = latest?.hybrid_score ?? 0;
  const ttl = latest?.time_to_low_minutes ?? null;
  const ttlLabel = formatTtl(ttl);
  const preventiveWindow =
    ttl != null &&
    Number.isFinite(ttl) &&
    ttl > 0 &&
    ttl <= 45 &&
    (latest?.glucose_mgdl ?? 0) > 70 &&
    hybrid < 65;

  return (
    <RiskShell hybridScore={hybrid}>
      <div className="min-h-screen dot-grid-bg pb-20">
        <header className="mx-auto max-w-6xl px-6 pt-8 lg:px-12">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Home
          </Link>
          <div className="flex flex-col gap-6 border-2 border-foreground bg-card/80 p-6 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-foreground bg-foreground text-background">
                <Activity size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-mono text-2xl font-bold uppercase tracking-tight md:text-3xl">
                  Live dashboard
                </h1>
                <p className="mt-1 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
                  Predictive view: trend + context + hybrid score, minutes-to-threshold, and factor
                  breakdown — not just a late glucose alarm. Polls{" "}
                  <span className="text-foreground">GET /readings</span> every 5s. Profile habits feed
                  the API risk engine when saved under <span className="text-foreground">/profile</span>.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PATIENTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPatientId(p)}
                  className={`border-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    patientId === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="flex items-center gap-1.5 border border-border px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                <Radio size={12} className={live ? "text-green-500" : "text-amber-500"} />
                {live ? "API" : "Mock"}
              </span>
            </div>
          </div>
          {apiError && (
            <p className="mt-3 font-mono text-[10px] text-amber-600 dark:text-amber-400">
              {apiError}
            </p>
          )}
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-10 lg:px-12">
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              <RiskMeter score={hybrid} />
              <DualAiStrip
                rule={latest?.rule_score ?? 0}
                ml={latest?.ml_score ?? 0}
                hybrid={hybrid}
              />
              <motion.div
                layout
                className="border-2 border-foreground bg-card p-4 font-mono text-xs"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Time to ~70 mg/dL (linear extrapolation)
                </p>
                <p className="mt-2 text-lg font-bold tabular-nums">
                  {ttlLabel ?? "— stable or rising trend"}
                </p>
                {latest && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Glucose {latest.glucose_mgdl} mg/dL · trend {latest.glucose_trend} mg/dL/min
                  </p>
                )}
              </motion.div>
              {preventiveWindow && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 border-2 border-accent bg-accent/10 p-4"
                >
                  <Timer size={20} className="mt-0.5 shrink-0 text-accent" strokeWidth={1.5} />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                      Preventive window
                    </p>
                    <p className="mt-1 font-mono text-sm leading-relaxed text-foreground">
                      Glucose is still above typical hypoglycemia thresholds, but the trajectory
                      suggests you may reach ~70 mg/dL in about{" "}
                      <strong className="tabular-nums">{ttlLabel}</strong> if the current trend holds.
                      That is the gap reactive systems often miss — use your care plan (e.g. fast
                      carbs, reduce activity, or confirm insulin on board).
                    </p>
                  </div>
                </motion.div>
              )}
              <div className="flex items-start gap-2 border-2 border-foreground bg-foreground p-4 text-background">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-background/70">
                    Alert band {alertEmoji(latest?.alert_type ?? null)}
                  </p>
                  <p className="mt-1 font-mono text-sm leading-relaxed">
                    {latest?.alert_type === "critical" &&
                      "Critical band — confirm symptoms, treat per plan, and involve your care team if needed."}
                    {latest?.alert_type === "early" &&
                      "Early warning — watch closely, consider carbs if trending down."}
                    {(!latest || latest.alert_type === "stable") &&
                      "Stable band — maintain routine monitoring."}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4 lg:col-span-3">
              <div className="border-2 border-foreground bg-card p-4">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Glucose · last 6h + forecast
                  </p>
                  <Link
                    href="/alerts"
                    className="font-mono text-[9px] uppercase tracking-widest text-accent hover:underline"
                  >
                    Alerts →
                  </Link>
                </div>
                <GlucoseChart readings={readings} />
              </div>
              <ExplainabilityPanel factors={latest?.factors ?? []} />
            </div>
          </div>

          <ScenarioControls patientId={patientId} />

          <section className="border border-dashed border-border bg-muted/10 p-6 font-mono text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">
            <p className="text-foreground">Real-world hooks (demo narrative)</p>
            <p className="mt-2">
              CGM streams (Dexcom / Libre), pumps, wearables, and Apple Health can feed the same{" "}
              <span className="text-foreground">POST /reading</span> schema — Ayuq stays
              device-agnostic at the API layer.
            </p>
          </section>
        </main>
      </div>
    </RiskShell>
  );
}
