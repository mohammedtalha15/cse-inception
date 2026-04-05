import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowLeft, Terminal } from "lucide-react";

export default function EnterDataPage() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-16 lg:px-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <Terminal className="h-7 w-7 text-accent" strokeWidth={1.25} />
          <h1 className="font-mono text-2xl font-bold uppercase tracking-tight text-foreground">
            Data & simulator
          </h1>
        </div>
        <p className="mb-6 font-mono text-sm leading-relaxed text-muted-foreground">
          Production path: your CGM / pump bridge posts the same JSON body to{" "}
          <code className="text-foreground">POST /reading</code>. For the hackathon demo, run the
          Python live loop (every 5s) and drive scenarios from the dashboard controls.
        </p>

        <div className="space-y-4 border-2 border-foreground bg-card p-6 font-mono text-xs">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            1 · Start API
          </p>
          <pre className="overflow-x-auto border border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
            cd backend && source .venv/bin/activate{"\n"}
            uvicorn main:app --reload --host 127.0.0.1 --port 8000
          </pre>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            2 · Live stream (optional)
          </p>
          <pre className="overflow-x-auto border border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
            python scripts/live_simulator.py --patient P001
          </pre>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            3 · Optional — bulk CSV history
          </p>
          <pre className="overflow-x-auto border border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
            python scripts/generate_patient_data.py{"\n"}
            # → backend/data/P00x_readings.csv
          </pre>
          <p className="text-[10px] text-muted-foreground">
            Copy <code className="text-foreground">.env.example</code> →{" "}
            <code className="text-foreground">.env</code> (root). Use{" "}
            <code className="text-accent">DATABASE_URL=postgresql+psycopg://…</code> for Supabase Postgres
            (see comments in the example); leave it empty to keep SQLite{" "}
            <code className="text-foreground">backend/ayuq.db</code>. Next.js:{" "}
            <code className="text-accent">NEXT_PUBLIC_API_URL</code> and optional{" "}
            <code className="text-accent">NEXT_PUBLIC_SUPABASE_*</code>. Uvicorn loads the same{" "}
            <code className="text-foreground">.env</code> from the repo root. Claude:{" "}
            <code className="text-foreground">ANTHROPIC_API_KEY</code>.
          </p>
        </div>

        <div className="mt-8 border-2 border-foreground bg-foreground p-6 text-background">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-background/60">
            POST /reading body
          </p>
          <pre className="mt-3 overflow-x-auto text-[10px] leading-relaxed text-background/90">
{`{
  "timestamp": "2025-04-05T14:30:00Z",
  "glucose_mgdl": 88,
  "glucose_trend": -3.2,
  "last_meal_mins_ago": 180,
  "meal_carbs_g": 45,
  "last_insulin_units": 4,
  "insulin_mins_ago": 90,
  "activity_level": "rest",
  "time_of_day": "afternoon",
  "patient_id": "P001"
}`}
          </pre>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex border-2 border-foreground bg-foreground px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-background"
          >
            Open dashboard
          </Link>
          <Link
            href="/alerts"
            className="inline-flex border-2 border-foreground px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            View alerts
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
