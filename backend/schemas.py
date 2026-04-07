from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


def _normalize_patient_id(v: object) -> str:
    if v is None or (isinstance(v, str) and not v.strip()):
        return "P001"
    return str(v).strip().upper()


class ReadingIn(BaseModel):
    timestamp: Optional[datetime] = None
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
    factors: List[Dict[str, Any]]
    explanation: Optional[str]
    alert_type: Optional[str]
    time_to_low_minutes: Optional[float]
    # Pima RF head (when model.pkl loaded): probability of positive class; source discriminates stub vs RF
    diabetes_ml_probability: Optional[float] = None
    ml_model_source: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileIn(BaseModel):
    patient_id: str = "P001"

    @field_validator("patient_id", mode="before")
    @classmethod
    def profile_patient_id_upper(cls, v: object) -> str:
        return _normalize_patient_id(v)

    typical_breakfast_time: Optional[str] = None
    typical_lunch_time: Optional[str] = None
    typical_dinner_time: Optional[str] = None
    insulin_type: Optional[str] = None
    basal_schedule: Optional[str] = None
    activity_pattern: Optional[str] = None
    sleep_window: Optional[str] = None
    notes: Optional[str] = None
    # Optional fields aligned with Pima / train.py for RF cross-check (POST /profile)
    sex: Optional[str] = None  # "male" | "female" — pregnancies only collected for female
    pregnancies: Optional[float] = None
    blood_pressure: Optional[float] = None
    skin_thickness: Optional[float] = None
    bmi: Optional[float] = None
    dpf: Optional[float] = None
    age: Optional[float] = None


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


class DoctorShareIn(BaseModel):
    patient_id: str = "P001"
    consent_to_share: bool = Field(
        default=False,
        description="Explicit consent required before sharing any patient summary.",
    )
    location_hint: Optional[str] = Field(
        default=None,
        description="City/area hint to pick nearest available doctor for demo.",
    )
    contact_preference: Optional[str] = Field(
        default="call",
        description="call | chat | video",
    )
    patient_note: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional note for the doctor.",
    )
    doctor_id: Optional[str] = Field(
        default=None,
        description="Optional doctor id from /doctor/nearby to target a specific doctor.",
    )

    @field_validator("patient_id", mode="before")
    @classmethod
    def doctor_patient_id_upper(cls, v: object) -> str:
        return _normalize_patient_id(v)


class DoctorShareOut(BaseModel):
    ok: bool
    patient_id: str
    doctor_id: str
    doctor_name: str
    clinic: str
    specialty: str
    distance_km: float
    eta_minutes: int
    contact_channel: str
    summary_shared: str
    doctor_suggestion: str
    risk_score: Optional[int] = None
    urgent: bool = False


class DoctorNearbyItem(BaseModel):
    doctor_id: str
    doctor_name: str
    clinic: str
    specialty: str
    distance_km: float
    eta_minutes: int
    available_channels: List[str]
    phone: str
    language: str
    accepting_new_cases: bool = True


class DoctorNearbyOut(BaseModel):
    patient_id: str
    risk_score: Optional[int] = None
    urgent: bool = False
    doctors: List[DoctorNearbyItem]


class MLPredictRequest(BaseModel):
    input: List[float]  # [pregnancies, glucose, bp, skin, insulin, bmi, dpf, age]


class FeatureContribution(BaseModel):
    feature: str
    value: float
    contribution_percent: float
    direction: str  # increases_risk | lowers_risk | neutral
    is_major: bool = False


class MLPredictResponse(BaseModel):
    prediction: int
    probability: float
    risk_level: str
    explanation: str
    feature_contributions: List[FeatureContribution] = []
