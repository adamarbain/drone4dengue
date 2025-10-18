"""
Dengue Risk Prediction Service
=============================

A Flask microservice that loads pre-trained ML models and provides dengue risk predictions.
Supports both historical cases and weather-based prediction models.

Author: AI Assistant
Date: 2025
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional, Tuple
import requests
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class DenguePredictionService:
    """
    Service class for dengue risk prediction using pre-trained models
    """
    
    def __init__(self, models_dir: str = "models"):
        """
        Initialize the prediction service
        
        Args:
            models_dir (str): Directory containing the pickle models
        """
        self.models_dir = models_dir
        self.model1 = None  # Historical cases model
        self.model2 = None  # Weather-based model
        self.scaler1 = None
        self.scaler2 = None
        self.model_features = None
        
        # Load models and scalers
        self._load_models()
        self._load_features()
        
    def _load_models(self):
        """Load the pre-trained models and scalers"""
        try:
            import joblib
            
            # Load Model 1 (Historical Cases)
            model1_path = os.path.join(self.models_dir, "model1_historical_cases_improved.pkl")
            scaler1_path = os.path.join(self.models_dir, "scaler1_historical_cases_improved.pkl")
            
            if os.path.exists(model1_path) and os.path.exists(scaler1_path):
                try:
                    # Use joblib directly (more reliable than pickle)
                    self.model1 = joblib.load(model1_path)
                    self.scaler1 = joblib.load(scaler1_path)
                    logger.info("Model 1 (Historical Cases) loaded successfully using joblib")
                except Exception as e:
                    logger.error(f"Failed to load Model 1 with joblib: {str(e)}")
                    raise Exception(f"Cannot load Model 1: {str(e)}")
            else:
                logger.error(f"Model 1 files not found: {model1_path}, {scaler1_path}")
                raise Exception("Model 1 files not found")
            
            # Load Model 2 (Weather-based)
            model2_path = os.path.join(self.models_dir, "model2_weather_based_improved.pkl")
            scaler2_path = os.path.join(self.models_dir, "scaler2_weather_based_improved.pkl")
            
            if os.path.exists(model2_path) and os.path.exists(scaler2_path):
                try:
                    # Use joblib directly (more reliable than pickle)
                    self.model2 = joblib.load(model2_path)
                    self.scaler2 = joblib.load(scaler2_path)
                    logger.info("Model 2 (Weather-based) loaded successfully using joblib")
                except Exception as e:
                    logger.error(f"Failed to load Model 2 with joblib: {str(e)}")
                    raise Exception(f"Cannot load Model 2: {str(e)}")
            else:
                logger.error(f"Model 2 files not found: {model2_path}, {scaler2_path}")
                raise Exception("Model 2 files not found")
                    
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise Exception(f"Failed to load required models: {str(e)}")
    
    def _load_features(self):
        """Load model features configuration"""
        try:
            features_path = os.path.join(self.models_dir, "model_features_improved.json")
            if os.path.exists(features_path):
                with open(features_path, 'r') as f:
                    self.model_features = json.load(f)
                logger.info("Model features loaded successfully")
            else:
                logger.warning(f"Features file not found: {features_path}")
                # Fallback to default features
                self.model_features = {
                    "model1_features": ["centroid_x", "centroid_y", "location_cluster", "month", "day_of_year", "is_hotspot", "cases_lag_1", "cases_lag_7", "cases_lag_30", "cases_avg_7", "cases_avg_30"],
                    "model2_features": ["centroid_x", "centroid_y", "humidity", "temperature", "rainfall", "month", "day_of_year", "location_cluster", "is_hotspot"]
                }
        except Exception as e:
            logger.error(f"Error loading features: {str(e)}")
            raise
    
    def _get_weather_data(self, latitude: float, longitude: float) -> Dict[str, float]:
        """
        Fetch weather data for given coordinates
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate
            
        Returns:
            Dict containing weather data (humidity, temperature, rainfall)
        """
        try:
            # Use Open Meteo API for weather data
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,precipitation",
                "timezone": "Asia/Singapore"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            current = data.get("current", {})
            
            return {
                "temperature": current.get("temperature_2m", 25.0),
                "humidity": current.get("relative_humidity_2m", 70.0),
                "rainfall": current.get("precipitation", 0.0)
            }
            
        except Exception as e:
            logger.warning(f"Error fetching weather data: {str(e)}")
            # Return default values if weather API fails
            return {
                "temperature": 25.0,
                "humidity": 70.0,
                "rainfall": 0.0
            }
    
    def _prepare_features(self, latitude: float, longitude: float, weather_data: Optional[Dict] = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare feature arrays for both models
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate
            weather_data (Optional[Dict]): Weather data dictionary for Model 2
            
        Returns:
            Tuple of (model1_features, model2_features) as numpy arrays
        """
        # Model 1: Only needs longitude and latitude
        model1_features = [longitude, latitude]
        
        # Model 2: Needs longitude, latitude, humidity, temperature, rainfall
        if weather_data is None:
            weather_data = self._get_weather_data(latitude, longitude)
        
        model2_features = [
            longitude,
            latitude,
            weather_data["humidity"],
            weather_data["temperature"],
            weather_data["rainfall"]
        ]
        
        return np.array(model1_features), np.array(model2_features)
    
    def predict_risk(self, latitude: float, longitude: float, weather_data: Optional[Dict] = None) -> Dict[str, float]:
        """
        Predict dengue risk using both models
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate
            weather_data (Optional[Dict]): Weather data dictionary
            
        Returns:
            Dict containing prediction results
        """
        try:
            # Validate coordinates
            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                raise ValueError("Invalid coordinates")
            
            # Ensure models are loaded
            if not (self.model1 and self.scaler1) and not (self.model2 and self.scaler2):
                raise Exception("No models loaded. Service cannot make predictions without models.")
            
            # Prepare features
            model1_features, model2_features = self._prepare_features(latitude, longitude, weather_data)
            
            results = {
                "model1_score": None,
                "model2_score": None,
                "combined_score": None,
                "risk_level": "unknown"
            }
            
            # Predict with Model 1 (Historical Cases)
            if self.model1 and self.scaler1:
                try:
                    # Check if it's a tree-based model (like RandomForest)
                    if hasattr(self.model1, 'feature_importances_'):
                        # Tree-based model - no scaling needed
                        model1_prediction = self.model1.predict(model1_features.reshape(1, -1))[0]
                    else:
                        # Linear model - needs scaling
                        model1_scaled = self.scaler1.transform(model1_features.reshape(1, -1))
                        model1_prediction = self.model1.predict(model1_scaled)[0]
                    
                    results["model1_score"] = float(model1_prediction)
                    logger.info(f"Model 1 prediction: {results['model1_score']}")
                except Exception as e:
                    logger.error(f"Model 1 prediction failed: {str(e)}")
                    raise Exception(f"Model 1 prediction failed: {str(e)}")
            
            # Predict with Model 2 (Weather-based)
            if self.model2 and self.scaler2:
                try:
                    # Check if it's a tree-based model (like RandomForest)
                    if hasattr(self.model2, 'feature_importances_'):
                        # Tree-based model - no scaling needed
                        model2_prediction = self.model2.predict(model2_features.reshape(1, -1))[0]
                    else:
                        # Linear model - needs scaling
                        model2_scaled = self.scaler2.transform(model2_features.reshape(1, -1))
                        model2_prediction = self.model2.predict(model2_scaled)[0]
                    
                    results["model2_score"] = float(model2_prediction)
                    logger.info(f"Model 2 prediction: {results['model2_score']}")
                except Exception as e:
                    logger.error(f"Model 2 prediction failed: {str(e)}")
                    raise Exception(f"Model 2 prediction failed: {str(e)}")
            
            # Combine predictions (weighted average)
            scores = [s for s in [results["model1_score"], results["model2_score"]] if s is not None]
            if not scores:
                raise Exception("No valid predictions from any model")
            
            # Use weighted average: 60% historical, 40% weather
            weights = [0.6, 0.4] if len(scores) == 2 else [1.0]
            results["combined_score"] = float(np.average(scores, weights=weights[:len(scores)]))
            
            # Determine risk level
            if results["combined_score"] >= 0.7:
                results["risk_level"] = "high"
            elif results["combined_score"] >= 0.4:
                results["risk_level"] = "medium"
            else:
                results["risk_level"] = "low"
            
            logger.info(f"Combined prediction: {results['combined_score']} ({results['risk_level']})")
            return results
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise
    
    def get_model_status(self) -> Dict[str, bool]:
        """Get the status of loaded models"""
        return {
            "model1_loaded": self.model1 is not None,
            "model2_loaded": self.model2 is not None,
            "scaler1_loaded": self.scaler1 is not None,
            "scaler2_loaded": self.scaler2 is not None,
            "features_loaded": self.model_features is not None
        }

