"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";

const W = 320;
const H = 240;

const bayerMatrix = [
  [0, 2],
  [3, 1],
];

/**
 * Dithered “risk field” — calmer center at low hybrid; edges roughen as score rises.
 * Interactive: slider (0–100) + pointer over the canvas.
 */
export function DitherCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const [hybridDemo, setHybridDemo] = useState(38);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const hybridRef = useRef(hybridDemo);
  const rafRef = useRef(0);

  useEffect(() => {
    hybridRef.current = hybridDemo;
  }, [hybridDemo]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = W;
    canvas.height = H;

    const isDark = resolvedTheme === "dark";
    const darkVal = isDark ? 230 : 10;
    const lightVal = isDark ? 15 : 230;

    const hybrid = hybridRef.current / 100;
    const imageData = ctx.createImageData(W, H);
    const data = imageData.data;
    const cx = W / 2;
    const cy = H / 2;
    const m = mouseRef.current;
    const mx = m?.x ?? cx;
    const my = m?.y ?? cy;
    const maxDist = Math.sqrt(cx ** 2 + cy ** 2);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;

        const distCore = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
        const gradient = 1 - distCore / maxDist;

        const freq = 0.045 + hybrid * 0.06;
        const wave =
          Math.sin(x * freq) *
          Math.cos(y * (freq * 0.65)) *
          (0.22 + hybrid * 0.45);

        const tension = hybrid * 0.35;
        const grain =
          tension * Math.sin(x * 0.31 + y * 0.19 + hybrid * 6.28) * 0.05;
        const value = gradient * (1 - tension) + wave + grain;

        const bayerValue = bayerMatrix[y % 2][x % 2] / 4;
        const dithered = value > bayerValue ? darkVal : lightVal;

        data[idx] = dithered;
        data[idx + 1] = dithered;
        data[idx + 2] = dithered;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [resolvedTheme]);

  const schedulePaint = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      paint();
    });
  }, [paint]);

  useEffect(() => {
    schedulePaint();
  }, [hybridDemo, resolvedTheme, schedulePaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top) * sy,
      };
      schedulePaint();
    };

    const onLeave = () => {
      mouseRef.current = null;
      schedulePaint();
    };

    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      mouseRef.current = {
        x: (t.clientX - rect.left) * sx,
        y: (t.clientY - rect.top) * sy,
      };
      schedulePaint();
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchend", onLeave);

    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchend", onLeave);
    };
  }, [schedulePaint]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b-2 border-foreground px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Hybrid risk field
          </span>
          <span className="font-mono text-[9px] leading-snug text-muted-foreground/80">
            Pointer = focal “calm” region · slider = demo hybrid (0–100)
          </span>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
          {W}×{H}
        </span>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden bg-background p-4">
        <div className="relative mx-auto w-full max-w-[320px]">
          <canvas
            ref={canvasRef}
            className="h-auto w-full cursor-crosshair touch-none"
            style={{ imageRendering: "pixelated" }}
            aria-label="Interactive hybrid risk field demo"
            role="img"
          />
        </div>
        <label className="mt-3 flex flex-col gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center justify-between gap-2">
            Demo hybrid score
            <span className="tabular-nums text-foreground">{hybridDemo}</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={hybridDemo}
            onChange={(e) => setHybridDemo(Number(e.target.value))}
            className="w-full accent-[#ea580c]"
          />
        </label>
      </div>
    </div>
  );
}
