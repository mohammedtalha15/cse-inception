"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertTriangle, Brain } from "lucide-react";
import { postProfile, postReading } from "@/lib/api";
import type { Reading, RiskFactor } from "@/lib/types";
import { MealPhotoAssist } from "@/components/meal-photo-assist";
import { setStoredChatPatientId } from "@/lib/chat-patient-id";

const ACTIVITY_LEVELS = [
  { v: "sedentary", label: "Sedentary" },
  { v: "light", label: "Light" },
  { v: "moderate", label: "Moderate" },
  { v: "intense", label: "Intense" },
] as const;

const TIME_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;

/** Pima fields after pregnancies (order matches training cols 2–8; col 1 is pregnancies). */
const PIMA_BODY = [
  { name: "glucose", label: "Glucose (mg/dL)", hint: "Plasma glucose — same as training CSV" },
  { name: "bp", label: "Blood pressure (diastolic, mm Hg)", hint: "Dataset col 3" },
  { name: "skin", label: "Skin thickness (mm)", hint: "Triceps fold — dataset col 4" },
  { name: "bmi", label: "BMI", hint: "Dataset col 6" },
  { name: "dpf", label: "Diabetes pedigree function", hint: "Dataset col 7" },
  { name: "age", label: "Age (years)", hint: "Dataset col 8" },
] as const;

const PREGNANCIES_FIELD = {
  name: "pregnancies",
  label: "Pregnancies",
  hint: "Times pregnant (Pima col 1) — shown only for female",
} as const;

const PIMA_INSULIN = {
  name: "insulin",
  label: "2h serum insulin (μU/ml)",
  hint: "Dataset col 5 — used for RF cross-check and mapped to last insulin units for the API",
} as const;

function mapActivityForApi(level: string): string {
  return level === "intense" ? "high" : level;
}