# Initialize the prediction service
prediction_service = DenguePredictionService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = prediction_service.get_model_status()
    return jsonify({
        "status": "healthy",
        "models": status,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint
    
    Expected JSON payload:
    {
        "latitude": float,
        "longitude": float,
        "weather_data": {
            "temperature": float,
            "humidity": float,
            "rainfall": float
        } (optional - will fetch automatically if not provided)
    }
    
    Model 1: Uses only latitude and longitude
    Model 2: Uses latitude, longitude, humidity, temperature, rainfall
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        weather_data = data.get('weather_data')
        
        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400
        
        # Perform prediction
        result = prediction_service.predict_risk(latitude, longitude, weather_data)
        
        return jsonify({
            "success": True,
            "prediction": result,
            "timestamp": datetime.now().isoformat()
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Prediction endpoint error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/status', methods=['GET'])
def status():
    """Get service status"""
    return jsonify({
        "service": "Dengue Prediction Service",
        "version": "1.0.0",
        "models": prediction_service.get_model_status(),
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    # Copy models from daily-scrap-dengue-data directory
    import shutil
    
    models_source = "../daily-scrap-dengue-data"
    models_dest = "models"
    
    if not os.path.exists(models_dest):
        os.makedirs(models_dest)
    
    # Copy model files
    model_files = [
        "model1_historical_cases_improved.pkl",
        "model2_weather_based_improved.pkl",
        "scaler1_historical_cases_improved.pkl",
        "scaler2_weather_based_improved.pkl",
        "model_features_improved.json"
    ]
    
    for file in model_files:
        src = os.path.join(models_source, file)
        dst = os.path.join(models_dest, file)
        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)
            logger.info(f"Copied {file} to models directory")
    
    # Start the Flask app
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
