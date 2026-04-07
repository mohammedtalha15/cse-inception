"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Sparkles } from "lucide-react";

type Props = {
  onEstimatedCarbs: (grams: number | null, note: string) => void;
};

export function MealPhotoAssist({ onEstimatedCarbs }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setLocalErr("Choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setLocalErr("Image too large (max ~4 MB).");
      return;
    }
    setLocalErr(null);
    setBusy(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const dataUrl = r.result as string;
          const i = dataUrl.indexOf(",");
          resolve(i >= 0 ? dataUrl.slice(i + 1) : dataUrl);
        };
        r.onerror = () => reject(new Error("read failed"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/meal-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mimeType: file.type || "image/jpeg",
          imageBase64: b64,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        text?: string;
        estimatedCarbsG?: number | null;
      };
      if (!res.ok) {
        setLocalErr(data.error || `HTTP ${res.status}`);
        onEstimatedCarbs(null, "");
        return;
      }
      onEstimatedCarbs(
        typeof data.estimatedCarbsG === "number" ? data.estimatedCarbsG : null,
        data.text || "",
      );
    } catch {
      setLocalErr("Could not reach /api/meal-photo.");
      onEstimatedCarbs(null, "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded border border-foreground/10 bg-foreground/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3 w-3 text-accent" />
        Meal photo (Gemini vision)
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/90">
        Optional demo: estimates carbs from a meal photo (not medical advice). Uses your server{" "}
        <code className="text-foreground/80">GEMINI_API_KEY</code>.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 border border-foreground/20 bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-foreground/5 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
        {busy ? "Analyzing…" : "Upload meal photo"}
      </button>
      {localErr && (
        <p className="font-mono text-[10px] text-red-400/90">{localErr}</p>
      )}
    </div>
  );
}
