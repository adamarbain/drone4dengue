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

# Import the breeding area detection service
from breeding_area_detection_service import BreedingAreaDetectionService

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
        # Auto-detect models directory
        if not os.path.exists(models_dir):
            if os.path.exists("../daily-scrap-dengue-data"):
                models_dir = "../daily-scrap-dengue-data"
            elif os.path.exists("server-ml/models"):
                models_dir = "server-ml/models"
            
        self.models_dir = models_dir
        
        # Validate that the models directory exists
        if not os.path.exists(self.models_dir):
            raise Exception(f"Models directory not found. Checked: {models_dir}, ../daily-scrap-dengue-data, server-ml/models")
        
        # Check for required files
        required_files = [
            "model1_historical_cases_improved.pkl",
            "model2_weather_based_improved.pkl", 
            "scaler1_historical_cases_improved.pkl",
            "scaler2_weather_based_improved.pkl",
            "model_features_improved.json",
        ]
        
        missing_files = []
        for file in required_files:
            if not os.path.exists(os.path.join(self.models_dir, file)):
                missing_files.append(file)
        
        if missing_files:
            logger.warning(f"Missing required files: {missing_files}")
            logger.warning("Some features may not work properly")
        
        self.model1 = None  # Historical cases model
        self.model2 = None  # Weather-based model
        self.scaler1 = None
        self.scaler2 = None
        self.model_features = None

        # Auxiliary artifacts from training
        self.geo_lookup = None       # NN-based lookup for state_encoded, density_cluster, bbox_area
        self.label_encoders = None   # LabelEncoders fitted during training
        self.kmeans_model = None     # Saved KMeans model from training

        # Model config flags (set by _load_features)
        self.model1_needs_scaling = False
        self.model2_needs_scaling = False
        self.model1_log_target = False
        self.model2_log_target = False
        
        # Initialize Model 3 (Breeding Area Detection)
        self.breeding_area_service = BreedingAreaDetectionService()
        
        # Load models, scalers, and auxiliary artifacts
        self._load_models()
        self._load_features()
        self._load_auxiliary_artifacts()
        
    def _load_models(self):
        """Load the pre-trained models and scalers from daily-scrap-dengue-data directory"""
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
                    logger.info(f"Model 1 (Historical Cases) loaded successfully from {model1_path}")
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
                    logger.info(f"Model 2 (Weather-based) loaded successfully from {model2_path}")
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
        """Load model features configuration and model config flags"""
        try:
            features_path = os.path.join(self.models_dir, "model_features_improved.json")
            if os.path.exists(features_path):
                with open(features_path, 'r') as f:
                    self.model_features = json.load(f)
                logger.info(f"Model features loaded successfully from {features_path}")

                # Read config flags saved by the training script
                self.model1_needs_scaling = self.model_features.get('model1_needs_scaling', False)
                self.model2_needs_scaling = self.model_features.get('model2_needs_scaling', False)
                self.model1_log_target = self.model_features.get('model1_log_target', False)
                self.model2_log_target = self.model_features.get('model2_log_target', False)

                logger.info(f"Model 1 — features: {len(self.model_features.get('model1_features', []))}, "
                            f"needs_scaling={self.model1_needs_scaling}, log_target={self.model1_log_target}")
                logger.info(f"Model 2 — features: {len(self.model_features.get('model2_features', []))}, "
                            f"needs_scaling={self.model2_needs_scaling}, log_target={self.model2_log_target}")
            else:
                logger.warning(f"Features file not found: {features_path}")
                self.model_features = {
                    "model1_features": [
                        "centroid_x", "centroid_y", "location_cluster", "month",
                        "day_of_year", "is_hotspot", "state_encoded",
                        "density_cluster", "bbox_area", "cases_lag_1",
                        "cases_lag_7", "cases_lag_30", "cases_avg_7", "cases_avg_30"
                    ],
                    "model2_features": [
                        "centroid_x", "centroid_y", "humidity", "temperature",
                        "rainfall", "month", "day_of_year", "week_of_year",
                        "location_cluster", "state_encoded", "is_hotspot",
                        "rainfall_lag_7", "humidity_lag_7", "temperature_lag_7",
                        "rainfall_cumul_14d", "rainfall_cumul_28d",
                        "temp_x_humidity", "temp_x_rainfall",
                        "humidity_x_rainfall", "breeding_favorable",
                        "rainfall_ewma_14d", "temp_ewma_7d",
                        "humidity_ewma_7d", "briere_thermal_curve"
                    ]
                }
                logger.info("Using fallback default features (new model format)")
        except Exception as e:
            logger.error(f"Error loading features: {str(e)}")
            raise

    def _load_auxiliary_artifacts(self):
        """Load auxiliary artifacts saved by the training script (geo_lookup, kmeans, label_encoders)."""
        import joblib

        # Geo lookup (NN-based for state_encoded, density_cluster, bbox_area)
        geo_path = os.path.join(self.models_dir, "geo_lookup.pkl")
        if os.path.exists(geo_path):
            try:
                self.geo_lookup = joblib.load(geo_path)
                logger.info("Geo lookup (NN) loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load geo_lookup.pkl: {e}")

        # KMeans model
        kmeans_path = os.path.join(self.models_dir, "kmeans_model.pkl")
        if os.path.exists(kmeans_path):
            try:
                self.kmeans_model = joblib.load(kmeans_path)
                logger.info("KMeans model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load kmeans_model.pkl: {e}")

        # Label encoders
        le_path = os.path.join(self.models_dir, "label_encoders.pkl")
        if os.path.exists(le_path):
            try:
                self.label_encoders = joblib.load(le_path)
                logger.info(f"Label encoders loaded: {list(self.label_encoders.keys())}")
            except Exception as e:
                logger.warning(f"Failed to load label_encoders.pkl: {e}")
    
    def _get_weather_data(self, latitude: float, longitude: float, target_date: Optional[datetime] = None) -> Dict:
        """
        Fetch extended weather data (past 28 days) for given coordinates.
        Computes current averages, lag-7 values, cumulative rainfall,
        EWMA features, interaction features, and Brière thermal curve.

        Returns:
            Dict with keys: temperature, humidity, rainfall (current 7-day avg)
            plus all derived features needed by Model 2.
        """
        try:
            if target_date is None:
                target_date = datetime.now()

            end_date = target_date - timedelta(days=1)
            start_date = end_date - timedelta(days=29)  # 30 days total

            url = "https://historical-forecast-api.open-meteo.com/v1/forecast"
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "start_date": start_date.strftime('%Y-%m-%d'),
                "end_date": end_date.strftime('%Y-%m-%d'),
                "daily": "temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum",
                "timezone": "Asia/Singapore"
            }

            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()

            data = response.json()
            daily = data.get("daily", {})

            temps = [v if v is not None else 0.0 for v in daily.get("temperature_2m_mean", [])]
            humids = [v if v is not None else 0.0 for v in daily.get("relative_humidity_2m_mean", [])]
            rains = [v if v is not None else 0.0 for v in daily.get("precipitation_sum", [])]

            if not temps or not humids or not rains:
                raise Exception("No daily weather data available")

            return self._compute_extended_weather(temps, humids, rains)

        except Exception as e:
            logger.warning(f"Error fetching weather data: {e}")
            return self._default_weather()

    @staticmethod
    def _compute_extended_weather(temps: list, humids: list, rains: list) -> Dict:
        """Derive all weather features from daily series (most-recent day last)."""
        n = len(temps)

        # Current values = average of most recent 7 days
        recent = min(7, n)
        temperature = sum(temps[-recent:]) / recent
        humidity = sum(humids[-recent:]) / recent
        rainfall = sum(rains[-recent:]) / recent

        # Lag-7 values (value from 7 days before the most recent day)
        idx7 = max(n - 8, 0)
        temperature_lag_7 = temps[idx7] if n > 7 else temperature
        humidity_lag_7 = humids[idx7] if n > 7 else humidity
        rainfall_lag_7 = rains[idx7] if n > 7 else rainfall

        # Cumulative rainfall
        rainfall_cumul_14d = sum(rains[-14:]) if n >= 14 else sum(rains)
        rainfall_cumul_28d = sum(rains[-28:]) if n >= 28 else sum(rains)

        # EWMA features using pandas
        rain_series = pd.Series(rains)
        temp_series = pd.Series(temps)
        humid_series = pd.Series(humids)

        rainfall_ewma_14d = float(rain_series.ewm(span=14, adjust=False).mean().iloc[-1])
        temp_ewma_7d = float(temp_series.ewm(span=7, adjust=False).mean().iloc[-1])
        humidity_ewma_7d = float(humid_series.ewm(span=7, adjust=False).mean().iloc[-1])

        # Interaction features (based on current averages)
        temp_x_humidity = temperature * humidity
        temp_x_rainfall = temperature * rainfall
        humidity_x_rainfall = humidity * rainfall

        breeding_favorable = int(
            25.0 <= temperature <= 35.0
            and humidity > 60.0
            and rainfall > 0.0
        )

        # Brière thermal performance curve
        T_min, T_max = 13.3, 39.2
        t_clipped = max(T_min, min(temperature, T_max))
        briere_thermal_curve = t_clipped * (t_clipped - T_min) * math.sqrt(T_max - t_clipped)

        return {
            "temperature": round(temperature, 2),
            "humidity": round(humidity, 2),
            "rainfall": round(rainfall, 2),
            "temperature_lag_7": round(temperature_lag_7, 2),
            "humidity_lag_7": round(humidity_lag_7, 2),
            "rainfall_lag_7": round(rainfall_lag_7, 2),
            "rainfall_cumul_14d": round(rainfall_cumul_14d, 2),
            "rainfall_cumul_28d": round(rainfall_cumul_28d, 2),
            "temp_x_humidity": round(temp_x_humidity, 2),
            "temp_x_rainfall": round(temp_x_rainfall, 2),
            "humidity_x_rainfall": round(humidity_x_rainfall, 2),
            "breeding_favorable": breeding_favorable,
            "rainfall_ewma_14d": round(rainfall_ewma_14d, 2),
            "temp_ewma_7d": round(temp_ewma_7d, 2),
            "humidity_ewma_7d": round(humidity_ewma_7d, 2),
            "briere_thermal_curve": round(briere_thermal_curve, 4),
        }

    @staticmethod
    def _default_weather() -> Dict:
        """Return sensible defaults for all weather features."""
        temp, hum, rain = 28.0, 75.0, 2.0
        T_min, T_max = 13.3, 39.2
        t_c = max(T_min, min(temp, T_max))
        return {
            "temperature": temp, "humidity": hum, "rainfall": rain,
            "temperature_lag_7": temp, "humidity_lag_7": hum, "rainfall_lag_7": rain,
            "rainfall_cumul_14d": rain * 14, "rainfall_cumul_28d": rain * 28,
            "temp_x_humidity": temp * hum, "temp_x_rainfall": temp * rain,
            "humidity_x_rainfall": hum * rain,
            "breeding_favorable": 1,
            "rainfall_ewma_14d": rain, "temp_ewma_7d": temp, "humidity_ewma_7d": hum,
            "briere_thermal_curve": round(t_c * (t_c - T_min) * math.sqrt(T_max - t_c), 4),
        }
    
    def _calculate_historical_features(self, historical_cases_data: Optional[List[Dict]], target_date: datetime) -> Dict[str, float]:
        """
        Calculate historical features from provided historical cases data
        
        Args:
            historical_cases_data (Optional[List[Dict]]): List of historical cases for this location
            target_date (datetime): Target date for prediction
            
        Returns:
            Dict: Historical features dictionary
        """
        # Initialize historical features
        historical_features = {
            'cases_lag_1': 0.0,
            'cases_lag_7': 0.0,
            'cases_lag_30': 0.0,
            'cases_avg_7': 0.0,
            'cases_avg_30': 0.0
        }
        
        if not historical_cases_data or len(historical_cases_data) == 0:
            return historical_features
        
        try:
            # Prepare historical data
            hist_data = []
            for item in historical_cases_data:
                if isinstance(item, dict):
                    # Handle different data formats
                    if 'date' in item and 'cases' in item:
                        hist_data.append({
                            'date': pd.to_datetime(item['date']),
                            'cases': float(item['cases'])
                        })
                    elif 'total_active_cases' in item and 'date' in item:
                        hist_data.append({
                            'date': pd.to_datetime(item['date']),
                            'cases': float(item['total_active_cases'])
                        })
            
            if not hist_data:
                return historical_features
            
            # Create DataFrame and sort by date
            hist_df = pd.DataFrame(hist_data)
            hist_df = hist_df.sort_values('date').reset_index(drop=True)
            
            # Filter data up to target date (exclude future data)
            hist_df = hist_df[hist_df['date'] < target_date]
            
            if len(hist_df) == 0:
                return historical_features
            
            # Calculate lag features
            if len(hist_df) >= 1:
                historical_features['cases_lag_1'] = hist_df['cases'].iloc[-1]
            if len(hist_df) >= 7:
                historical_features['cases_lag_7'] = hist_df['cases'].iloc[-7]
            if len(hist_df) >= 30:
                historical_features['cases_lag_30'] = hist_df['cases'].iloc[-30]
            
            # Calculate rolling averages
            if len(hist_df) >= 7:
                historical_features['cases_avg_7'] = hist_df['cases'].tail(7).mean()
            elif len(hist_df) > 0:
                historical_features['cases_avg_7'] = hist_df['cases'].mean()
            
            if len(hist_df) >= 30:
                historical_features['cases_avg_30'] = hist_df['cases'].tail(30).mean()
            elif len(hist_df) > 0:
                historical_features['cases_avg_30'] = hist_df['cases'].mean()
            
        except Exception as e:
            logger.warning(f"Error calculating historical features: {e}")
            # Return default values if calculation fails
            pass
        
        return historical_features
    
    def _is_location_hotspot(self, latitude: float, longitude: float) -> int:
        """
        Check if a location is a hotspot based on coordinates
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate
            
        Returns:
            int: 1 if hotspot, 0 if not hotspot
        """
        try:
            # Load hotspot data if not already loaded
            if not hasattr(self, 'hotspot_df'):
                hotspot_path = os.path.join(self.models_dir, "dengue_hotspot.csv")
                if os.path.exists(hotspot_path):
                    self.hotspot_df = pd.read_csv(hotspot_path)
                    # Parse date and normalize columns
                    self.hotspot_df['date'] = pd.to_datetime(self.hotspot_df['date'], format='%d/%m/%Y')
                    if 'centroid_x' not in self.hotspot_df.columns and 'x' in self.hotspot_df.columns:
                        self.hotspot_df = self.hotspot_df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
                    if 'location' not in self.hotspot_df.columns and 'area' in self.hotspot_df.columns:
                        self.hotspot_df = self.hotspot_df.rename(columns={'area': 'location'})
                else:
                    self.hotspot_df = None
            
            if self.hotspot_df is None:
                return 0
            
            # Round coordinates to reduce precision mismatch
            cx_round = round(longitude, 4)
            cy_round = round(latitude, 4)
            
            # Filter hotspot data by coordinates only
            hotspot_match = self.hotspot_df[
                (self.hotspot_df['centroid_x'].round(4) == cx_round) &
                (self.hotspot_df['centroid_y'].round(4) == cy_round)
            ]
            
            # Return 1 if any hotspot found, 0 otherwise
            return 1 if len(hotspot_match) > 0 else 0
            
        except Exception as e:
            logger.warning(f"Error checking hotspot status: {e}")
            return 0
    
    def _get_location_cluster(self, latitude: float, longitude: float) -> int:
        """Get KMeans location cluster for given coordinates."""
        try:
            # Prefer the saved KMeans model from training
            if self.kmeans_model is not None:
                return int(self.kmeans_model.predict([[longitude, latitude]])[0])

            # Fallback: fit on active_dengue.csv (legacy)
            if not hasattr(self, '_kmeans_fallback'):
                from sklearn.cluster import KMeans
                data_path = os.path.join(self.models_dir, "active_dengue.csv")
                if os.path.exists(data_path):
                    df = pd.read_csv(data_path)
                    if 'centroid_x' not in df.columns and 'x' in df.columns:
                        df = df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
                    self._kmeans_fallback = KMeans(n_clusters=10, random_state=42)
                    self._kmeans_fallback.fit(df[['centroid_x', 'centroid_y']])
                else:
                    return int((longitude + latitude) * 100) % 10

            return int(self._kmeans_fallback.predict([[longitude, latitude]])[0])

        except Exception as e:
            logger.warning(f"Error getting location cluster: {e}")
            return int((longitude + latitude) * 100) % 10

    def _get_geo_features(self, latitude: float, longitude: float) -> Dict[str, float]:
        """
        Look up geo-spatial features (state_encoded, density_cluster, bbox_area)
        via nearest-neighbour lookup against training data coordinates.
        """
        defaults = {'state_encoded': 0, 'density_cluster': 0, 'bbox_area': 0.0}
        if self.geo_lookup is None:
            return defaults
        try:
            nn_model = self.geo_lookup['nn_model']
            _, idx = nn_model.kneighbors([[longitude, latitude]])
            i = idx[0][0]
            return {
                'state_encoded': int(self.geo_lookup['state_encoded'][i]),
                'density_cluster': int(self.geo_lookup['density_cluster'][i]),
                'bbox_area': float(self.geo_lookup['bbox_area'][i]),
            }
        except Exception as e:
            logger.warning(f"Geo-lookup failed: {e}")
            return defaults
    
    def get_historical_data_for_location(self, latitude: float, longitude: float, days_back: int = 30) -> List[Dict]:
        """
        Get historical data for a specific location from the loaded dataset
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate
            days_back (int): Number of days to look back for historical data
            
        Returns:
            List[Dict]: Historical cases data for the location
        """
        try:
            # Load dataset if not already loaded
            if not hasattr(self, 'dataset_df'):
                data_path = os.path.join(self.models_dir, "active_dengue.csv")
                if os.path.exists(data_path):
                    self.dataset_df = pd.read_csv(data_path)
                    # Normalize column names if needed
                    if 'centroid_x' not in self.dataset_df.columns and 'x' in self.dataset_df.columns:
                        self.dataset_df = self.dataset_df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
                    # Convert date column to datetime
                    self.dataset_df['date'] = pd.to_datetime(self.dataset_df['date'], format='%d/%m/%Y', errors='coerce')
                else:
                    return []
            
            # Find data for this location (with small tolerance for coordinate matching)
            tolerance = 0.001
            location_data = self.dataset_df[
                (abs(self.dataset_df['centroid_x'] - longitude) < tolerance) & 
                (abs(self.dataset_df['centroid_y'] - latitude) < tolerance)
            ].copy()
            
            if location_data.empty:
                return []
            
            # Sort by date
            location_data = location_data.sort_values('date')
            
            # Get recent data (last N days)
            cutoff_date = datetime.now() - timedelta(days=days_back)
            recent_data = location_data[location_data['date'] >= cutoff_date]
            
            # Convert to the expected format
            historical_data = []
            for _, row in recent_data.iterrows():
                historical_data.append({
                    'date': row['date'].strftime('%Y-%m-%d'),
                    'cases': float(row['total_active_cases'])
                })
            
            return historical_data
            
        except Exception as e:
            logger.warning(f"Error getting historical data: {e}")
            return []
    
    def _prepare_features(self, latitude: float, longitude: float, weather_data: Optional[Dict] = None, 
                         historical_cases_data: Optional[List[Dict]] = None, target_date: Optional[datetime] = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare feature arrays for both models.

        Model 1 (14 features): centroid_x, centroid_y, location_cluster, month,
            day_of_year, is_hotspot, state_encoded, density_cluster, bbox_area,
            cases_lag_1, cases_lag_7, cases_lag_30, cases_avg_7, cases_avg_30

        Model 2 (24 features): centroid_x, centroid_y, humidity, temperature,
            rainfall, month, day_of_year, week_of_year, location_cluster,
            state_encoded, is_hotspot, rainfall_lag_7, humidity_lag_7,
            temperature_lag_7, rainfall_cumul_14d, rainfall_cumul_28d,
            temp_x_humidity, temp_x_rainfall, humidity_x_rainfall,
            breeding_favorable, rainfall_ewma_14d, temp_ewma_7d,
            humidity_ewma_7d, briere_thermal_curve
        """
        if target_date is None:
            target_date = datetime.now()

        current_month = target_date.month
        current_day_of_year = target_date.timetuple().tm_yday
        week_of_year = target_date.isocalendar()[1]

        # Shared lookups
        historical_features = self._calculate_historical_features(historical_cases_data, target_date)
        is_hotspot = self._is_location_hotspot(latitude, longitude)
        location_cluster = self._get_location_cluster(latitude, longitude)
        geo = self._get_geo_features(latitude, longitude)

        # Extended weather data (fetches 28-day daily series & computes all derived features)
        if weather_data is None or "rainfall_lag_7" not in weather_data:
            weather_data = self._get_weather_data(latitude, longitude, target_date)

        # ── Model 1: Historical Cases (14 features) ───────────────────
        model1_features = [
            longitude,                                    # centroid_x
            latitude,                                     # centroid_y
            location_cluster,                             # location_cluster
            current_month,                                # month
            current_day_of_year,                          # day_of_year
            is_hotspot,                                   # is_hotspot
            geo['state_encoded'],                         # state_encoded
            geo['density_cluster'],                       # density_cluster
            geo['bbox_area'],                             # bbox_area
            historical_features['cases_lag_1'],           # cases_lag_1
            historical_features['cases_lag_7'],           # cases_lag_7
            historical_features['cases_lag_30'],          # cases_lag_30
            historical_features['cases_avg_7'],           # cases_avg_7
            historical_features['cases_avg_30'],          # cases_avg_30
        ]

        # ── Model 2: Weather-based (24 features) ──────────────────────
        model2_features = [
            longitude,                                    # centroid_x
            latitude,                                     # centroid_y
            weather_data["humidity"],                      # humidity
            weather_data["temperature"],                   # temperature
            weather_data["rainfall"],                      # rainfall
            current_month,                                # month
            current_day_of_year,                          # day_of_year
            week_of_year,                                 # week_of_year
            location_cluster,                             # location_cluster
            geo['state_encoded'],                         # state_encoded
            is_hotspot,                                   # is_hotspot
            weather_data["rainfall_lag_7"],                # rainfall_lag_7
            weather_data["humidity_lag_7"],                # humidity_lag_7
            weather_data["temperature_lag_7"],             # temperature_lag_7
            weather_data["rainfall_cumul_14d"],            # rainfall_cumul_14d
            weather_data["rainfall_cumul_28d"],            # rainfall_cumul_28d
            weather_data["temp_x_humidity"],               # temp_x_humidity
            weather_data["temp_x_rainfall"],               # temp_x_rainfall
            weather_data["humidity_x_rainfall"],           # humidity_x_rainfall
            weather_data["breeding_favorable"],            # breeding_favorable
            weather_data["rainfall_ewma_14d"],             # rainfall_ewma_14d
            weather_data["temp_ewma_7d"],                  # temp_ewma_7d
            weather_data["humidity_ewma_7d"],              # humidity_ewma_7d
            weather_data["briere_thermal_curve"],          # briere_thermal_curve
        ]

        logger.info(f"Prepared features — Model 1: {len(model1_features)}, Model 2: {len(model2_features)}")
        return np.array(model1_features, dtype=np.float64), np.array(model2_features, dtype=np.float64)
    
    def predict_risk_with_breeding_areas(self, latitude: float, longitude: float, 
                                        weather_data: Optional[Dict] = None, 
                                        historical_cases_data: Optional[List[Dict]] = None, 
                                        target_date: Optional[datetime] = None,
                                        image_urls: Optional[List[str]] = None) -> Dict[str, float]:
        """
        Predict dengue risk using all three models (Historical, Weather, and Breeding Area Detection)
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate
            weather_data (Optional[Dict]): Weather data dictionary
            historical_cases_data (Optional[List[Dict]]): Historical cases data for Model 1
            target_date (Optional[datetime]): Target date for prediction
            image_urls (Optional[List[str]]): List of drone image URLs for breeding area detection
            
        Returns:
            Dict containing prediction results from all three models
        """
        try:
            # Validate coordinates
            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                raise ValueError("Invalid coordinates")
            
            # Get predictions from Models 1 and 2
            model1_model2_result = self.predict_risk(latitude, longitude, weather_data, historical_cases_data, target_date)
            
            # Initialize Model 3 results
            model3_score = 0.0
            model3_risk_level = "low"
            breeding_area_detections = []
            model3_error = None
            images_successfully_processed = False
            
            # Process breeding area detection if image URLs are provided
            if image_urls and len(image_urls) > 0:
                try:
                    logger.info(f"Processing {len(image_urls)} images for breeding area detection")
                    
                    all_detections = []
                    total_score = 0.0
                    processed_images = 0
                    
                    for image_url in image_urls:
                        try:
                            detection_result = self.breeding_area_service.detect_breeding_areas_from_url(image_url)
                            
                            if detection_result.get('success', False):
                                all_detections.extend(detection_result.get('detections', []))
                                total_score += detection_result.get('breeding_area_score', 0.0)
                                processed_images += 1
                                
                                logger.info(f"Processed image {image_url}: Score {detection_result.get('breeding_area_score', 0.0)}")
                            else:
                                logger.warning(f"Failed to process image {image_url}: {detection_result.get('error', 'Unknown error')}")
                                
                        except Exception as e:
                            logger.error(f"Error processing image {image_url}: {str(e)}")
                            continue
                    
                    # Calculate average Model 3 score
                    if processed_images > 0:
                        model3_score = total_score / processed_images
                        images_successfully_processed = True
                        
                        # Determine risk level based on Model 3 score
                        if model3_score >= 0.7:
                            model3_risk_level = "high"
                        elif model3_score >= 0.4:
                            model3_risk_level = "medium"
                        else:
                            model3_risk_level = "low"
                        
                        breeding_area_detections = all_detections
                        
                        logger.info(f"Model 3 completed: {processed_images} images processed, average score: {model3_score:.3f}")
                    else:
                        logger.warning("No images were successfully processed for Model 3")
                        model3_error = "No images could be processed"
                        
                except Exception as e:
                    logger.error(f"Model 3 processing failed: {str(e)}")
                    model3_error = str(e)
            else:
                logger.info("No image URLs provided for Model 3")
                model3_error = "No images provided"
            
            # Calculate combined score from all three models
            # Model scores from different scales:
            # - Model 1 (Historical cases): 0-5 range
            # - Model 2 (Weather-based): 0-5 range  
            # - Model 3 (Breeding area detection): 0-1 range (probability)
            
            model1_score = model1_model2_result.get('model1_score', 0.0)
            model2_score = model1_model2_result.get('model2_score', 0.0)
            
            # Normalize Model 1 and Model 2 to 0-1 range (max score is 5)
            # Clamp to ensure values stay in [0, 1] range
            model1_normalized = min(max(model1_score / 5.0, 0.0), 1.0)
            model2_normalized = min(max(model2_score / 5.0, 0.0), 1.0)
            model3_normalized = min(max(model3_score, 0.0), 1.0)  # Already 0-1, but ensure clamped
            
            # Weighted combination strategy:
            # When images are provided and successfully processed:
            # - Model 1 (35%): Historical data is most reliable predictor (based on actual case trends)
            # - Model 2 (35%): Weather conditions are important for dengue risk but can change rapidly
            # - Model 3 (30%): Visual breeding area detection is strong evidence but requires images
            # 
            # When images are NOT provided or failed to process:
            # - Model 1 (45%): Historical data gets increased weight
            # - Model 2 (45%): Weather conditions get increased weight
            # - Model 3 (10%): Reduced weight when no visual evidence is available
            # 
            # Rationale: Historical patterns (Model 1) are most predictive, but weather (Model 2) 
            # and immediate visual evidence (Model 3) provide important context for current risk.
            # When visual evidence is unavailable, we rely more on historical and weather data.
            
            if images_successfully_processed:
                # Use 35/35/30 weights when images are available and successfully processed
                combined_score_normalized = (
                    0.35 * model1_normalized + 
                    0.35 * model2_normalized + 
                    0.30 * model3_normalized
                )
            else:
                # Use 45/45/10 weights when images are not provided or failed
                combined_score_normalized = (
                    0.45 * model1_normalized + 
                    0.45 * model2_normalized + 
                    0.10 * model3_normalized
                )
            
            # Scale back to 0-5 range for consistency with two-model prediction output
            # This maintains compatibility with existing frontend/API expectations
            combined_score = combined_score_normalized * 5.0
            
            # Determine overall risk level (based on 0-5 scale)
            # Thresholds: High >= 3.5 (0.7 normalized), Medium >= 2.0 (0.4 normalized)
            if combined_score >= 3.0:  # >= 0.7 normalized * 5
                overall_risk_level = "high"
            elif combined_score >= 1.0:  # >= 0.4 normalized * 5
                overall_risk_level = "medium"
            else:
                overall_risk_level = "low"
            
            # Prepare comprehensive result
            result = {
                "success": True,
                "prediction": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "combined_score": round(combined_score, 5),  # Score in 0-5 range
                    "combined_score_normalized": round(combined_score_normalized, 3),  # Score in 0-1 range for reference
                    "risk_level": overall_risk_level,
                    
                    # Individual model scores
                    "model1_score": model1_score,
                    "model2_score": model2_score,
                    "model3_score": model3_score,
                    
                    # Model 1 & 2 details
                    "historical_features_used": model1_model2_result.get('historical_features_used'),
                    "is_hotspot": model1_model2_result.get('is_hotspot'),
                    "location_cluster": model1_model2_result.get('location_cluster'),
                    
                    # Model 3 details
                    "breeding_area_detections": breeding_area_detections,
                    "model3_risk_level": model3_risk_level,
                    "model3_error": model3_error,
                    "images_processed": len(image_urls) if image_urls else 0,
                    
                    # Metadata
                    "timestamp": datetime.now().isoformat(),
                    "models_used": ["model1_historical", "model2_weather", "model3_breeding_area"]
                }
            }
            
            logger.info(f"Three-model prediction completed: Combined score {combined_score:.3f}, Risk level: {overall_risk_level}")
            
            return result
            
        except Exception as e:
            logger.error(f"Three-model prediction failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "prediction": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "combined_score": 0.0,
                    "risk_level": "unknown",
                    "model1_score": 0.0,
                    "model2_score": 0.0,
                    "model3_score": 0.0,
                    "timestamp": datetime.now().isoformat()
                }
            }
    
    def predict_risk(self, latitude: float, longitude: float, weather_data: Optional[Dict] = None, 
                    historical_cases_data: Optional[List[Dict]] = None, target_date: Optional[datetime] = None) -> Dict[str, float]:
        """
        Predict dengue risk using both models
        
        Args:
            latitude (float): Latitude coordinate
            longitude (float): Longitude coordinate
            weather_data (Optional[Dict]): Weather data dictionary
            historical_cases_data (Optional[List[Dict]]): Historical cases data for Model 1
            target_date (Optional[datetime]): Target date for prediction
            
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
            model1_features, model2_features = self._prepare_features(
                latitude, longitude, weather_data, historical_cases_data, target_date
            )
            
            results = {
                "model1_score": None,
                "model2_score": None,
                "combined_score": None,
                "risk_level": "unknown",
                "historical_features_used": None,
                "is_hotspot": None,
                "location_cluster": None
            }
            
            # Predict with Model 1 (Historical Cases)
            if self.model1 and self.scaler1:
                try:
                    logger.info(f"Model 1 features shape: {model1_features.shape}")

                    if self.model1_needs_scaling:
                        X1 = self.scaler1.transform(model1_features.reshape(1, -1))
                    else:
                        X1 = model1_features.reshape(1, -1)

                    raw_pred = float(self.model1.predict(X1)[0])

                    if self.model1_log_target:
                        model1_prediction = float(np.expm1(max(raw_pred, 0)))
                    else:
                        model1_prediction = raw_pred

                    model1_prediction = max(model1_prediction, 0.0)
                    results["model1_score"] = model1_prediction
                    logger.info(f"Model 1 prediction: {results['model1_score']}")
                except Exception as e:
                    logger.error(f"Model 1 prediction failed: {str(e)}")
                    raise Exception(f"Model 1 prediction failed: {str(e)}")
            
            # Predict with Model 2 (Weather-based)
            if self.model2 and self.scaler2:
                try:
                    logger.info(f"Model 2 features shape: {model2_features.shape}")

                    if self.model2_needs_scaling:
                        X2 = self.scaler2.transform(model2_features.reshape(1, -1))
                    else:
                        X2 = model2_features.reshape(1, -1)

                    raw_pred = float(self.model2.predict(X2)[0])

                    if self.model2_log_target:
                        model2_prediction = float(np.expm1(max(raw_pred, 0)))
                    else:
                        model2_prediction = raw_pred

                    model2_prediction = max(model2_prediction, 0.0)
                    results["model2_score"] = model2_prediction
                    logger.info(f"Model 2 prediction: {results['model2_score']}")
                except Exception as e:
                    logger.error(f"Model 2 prediction failed: {str(e)}")
                    raise Exception(f"Model 2 prediction failed: {str(e)}")
            
            # Combine predictions (weighted average)
            scores = [s for s in [results["model1_score"], results["model2_score"]] if s is not None]
            if not scores:
                raise Exception("No valid predictions from any model")
            
            # Use weighted average: 45% historical, 45% weather, 10% images (Model 3 = 0.0 when no images)
            # When no images: Model 1 = 45%, Model 2 = 45%, Model 3 = 10% (but contributes 0.0)
            # Both models available: 45% + 45% = 90%, Model 3 (0.0) gets 10%
            model1_score = results["model1_score"] if results["model1_score"] is not None else 0.0
            model2_score = results["model2_score"] if results["model2_score"] is not None else 0.0
            model3_score = 0.0  # No images available
            
            results["combined_score"] = float(0.45 * model1_score + 0.45 * model2_score + 0.10 * model3_score)
            
            # Determine risk level
            if results["combined_score"] >= 3:
                results["risk_level"] = "high"
            elif results["combined_score"] >= 1:
                results["risk_level"] = "medium"
            else:
                results["risk_level"] = "low"
            
            # Add additional information
            if historical_cases_data:
                historical_features = self._calculate_historical_features(historical_cases_data, target_date or datetime.now())
                results["historical_features_used"] = historical_features
            
            results["is_hotspot"] = int(self._is_location_hotspot(latitude, longitude))
            results["location_cluster"] = int(self._get_location_cluster(latitude, longitude))
            
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

@app.route('/detect-breeding-areas', methods=['POST'])
def detect_breeding_areas():
    """
    Breeding area detection endpoint (Model 3 only)
    
    Expected JSON payload:
    {
        "image_urls": [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        image_urls = data.get('image_urls', [])
        
        if not image_urls or len(image_urls) == 0:
            return jsonify({"error": "image_urls array is required and cannot be empty"}), 400
        
        # Process all images
        all_detections = []
        total_score = 0.0
        processed_images = 0
        errors = []
        
        for i, image_url in enumerate(image_urls):
            try:
                detection_result = prediction_service.breeding_area_service.detect_breeding_areas_from_url(image_url)
                
                if detection_result.get('success', False):
                    all_detections.extend(detection_result.get('detections', []))
                    total_score += detection_result.get('breeding_area_score', 0.0)
                    processed_images += 1
                else:
                    errors.append(f"Image {i+1}: {detection_result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                errors.append(f"Image {i+1}: {str(e)}")
                continue
        
        # Calculate average score
        average_score = total_score / processed_images if processed_images > 0 else 0.0
        
        # Determine risk level
        if average_score >= 0.7:
            risk_level = "high"
        elif average_score >= 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Get recommendations
        recommendations = prediction_service.breeding_area_service.get_risk_recommendations(
            risk_level, len(all_detections)
        )
        
        result = {
            "success": True,
            "breeding_area_score": round(average_score, 3),
            "risk_level": risk_level,
            "detections": all_detections,
            "detection_count": len(all_detections),
            "images_processed": processed_images,
            "total_images": len(image_urls),
            "recommendations": recommendations,
            "errors": errors if errors else None,
            "timestamp": datetime.now().isoformat()
        }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Breeding area detection endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/predict/three-models', methods=['POST'])
def predict_three_models():
    """
    Three-model prediction endpoint (Historical + Weather + Breeding Area Detection)
    
    Expected JSON payload:
    {
        "latitude": float,
        "longitude": float,
        "weather_data": {
            "temperature": float,
            "humidity": float,
            "rainfall": float
        } (optional - will fetch automatically if not provided),
        "historical_cases_data": [
            {
                "date": "YYYY-MM-DD",
                "cases": float
            }
        ] (optional - for Model 1 historical features),
        "target_date": "YYYY-MM-DD" (optional - defaults to current date),
        "image_urls": [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
        ] (optional - for Model 3 breeding area detection)
    }
    
    Model 1: Historical cases prediction
    Model 2: Weather-based prediction  
    Model 3: Breeding area detection from drone images
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        weather_data = data.get('weather_data')
        historical_cases_data = data.get('historical_cases_data')
        target_date_str = data.get('target_date')
        image_urls = data.get('image_urls', [])
        
        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400
        
        # Parse target date if provided
        target_date = None
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({"error": "Invalid target_date format. Use YYYY-MM-DD"}), 400
        
        # Perform three-model prediction
        result = prediction_service.predict_risk_with_breeding_areas(
            latitude=latitude,
            longitude=longitude,
            weather_data=weather_data,
            historical_cases_data=historical_cases_data,
            target_date=target_date,
            image_urls=image_urls
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Three-model prediction endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

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
        } (optional - will fetch automatically if not provided),
        "historical_cases_data": [
            {
                "date": "YYYY-MM-DD",
                "cases": float
            }
        ] (optional - for Model 1 historical features),
        "target_date": "YYYY-MM-DD" (optional - defaults to current date)
    }
    
    Model 1: Uses latitude, longitude, and historical cases data
    Model 2: Uses latitude, longitude, humidity, temperature, rainfall
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        weather_data = data.get('weather_data')
        historical_cases_data = data.get('historical_cases_data')
        target_date_str = data.get('target_date')
        
        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400
        
        # Parse target date if provided
        target_date = None
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({"error": "Invalid target_date format. Use YYYY-MM-DD"}), 400
        
        # Perform prediction
        result = prediction_service.predict_risk(
            latitude, longitude, weather_data, historical_cases_data, target_date
        )
        
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

