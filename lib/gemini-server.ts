/** Server-only Gemini REST helper with quota-aware model fallback. */

type GeminiContent = { role: string; parts: Array<{ text: string }> };

/** Multimodal parts (text + optional inline image) for vision calls. */
export type GeminiMultimodalPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

function normalizeModel(id: string): string {
  let m = id.trim();
  if (m.startsWith("models/")) m = m.slice("models/".length);
  return m;
}

function isQuotaLike(status: number, body: string): boolean {
  if (status === 429) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("resource exhausted") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  );
}

/** Old IDs like gemini-1.5-flash often 404 on v1beta; try the next configured model. */
function isModelUnavailable(status: number, body: string): boolean {
  const lower = body.toLowerCase();
  return (
    status === 404 ||
    lower.includes("not found for api version") ||
    lower.includes("not supported for generatecontent") ||
    lower.includes("is not found") ||
    lower.includes("invalid model")
  );
}

function parseGeminiError(raw: string): string {
  try {
    const j = JSON.parse(raw) as { error?: { message?: string } };
    if (j?.error?.message) return j.error.message;
  } catch {
    /* ignore */
  }
  return raw || "Gemini request failed";
}

function isInvalidApiKeyBody(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("please pass a valid api key")
  );
}

/** Strip whitespace; remove accidental surrounding quotes from .env */
export function normalizeGeminiApiKey(key: string): string {
  let s = key.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const INVALID_KEY_HELP =
  "Gemini rejected your API key (API_KEY_INVALID). Fix: open https://aistudio.google.com/apikey → Create API key → copy the full key into GEMINI_API_KEY in .env.local (no quotes, no spaces before/after). Restart `npm run dev`. In Google Cloud Console for that project, ensure “Generative Language API” is enabled.";

function extractText(raw: string): string {
  const j = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parts = j.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("").trim();
}

export async function geminiGenerateContent(options: {
  apiKey: string;
  primaryModel: string;
  fallbackModel?: string;
  systemInstruction: string;
  contents: GeminiContent[];
  maxOutputTokens: number;
  temperature?: number;
}): Promise<
  | { ok: true; text: string; modelUsed: string }
  | { ok: false; status: number; error: string }
> {
  const key = normalizeGeminiApiKey(options.apiKey);
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: INVALID_KEY_HELP,
    };
  }

  const primary = normalizeModel(options.primaryModel);
  const fb = options.fallbackModel?.trim()
    ? normalizeModel(options.fallbackModel)
    : normalizeModel(process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite");
  const models = primary === fb ? [primary] : [primary, fb];

  const bodyObj = {
    systemInstruction: { parts: [{ text: options.systemInstruction }] },
    contents: options.contents,
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature ?? 0.5,
    },
  };

  let lastStatus = 502;
  let lastError = "";

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });
    const raw = await res.text();

    if (res.ok) {
      try {
        const text = extractText(raw);
        return { ok: true, text: text || "(empty reply)", modelUsed: model };
      } catch {
        lastStatus = 502;
        lastError = "Bad response from model";
        continue;
      }
    }

    lastStatus = res.status >= 500 ? 502 : res.status;
    lastError = parseGeminiError(raw);

    if (isInvalidApiKeyBody(raw)) {
      return { ok: false, status: 401, error: INVALID_KEY_HELP };
    }

    const tryNext =
      model !== models[models.length - 1] &&
      (isQuotaLike(res.status, raw) || isModelUnavailable(res.status, raw));
    if (tryNext) {
      continue;
    }
    break;
  }

  if (lastStatus === 429 || isQuotaLike(lastStatus, lastError)) {
    return {
      ok: false,
      status: 429,
      error:
        "Gemini free quota for this Google Cloud project is used up (new API keys in the same project share the same limit). Wait for the daily reset, enable billing in Google AI Studio / Cloud Console, or create a new Google Cloud project and API key. Sugarfree already tried a lighter fallback model if one was configured.",
    };
  }

  return { ok: false, status: lastStatus, error: lastError };
}

/**
 * Vision: same retry/fallback behavior as generateContent, with inline image + text parts.
 */
export async function geminiGenerateMultimodal(options: {
  apiKey: string;
  primaryModel: string;
  fallbackModel?: string;
  systemInstruction: string;
  userParts: GeminiMultimodalPart[];
  maxOutputTokens: number;
  temperature?: number;
}): Promise<
  | { ok: true; text: string; modelUsed: string }
  | { ok: false; status: number; error: string }
> {
  const key = normalizeGeminiApiKey(options.apiKey);
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: INVALID_KEY_HELP,
    };
  }

  const primary = normalizeModel(options.primaryModel);
  const fb = options.fallbackModel?.trim()
    ? normalizeModel(options.fallbackModel)
    : normalizeModel(process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite");
  const models = primary === fb ? [primary] : [primary, fb];

  const bodyObj = {
    systemInstruction: { parts: [{ text: options.systemInstruction }] },
    contents: [{ role: "user", parts: options.userParts }],
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens,
      temperature: options.temperature ?? 0.4,
    },
  };

  let lastStatus = 502;
  let lastError = "";

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
    });
    const raw = await res.text();

    if (res.ok) {
      try {
        const text = extractText(raw);
        return { ok: true, text: text || "(empty reply)", modelUsed: model };
      } catch {
        lastStatus = 502;
        lastError = "Bad response from model";
        continue;
      }
    }

    lastStatus = res.status >= 500 ? 502 : res.status;
    lastError = parseGeminiError(raw);

    if (isInvalidApiKeyBody(raw)) {
      return { ok: false, status: 401, error: INVALID_KEY_HELP };
    }

    const tryNext =
      model !== models[models.length - 1] &&
      (isQuotaLike(res.status, raw) || isModelUnavailable(res.status, raw));
    if (tryNext) {
      continue;
    }
    break;
  }

  if (lastStatus === 429 || isQuotaLike(lastStatus, lastError)) {
    return {
      ok: false,
      status: 429,
      error:
        "Gemini quota or rate limit — try again later or check billing on the API key project.",
    };
  }

  return { ok: false, status: lastStatus, error: lastError };
}
