from __future__ import annotations

import math
import os
import traceback
import hashlib
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import AlertRow, ProfileRow, ReadingRow, SimulatorStateRow, make_session_factory
from explain import fallback_explanation, generate_chat_reply, generate_explanation
from risk_engine import alert_type as risk_alert_type_from_score, compute_risk_detailed
from schemas import (
    AlertOut,
    ChatIn,
    ChatOut,
    DoctorNearbyOut,
    DoctorShareIn,
    DoctorShareOut,
    MLPredictRequest,
    MLPredictResponse,
    ProfileIn,
    ReadingIn,
    ReadingOut,
    ScenarioAction,
)

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent

load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_REPO_ROOT / ".env.local")


def _normalize_database_url(url: str) -> str:
    """Use psycopg v3 driver when URL is plain postgresql://."""
    if url.startswith("postgresql://") and "+psycopg" not in url and "+psycopg2" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DB_PATH = _BACKEND_DIR / "sugarfree.db"
_raw_db = (os.environ.get("DATABASE_URL") or "").strip() or f"sqlite:///{DB_PATH}"
DATABASE_URL = _normalize_database_url(_raw_db)
SessionLocal = make_session_factory(DATABASE_URL)

import pickle
import numpy as np
import google.generativeai as genai

_ML_MODEL = None
_ML_SCALER = None
try:
    with open(_BACKEND_DIR / "model.pkl", "rb") as f:
        _ML_MODEL = pickle.load(f)
    with open(_BACKEND_DIR / "scaler.pkl", "rb") as f:
        _ML_SCALER = pickle.load(f)
except Exception as e:
    print(f"Warning: Could not load ML models: {e}")

_PIMA_FEATURES = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DPF",
    "Age",
]

app = FastAPI(title="Sugarfree API", version="0.1.0")

_cors_raw = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
if not _cors_origins:
    _cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _finite_float_or_none(value: Any) -> Optional[float]:
    """Postgres JSON rejects NaN/Inf; numpy scalars may appear from ML paths."""
    if value is None:
        return None
    try:
        x = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(x):
        return None
    return x


def json_safe_reading_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    """JSON columns (e.g. Postgres) cannot store datetime objects — use ISO strings."""
    out: Dict[str, Any] = {}
    for k, v in payload.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, date):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def norm_path_patient_id(patient_id: str) -> str:
    """Match dashboard IDs (P001) even if the URL used p001."""
    s = (patient_id or "").strip().upper()
    return s if s else "P001"


def unpack_factors(fac) -> Tuple[List[Any], Optional[float]]:
    if isinstance(fac, dict) and "items" in fac:
        raw = fac["items"]
        return (raw if isinstance(raw, list) else []), fac.get("_ttl")
    if isinstance(fac, list):
        return fac, None
    return [], None


def _safe_factor_labels(items: Optional[List[Any]], limit: int = 5) -> str:
    parts: List[str] = []
    for f in (items or [])[:limit]:
        if isinstance(f, dict):
            parts.append(str(f.get("label", "") or "").strip())
        else:
            parts.append(str(f))
    return ", ".join(p for p in parts if p) or "none"


def _ml_meta_from_factors(fac: Any) -> Tuple[Optional[float], Optional[str]]:
    if isinstance(fac, dict) and isinstance(fac.get("_ml"), dict):
        m = fac["_ml"]
        return (
            m.get("diabetes_probability") if m.get("diabetes_probability") is not None else None,
            m.get("source"),
        )
    return None, None


def _alert_basis_score(hybrid_score: int, diabetes_prob: Optional[float]) -> int:
    """Use higher risk indicator so Alerts matches UI risk percentage expectations."""
    if diabetes_prob is None:
        return int(hybrid_score)
    ml_percent = int(round(max(0.0, min(1.0, float(diabetes_prob))) * 100.0))
    return max(int(hybrid_score), ml_percent)


