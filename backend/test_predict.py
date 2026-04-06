import sys
import os
from fastapi.testclient import TestClient

# Make sure we can import main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import app

client = TestClient(app)

def test_predictions():
    # Outcome 1 in dataset (diabetes)
    high_risk_data = {
        "input": [6, 148, 72, 35, 0, 33.6, 0.627, 50]
    }
    
    print("Testing High Risk Profile...")
    res = client.post("/predict", json=high_risk_data)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}\n")
    
    # Outcome 0 in dataset (no diabetes)
    low_risk_data = {
        "input": [1, 85, 66, 29, 0, 26.6, 0.351, 31]
    }
    
    print("Testing Low Risk Profile...")
    res = client.post("/predict", json=low_risk_data)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}\n")

if __name__ == "__main__":
    test_predictions()
