import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowLeft } from "lucide-react";

export default function AlertsPage() {
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
          Alerts & AI
        </h1>
        <p className="mb-8 font-mono text-sm leading-relaxed text-muted-foreground">
          High-risk events come from <code className="text-foreground">GET /alerts/{"{patient_id}"}</code>.
          When hybrid risk exceeds your threshold (e.g. 60), call Gemini once per escalation and render
          the explanation card here.
        </p>
        <div className="space-y-4">
          <div className="border-2 border-foreground bg-foreground p-4 text-background">
            <p className="font-mono text-[10px] uppercase tracking-widest text-background/60">
              Example narrative
            </p>
            <p className="mt-2 font-mono text-sm leading-relaxed">
              Your glucose is falling quickly after activity with a long gap since your last meal.
              Take 15g fast-acting carbohydrate and recheck in 15 minutes.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
