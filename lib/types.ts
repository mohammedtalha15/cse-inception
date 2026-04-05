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
