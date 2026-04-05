#!/usr/bin/env python3
"""
Push a synthetic reading to Ayuq FastAPI every 5 seconds (demo loop).
Uses GET /simulator/{patient_id} to apply scenario modifiers from the UI.

Usage:
  pip install -r backend/requirements.txt httpx
  uvicorn main:app --reload   # from backend/
  python scripts/live_simulator.py --patient P001
"""

from __future__ import annotations

import argparse
import math
import random
import time
from datetime import datetime, timezone

import httpx

DEFAULT_API_BASE = "http://127.0.0.1:8000"


def bucket_time_of_day(hour: int) -> str:
    if 5 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 22:
        return "evening"
    return "night"


def fetch_state(client: httpx.Client, base: str, patient_id: str) -> dict:
    r = client.get(f"{base}/simulator/{patient_id}", timeout=5.0)
    if r.status_code == 404:
        return {}
    r.raise_for_status()
    return r.json()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--patient", default="P001")
    ap.add_argument("--base", default=DEFAULT_API_BASE)
    ap.add_argument("--interval", type=float, default=5.0)
    args = ap.parse_args()
    base = args.base.rstrip("/")

    g = 110.0
    trend = -0.3
    i = 0

    with httpx.Client() as client:
        while True:
            now = datetime.now(timezone.utc)
            hour = now.hour
            tod = bucket_time_of_day(hour)
            try:
                st = fetch_state(client, base, args.patient)
            except Exception:
                st = {}

            meal_ago = int(90 + 40 * math.sin(i / 20) + st.get("skip_meal_boost_mins", 0))
            meal_ago = min(400, max(30, meal_ago))

            ins_ago = int(70 + (i % 50))
            extra_ins = float(st.get("extra_insulin_units", 0))
            if extra_ins > 0:
                ins_ago = max(25, ins_ago - int(extra_ins * 5))

            activity = "high" if st.get("workout_active") else "rest"
            if activity == "high":
                trend = -1.4 + random.uniform(-0.4, 0.2)
                g -= random.uniform(0.8, 2.2)
            else:
                drift = -0.25 + 0.1 * math.sin(i / 15)
                if meal_ago > 240:
                    drift -= 0.5
                trend = drift + random.uniform(-0.15, 0.15)
                g += trend * (args.interval / 60.0) * 8 + random.uniform(-0.4, 0.4)

            g = max(52, min(220, g))

            body = {
                "timestamp": now.isoformat(),
                "glucose_mgdl": round(g, 1),
                "glucose_trend": round(trend, 2),
                "last_meal_mins_ago": meal_ago,
                "meal_carbs_g": 45.0 if meal_ago < 120 else 0.0,
                "last_insulin_units": 4.0 + extra_ins,
                "insulin_mins_ago": ins_ago,
                "activity_level": activity,
                "time_of_day": tod,
                "patient_id": args.patient,
            }

            try:
                r = client.post(f"{base}/reading", json=body, timeout=10.0)
                r.raise_for_status()
                out = r.json()
                print(
                    f"[{now.strftime('%H:%M:%S')}] g={out['glucose_mgdl']} "
                    f"hybrid={out['hybrid_score']} rule={out['rule_score']} ml={out['ml_score']}"
                )
            except Exception as e:
                print(f"POST failed: {e}")

            i += 1
            time.sleep(args.interval)


if __name__ == "__main__":
    main()
