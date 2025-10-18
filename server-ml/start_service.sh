#!/bin/bash

# Dengue Prediction Service Startup Script

echo "Starting Dengue Prediction Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Copy model files from daily-scrap-dengue-data
echo "Setting up model files..."
mkdir -p models

# Copy model files
cp ../daily-scrap-dengue-data/model1_historical_cases_improved.pkl models/
cp ../daily-scrap-dengue-data/model2_weather_based_improved.pkl models/
cp ../daily-scrap-dengue-data/scaler1_historical_cases_improved.pkl models/
cp ../daily-scrap-dengue-data/scaler2_weather_based_improved.pkl models/
cp ../daily-scrap-dengue-data/model_features_improved.json models/

echo "Model files copied successfully!"

# Start the service
echo "Starting prediction service on port 5001..."
python prediction_service.py
