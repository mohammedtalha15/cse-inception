import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowLeft } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16 lg:px-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <h1 className="mb-4 font-mono text-2xl font-bold uppercase tracking-tight text-foreground">
          Live dashboard
        </h1>
        <p className="mb-8 max-w-xl font-mono text-sm leading-relaxed text-muted-foreground">
          Connect charts to <code className="text-foreground">GET /readings/{"{patient_id}"}</code> for
          the last 24 hours. Add a risk gauge bound to the hybrid score and a strip for active
          scenario (post-exercise, night insulin, skipped meal).
        </p>
        <div className="grid gap-4 border-2 border-foreground md:grid-cols-2">
          <div className="min-h-[160px] border-b-2 border-foreground bg-muted/30 p-4 md:border-b-0 md:border-r-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Glucose trace
            </span>
            <p className="mt-4 font-mono text-xs text-muted-foreground">Chart placeholder</p>
          </div>
          <div className="min-h-[160px] bg-muted/20 p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Risk meter (0–100)
            </span>
            <p className="mt-4 font-mono text-xs text-muted-foreground">Gauge placeholder</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
