"""Claude explanation when risk is high; calm fallback without API key."""

from __future__ import annotations

import os
from typing import Any


def fallback_explanation(reading: dict[str, Any], hybrid: int, factors: list[dict]) -> str:
    parts = [f"Risk score is {hybrid}/100."]
    if factors:
        top = factors[:3]
        parts.append(
            "Main contributors: "
            + "; ".join(f"{f['label']} (+{f['points']})" for f in top)
            + "."
        )
    parts.append(
        "If you feel low or the trend keeps falling, take about 15g fast-acting carbohydrate "
        "and recheck in 15 minutes, or follow your care team's plan."
    )
    return " ".join(parts)


def generate_explanation(reading: dict[str, Any], hybrid: int, factors: list[dict]) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return fallback_explanation(reading, hybrid, factors)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        factor_lines = "\n".join(f"- {f['label']}: +{f['points']}" for f in factors[:8])
        prompt = f"""A diabetic patient's glucose monitoring data shows:
- Current glucose: {reading['glucose_mgdl']} mg/dL
- Trend: {reading['glucose_trend']} mg/dL per minute
- Last insulin: {reading['insulin_mins_ago']} minutes ago ({reading['last_insulin_units']} units)
- Last meal: {reading['last_meal_mins_ago']} minutes ago
- Activity: {reading['activity_level']}
- Time of day: {reading['time_of_day']}
- Hybrid risk score: {hybrid}/100 (rules + model blend)

Contributing factors:
{factor_lines or "(none listed)"}

In exactly 2 short sentences, explain clearly to the patient why hypoglycemia risk is elevated right now and what they should do. Use simple, calm language. No medical jargon."""

        message = client.messages.create(
            model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        block = message.content[0]
        if block.type == "text":
            return block.text.strip()
    except Exception:
        pass
    return fallback_explanation(reading, hybrid, factors)