@app.route('/predict/weighted-50-50', methods=['POST'])
def predict_weighted_50_50():
    """
    Prediction endpoint with equal weighting (50% Model 1, 50% Model 2)
    
    Expected JSON payload:
    {
        "latitude": float,
        "longitude": float,
        "weather_data": {
            "temperature": float,
            "humidity": float,
            "rainfall": float
        } (optional - will fetch automatically if not provided),
        "historical_cases_data": [
            {
                "date": "YYYY-MM-DD",
                "cases": float
            }
        ] (optional - for Model 1 historical features),
        "target_date": "YYYY-MM-DD" (optional - defaults to current date)
    }
    
    Combines scores with 50/50 weighting between Model 1 and Model 2.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        weather_data = data.get('weather_data')
        historical_cases_data = data.get('historical_cases_data')
        target_date_str = data.get('target_date')
        
        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400
        
        # Parse target date if provided
        target_date = None
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({"error": "Invalid target_date format. Use YYYY-MM-DD"}), 400
        
        # Validate coordinates
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400
        
        # Ensure models are loaded
        if not (prediction_service.model1 and prediction_service.scaler1) and not (prediction_service.model2 and prediction_service.scaler2):
            return jsonify({"error": "No models loaded. Service cannot make predictions without models."}), 503
        
        # Prepare features
        model1_features, model2_features = prediction_service._prepare_features(
            latitude, longitude, weather_data, historical_cases_data, target_date
        )
        
        model1_score = None
        model2_score = None
        
        # Predict with Model 1
        if prediction_service.model1 and prediction_service.scaler1:
            X1 = (prediction_service.scaler1.transform(model1_features.reshape(1, -1))
                  if prediction_service.model1_needs_scaling
                  else model1_features.reshape(1, -1))
            raw1 = float(prediction_service.model1.predict(X1)[0])
            model1_score = max(float(np.expm1(max(raw1, 0))) if prediction_service.model1_log_target else raw1, 0.0)
        
        # Predict with Model 2
        if prediction_service.model2 and prediction_service.scaler2:
            X2 = (prediction_service.scaler2.transform(model2_features.reshape(1, -1))
                  if prediction_service.model2_needs_scaling
                  else model2_features.reshape(1, -1))
            raw2 = float(prediction_service.model2.predict(X2)[0])
            model2_score = max(float(np.expm1(max(raw2, 0))) if prediction_service.model2_log_target else raw2, 0.0)
        
        if model1_score is None and model2_score is None:
            return jsonify({"error": "No valid predictions from any model"}), 500
        
        # Combine with 50/50 weighting (ignore model3 here)
        combined_score = (
            (model1_score if model1_score is not None else 0.0) * 0.5 +
            (model2_score if model2_score is not None else 0.0) * 0.5
        )
        
        # Determine risk level using same thresholds
        if combined_score >= 3:
            risk_level = "high"
        elif combined_score >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Historical features for response if provided
        historical_features = None
        if historical_cases_data:
            historical_features = prediction_service._calculate_historical_features(
                historical_cases_data, target_date or datetime.now()
            )
        
        result = {
            "model1_score": model1_score,
            "model2_score": model2_score,
            "combined_score": combined_score,
            "risk_level": risk_level,
            "historical_features_used": historical_features,
            "is_hotspot": int(prediction_service._is_location_hotspot(latitude, longitude)),
            "location_cluster": int(prediction_service._get_location_cluster(latitude, longitude))
        }
        
        return jsonify({
            "success": True,
            "prediction": result,
            "timestamp": datetime.now().isoformat()
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Weighted prediction endpoint error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/predict/model1', methods=['POST'])
def predict_model1():
    """
    Model 1 prediction endpoint with historical data support
    
    Expected JSON payload:
    {
        "latitude": float,
        "longitude": float,
        "historical_cases_data": [
            {
                "date": "YYYY-MM-DD",
                "cases": float
            }
        ] (optional - for better predictions),
        "target_date": "YYYY-MM-DD" (optional - defaults to current date)
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        historical_cases_data = data.get('historical_cases_data')
        target_date_str = data.get('target_date')
        
        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400
        
        # Parse target date if provided
        target_date = None
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({"error": "Invalid target_date format. Use YYYY-MM-DD"}), 400
        
        # Check if Model 1 is available
        if not (prediction_service.model1 and prediction_service.scaler1):
            return jsonify({"error": "Model 1 not available"}), 503
        
        # Prepare features for Model 1 only
        model1_features, _ = prediction_service._prepare_features(
            latitude, longitude, None, historical_cases_data, target_date
        )
        
        # Make prediction with Model 1
        X1 = (prediction_service.scaler1.transform(model1_features.reshape(1, -1))
              if prediction_service.model1_needs_scaling
              else model1_features.reshape(1, -1))
        raw_pred = float(prediction_service.model1.predict(X1)[0])
        model1_prediction = max(
            float(np.expm1(max(raw_pred, 0))) if prediction_service.model1_log_target else raw_pred,
            0.0
        )
        
        # Calculate historical features for response
        historical_features = prediction_service._calculate_historical_features(
            historical_cases_data, target_date or datetime.now()
        )
        
        # Determine risk level
        if model1_prediction >= 3:
            risk_level = "high"
        elif model1_prediction >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        result = {
            "model": "Historical Cases Model (Improved)",
            "predicted_cases": float(model1_prediction),
            "risk_level": risk_level,
            "historical_features_used": historical_features,
            "is_hotspot": int(prediction_service._is_location_hotspot(latitude, longitude)),
            "location_cluster": int(prediction_service._get_location_cluster(latitude, longitude)),
            "data_quality": {
                "has_historical_data": historical_cases_data is not None and len(historical_cases_data) > 0,
                "data_points_available": len(historical_cases_data) if historical_cases_data else 0,
                "has_lag_1": historical_features['cases_lag_1'] > 0,
                "has_lag_7": historical_features['cases_lag_7'] > 0,
                "has_lag_30": historical_features['cases_lag_30'] > 0
            }
        }
        
        return jsonify({
            "success": True,
            "prediction": result,
            "timestamp": datetime.now().isoformat()
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Model 1 prediction endpoint error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/historical-data', methods=['GET'])
def get_historical_data():
    """
    Get historical data for a specific location
    
    Query parameters:
    - latitude: float (required)
    - longitude: float (required)
    - days_back: int (optional, default 30)
    """
    try:
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        days_back = request.args.get('days_back', 30, type=int)
        
        if latitude is None or longitude is None:
            return jsonify({"error": "latitude and longitude are required"}), 400
        
        # Validate coordinates
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400
        
        # Get historical data
        historical_data = prediction_service.get_historical_data_for_location(
            latitude, longitude, days_back
        )
        
        return jsonify({
            "success": True,
            "location": {"latitude": latitude, "longitude": longitude},
            "historical_data": historical_data,
            "data_points": len(historical_data),
            "days_back": days_back,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Historical data endpoint error: {str(e)}")
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
    # Test model loading
    try:
        logger.info("Testing model loading...")
        status = prediction_service.get_model_status()
        logger.info(f"Model loading status: {status}")
        
        if status['model1_loaded'] and status['model2_loaded']:
            logger.info("✅ All models loaded successfully!")
        else:
            logger.error("❌ Some models failed to load")
            
    except Exception as e:
        logger.error(f"❌ Model loading test failed: {e}")
        exit(1)
    
    # Start the Flask app
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting Dengue Prediction Service on port {port}")
    logger.info(f"Loading models from: {prediction_service.models_dir}")
    app.run(host='0.0.0.0', port=port, debug=False)
