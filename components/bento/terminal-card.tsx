"use client";

import { useEffect, useState } from "react";

const LOG_LINES = [
  "> Initializing Ayuq pipeline...",
  "> Streaming vitals: P001 @ 5s cadence",
  "> Feature extract: glucose_trend = -2.1 mg/dL·min",
  "> Rule engine: base score 35",
  "> ML head: P(hypo) = 0.18 → blended 42",
  "> Risk band: MEDIUM (amber)",
  "> Threshold check: Gemini explain → pending",
  "> Meal gap 220m + insulin active → escalate",
  "> Suggestion: 15g fast carbs within 10 min",
  "> --------- CYCLE COMPLETE ---------",
];

export function TerminalCard() {
  const [lines, setLines] = useState<string[]>(() => [LOG_LINES[0]]);
  const [currentLine, setCurrentLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        const next = prev + 1;
        if (next >= LOG_LINES.length) {
          setLines([]);
          return 0;
        }
        setLines((l) => [...l.slice(-8), LOG_LINES[next]]);
        return next;
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b-2 border-foreground px-4 py-2">
        <span className="h-2 w-2 bg-[#ea580c]" />
        <span className="h-2 w-2 bg-foreground" />
        <span className="h-2 w-2 border border-foreground" />
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">
          ayuq.engine.log
        </span>
      </div>
      <div className="flex-1 overflow-hidden bg-foreground p-4">
        <div className="flex flex-col gap-1">
          {lines.map((line, i) => (
            <span
              key={`${currentLine}-${i}`}
              className="block font-mono text-xs text-background"
              style={{ opacity: i === lines.length - 1 ? 1 : 0.6 }}
            >
              {line}
            </span>
          ))}
          <span className="animate-blink font-mono text-xs text-[#ea580c]">{"_"}</span>
        </div>
      </div>
    </div>
  );
}
