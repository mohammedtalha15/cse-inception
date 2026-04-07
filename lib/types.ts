export type RiskFactor = {
  key: string;
  label: string;
  points: number;
};

export type Reading = {
  id: number;
  timestamp: string;
  patient_id: string;
  glucose_mgdl: number;
  glucose_trend: number;
  last_meal_mins_ago: number;
  meal_carbs_g: number;
  last_insulin_units: number;
  insulin_mins_ago: number;
  activity_level: string;
  time_of_day: string;
  rule_score: number;
  ml_score: number;
  hybrid_score: number;
  factors: RiskFactor[];
  explanation: string | null;
  alert_type: string | null;
  time_to_low_minutes: number | null;
  /** Pima RF positive-class probability when model.pkl is loaded */
  diabetes_ml_probability?: number | null;
  /** random_forest | stub | null */
  ml_model_source?: string | null;
};

export type AlertItem = {
  id: number;
  timestamp: string;
  patient_id: string;
  hybrid_score: number;
  explanation: string;
};

export type SimulatorState = {
  patient_id: string;
  skip_meal_boost_mins: number;
  workout_active: boolean;
  extra_insulin_units: number;
};

export type DoctorShareResult = {
  ok: boolean;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  clinic: string;
  specialty: string;
  distance_km: number;
  eta_minutes: number;
  contact_channel: string;
  summary_shared: string;
  doctor_suggestion: string;
  risk_score?: number | null;
  urgent?: boolean;
};

export type NearbyDoctor = {
  doctor_id: string;
  doctor_name: string;
  clinic: string;
  specialty: string;
  distance_km: number;
  eta_minutes: number;
  available_channels: string[];
  phone: string;
  language: string;
  accepting_new_cases: boolean;
};

export type DoctorNearbyResult = {
  patient_id: string;
  risk_score?: number | null;
  urgent: boolean;
  doctors: NearbyDoctor[];
};
