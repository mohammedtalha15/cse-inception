import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { EnterVitalsForm } from "@/components/enter-vitals-form";
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
        <p className="mb-8 font-mono text-sm leading-relaxed text-muted-foreground">
          Enter your current readings below. Ayuq combines trend, meals, insulin, and activity into
          a single risk score. When risk is elevated, you will see a short plain-language summary
          powered by Google Gemini (or built-in guidance if AI is unavailable).
        </p>

        <EnterVitalsForm />

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
