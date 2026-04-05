import pandas as pd
from xgboost import XGBClassifier
import joblib

# Load dataset
df = pd.read_csv("diabetes.csv")

# Clean column names (lowercase)
df.columns = df.columns.str.lower()

# Handle missing/zero values (important for this dataset)
df = df[df["glucose"] != 0]
df = df[df["bmi"] != 0]

# Create hypoglycemia risk proxy
df["risk"] = df["glucose"].apply(lambda x: 1 if x < 80 else 0)

# Select features
features = ["glucose", "insulin", "bmi", "age"]
X = df[features]
y = df["risk"]

# Train model
model = XGBClassifier(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1
)

model.fit(X, y)

# Save model
joblib.dump(model, "model.pkl")

print("Model trained and saved as model.pkl")