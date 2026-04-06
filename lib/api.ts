import type { AlertItem, Reading, SimulatorState } from "./types";

const DEFAULT = "http://127.0.0.1:8000";

/**
 * In the browser, call same-origin `/api/backend/*` so Next proxies to FastAPI (avoids CORS /
 * Safari "Load failed" on cross-origin localhost). Server-side keeps direct URL for scripts.
 */
export function apiBase(): string {
  if (typeof window !== "undefined") {
    return "/api/backend";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT;
}

function formatDetail(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return typeof item === "string" ? item : JSON.stringify(item);
      })
      .filter(Boolean)
      .join("; ");
  }
  if (typeof detail === "object") return JSON.stringify(detail);
  return String(detail);
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text();
    let msg = t || res.statusText;
    try {
      const j = JSON.parse(t) as { detail?: unknown };
      if (j?.detail !== undefined) msg = formatDetail(j.detail) || msg;
    } catch {
      /* not JSON */
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchReadings(
  patientId: string,
  hours = 24,
): Promise<Reading[]> {
  const b = apiBase();
  const res = await fetch(
    `${b}/readings/${encodeURIComponent(patientId)}?hours=${hours}`,
    { cache: "no-store" },
  );
  return parse<Reading[]>(res);
}

export async function fetchLatest(patientId: string): Promise<Reading | null> {
  const b = apiBase();
  const res = await fetch(
    `${b}/readings/${encodeURIComponent(patientId)}/latest`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  return parse<Reading | null>(res);
}

export async function fetchAlerts(patientId: string): Promise<AlertItem[]> {
  const b = apiBase();
  const res = await fetch(
    `${b}/alerts/${encodeURIComponent(patientId)}`,
    { cache: "no-store" },
  );
  return parse<AlertItem[]>(res);
}

export async function postScenario(
  patientId: string,
  action: string,
): Promise<{ ok: boolean; state: SimulatorState }> {
  const b = apiBase();
  const res = await fetch(
    `${b}/simulator/${encodeURIComponent(patientId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
  return parse(res);
}

export async function fetchSimulatorState(
  patientId: string,
): Promise<SimulatorState> {
  const b = apiBase();
  const res = await fetch(
    `${b}/simulator/${encodeURIComponent(patientId)}`,
    { cache: "no-store" },
  );
  return parse<SimulatorState>(res);
}

export async function postProfile(data: Record<string, unknown>) {
  const b = apiBase();
  const res = await fetch(`${b}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return parse(res);
}

export async function postReading(
  body: Record<string, unknown>,
): Promise<Reading> {
  const b = apiBase();
  const res = await fetch(`${b}/reading`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse<Reading>(res);
}

export async function fetchProfile(patientId: string) {
  const b = apiBase();
  const res = await fetch(
    `${b}/profile/${encodeURIComponent(patientId)}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  return parse<Record<string, unknown>>(res);
}

export async function predictDiabetesRisk(input: number[]) {
  const b = apiBase();
  const res = await fetch(`${b}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  return parse<{
    prediction: number;
    probability: number;
    risk_level: string;
    explanation: string;
  }>(res);
}

