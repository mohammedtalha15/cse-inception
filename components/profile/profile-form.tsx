"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { fetchProfile, postProfile } from "@/lib/api";

export function ProfileForm() {
  const [patientId, setPatientId] = useState("P001");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [insulinType, setInsulinType] = useState("");
  const [basal, setBasal] = useState("");
  const [activity, setActivity] = useState("");
  const [sleep, setSleep] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const p = await fetchProfile(patientId);
      if (!p) return;
      setBreakfast(String(p.typical_breakfast_time ?? ""));
      setLunch(String(p.typical_lunch_time ?? ""));
      setDinner(String(p.typical_dinner_time ?? ""));
      setInsulinType(String(p.insulin_type ?? ""));
      setBasal(String(p.basal_schedule ?? ""));
      setActivity(String(p.activity_pattern ?? ""));
      setSleep(String(p.sleep_window ?? ""));
      setNotes(String(p.notes ?? ""));
    } catch {
      /* no profile yet */
    }
  }, [patientId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    try {
      await postProfile({
        patient_id: patientId,
        typical_breakfast_time: breakfast || null,
        typical_lunch_time: lunch || null,
        typical_dinner_time: dinner || null,
        insulin_type: insulinType || null,
        basal_schedule: basal || null,
        activity_pattern: activity || null,
        sleep_window: sleep || null,
        notes: notes || null,
      });
      setStatus("ok");
      setMsg("Saved to SQLite via POST /profile");
    } catch (err) {
      setStatus("err");
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  const field =
    "w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-xs outline-none ring-0 focus:border-accent";

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
        <h1 className="mb-2 font-mono text-2xl font-bold uppercase tracking-tight">
          Profile & habits
        </h1>
        <p className="mb-8 font-mono text-xs leading-relaxed text-muted-foreground">
          Saved habits feed the <strong className="text-foreground">risk engine</strong> on each{" "}
          <code className="text-accent">POST /reading</code> — e.g. sleep window, training pattern,
          lunch timing, and rapid insulin type can add explainable points when they amplify risk.
          Claude prompts can use the same profile for calmer, more personal narratives.
        </p>

        <form onSubmit={onSubmit} className="space-y-6 border-2 border-foreground bg-card p-6">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Patient ID
            <input
              className={`${field} mt-2`}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Breakfast window
              <input
                className={`${field} mt-2`}
                placeholder="e.g. 07:30"
                value={breakfast}
                onChange={(e) => setBreakfast(e.target.value)}
              />
            </label>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Lunch window
              <input
                className={`${field} mt-2`}
                placeholder="12:30"
                value={lunch}
                onChange={(e) => setLunch(e.target.value)}
              />
            </label>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Dinner window
              <input
                className={`${field} mt-2`}
                placeholder="19:00"
                value={dinner}
                onChange={(e) => setDinner(e.target.value)}
              />
            </label>
          </div>

          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Insulin type
            <input
              className={`${field} mt-2`}
              placeholder="Rapid-acting, basal name…"
              value={insulinType}
              onChange={(e) => setInsulinType(e.target.value)}
            />
          </label>

          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Basal schedule (free text)
            <textarea
              className={`${field} mt-2 min-h-[72px]`}
              value={basal}
              onChange={(e) => setBasal(e.target.value)}
            />
          </label>

          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Typical activity pattern
            <input
              className={`${field} mt-2`}
              placeholder="Desk job, evening walks…"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
          </label>

          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sleep window
            <input
              className={`${field} mt-2`}
              placeholder="23:00–07:00"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
            />
          </label>

          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Notes for care team / demo
            <textarea
              className={`${field} mt-2 min-h-[88px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.99 }}
            className="flex w-full items-center justify-center gap-2 border-2 border-foreground bg-foreground py-3 font-mono text-xs font-bold uppercase tracking-widest text-background"
          >
            <Check size={16} />
            Save profile
          </motion.button>

          {status === "ok" && (
            <p className="font-mono text-xs text-green-600 dark:text-green-400">{msg}</p>
          )}
          {status === "err" && (
            <p className="font-mono text-xs text-red-500">{msg}</p>
          )}
        </form>
      </main>
    </div>
  );
}
