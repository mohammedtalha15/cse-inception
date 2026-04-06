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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