def _doctor_pool() -> List[Dict[str, Any]]:
    return [
        {
            "doctor_id": "D001",
            "doctor_name": "Dr. Ananya Sharma",
            "clinic": "City Endocrine Clinic",
            "specialty": "Endocrinology",
            "distance_km": 2.4,
            "eta_minutes": 18,
            "available_channels": ["call", "chat", "video"],
            "phone": "+91-90000-10001",
            "language": "English / Hindi",
            "accepting_new_cases": True,
        },
        {
            "doctor_id": "D002",
            "doctor_name": "Dr. Rohan Verma",
            "clinic": "Metro Diabetes Center",
            "specialty": "Diabetology",
            "distance_km": 3.1,
            "eta_minutes": 24,
            "available_channels": ["call", "chat"],
            "phone": "+91-90000-10002",
            "language": "English / Hindi / Marathi",
            "accepting_new_cases": True,
        },
        {
            "doctor_id": "D003",
            "doctor_name": "Dr. Meera Iyer",
            "clinic": "CarePoint Internal Medicine",
            "specialty": "Internal Medicine",
            "distance_km": 4.8,
            "eta_minutes": 32,
            "available_channels": ["call", "video"],
            "phone": "+91-90000-10003",
            "language": "English / Tamil / Hindi",
            "accepting_new_cases": True,
        },
        {
            "doctor_id": "D004",
            "doctor_name": "Dr. Farhan Ali",
            "clinic": "Rural Telehealth Hub",
            "specialty": "General Practice",
            "distance_km": 6.2,
            "eta_minutes": 40,
            "available_channels": ["call", "chat"],
            "phone": "+91-90000-10004",
            "language": "English / Urdu / Hindi",
            "accepting_new_cases": True,
        },
    ]


def _nearby_doctors(pid: str, location_hint: str) -> List[Dict[str, Any]]:
    pool = _doctor_pool()
    key = f"{pid}:{(location_hint or '').strip().lower()}".encode("utf-8")
    seed = int(hashlib.sha256(key).hexdigest()[:8], 16)
    rotate = seed % len(pool)
    ordered = pool[rotate:] + pool[:rotate]
    return sorted(ordered, key=lambda d: (d["distance_km"], d["eta_minutes"]))


def _pick_doctor_from_nearby(
    doctors: List[Dict[str, Any]], doctor_id: Optional[str]
) -> Dict[str, Any]:
    if doctor_id:
        for d in doctors:
            if str(d.get("doctor_id", "")).upper() == doctor_id.strip().upper():
                return d
    return doctors[0]


def row_to_reading_out(row: ReadingRow) -> ReadingOut:
    items, ttl = unpack_factors(row.factors_json)
    dp, src = _ml_meta_from_factors(row.factors_json)
    return ReadingOut(
        id=row.id,
        timestamp=row.timestamp,
        patient_id=row.patient_id,
        glucose_mgdl=row.glucose_mgdl,
        glucose_trend=row.glucose_trend,
        last_meal_mins_ago=row.last_meal_mins_ago,
        meal_carbs_g=row.meal_carbs_g,
        last_insulin_units=row.last_insulin_units,
        insulin_mins_ago=row.insulin_mins_ago,
        activity_level=row.activity_level,
        time_of_day=row.time_of_day,
        rule_score=row.rule_score,
        ml_score=row.ml_score,
        hybrid_score=row.hybrid_score,
        factors=items,
        explanation=row.explanation,
        alert_type=row.alert_type,
        time_to_low_minutes=ttl,
        diabetes_ml_probability=dp,
        ml_model_source=src,
    )


