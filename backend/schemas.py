from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


def _normalize_patient_id(v: object) -> str:
    if v is None or (isinstance(v, str) and not v.strip()):
        return "P001"
    return str(v).strip().upper()


class ReadingIn(BaseModel):
    timestamp: datetime | None = None
    glucose_mgdl: float = Field(ge=20, le=600, description="mg/dL (typical sensor range)")
    glucose_trend: float = Field(ge=-20, le=20, description="mg/dL per minute")
    last_meal_mins_ago: int = Field(ge=0, le=43200)
    meal_carbs_g: float = Field(default=0, ge=0, le=2000)
    last_insulin_units: float = Field(default=0, ge=0, le=500)
    insulin_mins_ago: int = Field(ge=0, le=43200)
    activity_level: str
    time_of_day: str
    patient_id: str = "P001"

    @field_validator("patient_id", mode="before")
    @classmethod
    def patient_id_upper(cls, v: object) -> str:
        return _normalize_patient_id(v)


class ReadingOut(BaseModel):
    id: int
    timestamp: datetime
    patient_id: str
    glucose_mgdl: float
    glucose_trend: float
    last_meal_mins_ago: int
    meal_carbs_g: float
    last_insulin_units: float
    insulin_mins_ago: int
    activity_level: str
    time_of_day: str
    rule_score: int
    ml_score: int
    hybrid_score: int
    factors: list[dict[str, Any]]
    explanation: str | None
    alert_type: str | None
    time_to_low_minutes: float | None

    class Config:
        from_attributes = True


class ProfileIn(BaseModel):
    patient_id: str = "P001"

    @field_validator("patient_id", mode="before")
    @classmethod
    def profile_patient_id_upper(cls, v: object) -> str:
        return _normalize_patient_id(v)
    typical_breakfast_time: str | None = None
    typical_lunch_time: str | None = None
    typical_dinner_time: str | None = None
    insulin_type: str | None = None
    basal_schedule: str | None = None
    activity_pattern: str | None = None
    sleep_window: str | None = None
    notes: str | None = None


class ScenarioAction(BaseModel):
    action: str  # skip_meal | start_workout | end_workout | add_insulin | reset


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    patient_id: str = "P001"

    @field_validator("patient_id", mode="before")
    @classmethod
    def chat_patient_id_upper(cls, v: object) -> str:
        return _normalize_patient_id(v)


class ChatOut(BaseModel):
    reply: str


class AlertOut(BaseModel):
    id: int
    timestamp: datetime
    patient_id: str
    hybrid_score: int
    explanation: str

    class Config:
        from_attributes = True

class MLPredictRequest(BaseModel):
    input: list[float]  # [pregnancies, glucose, bp, skin, insulin, bmi, dpf, age]

class MLPredictResponse(BaseModel):
    prediction: int
    probability: float
    risk_level: str
    explanation: str
