#!/bin/bash
set -e

cd backend

echo "Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing backend dependencies..."
pip install -r requirements.txt

echo "Starting FastAPI server..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