@app.post("/reading", response_model=ReadingOut)
def post_reading(body: ReadingIn, db: Session = Depends(get_db)):
    try:
        ts = body.timestamp or datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        payload = body.model_dump()
        payload["timestamp"] = ts

        profile_row = db.get(ProfileRow, body.patient_id)
        profile_data = None
        if profile_row and isinstance(profile_row.data_json, dict):
            profile_data = profile_row.data_json

        detail = compute_risk_detailed(payload, profile_data, _ML_MODEL, _ML_SCALER)
        factors = detail["factors"]
        ttl = _finite_float_or_none(detail.get("time_to_low_minutes"))
        dp = detail.get("diabetes_ml_probability")
        src = detail.get("ml_model_source")
        factors_store: Dict[str, Any] = {"items": factors, "_ttl": ttl}
        if dp is not None or src:
            factors_store["_ml"] = {
                "diabetes_probability": _finite_float_or_none(dp),
                "source": src,
            }

        alert_score = _alert_basis_score(detail["hybrid_score"], _finite_float_or_none(dp))

        explanation = None
        if alert_score >= 40:
            try:
                explanation = generate_explanation(
                    payload, alert_score, factors
                )
            except Exception:
                traceback.print_exc()
                explanation = fallback_explanation(
                    payload, alert_score, factors
                )
            if not (explanation or "").strip():
                explanation = fallback_explanation(
                    payload, alert_score, factors
                )
        elif alert_score > 30:
            explanation = (
                f"Risk is {alert_score}/100 (below critical), but caution is advised. "
                "Take preventive measures now (check glucose trend, keep fast carbs ready, avoid overexertion), "
                "and consult your doctor promptly if symptoms appear or readings worsen."
            )
        else:
            explanation = (
                f"Risk is {alert_score}/100 and currently not critical. "
                "Continue routine monitoring, follow your care plan, and consult your doctor if you feel unwell."
            )

        if alert_score >= 40 and explanation:
            explanation = (
                f"{explanation} "
                "This is in the critical band. Contact a doctor or emergency support immediately, "
                "and share this alert summary."
            )

        if alert_score >= 40:
            db.add(
                AlertRow(
                    timestamp=ts,
                    patient_id=body.patient_id,
                    hybrid_score=alert_score,
                    explanation=explanation,
                    reading_snapshot=json_safe_reading_snapshot(payload),
                )
            )

        row = ReadingRow(
            timestamp=ts,
            patient_id=body.patient_id,
            glucose_mgdl=body.glucose_mgdl,
            glucose_trend=body.glucose_trend,
            last_meal_mins_ago=body.last_meal_mins_ago,
            meal_carbs_g=body.meal_carbs_g,
            last_insulin_units=body.last_insulin_units,
            insulin_mins_ago=body.insulin_mins_ago,
            activity_level=body.activity_level,
            time_of_day=body.time_of_day,
            rule_score=detail["rule_score"],
            ml_score=detail["ml_score"],
            hybrid_score=detail["hybrid_score"],
            factors_json=factors_store,
            explanation=explanation,
            alert_type=risk_alert_type_from_score(alert_score),
        )
        db.add(row)
        db.commit()
        db.refresh(row)

        return ReadingOut(
            id=row.id,
            timestamp=row.timestamp,
            patient_id=row.patient_id,
            glucose_mgdl=row.glucose_mgdl,
            glucose_trend=row.glucose_trend,
            last_meal_mins_ago=row.last_meal_mins_ago,
            meal_carbs_g=row.meal_carbs_g,
            last_insulin_units=row.last_insulin_units,
            insulin_mins_ago=row.insulin_mins_ago,
            activity_level=row.activity_level,
            time_of_day=row.time_of_day,
            rule_score=row.rule_score,
            ml_score=row.ml_score,
            hybrid_score=row.hybrid_score,
            factors=factors,
            explanation=explanation,
            alert_type=risk_alert_type_from_score(alert_score),
            time_to_low_minutes=ttl,
            diabetes_ml_probability=_finite_float_or_none(dp),
            ml_model_source=src,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(e) or type(e).__name__,
        ) from e