export function EnterVitalsForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealCarbsG, setMealCarbsG] = useState("0");
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [diagnosedDiabetic, setDiagnosedDiabetic] = useState<"yes" | "no" | null>(null);
  const [sex, setSex] = useState<"male" | "female" | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const patientId = ((fd.get("patient_id") as string) || "P001").trim().toUpperCase() || "P001";

    if (diagnosedDiabetic === null) {
      setError("Please answer whether the person is diabetic (yes or no).");
      setLoading(false);
      return;
    }

    if (sex === null) {
      setError("Please select sex (male or female).");
      setLoading(false);
      return;
    }

    const preg = sex === "female" ? Number(fd.get("pregnancies")) : 0;
    if (sex === "female" && (!Number.isFinite(preg) || preg < 0)) {
      setError("Enter pregnancies (0 or more) for female patients.");
      setLoading(false);
      return;
    }

    const g = Number(fd.get("glucose"));
    const ins = diagnosedDiabetic === "yes" ? Number(fd.get("insulin")) : 0;
    if (diagnosedDiabetic === "yes" && (!Number.isFinite(ins) || ins < 0)) {
      setError("Enter insulin (μU/ml) or 0 if unknown.");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(g) || g < 20 || g > 600) {
      setError("Glucose must be between 20 and 600 mg/dL.");
      setLoading(false);
      return;
    }

    const profilePayload = {
      patient_id: patientId,
      sex,
      pregnancies: preg,
      blood_pressure: Number(fd.get("bp")),
      skin_thickness: Number(fd.get("skin")),
      bmi: Number(fd.get("bmi")),
      dpf: Number(fd.get("dpf")),
      age: Number(fd.get("age")),
    };

    const trend = Number(fd.get("glucose_trend") ?? 0);
    const lastMeal = Number(fd.get("last_meal_mins_ago") ?? 180);
    const insMins =
      diagnosedDiabetic === "yes"
        ? Number(fd.get("insulin_mins_ago") ?? 120)
        : 120;
    const activityRaw = (fd.get("activity_level") as string) || "moderate";
    const timeOfDay = (fd.get("time_of_day") as string) || "afternoon";

    const carbs = Number(mealCarbsG);
    const mealCarbs = Number.isFinite(carbs) ? Math.min(2000, Math.max(0, carbs)) : 0;

    const body = {
      glucose_mgdl: g,
      glucose_trend: Number.isFinite(trend) ? Math.max(-20, Math.min(20, trend)) : 0,
      last_meal_mins_ago: Number.isFinite(lastMeal)
        ? Math.min(43200, Math.max(0, Math.floor(lastMeal)))
        : 180,
      meal_carbs_g: mealCarbs,
      last_insulin_units: Number.isFinite(ins)
        ? Math.min(500, Math.max(0, ins))
        : 0,
      insulin_mins_ago: Number.isFinite(insMins)
        ? Math.min(43200, Math.max(0, Math.floor(insMins)))
        : 120,
      activity_level: mapActivityForApi(activityRaw),
      time_of_day: timeOfDay,
      patient_id: patientId,
    };

    try {
      await postProfile(profilePayload);
      const data = await postReading(body);
      setResult(data);
      if (typeof window !== "undefined") {
        setStoredChatPatientId(patientId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Patient ID" hint="Used for dashboard + chat context">
          <input
            name="patient_id"
            type="text"
            defaultValue="P001"
            className="form-input"
          />
        </Field>

        <div className="border border-foreground/20 bg-foreground/2 px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sex
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground/90">
            Pregnancies (Pima field) is shown only if you select female; males send 0 for that feature.
          </p>
          <div className="mt-3 flex flex-wrap gap-4" role="radiogroup" aria-label="Sex">
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs">
              <input
                type="radio"
                name="patient_sex"
                checked={sex === "female"}
                onChange={() => setSex("female")}
                className="border-foreground accent-accent"
              />
              Female
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs">
              <input
                type="radio"
                name="patient_sex"
                checked={sex === "male"}
                onChange={() => setSex("male")}
                className="border-foreground accent-accent"
              />
              Male
            </label>
          </div>
        </div>

        <div className="border border-foreground/20 bg-foreground/2 px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Diabetes diagnosis
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground/90">
            Insulin fields appear only if you select Yes.
          </p>
          <div className="mt-3 flex flex-wrap gap-4" role="radiogroup" aria-label="Diabetes diagnosis">
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs">
              <input
                type="radio"
                name="diagnosed_diabetic"
                checked={diagnosedDiabetic === "yes"}
                onChange={() => setDiagnosedDiabetic("yes")}
                className="border-foreground accent-accent"
              />
              Yes
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs">
              <input
                type="radio"
                name="diagnosed_diabetic"
                checked={diagnosedDiabetic === "no"}
                onChange={() => setDiagnosedDiabetic("no")}
                className="border-foreground accent-accent"
              />
              No
            </label>
          </div>
        </div>

        <div className="border border-accent/25 bg-accent/5 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          <span className="text-accent">Primary inputs</span> match the{" "}
          <strong className="text-foreground/90">Pima Indians diabetes</strong> training CSV (
          <code className="text-foreground/80">backend/data/diabetes.csv</code>
          ). The random forest uses pregnancies (female only), glucose, BP, skin, BMI, DPF, age
          {diagnosedDiabetic === "yes" ? ", plus insulin" : " (insulin sent as 0 if no diagnosis)"}{" "}
          and your optional CGM refinements below.
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sex === "female" && (
            <Field
              key={PREGNANCIES_FIELD.name}
              label={PREGNANCIES_FIELD.label}
              hint={PREGNANCIES_FIELD.hint}
            >
              <input
                name={PREGNANCIES_FIELD.name}
                type="number"
                step="any"
                min={0}
                required
                className="form-input"
              />
            </Field>
          )}
          {PIMA_BODY.map((f) => (
            <Field key={f.name} label={f.label} hint={f.hint}>
              <input
                name={f.name}
                type="number"
                step="any"
                required
                className="form-input"
              />
            </Field>
          ))}
          {diagnosedDiabetic === "yes" && (
            <Field key={PIMA_INSULIN.name} label={PIMA_INSULIN.label} hint={PIMA_INSULIN.hint}>
              <input
                name={PIMA_INSULIN.name}
                type="number"
                step="any"
                min={0}
                required
                className="form-input"
              />
            </Field>
          )}
        </div>

        <details className="border-2 border-foreground/30 bg-card/70 p-5 open:border-accent/45">
          <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-[0.16em] text-foreground">
            Real-time CGM & meal (optional — refines hypoglycemia rules)
          </summary>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground/90">
            Defaults if unchanged: trend 0, last meal 180 min ago, carbs 0, moderate activity,
            afternoon.
            {diagnosedDiabetic === "yes"
              ? " Insulin timing defaults to 120 min ago."
              : " Insulin timing is not collected without a diabetes diagnosis (rules use a neutral default)."}
          </p>

          <div className="mt-5 space-y-5">
            <MealPhotoAssist
              onEstimatedCarbs={(grams, note) => {
                setPhotoNote(note || null);
                if (grams != null && Number.isFinite(grams)) {
                  setMealCarbsG(String(Math.min(2000, Math.max(0, grams))));
                }
              }}
            />
            {photoNote && (
              <p className="font-mono text-[10px] text-muted-foreground/90 line-clamp-4">
                {photoNote}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Glucose trend (mg/dL/min)" hint="Default 0">
                <input
                  name="glucose_trend"
                  type="number"
                  step="any"
                  defaultValue="0"
                  className="form-input"
                />
              </Field>
              <Field label="Last meal (min ago)" hint="Default 180">
                <input
                  name="last_meal_mins_ago"
                  type="number"
                  min={0}
                  max={43200}
                  defaultValue="180"
                  className="form-input"
                />
              </Field>
              <Field label="Meal carbs (g)" hint="Filled by photo assist or enter manually">
                <input
                  type="number"
                  step="any"
                  min={0}
                  max={2000}
                  value={mealCarbsG}
                  onChange={(e) => setMealCarbsG(e.target.value)}
                  className="form-input"
                  aria-label="Meal carbs grams"
                />
              </Field>
              {diagnosedDiabetic === "yes" && (
                <Field label="Insulin last taken (min ago)" hint="For hypoglycemia rules — default 120">
                  <input
                    name="insulin_mins_ago"
                    type="number"
                    min={0}
                    max={43200}
                    defaultValue="120"
                    className="form-input"
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Activity level">
                <select
                  name="activity_level"
                  defaultValue="moderate"
                  className="form-input"
                >
                  {ACTIVITY_LEVELS.map((l) => (
                    <option key={l.v} value={l.v}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Time of day">
                <select name="time_of_day" defaultValue="afternoon" className="form-input">
                  {TIME_OF_DAY.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </details>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full border-2 border-foreground bg-foreground px-6 py-3.5 font-mono text-sm font-bold uppercase tracking-[0.16em] text-background shadow-[4px_4px_0_0_hsl(var(--foreground)/0.18)] disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Processing…
            </span>
          ) : (
            "Submit & cross-check with trained model"
          )}
        </motion.button>
      </form>

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
              Risk assessment + Pima RF
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <ScoreBox label="Hybrid" value={result.hybrid_score} />
              <ScoreBox label="Rule" value={result.rule_score} />
              <ScoreBox label="ML" value={result.ml_score} />
            </div>
            <div className="border border-foreground/15 bg-foreground/5 p-3 font-mono text-xs">
              <span className="text-muted-foreground">Glucose : Insulin ratio</span>
              <span className="ml-2 text-foreground">
                {formatGlucoseInsulinRatio(result)}
              </span>
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              <span className="text-foreground">Rule</span> — hypoglycemia risk from glucose, trend,
              meal gap, activity, time of day, and (if you use insulin) insulin timing — 0–100.{" "}
              <span className="text-foreground">ML</span> — Pima random-forest diabetes signal scaled
              to 0–100 when the model is loaded; otherwise a deterministic stub.{" "}
              <span className="text-foreground">Hybrid</span> — blend (~55% rule + ~45% ML). Example:{" "}
              Rule 0 + ML 50 → Hybrid ≈ 22.
            </p>

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
                {result.factors.map((f: RiskFactor, i: number) => (
                  <div
                    key={`${f.key}-${i}`}
                    className="flex items-center justify-between border-b border-foreground/5 py-1 font-mono text-xs"
                  >
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="tabular-nums text-accent">+{f.points}</span>
                  </div>
                ))}
              </div>
            )}

            {result.explanation && (
              <div className="border-l-2 border-accent bg-accent/5 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                {result.explanation}
              </div>
            )}

            {(result.diabetes_ml_probability != null || result.ml_model_source) && (
              <div className="border border-accent/20 bg-accent/5 p-4 font-mono text-xs">
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Brain size={12} className="text-accent" />
                  Trained model cross-check (Pima RF)
                </div>
                {result.ml_model_source === "random_forest" &&
                  result.diabetes_ml_probability != null && (
                    <p className="text-foreground/90">
                      Diabetes risk probability (model):{" "}
                      <span className="tabular-nums font-semibold text-accent">
                        {(result.diabetes_ml_probability * 100).toFixed(1)}%
                      </span>
                    </p>
                  )}
                {result.ml_model_source === "stub" && (
                  <p className="text-muted-foreground">
                    RF not loaded — ML score uses a deterministic stub. Run{" "}
                    <code className="text-foreground/80">python backend/train.py</code> on the API
                    host and restart.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
        {label}
      </span>
      {hint && (
        <span className="block font-mono text-[10px] text-muted-foreground/80">
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

function formatGlucoseInsulinRatio(reading: Reading): string {
  const g = Number(reading.glucose_mgdl);
  const i = Number(reading.last_insulin_units);
  if (!Number.isFinite(g)) return "N/A";
  if (!Number.isFinite(i) || i <= 0) return `${g.toFixed(1)} : 0 (insulin not provided)`;
  return `${(g / i).toFixed(2)} : 1`;
}
