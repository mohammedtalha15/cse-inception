import { ClipboardList } from "lucide-react";

const FEATURE_ORDER = [
  "Pregnancies",
  "Glucose",
  "Blood pressure (diastolic)",
  "Skin thickness",
  "Insulin",
  "BMI",
  "DPF (diabetes pedigree function)",
  "Age",
] as const;

export function DiabetesModelCheatSheet() {
  return (
    <details className="group border-2 border-foreground/15 bg-card/80 open:border-accent/35">
      <summary className="cursor-pointer list-none px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent" strokeWidth={1.5} />
          Diabetes model cheat sheet (reference)
        </span>
        <span className="ml-2 text-[9px] normal-case tracking-normal text-muted-foreground/80">
          — feature order, bands, demo vectors, pitch lines
        </span>
      </summary>

      <div className="space-y-6 border-t-2 border-foreground/10 px-4 py-5 font-mono text-[11px] leading-relaxed text-muted-foreground">
        <section>
          <h3 className="mb-2 border-b border-foreground/10 pb-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
            Input features (order matters)
          </h3>
          <ol className="list-decimal space-y-1 pl-5">
            {FEATURE_ORDER.map((label, i) => (
              <li key={label}>
                <span className="text-foreground/90">{i + 1}.</span> {label}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[10px] text-muted-foreground/85">
            Same order as training / scaler in <code className="text-foreground/80">backend/train.py</code>.
            Log vitals collects these as structured ML features; when insulin is skipped (no diagnosis),
            we send 0 for that slot.
          </p>
        </section>

        <section>
          <h3 className="mb-2 border-b border-foreground/10 pb-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
            Risk bands (reference — not a diagnosis)
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">Glucose (mg/dL)</dt>
              <dd className="mt-1 space-y-0.5">
                <div>&lt; 100 → normal</div>
                <div>100–125 → warning (prediabetes range)</div>
                <div>≥ 126 → high risk (diabetes range)</div>
              </dd>
            </div>
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">BMI</dt>
              <dd className="mt-1 space-y-0.5">
                <div>18.5–24.9 → normal</div>
                <div>25–29.9 → overweight</div>
                <div>≥ 30 → obese</div>
              </dd>
            </div>
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">Blood pressure (diastolic)</dt>
              <dd className="mt-1 space-y-0.5">
                <div>60–80 → normal</div>
                <div>80–89 → warning</div>
                <div>≥ 90 → high risk</div>
              </dd>
            </div>
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">Age</dt>
              <dd className="mt-1 space-y-0.5">
                <div>&lt; 35 → lower</div>
                <div>35–50 → moderate</div>
                <div>&gt; 50 → higher</div>
              </dd>
            </div>
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">Pregnancies</dt>
              <dd className="mt-1 space-y-0.5">
                <div>0–2 → normal</div>
                <div>3–5 → moderate</div>
                <div>&gt; 5 → high factor</div>
              </dd>
            </div>
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">Insulin (µU/mL)</dt>
              <dd className="mt-1 space-y-0.5">
                <div>16–166 → typical lab range</div>
                <div>&lt; 16 or &gt; 166 → flag as abnormal</div>
              </dd>
            </div>
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">Skin thickness (mm)</dt>
              <dd className="mt-1 space-y-0.5">
                <div>10–40 → typical</div>
                <div>0 or extreme → invalid / warning</div>
              </dd>
            </div>
            <div className="border border-foreground/10 bg-background/40 p-2">
              <dt className="text-[10px] uppercase tracking-wider text-accent">DPF (genetic risk)</dt>
              <dd className="mt-1 space-y-0.5">
                <div>&lt; 0.5 → low</div>
                <div>0.5–1.0 → moderate</div>
                <div>&gt; 1.0 → high</div>
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="mb-2 border-b border-foreground/10 pb-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
            Model output (binary class)
          </h3>
          <ul className="space-y-1">
            <li>
              <span className="text-foreground">0</span> → normal (not diabetic in model terms)
            </li>
            <li>
              <span className="text-foreground">1</span> → abnormal (diabetic in model terms)
            </li>
          </ul>
          <p className="mt-2 text-[10px] italic text-muted-foreground/90">
            Screening / education only — not a clinical diagnosis. Same preprocessing and scaling as
            training when RF + scaler are loaded.
          </p>
        </section>

        <section>
          <h3 className="mb-2 border-b border-foreground/10 pb-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
            Demo test vectors{" "}
            <span className="font-normal normal-case text-muted-foreground">[Pima order]</span>
          </h3>
          <div className="space-y-2 font-mono text-[10px] text-foreground/90">
            <p>
              <span className="text-muted-foreground">Low risk:</span>{" "}
              <code className="break-all text-[10px]">[1, 85, 66, 29, 0, 26.6, 0.351, 31]</code>
            </p>
            <p>
              <span className="text-muted-foreground">High risk:</span>{" "}
              <code className="break-all text-[10px]">[6, 148, 72, 35, 0, 33.6, 0.627, 50]</code>
            </p>
            <p>
              <span className="text-muted-foreground">Extreme risk:</span>{" "}
              <code className="break-all text-[10px]">[8, 180, 90, 40, 200, 40.0, 1.2, 60]</code>
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 border-b border-foreground/10 pb-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
            Talking points
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>We map user-friendly inputs to structured ML features.</li>
            <li>The model predicts; Gemini explains when configured.</li>
            <li>ML + AI together for interpretability — not a black box alone.</li>
            <li>This is a screening / demo tool, not a substitute for professional care.</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 border-b border-foreground/10 pb-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
            Quick debug check
          </h3>
          <ul className="space-y-1 text-[10px]">
            <li>✔ Feature order matches training</li>
            <li>✔ Same preprocessing as training</li>
            <li>✔ Scaler applied when model loads</li>
            <li>✔ Input shape = 2D array (1 × 8)</li>
          </ul>
        </section>

        <blockquote className="border-l-2 border-accent bg-accent/5 px-3 py-2 font-mono text-xs italic text-foreground/95">
          “We don’t just predict risk — we explain it in a way users can understand.”
        </blockquote>
      </div>
    </details>
  );
}