@app.post("/chat", response_model=ChatOut)
def post_chat(body: ChatIn, db: Session = Depends(get_db)):
    """Always returns 200 with a reply — avoids proxy timeouts surfacing as opaque 500s."""
    hard_fallback = (
        "I could not reach the AI service right now. General guidance: treat suspected lows with "
        "fast-acting carbohydrate per your care plan, recheck glucose, and get urgent help for "
        "confusion, seizures, or loss of consciousness."
    )
    try:
        pid = norm_path_patient_id(body.patient_id)
        context = None
        try:
            row = (
                db.query(ReadingRow)
                .filter(ReadingRow.patient_id == pid)
                .order_by(ReadingRow.timestamp.desc())
                .first()
            )
            if row:
                items, _ttl = unpack_factors(row.factors_json)
                top_labels = _safe_factor_labels(items)
                dp, msrc = _ml_meta_from_factors(row.factors_json)
                ml_line = ""
                if dp is not None and msrc == "random_forest":
                    ml_line = (
                        f" Trained Pima diabetes model probability (class 1): {dp:.1%}; "
                        f"ML score column {row.ml_score}/100 blends this with rules."
                    )
                elif msrc == "stub":
                    ml_line = " ML score uses a deterministic stub (train model.pkl for RF)."
                context = (
                    f"Patient {pid}: latest glucose {row.glucose_mgdl} mg/dL, "
                    f"trend {row.glucose_trend} mg/dL/min, hybrid risk {row.hybrid_score}/100, "
                    f"alert band {row.alert_type or 'n/a'}. "
                    f"Factor labels: {top_labels}.{ml_line}"
                )
        except Exception:
            traceback.print_exc()
            context = None

        reply = generate_chat_reply(body.message.strip(), context)
        return ChatOut(reply=reply)
    except Exception:
        traceback.print_exc()
        return ChatOut(reply=hard_fallback)


@app.get("/health")
def health():
    return {"ok": True, "service": "sugarfree-api"}


@app.get("/readings/{patient_id}", response_model=List[ReadingOut])
def get_readings(patient_id: str, hours: int = 24, db: Session = Depends(get_db)):
    patient_id = norm_path_patient_id(patient_id)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = (
        db.query(ReadingRow)
        .filter(ReadingRow.patient_id == patient_id, ReadingRow.timestamp >= since)
        .order_by(ReadingRow.timestamp.asc())
        .all()
    )
    return [row_to_reading_out(r) for r in rows]


@app.get("/readings/{patient_id}/latest", response_model=Optional[ReadingOut])
def get_latest(patient_id: str, db: Session = Depends(get_db)):
    patient_id = norm_path_patient_id(patient_id)
    row = (
        db.query(ReadingRow)
        .filter(ReadingRow.patient_id == patient_id)
        .order_by(ReadingRow.timestamp.desc())
        .first()
    )
    return row_to_reading_out(row) if row else None


@app.get("/alerts/{patient_id}", response_model=List[AlertOut])
def get_alerts(patient_id: str, db: Session = Depends(get_db)):
    patient_id = norm_path_patient_id(patient_id)
    rows = (
        db.query(AlertRow)
        .filter(AlertRow.patient_id == patient_id)
        .order_by(AlertRow.timestamp.desc())
        .limit(100)
        .all()
    )
    return [
        AlertOut(
            id=r.id,
            timestamp=r.timestamp,
            patient_id=r.patient_id,
            hybrid_score=r.hybrid_score,
            explanation=r.explanation,
        )
        for r in rows
    ]


@app.get("/doctor/nearby/{patient_id}", response_model=DoctorNearbyOut)
def get_nearby_doctors(patient_id: str, location_hint: str = "", db: Session = Depends(get_db)):
    pid = norm_path_patient_id(patient_id)
    latest = (
        db.query(ReadingRow)
        .filter(ReadingRow.patient_id == pid)
        .order_by(ReadingRow.timestamp.desc())
        .first()
    )
    risk = int(latest.hybrid_score) if latest else None
    urgent = bool(risk is not None and risk >= 70)
    docs = _nearby_doctors(pid, location_hint)
    return DoctorNearbyOut(
        patient_id=pid,
        risk_score=risk,
        urgent=urgent,
        doctors=docs,
    )


