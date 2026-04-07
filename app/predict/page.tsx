"use client";

import { useState } from "react";
import { predictDiabetesRisk } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldAlert, Sparkles, Brain } from "lucide-react";

type PredictResult = {
  prediction: number;
  probability: number;
  risk_level: string;
  explanation: string;
  feature_contributions?: Array<{
    feature: string;
    value: number;
    contribution_percent: number;
    direction: "increases_risk" | "lowers_risk" | "neutral";
    is_major: boolean;
  }>;
};

const FEATURES = [
  { key: "pregnancies", label: "Pregnancies", hint: "Number of times pregnant" },
  { key: "glucose", label: "Glucose", hint: "Plasma glucose conc. (mg/dL)" },
  { key: "bp", label: "Blood Pressure", hint: "Diastolic BP (mm Hg)" },
  { key: "skin", label: "Skin Thickness", hint: "Triceps skin fold (mm)" },
  { key: "insulin", label: "Insulin", hint: "2-Hour serum insulin (mu U/ml)" },
  { key: "bmi", label: "BMI", hint: "Body mass index" },
  { key: "dpf", label: "Diabetes Pedigree", hint: "Diabetes pedigree function" },
  { key: "age", label: "Age", hint: "Age (years)" },
];

export default function PredictPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const input = FEATURES.map(f => Number(fd.get(f.key) || 0));

    try {
      const res = await predictDiabetesRisk(input);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to predict");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-mono uppercase tracking-widest text-green-500 flex items-center gap-2">
          <Brain size={24} /> Pima ML Prognosis
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-2">
          RandomForestClassifier trained on Pima Indians Diabetes Dataset.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-neutral-900 border border-neutral-800 p-6">
        {FEATURES.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
              {f.label}
            </label>
            <input
              name={f.key}
              type="number"
              step="any"
              required
              className="w-full bg-neutral-950 border border-neutral-700/50 p-3 font-mono text-sm focus:border-green-500 focus:outline-none transition-colors"
              placeholder={f.hint}
            />
          </div>
        ))}
        
        <div className="sm:col-span-2 pt-4 border-t border-neutral-800">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500/10 hover:bg-green-500 border border-green-500 text-green-500 hover:text-black py-4 font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />}
            {loading ? "Analyzing Matrix..." : "Run ML Inference"}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 border border-red-500 bg-red-500/10 text-red-500 font-mono text-xs flex items-center gap-2"
          >
            <ShieldAlert size={16} /> {error}
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-green-500/30 bg-neutral-900 p-6 space-y-6"
          >
            <div className="flex items-center gap-2 text-green-500 font-mono uppercase tracking-widest text-xs">
              <Sparkles size={16} /> Inference Complete
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-neutral-500 text-[10px] uppercase font-mono tracking-widest">Risk Level</div>
                <div className={`text-2xl font-mono mt-1 ${result.risk_level === "Low" ? "text-green-500" : result.risk_level === "Medium" ? "text-yellow-500" : "text-red-500"}`}>
                  {result.risk_level}
                </div>
              </div>
              <div className="border border-neutral-800 bg-neutral-950 p-4">
                <div className="text-neutral-500 text-[10px] uppercase font-mono tracking-widest">Probability</div>
                <div className="text-2xl font-mono mt-1 text-white">
                  {(result.probability * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="border-l-2 border-green-500 bg-green-500/5 p-4 font-mono text-sm leading-relaxed text-neutral-300">
              <span className="text-green-500 font-bold mr-2 text-xs">SYS{">"}</span>
              {result.explanation}
            </div>

            {result.feature_contributions && result.feature_contributions.length > 0 && (
              <div className="space-y-3 border border-green-500/30 bg-neutral-950 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-green-500">
                  Explainable AI (Why prediction happened)
                </p>
                <p className="font-mono text-xs text-neutral-400">
                  Not just result — feature contribution breakdown:
                </p>
                <div className="space-y-2">
                  {result.feature_contributions.slice(0, 6).map((f) => (
                    <div key={f.feature} className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-neutral-200">
                          {f.feature}
                          {f.is_major ? " (major)" : ""}
                        </span>
                        <span className="text-green-400 tabular-nums">
                          {f.contribution_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-900 border border-neutral-800">
                        <div
                          className={`h-full ${
                            f.direction === "increases_risk"
                              ? "bg-red-500/80"
                              : f.direction === "lowers_risk"
                                ? "bg-green-500/80"
                                : "bg-yellow-500/70"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, f.contribution_percent))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-[11px] text-neutral-300 leading-relaxed">
                  {(() => {
                    const top = [...result.feature_contributions]
                      .sort((a, b) => b.contribution_percent - a.contribution_percent)
                      .slice(0, 2);
                    if (top.length === 0) return null;
                    return (
                      <>
                        {top[0] && (
                          <p>
                            • {top[0].feature} contributed about{" "}
                            <span className="text-green-400">{top[0].contribution_percent.toFixed(1)}%</span>{" "}
                            to this risk signal.
                          </p>
                        )}
                        {top[1] && (
                          <p>
                            • {top[1].feature} is also a major factor at{" "}
                            <span className="text-green-400">{top[1].contribution_percent.toFixed(1)}%</span>.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <p className="font-mono text-[10px] text-neutral-500">
                  Powered by SHAP-style feature attribution (with robust fallback).
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
