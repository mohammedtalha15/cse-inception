import os
import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

def train_model():
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'diabetes.csv')
    print(f"Loading dataset from {data_path}...")
    headers = ['pregnancies', 'glucose', 'bp', 'skin', 'insulin', 'bmi', 'dpf', 'age', 'outcome']
    df = pd.read_csv(data_path, names=headers)
    
    print("Handling invalid zero values...")
    columns_with_invalid_zeros = ['glucose', 'bp', 'skin', 'insulin', 'bmi']
    for col in columns_with_invalid_zeros:
        df[col] = df[col].replace(0, np.nan)
        df.fillna({col: df[col].mean()}, inplace=True)
        
    X = df.drop('outcome', axis=1)
    y = df['outcome']
    
    print("Splitting and Scaling data...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("Training RandomForestClassifier...")
    model = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    acc = model.score(X_test_scaled, y_test)
    print(f"Test Accuracy: {acc:.4f}")
    
    print("Saving model.pkl and scaler.pkl...")
    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    scaler_path = os.path.join(os.path.dirname(__file__), 'scaler.pkl')
    
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
        
    print("Done!")

if __name__ == "__main__":
    train_model()