@app.post("/doctor/share", response_model=DoctorShareOut)
def share_with_doctor(body: DoctorShareIn, db: Session = Depends(get_db)):
    pid = norm_path_patient_id(body.patient_id)
    if not body.consent_to_share:
        raise HTTPException(
            status_code=400,
            detail="Consent is required before sharing patient data with a doctor.",
        )

    latest = (
        db.query(ReadingRow)
        .filter(ReadingRow.patient_id == pid)
        .order_by(ReadingRow.timestamp.desc())
        .first()
    )
    if not latest:
        raise HTTPException(
            status_code=404,
            detail=f"No readings found for {pid}. Log vitals first, then share.",
        )

    profile_row = db.get(ProfileRow, pid)
    profile = profile_row.data_json if profile_row and isinstance(profile_row.data_json, dict) else {}

    doctors = _nearby_doctors(pid, body.location_hint or "")
    doctor = _pick_doctor_from_nearby(doctors, body.doctor_id)
    channel = (body.contact_preference or "call").strip().lower()
    if channel not in {"call", "chat", "video"}:
        channel = "call"

    summary = (
        f"Patient {pid}: glucose {latest.glucose_mgdl} mg/dL, trend {latest.glucose_trend} mg/dL/min, "
        f"hybrid risk {latest.hybrid_score}/100, alert {latest.alert_type or 'stable'}. "
        f"Last meal {latest.last_meal_mins_ago} min ago, insulin {latest.last_insulin_units}U "
        f"{latest.insulin_mins_ago} min ago, activity {latest.activity_level}, time {latest.time_of_day}. "
        f"Known profile keys: {', '.join(sorted(profile.keys())) if profile else 'none'}."
    )
    if body.patient_note:
        summary = f"{summary} Patient note: {body.patient_note.strip()[:300]}"

    suggestion = generate_chat_reply(
        "Provide a brief clinician-facing next-step suggestion based on this patient context. "
        "Use 2-4 concise sentences and include immediate safety considerations.",
        summary,
    )

    risk_score = int(latest.hybrid_score)
    urgent = risk_score >= 70

    return DoctorShareOut(
        ok=True,
        patient_id=pid,
        doctor_id=str(doctor["doctor_id"]),
        doctor_name=doctor["doctor_name"],
        clinic=doctor["clinic"],
        specialty=doctor["specialty"],
        distance_km=float(doctor["distance_km"]),
        eta_minutes=int(doctor["eta_minutes"]),
        contact_channel=channel,
        summary_shared=summary,
        doctor_suggestion=suggestion,
        risk_score=risk_score,
        urgent=urgent,
    )


