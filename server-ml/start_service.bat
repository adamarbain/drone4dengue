@echo off
REM Dengue Prediction Service Startup Script for Windows

echo Starting Dengue Prediction Service...

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Copy model files from daily-scrap-dengue-data
echo Setting up model files...
if not exist "models" mkdir models

REM Copy model files
copy "..\daily-scrap-dengue-data\model1_historical_cases_improved.pkl" "models\"
copy "..\daily-scrap-dengue-data\model2_weather_based_improved.pkl" "models\"
copy "..\daily-scrap-dengue-data\scaler1_historical_cases_improved.pkl" "models\"
copy "..\daily-scrap-dengue-data\scaler2_weather_based_improved.pkl" "models\"
copy "..\daily-scrap-dengue-data\model_features_improved.json" "models\"

echo Model files copied successfully!

REM Start the service
echo Starting prediction service on port 5001...
python prediction_service.py
