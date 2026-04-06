from __future__ import annotations

import os
import traceback
from datetime import date, datetime, timedelta, timezone
from typing import Any
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import AlertRow, ProfileRow, ReadingRow, SimulatorStateRow, make_session_factory
from explain import generate_chat_reply, generate_explanation
from risk_engine import compute_risk_detailed
from schemas import (
    AlertOut,
    ChatIn,
    ChatOut,
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


DB_PATH = _BACKEND_DIR / "ayuq.db"
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

app = FastAPI(title="Ayuq API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
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


def json_safe_reading_snapshot(payload: dict[str, Any]) -> dict[str, Any]:
    """JSON columns (e.g. Postgres) cannot store datetime objects — use ISO strings."""
    out: dict[str, Any] = {}
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


def unpack_factors(fac) -> tuple[list, float | None]:
    if isinstance(fac, dict) and "items" in fac:
        raw = fac["items"]
        return (raw if isinstance(raw, list) else []), fac.get("_ttl")
    if isinstance(fac, list):
        return fac, None
    return [], None


def _safe_factor_labels(items: list | None, limit: int = 5) -> str:
    parts: list[str] = []
    for f in (items or [])[:limit]:
        if isinstance(f, dict):
            parts.append(str(f.get("label", "") or "").strip())
        else:
            parts.append(str(f))
    return ", ".join(p for p in parts if p) or "none"


def row_to_reading_out(row: ReadingRow) -> ReadingOut:
    items, ttl = unpack_factors(row.factors_json)
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
        profile_data = profile_row.data_json if profile_row else None

        detail = compute_risk_detailed(payload, profile_data)
        factors = detail["factors"]
        ttl = detail.get("time_to_low_minutes")
        factors_store = {"items": factors, "_ttl": ttl}

        explanation = None
        if detail["hybrid_score"] > 60:
            explanation = generate_explanation(
                payload, detail["hybrid_score"], factors
            )
            db.add(
                AlertRow(
                    timestamp=ts,
                    patient_id=body.patient_id,
                    hybrid_score=detail["hybrid_score"],
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
            alert_type=detail["alert_type"],
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
            alert_type=detail["alert_type"],
            time_to_low_minutes=ttl,
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
                context = (
                    f"Patient {pid}: latest glucose {row.glucose_mgdl} mg/dL, "
                    f"trend {row.glucose_trend} mg/dL/min, hybrid risk {row.hybrid_score}/100, "
                    f"alert band {row.alert_type or 'n/a'}. "
                    f"Factor labels: {top_labels}."
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
    return {"ok": True, "service": "ayuq-api"}


@app.get("/readings/{patient_id}", response_model=list[ReadingOut])
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


@app.get("/readings/{patient_id}/latest", response_model=ReadingOut | None)
def get_latest(patient_id: str, db: Session = Depends(get_db)):
    patient_id = norm_path_patient_id(patient_id)
    row = (
        db.query(ReadingRow)
        .filter(ReadingRow.patient_id == patient_id)
        .order_by(ReadingRow.timestamp.desc())
        .first()
    )
    return row_to_reading_out(row) if row else None


@app.get("/alerts/{patient_id}", response_model=list[AlertOut])
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
        explanation=explanation
    )

