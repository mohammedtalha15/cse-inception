import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
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
          Profile & habits
        </h1>
        <p className="mb-8 font-mono text-sm leading-relaxed text-muted-foreground">
          Map this screen to <code className="text-foreground">POST /profile</code> — capture insulin
          curves, meal windows, and activity defaults so the feature layer and Gemini prompts stay
          personalized.
        </p>
        <div className="border-2 border-dashed border-border p-8 text-center font-mono text-xs text-muted-foreground">
          Form fields placeholder
        </div>
      </main>
      <Footer />
    </div>
  );
}
