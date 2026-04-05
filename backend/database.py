from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class ReadingRow(Base):
    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    patient_id: Mapped[str] = mapped_column(String(32), index=True)
    glucose_mgdl: Mapped[float] = mapped_column(Float)
    glucose_trend: Mapped[float] = mapped_column(Float)
    last_meal_mins_ago: Mapped[int] = mapped_column(Integer)
    meal_carbs_g: Mapped[float] = mapped_column(Float)
    last_insulin_units: Mapped[float] = mapped_column(Float)
    insulin_mins_ago: Mapped[int] = mapped_column(Integer)
    activity_level: Mapped[str] = mapped_column(String(32))
    time_of_day: Mapped[str] = mapped_column(String(32))
    rule_score: Mapped[int] = mapped_column(Integer)
    ml_score: Mapped[int] = mapped_column(Integer)
    hybrid_score: Mapped[int] = mapped_column(Integer)
    factors_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    alert_type: Mapped[str | None] = mapped_column(String(32), nullable=True)


class AlertRow(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    patient_id: Mapped[str] = mapped_column(String(32), index=True)
    hybrid_score: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text)
    reading_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class ProfileRow(Base):
    __tablename__ = "profiles"

    patient_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    data_json: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class SimulatorStateRow(Base):
    __tablename__ = "simulator_state"

    patient_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    skip_meal_boost_mins: Mapped[int] = mapped_column(Integer, default=0)
    workout_active: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_insulin_units: Mapped[float] = mapped_column(Float, default=0.0)


def make_session_factory(db_url: str):
    if db_url.startswith("sqlite"):
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )
    else:
        # Supabase / Postgres: use pool_pre_ping for serverless disconnects
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)
