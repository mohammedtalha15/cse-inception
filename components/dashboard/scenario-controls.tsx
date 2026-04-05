"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, Dumbbell, Syringe, RotateCcw } from "lucide-react";
import { postScenario, fetchSimulatorState } from "@/lib/api";
import type { SimulatorState } from "@/lib/types";

const btn =
  "flex items-center justify-center gap-2 border-2 border-foreground bg-background px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors hover:bg-foreground hover:text-background disabled:opacity-40";

export function ScenarioControls({
  patientId,
  onState,
}: {
  patientId: string;
  onState?: (s: SimulatorState) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [local, setLocal] = useState<SimulatorState | null>(null);

  async function act(action: string) {
    setLoading(action);
    setErr(null);
    try {
      const { state } = await postScenario(patientId, action);
      setLocal(state);
      onState?.(state);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(null);
    }
  }

  async function refresh() {
    try {
      const s = await fetchSimulatorState(patientId);
      setLocal(s);
      onState?.(s);
    } catch {
      /* ignore */
    }
  }

  const st = local;

  return (
    <div className="space-y-3 border-2 border-foreground bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Scenario simulator
        </p>
        <button type="button" onClick={() => refresh()} className="font-mono text-[9px] uppercase tracking-widest text-accent underline-offset-2 hover:underline">
          Refresh state
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className={btn}
          disabled={!!loading}
          onClick={() => act("skip_meal")}
        >
          <UtensilsCrossed size={14} />
          Skip meal
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className={btn}
          disabled={!!loading}
          onClick={() => act("start_workout")}
        >
          <Dumbbell size={14} />
          Workout
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className={btn}
          disabled={!!loading}
          onClick={() => act("add_insulin")}
        >
          <Syringe size={14} />
          Insulin
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          className={btn}
          disabled={!!loading}
          onClick={() => act("reset")}
        >
          <RotateCcw size={14} />
          Reset
        </motion.button>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        className={`${btn} w-full border-dashed`}
        disabled={!!loading}
        onClick={() => act("end_workout")}
      >
        End workout
      </motion.button>
      {st && (
        <pre className="overflow-x-auto border border-border bg-muted/30 p-2 font-mono text-[9px] text-muted-foreground">
          {JSON.stringify(st, null, 0)}
        </pre>
      )}
      {err && <p className="font-mono text-[10px] text-red-500">{err}</p>}
      {loading && (
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {loading}…
        </p>
      )}
    </div>
  );
}
