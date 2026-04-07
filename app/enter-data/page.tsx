import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { EnterVitalsForm } from "@/components/enter-vitals-form";
import { DiabetesModelCheatSheet } from "@/components/diabetes-model-cheat-sheet";
import { DeployBackendBanner } from "@/components/deploy-backend-banner";
import { ArrowLeft, HeartPulse } from "lucide-react";

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
          <HeartPulse className="h-7 w-7 text-accent" strokeWidth={1.25} />
          <h1 className="font-mono text-2xl font-bold uppercase tracking-tight text-foreground">
            Log vitals
          </h1>
        </div>
        <p className="mb-6 font-mono text-sm leading-relaxed text-muted-foreground">
          Enter the <strong className="text-foreground/90">same eight clinical fields</strong> as the
          training dataset (Pima format — <strong className="text-foreground/90">order matters</strong>
          ), then optionally refine with CGM-style timing. Sugarfree cross-checks with the on-server random
          forest, blends rule-based hypoglycemia risk, and can use Gemini for explanations. Optional:
          upload a meal photo for a rough carb estimate (vision model — not a substitute for carb
          counting).
        </p>

        <div className="mb-6">
          <DiabetesModelCheatSheet />
        </div>

        <DeployBackendBanner />

        <div className="border-2 border-foreground bg-card p-6 sm:p-8">
          <EnterVitalsForm />
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex border-2 border-foreground bg-foreground px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-background"
          >
            Live dashboard
          </Link>
          <Link
            href="/alerts"
            className="inline-flex border-2 border-foreground px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            Alerts
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
