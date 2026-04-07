import { NextResponse } from "next/server";
import {
  geminiGenerateMultimodal,
  normalizeGeminiApiKey,
} from "@/lib/gemini-server";

export const runtime = "nodejs";
export const maxDuration = 60;

function geminiKey(): string | undefined {
  const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const cleaned = normalizeGeminiApiKey(raw);
  return cleaned || undefined;
}

/** Parse ESTIMATED_CARBS_G: line or fallback heuristics. */
function parseCarbsGuess(text: string): number | null {
  const line = text.match(/ESTIMATED_CARBS_G:\s*(\d+(?:\.\d+)?)/i);
  if (line) {
    const n = Number(line[1]);
    if (Number.isFinite(n) && n >= 0 && n <= 500) return Math.round(n * 10) / 10;
  }
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)/i);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) && n >= 0 && n <= 500 ? Math.round(n * 10) / 10 : null;
  }
  return null;
}

export async function POST(req: Request) {
  const key = geminiKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY — add it in the host environment (e.g. Vercel) or .env.local for local dev.",
      },
      { status: 503 },
    );
  }

  let body: { mimeType?: string; imageBase64?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mime = (body.mimeType || "image/jpeg").trim();
  const b64 = (body.imageBase64 || "").trim();
  if (!b64 || b64.length < 80) {
    return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
  }

  const primary = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const fb = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";

  const result = await geminiGenerateMultimodal({
    apiKey: key,
    primaryModel: primary,
    fallbackModel: fb,
    systemInstruction:
      "You help people with diabetes estimate meal carbohydrate content from a photo. " +
      "Reply in 2–4 short sentences. End with a line exactly: ESTIMATED_CARBS_G: <number> " +
      "where <number> is your best total carb estimate in grams (0–300). If the image is not food, say so and use ESTIMATED_CARBS_G: 0.",
    userParts: [
      {
        text: "Estimate total carbohydrates in grams for diabetes bolus planning. Be conservative if unsure.",
      },
      { inline_data: { mime_type: mime, data: b64 } },
    ],
    maxOutputTokens: 256,
    temperature: 0.35,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const carbs = parseCarbsGuess(result.text);
  return NextResponse.json({
    text: result.text,
    estimatedCarbsG: carbs,
    modelUsed: result.modelUsed,
  });
}
