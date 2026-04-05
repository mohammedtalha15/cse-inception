"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "intense"] as const;
const TIME_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;

interface RiskResult {
  hybrid_score: number;
  rule_score: number;
  ml_score: number;
  factors: { label: string; weight: number; direction: string }[];
  explanation: string | null;
  alert_type: string | null;
  time_to_low_minutes: number | null;
}

export function EnterVitalsForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      glucose_mgdl: Number(fd.get("glucose_mgdl")),
      glucose_trend: Number(fd.get("glucose_trend")),
      last_meal_mins_ago: Number(fd.get("last_meal_mins_ago")),
      meal_carbs_g: Number(fd.get("meal_carbs_g")),
      last_insulin_units: Number(fd.get("last_insulin_units")),
      insulin_mins_ago: Number(fd.get("insulin_mins_ago")),
      activity_level: fd.get("activity_level") as string,
      time_of_day: fd.get("time_of_day") as string,
      patient_id: (fd.get("patient_id") as string) || "P001",
    };

    try {
      const res = await fetch(`${API}/reading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient ID */}
        <Field label="Patient ID" hint="Default: P001">
          <input
            name="patient_id"
            type="text"
            defaultValue="P001"
            className="form-input"
          />
        </Field>

        {/* Glucose */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Glucose (mg/dL)" hint="Current blood glucose">
            <input
              name="glucose_mgdl"
              type="number"
              step="any"
              required
              placeholder="110"
              className="form-input"
            />
          </Field>
          <Field label="Glucose Trend (mg/dL/min)" hint="Rate of change">
            <input
              name="glucose_trend"
              type="number"
              step="any"
              required
              placeholder="-1.2"
              className="form-input"
            />
          </Field>
        </div>

        {/* Meal */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Last Meal (min ago)">
            <input
              name="last_meal_mins_ago"
              type="number"
              min="0"
              required
              placeholder="90"
              className="form-input"
            />
          </Field>
          <Field label="Meal Carbs (g)">
            <input
              name="meal_carbs_g"
              type="number"
              step="any"
              defaultValue="0"
              className="form-input"
            />
          </Field>
        </div>

        {/* Insulin */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Last Insulin (units)">
            <input
              name="last_insulin_units"
              type="number"
              step="any"
              defaultValue="0"
              className="form-input"
            />
          </Field>
          <Field label="Insulin (min ago)">
            <input
              name="insulin_mins_ago"
              type="number"
              min="0"
              required
              placeholder="45"
              className="form-input"
            />
          </Field>
        </div>

        {/* Activity & Time */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Activity Level">
            <select name="activity_level" required className="form-input">
              {ACTIVITY_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time of Day">
            <select name="time_of_day" required className="form-input">
              {TIME_OF_DAY.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full border-2 border-foreground bg-foreground px-6 py-3 font-mono text-xs uppercase tracking-widest text-background disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Processing…
            </span>
          ) : (
            "Submit Reading"
          )}
        </motion.button>
      </form>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-red-500/30 bg-red-500/5 p-4 font-mono text-xs text-red-400"
          >
            <AlertTriangle size={14} className="mb-1 inline" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 border border-foreground/20 p-6"
          >
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <CheckCircle2 size={14} className="text-green-500" />
              Risk Assessment
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <ScoreBox label="Hybrid" value={result.hybrid_score} />
              <ScoreBox label="Rule" value={result.rule_score} />
              <ScoreBox label="ML" value={result.ml_score} />
            </div>

            {result.alert_type && (
              <div className="border-l-2 border-yellow-500 bg-yellow-500/5 p-3 font-mono text-xs text-yellow-300">
                Alert: {result.alert_type}
              </div>
            )}

            {result.time_to_low_minutes != null && (
              <div className="font-mono text-xs text-muted-foreground">
                Est. time to low:{" "}
                <span className="text-foreground">
                  {result.time_to_low_minutes.toFixed(0)} min
                </span>
              </div>
            )}

            {result.factors.length > 0 && (
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Factors
                </span>
                {result.factors.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-foreground/5 py-1 font-mono text-xs"
                  >
                    <span className="text-muted-foreground">{f.label}</span>
                    <span
                      className={
                        f.direction === "up"
                          ? "text-red-400"
                          : f.direction === "down"
                          ? "text-green-400"
                          : "text-foreground"
                      }
                    >
                      {f.direction === "up" ? "↑" : f.direction === "down" ? "↓" : "—"}{" "}
                      {f.weight}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {result.explanation && (
              <div className="border-l-2 border-accent bg-accent/5 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                {result.explanation}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── helpers ─── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {hint && (
        <span className="block font-mono text-[10px] text-muted-foreground/60">
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  const color =
    value > 70
      ? "text-red-400 border-red-500/30"
      : value > 40
      ? "text-yellow-400 border-yellow-500/30"
      : "text-green-400 border-green-500/30";

  return (
    <div className={`border p-3 ${color}`}>
      <div className="font-mono text-2xl font-bold">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">
        {label}
      </div>
    </div>
  );
}
