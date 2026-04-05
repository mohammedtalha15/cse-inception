#!/usr/bin/env python3
"""
Generate ~7 days of 5-minute-interval glucose readings for 3 demo patients.
Outputs CSVs under backend/data/ (create if missing).

Scenarios:
  P001 — post-exercise afternoon crash (activity high, sharp negative trend)
  P002 — night low from evening insulin (night window, insulin recent)
  P003 — slow daytime drop after skipping lunch (long meal gap, rest)
"""

from __future__ import annotations

import csv
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "backend" / "data"


def bucket_time_of_day(hour: int) -> str:
    if 5 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 22:
        return "evening"
    return "night"


def write_patient(
    patient_id: str,
    start: datetime,
    steps: int,
    row_fn,
) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{patient_id}_readings.csv"
    fields = [
        "timestamp",
        "glucose_mgdl",
        "glucose_trend",
        "last_meal_mins_ago",
        "meal_carbs_g",
        "last_insulin_units",
        "insulin_mins_ago",
        "activity_level",
        "time_of_day",
        "patient_id",
    ]
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for i in range(steps):
            ts = start + timedelta(minutes=5 * i)
            w.writerow(row_fn(ts, i))


def scenario_post_exercise(ts: datetime, i: int) -> dict:
    hour = ts.hour
    tod = bucket_time_of_day(hour)
    # Base drift + afternoon exercise dip
    phase = i / 200.0
    base = 118 + 12 * math.sin(phase) - (i % 17) * 0.15
    if 14 <= hour <= 17:
        base -= (hour - 14) * 6 + min(40, max(0, i - 400) * 0.08)
        trend = -1.8 - 0.02 * ((i % 50))
        activity = "high"
        meal_ago = min(300, 90 + (i % 40))
    else:
        trend = -0.2 + 0.15 * math.sin(i / 30.0)
        activity = "rest" if hour < 22 else "rest"
        meal_ago = min(200, 45 + (i % 80))
    return {
        "timestamp": ts.replace(tzinfo=timezone.utc).isoformat(),
        "glucose_mgdl": round(max(55, base), 1),
        "glucose_trend": round(trend, 2),
        "last_meal_mins_ago": int(meal_ago),
        "meal_carbs_g": 45 if meal_ago < 120 else 0,
        "last_insulin_units": 4.0,
        "insulin_mins_ago": min(180, 60 + (i % 90)),
        "activity_level": activity,
        "time_of_day": tod,
        "patient_id": "P001",
    }


def scenario_night_insulin(ts: datetime, i: int) -> dict:
    hour = ts.hour
    tod = bucket_time_of_day(hour)
    base = 105 + 8 * math.sin(i / 250.0)
    trend = -0.35 + 0.1 * math.sin(i / 40.0)
    ins_ago = 75 + (i % 40)
    meal_ago = 200 + (i % 60)
    activity = "rest"
    if tod == "night":
        base -= 18 + min(25, (i % 200) * 0.12)
        trend = -2.2 - 0.01 * (i % 30)
        ins_ago = min(ins_ago, 95)
        meal_ago = min(meal_ago + 60, 320)
    return {
        "timestamp": ts.replace(tzinfo=timezone.utc).isoformat(),
        "glucose_mgdl": round(max(52, base), 1),
        "glucose_trend": round(trend, 2),
        "last_meal_mins_ago": int(meal_ago),
        "meal_carbs_g": 50,
        "last_insulin_units": 6.0,
        "insulin_mins_ago": int(ins_ago),
        "activity_level": activity,
        "time_of_day": tod,
        "patient_id": "P002",
    }


def scenario_skip_lunch(ts: datetime, i: int) -> dict:
    hour = ts.hour
    tod = bucket_time_of_day(hour)
    base = 112 + 6 * math.sin(i / 180.0)
    trend = -0.4
    meal_ago = 60 + (i % 100)
    activity = "rest"
    if 11 <= hour <= 16:
        meal_ago = min(320, 200 + (i % 140))
        trend = -0.9 - 0.005 * (i % 50)
        base -= 12
    return {
        "timestamp": ts.replace(tzinfo=timezone.utc).isoformat(),
        "glucose_mgdl": round(max(58, base), 1),
        "glucose_trend": round(trend, 2),
        "last_meal_mins_ago": int(meal_ago),
        "meal_carbs_g": 40 if meal_ago < 150 else 0,
        "last_insulin_units": 3.5,
        "insulin_mins_ago": min(200, 85 + (i % 70)),
        "activity_level": activity,
        "time_of_day": tod,
        "patient_id": "P003",
    }


def main() -> None:
    start = datetime(2025, 4, 1, 0, 0, 0, tzinfo=timezone.utc)
    steps = 7 * 24 * 12  # 5-minute samples
    write_patient("P001", start, steps, scenario_post_exercise)
    write_patient("P002", start, steps, scenario_night_insulin)
    write_patient("P003", start, steps, scenario_skip_lunch)
    print(f"Wrote 3 CSVs × {steps} rows → {OUT_DIR}")


if __name__ == "__main__":
    main()
