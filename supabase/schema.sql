-- Optional reference schema for Supabase SQL Editor.
-- Tables are also created automatically by FastAPI on first boot (SQLAlchemy create_all).
-- Use this if you prefer to manage DDL in Supabase or need to tweak types (e.g. JSONB).

CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    patient_id VARCHAR(32) NOT NULL,
    glucose_mgdl DOUBLE PRECISION NOT NULL,
    glucose_trend DOUBLE PRECISION NOT NULL,
    last_meal_mins_ago INTEGER NOT NULL,
    meal_carbs_g DOUBLE PRECISION NOT NULL,
    last_insulin_units DOUBLE PRECISION NOT NULL,
    insulin_mins_ago INTEGER NOT NULL,
    activity_level VARCHAR(32) NOT NULL,
    time_of_day VARCHAR(32) NOT NULL,
    rule_score INTEGER NOT NULL,
    ml_score INTEGER NOT NULL,
    hybrid_score INTEGER NOT NULL,
    factors_json JSONB,
    explanation TEXT,
    alert_type VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS ix_readings_timestamp ON readings (timestamp);
CREATE INDEX IF NOT EXISTS ix_readings_patient_id ON readings (patient_id);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    patient_id VARCHAR(32) NOT NULL,
    hybrid_score INTEGER NOT NULL,
    explanation TEXT NOT NULL,
    reading_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS ix_alerts_timestamp ON alerts (timestamp);
CREATE INDEX IF NOT EXISTS ix_alerts_patient_id ON alerts (patient_id);

CREATE TABLE IF NOT EXISTS profiles (
    patient_id VARCHAR(32) PRIMARY KEY,
    data_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS simulator_state (
    patient_id VARCHAR(32) PRIMARY KEY,
    skip_meal_boost_mins INTEGER NOT NULL DEFAULT 0,
    workout_active BOOLEAN NOT NULL DEFAULT FALSE,
    extra_insulin_units DOUBLE PRECISION NOT NULL DEFAULT 0.0
);
