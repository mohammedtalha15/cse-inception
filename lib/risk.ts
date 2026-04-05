/** Mirrors backend/risk_engine.py for offline demo / consistency checks. */

import type { RiskFactor } from "./types";

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

export function mlStubScore(
  patientId: string,
  glucoseMgdl: number,
  ruleScore: number,
): number {
  const key = `${patientId}:${Math.round(glucoseMgdl * 10) / 10}`;
  const h = djb2(key);
  const jitter = (h % 19) - 9;
  return Math.max(0, Math.min(100, ruleScore + jitter));
}

export function hybridScore(rule: number, ml: number, ruleWeight = 0.55): number {
  return Math.round(ruleWeight * rule + (1 - ruleWeight) * ml);
}

export function timeToLowMinutes(
  glucoseMgdl: number,
  trendMgdlPerMin: number,
): number | null {
  if (trendMgdlPerMin >= 0 || glucoseMgdl <= 70) return null;
  const mins = (glucoseMgdl - 70) / Math.abs(trendMgdlPerMin);
  return Math.max(0, mins);
}

export function riskBucket(score: number): "safe" | "watch" | "alert" {
  if (score <= 30) return "safe";
  if (score <= 60) return "watch";
  return "alert";
}

export function alertTypeFromScore(score: number): "stable" | "early" | "critical" {
  if (score <= 30) return "stable";
  if (score <= 60) return "early";
  return "critical";
}

export type ProfileContext = Record<string, unknown> | null | undefined;

function profileContextFactors(
  reading: {
    last_meal_mins_ago: number;
    insulin_mins_ago: number;
    activity_level: string;
    time_of_day: string;
  },
  profile: Record<string, unknown>,
): RiskFactor[] {
  const out: RiskFactor[] = [];

  if (profile.sleep_window && String(profile.sleep_window).trim()) {
    if (reading.time_of_day === "night") {
      const p = 4;
      out.push({
        key: "profile_sleep",
        label: "Your profile: sleep window — less awareness overnight",
        points: p,
      });
    }
  }

  const ap = String(profile.activity_pattern ?? "").toLowerCase();
  if (ap && reading.activity_level === "high") {
    if (/\b(run|cardio|gym|sport|train|bike|hiit)\b/.test(ap)) {
      const p = 5;
      out.push({
        key: "profile_activity",
        label: "Your profile: regular training — glucose falls faster with activity",
        points: p,
      });
    }
  }

  if (profile.typical_lunch_time && String(profile.typical_lunch_time).trim()) {
    if (reading.time_of_day === "afternoon" && reading.last_meal_mins_ago > 240) {
      const p = 6;
      out.push({
        key: "profile_meal_habit",
        label: "Past your saved lunch window — long fast vs your usual pattern",
        points: p,
      });
    }
  }

  const itype = String(profile.insulin_type ?? "").toLowerCase();
  if (/\b(rapid|bolus|humalog|novolog|fiasp|lyumjev)\b/.test(itype)) {
    if (reading.insulin_mins_ago < 90 && reading.last_meal_mins_ago > 200) {
      const p = 5;
      out.push({
        key: "profile_insulin",
        label: "Your profile: rapid insulin + long gap since eating",
        points: p,
      });
    }
  }

  return out;
}

export function computeRiskDetailed(
  reading: {
    glucose_mgdl: number;
    glucose_trend: number;
    last_meal_mins_ago: number;
    insulin_mins_ago: number;
    activity_level: string;
    time_of_day: string;
    patient_id?: string;
  },
  profile?: ProfileContext,
): {
  rule_score: number;
  ml_score: number;
  hybrid_score: number;
  factors: RiskFactor[];
  bucket: ReturnType<typeof riskBucket>;
  alert_type: ReturnType<typeof alertTypeFromScore>;
  time_to_low_minutes: number | null;
} {
  let score = 0;
  const factors: RiskFactor[] = [];
  const pid = reading.patient_id ?? "P001";

  const g = reading.glucose_mgdl;
  if (g < 70) {
    const p = 40;
    score += p;
    factors.push({
      key: "glucose",
      label: "Glucose already in hypoglycemic range",
      points: p,
    });
  } else if (g < 80) {
    const p = 25;
    score += p;
    factors.push({ key: "glucose", label: "Glucose under 80 mg/dL", points: p });
  } else if (g < 90) {
    const p = 10;
    score += p;
    factors.push({ key: "glucose", label: "Glucose under 90 mg/dL", points: p });
  }

  const trend = reading.glucose_trend;
  if (trend < -2.5) {
    const p = 30;
    score += p;
    factors.push({
      key: "trend",
      label: "Rapid fall (>2.5 mg/dL per min)",
      points: p,
    });
  } else if (trend < -1.5) {
    const p = 15;
    score += p;
    factors.push({
      key: "trend",
      label: "Falling quickly (>1.5 mg/dL per min)",
      points: p,
    });
  } else if (trend < -0.5) {
    const p = 5;
    score += p;
    factors.push({ key: "trend", label: "Moderate downward trend", points: p });
  }

  const insAgo = reading.insulin_mins_ago;
  if (insAgo < 60) {
    const p = 20;
    score += p;
    factors.push({
      key: "insulin",
      label: "Insulin still very active (<60 min)",
      points: p,
    });
  } else if (insAgo < 120) {
    const p = 10;
    score += p;
    factors.push({ key: "insulin", label: "Recent insulin (<120 min)", points: p });
  }

  const mealAgo = reading.last_meal_mins_ago;
  if (mealAgo > 240) {
    const p = 15;
    score += p;
    factors.push({
      key: "meal",
      label: "Long gap since last meal (>4h)",
      points: p,
    });
  } else if (mealAgo > 180) {
    const p = 8;
    score += p;
    factors.push({ key: "meal", label: "Extended fast (>3h)", points: p });
  }

  if (reading.time_of_day === "night") {
    const p = 10;
    score += p;
    factors.push({
      key: "night",
      label: "Nighttime (sleep / less awareness)",
      points: p,
    });
  }

  if (reading.activity_level === "high") {
    const p = 10;
    score += p;
    factors.push({
      key: "activity",
      label: "High activity (faster glucose use)",
      points: p,
    });
  }

  if (profile && typeof profile === "object") {
    const pf = profileContextFactors(reading, profile);
    for (const f of pf) {
      score += f.points;
      factors.push(f);
    }
  }

  const ruleScore = Math.min(score, 100);
  const ml = mlStubScore(pid, g, ruleScore);
  const hybrid = hybridScore(ruleScore, ml);

  return {
    rule_score: ruleScore,
    ml_score: ml,
    hybrid_score: hybrid,
    factors,
    bucket: riskBucket(hybrid),
    alert_type: alertTypeFromScore(hybrid),
    time_to_low_minutes: timeToLowMinutes(g, trend),
  };
}
