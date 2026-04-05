import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowLeft } from "lucide-react";

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
        <h1 className="mb-4 font-mono text-2xl font-bold uppercase tracking-tight text-foreground">
          Enter data
        </h1>
        <p className="mb-8 font-mono text-sm leading-relaxed text-muted-foreground">
          Wire this view to your FastAPI <code className="text-foreground">POST /reading</code> flow.
          The simulator pushes structured vitals every five seconds; replace with your pump/CGM
          bridge when ready.
        </p>
        <div className="border-2 border-foreground bg-card p-6 font-mono text-xs text-muted-foreground">
          <p className="mb-2 text-foreground">Payload sketch</p>
          <pre className="overflow-x-auto text-[10px] leading-relaxed">
{`{
  "glucose_mgdl": 88,
  "glucose_trend": -2.1,
  "last_meal_mins_ago": 180,
  "meal_carbs_g": 45,
  "last_insulin_units": 4,
  "insulin_mins_ago": 90,
  "activity_level": "high",
  "time_of_day": "afternoon",
  "patient_id": "P001"
}`}
          </pre>
        </div>
      </main>
      <Footer />
    </div>
  );
}