@app.post("/profile")
def post_profile(body: ProfileIn, db: Session = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    pid = data.pop("patient_id")
    now = datetime.now(timezone.utc)
    row = db.get(ProfileRow, pid)
    if row:
        row.data_json = {**(row.data_json or {}), **data}
        row.updated_at = now
    else:
        row = ProfileRow(patient_id=pid, data_json=data, updated_at=now)
        db.add(row)
    db.commit()
    return {"ok": True, "patient_id": pid}


@app.get("/profile/{patient_id}")
def get_profile(patient_id: str, db: Session = Depends(get_db)):
    patient_id = norm_path_patient_id(patient_id)
    row = db.get(ProfileRow, patient_id)
    if not row:
        raise HTTPException(404, "No profile")
    return {"patient_id": row.patient_id, **row.data_json, "updated_at": row.updated_at.isoformat()}


@app.get("/simulator/{patient_id}")
def get_sim_state(patient_id: str, db: Session = Depends(get_db)):
    patient_id = norm_path_patient_id(patient_id)
    row = db.get(SimulatorStateRow, patient_id)
    if not row:
        return {
            "patient_id": patient_id,
            "skip_meal_boost_mins": 0,
            "workout_active": False,
            "extra_insulin_units": 0.0,
        }
    return {
        "patient_id": row.patient_id,
        "skip_meal_boost_mins": row.skip_meal_boost_mins,
        "workout_active": row.workout_active,
        "extra_insulin_units": row.extra_insulin_units,
    }


@app.post("/simulator/{patient_id}")
def post_sim_scenario(patient_id: str, body: ScenarioAction, db: Session = Depends(get_db)):
    patient_id = norm_path_patient_id(patient_id)
    try:
        row = db.get(SimulatorStateRow, patient_id)
        if not row:
            row = SimulatorStateRow(patient_id=patient_id)
            db.add(row)
            db.flush()

        if body.action == "skip_meal":
            row.skip_meal_boost_mins = min(360, row.skip_meal_boost_mins + 120)
        elif body.action == "start_workout":
            row.workout_active = True
        elif body.action == "end_workout":
            row.workout_active = False
        elif body.action == "add_insulin":
            row.extra_insulin_units = min(20.0, row.extra_insulin_units + 3.0)
        elif body.action == "reset":
            row.skip_meal_boost_mins = 0
            row.workout_active = False
            row.extra_insulin_units = 0.0
        else:
            raise HTTPException(400, "Unknown action")

        db.commit()
        db.refresh(row)
        return {
            "ok": True,
            "state": {
                "patient_id": row.patient_id,
                "skip_meal_boost_mins": row.skip_meal_boost_mins,
                "workout_active": row.workout_active,
                "extra_insulin_units": row.extra_insulin_units,
            },
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(e) or type(e).__name__,
        ) from e


@app.post("/predict", response_model=MLPredictResponse)
def predict_diabetes_risk(body: MLPredictRequest):
    if _ML_MODEL is None or _ML_SCALER is None:
        raise HTTPException(status_code=500, detail="ML model not loaded. Run train.py first.")
    
    try:
        if len(body.input) != 8:
            raise ValueError(f"Expected 8 features, got {len(body.input)}")
            
        input_data = np.array(body.input).reshape(1, -1)
        scaled_input = _ML_SCALER.transform(input_data)
        
        prediction = int(_ML_MODEL.predict(scaled_input)[0])
        probabilities = _ML_MODEL.predict_proba(scaled_input)[0]
        probability = float(probabilities[1]) if len(probabilities) > 1 else float(prediction)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {e}")
        
    if probability < 0.3:
        risk_level = "Low"
    elif probability <= 0.7:
        risk_level = "Medium"
    else:
        risk_level = "High"

    feature_contributions: List[Dict[str, Any]] = []
    try:
        # Preferred: SHAP for local feature attribution on tree models.
        import shap  # type: ignore

        explainer = shap.TreeExplainer(_ML_MODEL)
        raw_values = explainer.shap_values(scaled_input)
        if isinstance(raw_values, list):
            vals = raw_values[1][0] if len(raw_values) > 1 else raw_values[0][0]
        else:
            arr = np.array(raw_values)
            if arr.ndim == 3:
                vals = arr[0, :, 1] if arr.shape[-1] > 1 else arr[0, :, 0]
            else:
                vals = arr[0]
        abs_sum = float(np.sum(np.abs(vals))) or 1.0
        for i, f in enumerate(_PIMA_FEATURES):
            v = float(vals[i])
            pct = float(abs(v) / abs_sum * 100.0)
            feature_contributions.append(
                {
                    "feature": f,
                    "value": float(body.input[i]),
                    "contribution_percent": round(pct, 2),
                    "direction": "increases_risk" if v > 0 else ("lowers_risk" if v < 0 else "neutral"),
                    "is_major": pct >= 15.0,
                }
            )
    except Exception:
        # Fallback when shap is unavailable: proxy attribution using RF global importance × magnitude.
        try:
            importances = getattr(_ML_MODEL, "feature_importances_", None)
            if importances is None:
                raise ValueError("No feature importances")
            weighted = np.abs(np.array(importances) * np.abs(scaled_input[0]))
            denom = float(np.sum(weighted)) or 1.0
            for i, f in enumerate(_PIMA_FEATURES):
                pct = float(weighted[i] / denom * 100.0)
                feature_contributions.append(
                    {
                        "feature": f,
                        "value": float(body.input[i]),
                        "contribution_percent": round(pct, 2),
                        "direction": "neutral",
                        "is_major": pct >= 15.0,
                    }
                )
        except Exception:
            feature_contributions = []

    feature_contributions.sort(key=lambda x: x["contribution_percent"], reverse=True)
        
    explanation = "Explanation unavailable."
    try:
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = f"A patient has the following Pima diabetes factors [pregnancies, glucose, bp, skin, insulin, bmi, dpf, age]: {body.input}. The random forest model predicted a risk probability of {probability:.2f} ({risk_level} risk). Keep your response under 3 sentences and explain why in plain English for the patient in 2nd person."
            response = model.generate_content(prompt)
            explanation = response.text
    except Exception as e:
        print(f"Gemini error: {e}")
        explanation = f"Could not generate explanation due to an error: {e}"
        
    return MLPredictResponse(
        prediction=prediction,
        probability=probability,
        risk_level=risk_level,
        explanation=explanation,
        feature_contributions=feature_contributions,
    )

