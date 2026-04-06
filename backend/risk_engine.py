"""Rule-based risk scoring with per-factor breakdown for explainability."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict


class RiskFactor(TypedDict):
    key: str
    label: str
    points: int


def _djb2(s: str) -> int:
    h = 5381
    for c in s:
        h = ((h << 5) + h + ord(c)) & 0xFFFFFFFF
    return h


def ml_stub_score(patient_id: str, glucose_mgdl: float, rule_score: int) -> int:
    """
    Deterministic pseudo-ML head for hybrid display — not a trained XGBoost/PKL model.
    A real learned model would load weights here and map the same reading features to a score.
    """
    key = f"{patient_id}:{round(glucose_mgdl, 1)}"
    h = _djb2(key)
    jitter = (h % 19) - 9
    return max(0, min(100, rule_score + jitter))


def hybrid_score(rule_score: int, ml_score: int, rule_weight: float = 0.55) -> int:
    return int(round(rule_weight * rule_score + (1 - rule_weight) * ml_score))


def time_to_low_minutes(glucose_mgdl: float, trend_mgdl_per_min: float) -> Optional[float]:
    """
    Minutes until glucose hits 70 mg/dL if trend stays constant (negative trend only).
    time = (current - 70) / abs(trend)
    """
    if trend_mgdl_per_min >= 0 or glucose_mgdl <= 70:
        return None
    mins = (glucose_mgdl - 70) / abs(trend_mgdl_per_min)
    return max(0.0, mins)


def risk_bucket(score: int) -> str:
    if score <= 30:
        return "safe"
    if score <= 60:
        return "watch"
    return "alert"


def alert_type(score: int) -> str:
    if score <= 30:
        return "stable"
    if score <= 60:
        return "early"
    return "critical"


def profile_context_factors(reading: Dict[str, Any], profile: Dict[str, Any]) -> List[RiskFactor]:
    """
    Personalization from POST /profile — adds explainable points when habits amplify risk.
    """
    out: List[RiskFactor] = []

    if profile.get("sleep_window") and str(profile["sleep_window"]).strip():
        if reading.get("time_of_day") == "night":
            p = 4
            out.append(
                {
                    "key": "profile_sleep",
                    "label": "Your profile: sleep window — less awareness overnight",
                    "points": p,
                }
            )

    ap = (profile.get("activity_pattern") or "").lower()
    if ap and reading.get("activity_level") == "high":
        if any(k in ap for k in ("run", "cardio", "gym", "sport", "train", "bike", "hiit")):
            p = 5
            out.append(
                {
                    "key": "profile_activity",
                    "label": "Your profile: regular training — glucose falls faster with activity",
                    "points": p,
                }
            )

    if profile.get("typical_lunch_time") and str(profile["typical_lunch_time"]).strip():
        if reading.get("time_of_day") == "afternoon":
            meal_ago = int(reading.get("last_meal_mins_ago", 0))
            if meal_ago > 240:
                p = 6
                out.append(
                    {
                        "key": "profile_meal_habit",
                        "label": "Past your saved lunch window — long fast vs your usual pattern",
                        "points": p,
                    }
                )

    itype = (profile.get("insulin_type") or "").lower()
    if "rapid" in itype or "bolus" in itype or "humalog" in itype or "novolog" in itype:
        ins_ago = int(reading.get("insulin_mins_ago", 999))
        meal_ago = int(reading.get("last_meal_mins_ago", 0))
        if ins_ago < 90 and meal_ago > 200:
            p = 5
            out.append(
                {
                    "key": "profile_insulin",
                    "label": "Your profile: rapid insulin + long gap since eating",
                    "points": p,
                }
            )

    return out


def compute_risk_detailed(
    reading: Dict[str, Any],
    profile: Optional[Dict[str, Any]] = None,
    ml_model: Any = None,
    ml_scaler: Any = None,
) -> Dict[str, Any]:
    score = 0
    factors: List[RiskFactor] = []

    g = float(reading["glucose_mgdl"])
    if g < 70:
        p = 40
        score += p
        factors.append(
            {"key": "glucose", "label": "Glucose already in hypoglycemic range", "points": p}
        )
    elif g < 80:
        p = 25
        score += p
        factors.append({"key": "glucose", "label": "Glucose under 80 mg/dL", "points": p})
    elif g < 90:
        p = 10
        score += p
        factors.append({"key": "glucose", "label": "Glucose under 90 mg/dL", "points": p})

    trend = float(reading["glucose_trend"])
    if trend < -2.5:
        p = 30
        score += p
        factors.append({"key": "trend", "label": "Rapid fall (>2.5 mg/dL per min)", "points": p})
    elif trend < -1.5:
        p = 15
        score += p
        factors.append({"key": "trend", "label": "Falling quickly (>1.5 mg/dL per min)", "points": p})
    elif trend < -0.5:
        p = 5
        score += p
        factors.append({"key": "trend", "label": "Moderate downward trend", "points": p})

    ins_ago = int(reading["insulin_mins_ago"])
    if ins_ago < 60:
        p = 20
        score += p
        factors.append({"key": "insulin", "label": "Insulin still very active (<60 min)", "points": p})
    elif ins_ago < 120:
        p = 10
        score += p
        factors.append({"key": "insulin", "label": "Recent insulin (<120 min)", "points": p})

    meal_ago = int(reading["last_meal_mins_ago"])
    if meal_ago > 240:
        p = 15
        score += p
        factors.append({"key": "meal", "label": "Long gap since last meal (>4h)", "points": p})
    elif meal_ago > 180:
        p = 8
        score += p
        factors.append({"key": "meal", "label": "Extended fast (>3h)", "points": p})

    if reading.get("time_of_day") == "night":
        p = 10
        score += p
        factors.append({"key": "night", "label": "Nighttime (sleep / less awareness)", "points": p})

    if reading.get("activity_level") == "high":
        p = 10
        score += p
        factors.append({"key": "activity", "label": "High activity (faster glucose use)", "points": p})

    if profile and isinstance(profile, dict):
        pf = profile_context_factors(reading, profile)
        for f in pf:
            score += f["points"]
            factors.append(f)
    else:
        profile = {}

    rule_score = min(score, 100)
    patient_id = str(reading.get("patient_id", "P001"))
    
    # ML Score generation via RF model instead of stub
    ml = None
    if ml_model and ml_scaler:
        import numpy as np
        try:
            # Map features: [pregnancies, glucose, bp, skin, insulin, bmi, dpf, age]
            input_features = [
                float(profile.get("pregnancies", 0)),
                float(reading.get("glucose_mgdl", 100)),
                float(profile.get("blood_pressure", 72)),
                float(profile.get("skin_thickness", 20)),
                float(reading.get("last_insulin_units", 0)),
                float(profile.get("bmi", 25.0)),
                float(profile.get("dpf", 0.5)),
                float(profile.get("age", 35))
            ]
            input_data = np.array(input_features).reshape(1, -1)
            scaled_input = ml_scaler.transform(input_data)
            
            probabilities = ml_model.predict_proba(scaled_input)[0]
            probability = float(probabilities[1]) if len(probabilities) > 1 else 0.0
            
            # Probability returned by model mapped cleanly to the UI ML score out of 100
            ml = int(probability * 100)
            
            import warnings
            warnings.filterwarnings("ignore", category=UserWarning) # Suppress feature name warnings
        except Exception as e:
            print(f"Warning: ML pipeline mapping failed, using stub: {e}")
            
    if ml is None:
        ml = ml_stub_score(patient_id, g, rule_score)
        
    hybrid = hybrid_score(rule_score, ml)

    return {
        "rule_score": rule_score,
        "ml_score": ml,
        "hybrid_score": hybrid,
        "factors": factors,
        "bucket": risk_bucket(hybrid),
        "alert_type": alert_type(hybrid),
        "time_to_low_minutes": time_to_low_minutes(g, trend),
    }
