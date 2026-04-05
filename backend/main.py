from __future__ import annotations

import os
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import AlertRow, ProfileRow, ReadingRow, SimulatorStateRow, make_session_factory
from explain import generate_explanation
from risk_engine import compute_risk_detailed
from schemas import AlertOut, ProfileIn, ReadingIn, ReadingOut, ScenarioAction

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


def norm_path_patient_id(patient_id: str) -> str:
    """Match dashboard IDs (P001) even if the URL used p001."""
    s = (patient_id or "").strip().upper()
    return s if s else "P001"


def unpack_factors(fac) -> tuple[list, float | None]:
    if isinstance(fac, dict) and "items" in fac:
        return fac["items"], fac.get("_ttl")
    if isinstance(fac, list):
        return fac, None
    return [], None


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
                    reading_snapshot=payload,
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
