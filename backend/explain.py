"""Gemini explanation when risk is high; calm fallback without API key."""

from __future__ import annotations

import os
from typing import Any

import httpx


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


def _gemini_key() -> str:
    return (
        os.environ.get("GEMINI_API_KEY", "").strip()
        or os.environ.get("GOOGLE_API_KEY", "").strip()
    )


def _normalize_api_key(raw: str) -> str:
    s = raw.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        s = s[1:-1].strip()
    return s


def _invalid_api_key_response(resp: httpx.Response) -> bool:
    try:
        j = resp.json()
        err = j.get("error") or {}
        for d in err.get("details") or []:
            if isinstance(d, dict) and d.get("reason") == "API_KEY_INVALID":
                return True
        msg = str(err.get("message", "")).lower()
        return "api key not valid" in msg or "invalid api key" in msg
    except Exception:
        return False


def _norm_model(name: str) -> str:
    m = name.strip()
    if m.startswith("models/"):
        return m[len("models/") :]
    return m


def _should_try_next_model(resp: httpx.Response) -> bool:
    if resp.status_code == 429:
        return True
    if resp.status_code == 404:
        return True
    try:
        j = resp.json()
        err = j.get("error") or {}
        msg = str(err.get("message", "")).lower()
        st = str(err.get("status", "")).upper()
        if (
            "quota" in msg
            or "resource exhausted" in msg
            or st == "RESOURCE_EXHAUSTED"
            or "rate limit" in msg
        ):
            return True
        if (
            "not found for api version" in msg
            or "not supported for generatecontent" in msg
            or "is not found" in msg
        ):
            return True
    except Exception:
        pass
    return False


def _extract_text(data: dict[str, Any]) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
    return "".join(texts).strip()


def generate_explanation(reading: dict[str, Any], hybrid: int, factors: list[dict]) -> str:
    api_key = _normalize_api_key(_gemini_key())
    if not api_key:
        return fallback_explanation(reading, hybrid, factors)

    primary = _norm_model(os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"))
    fb_raw = os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite").strip()
    fallback = _norm_model(fb_raw) if fb_raw else ""
    models = [primary] if primary == fallback else [primary, fallback]

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

    payload: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": 200,
            "temperature": 0.4,
        },
    }

    url_tpl = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"

    try:
        # Keep under typical serverless proxy limits (e.g. ~10s) so /reading does not 502/500.
        with httpx.Client(timeout=10.0) as client:
            for i, model in enumerate(models):
                r = client.post(
                    url_tpl.format(model),
                    params={"key": api_key},
                    json=payload,
                )
                if r.is_success:
                    data = r.json()
                    out = _extract_text(data)
                    if out:
                        return out
                    return fallback_explanation(reading, hybrid, factors)

                if _invalid_api_key_response(r):
                    break

                if _should_try_next_model(r) and i < len(models) - 1:
                    continue
                break
    except Exception:
        pass
    return fallback_explanation(reading, hybrid, factors)


def _chat_fallback(user_message: str, context: str | None) -> str:
    base = (
        "Ayuq focuses on hypoglycemia risk from glucose trend, meals, insulin, and activity. "
        "This reply is offline: follow your clinician's plan for lows (typically about 15g fast carb, "
        "recheck in ~15 minutes), and seek emergency care for severe symptoms."
    )
    if context:
        return f"{base}\n\nContext we have: {context}\nYour question was: {user_message[:500]}"
    return f"{base}\n\nYour question was: {user_message[:500]}"


def generate_chat_reply(user_message: str, context: str | None) -> str:
    """Short patient-facing answer; uses Gemini when configured."""
    api_key = _normalize_api_key(_gemini_key())
    if not api_key:
        return _chat_fallback(user_message, context)

    primary = _norm_model(os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"))
    fb_raw = os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite").strip()
    fallback = _norm_model(fb_raw) if fb_raw else ""
    models = [primary] if primary == fallback else [primary, fallback]

    ctx_block = f"\n\nRecent stored context:\n{context}\n" if context else ""
    prompt = f"""You are Ayuq, a calm diabetes education assistant (not a doctor).{ctx_block}
User question:
{user_message}

Rules:
- Answer in 3–6 short sentences, plain language.
- Relate to hypoglycemia risk, glucose trends, meals, insulin, or activity when relevant.
- Never diagnose; say to follow the user's care team for medical decisions.
- If they report emergency symptoms (unconscious, seizure, can't swallow), tell them to call emergency services now.
- Do not claim you saw real-time medical devices unless context above includes readings."""

    payload: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": 512,
            "temperature": 0.35,
        },
    }

    url_tpl = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"

    try:
        with httpx.Client(timeout=8.0) as client:
            for i, model in enumerate(models):
                r = client.post(
                    url_tpl.format(model),
                    params={"key": api_key},
                    json=payload,
                )
                if r.is_success:
                    data = r.json()
                    out = _extract_text(data)
                    if out:
                        return out
                    return _chat_fallback(user_message, context)

                if _invalid_api_key_response(r):
                    break

                if _should_try_next_model(r) and i < len(models) - 1:
                    continue
                break
    except Exception:
        pass
    return _chat_fallback(user_message, context)
