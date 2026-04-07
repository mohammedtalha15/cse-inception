import { NextResponse } from "next/server";
import {
  geminiGenerateContent,
  normalizeGeminiApiKey,
} from "@/lib/gemini-server";

type ChatMsg = { role: "user" | "assistant"; content: string };

function geminiKey(): string | undefined {
  const raw =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const cleaned = normalizeGeminiApiKey(raw);
  return cleaned || undefined;
}

export async function POST(req: Request) {
  const key = geminiKey();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Server missing GEMINI_API_KEY (or GOOGLE_API_KEY) in .env.local — add your Google AI Studio key and restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: {
    messages?: ChatMsg[];
    reportText?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = messages.filter(
    (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  ) as ChatMsg[];

  if (last.length === 0 || last[last.length - 1]?.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from user" },
      { status: 400 },
    );
  }

  const report = typeof body.reportText === "string" ? body.reportText.trim() : "";
  if (report.length > 20000) {
    return NextResponse.json(
      { error: "reportText is too long (max 20,000 chars)." },
      { status: 400 },
    );
  }
  const geminiContents = last.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (report && geminiContents[0]?.role === "user") {
    const first = geminiContents[0].parts[0]?.text ?? "";
    geminiContents[0] = {
      role: "user",
      parts: [
        {
          text: `[Attached report / lab text — user uploaded or pasted]\n${report}\n\n---\n\n${first}`,
        },
      ],
    };
  }

  const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim();

  const system =
    "You are Sugarfree, a concise assistant for diabetes education and interpreting glucose-related data and lab-style reports. You are not a medical provider; remind users to follow their care team for treatment decisions. Never diagnose; give general educational context only.";

  const result = await geminiGenerateContent({
    apiKey: key,
    primaryModel,
    fallbackModel: fallbackModel || undefined,
    systemInstruction: system,
    contents: geminiContents,
    maxOutputTokens: 768,
    temperature: 0.5,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status >= 500 ? 502 : result.status },
    );
  }

  return NextResponse.json({ text: result.text });
}
