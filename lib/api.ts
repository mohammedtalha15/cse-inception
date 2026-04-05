import type { AlertItem, Reading, SimulatorState } from "./types";

const DEFAULT = "http://127.0.0.1:8000";

export function apiBase(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT;
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
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

export async function fetchProfile(patientId: string) {
  const b = apiBase();
  const res = await fetch(
    `${b}/profile/${encodeURIComponent(patientId)}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  return parse<Record<string, unknown>>(res);
}
