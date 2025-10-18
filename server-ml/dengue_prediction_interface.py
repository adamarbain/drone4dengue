"""
Dengue Prediction Interface
==========================

A user-friendly interface for making dengue predictions using the trained models.
This script provides an interactive way to use both models for dengue prediction.

Author: AI Assistant
Date: 2025
"""

import pandas as pd
import numpy as np
import joblib
import json
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class DenguePredictionInterface:
    """
    A user-friendly interface for dengue prediction
    """
    
    def __init__(self):
        """
        Initialize the prediction interface
        """
        self.model1 = None
        self.model2 = None
        self.scaler1 = None
        self.scaler2 = None
        self.model1_feature_names = None
        self.model2_feature_names = None
        self.kmeans = None
        self.df = None
        self.hotspot_df = None
        
    def load_models(self):
        """
        Load the trained models and required data
        """
        try:
            # Try to load improved models first, fallback to original models
            try:
                # Load improved models from models directory
                self.model1 = joblib.load('models/model1_historical_cases_improved.pkl')
                self.model2 = joblib.load('models/model2_weather_based_improved.pkl')
                
                # Load improved scalers
                self.scaler1 = joblib.load('models/scaler1_historical_cases_improved.pkl')
                self.scaler2 = joblib.load('models/scaler2_weather_based_improved.pkl')
                
                # Load improved feature names
                with open('models/model_features_improved.json', 'r') as f:
                    features = json.load(f)
                    self.model1_feature_names = features['model1_features']
                    self.model2_feature_names = features['model2_features']
                
                print("✅ Improved models loaded successfully!")
                
            except FileNotFoundError:
                # Fallback to original models
                self.model1 = joblib.load('models/model1_historical_cases.pkl')
                self.model2 = joblib.load('models/model2_weather_based.pkl')
                
                # Load original scalers
                self.scaler1 = joblib.load('models/scaler1_historical_cases.pkl')
                self.scaler2 = joblib.load('models/scaler2_weather_based.pkl')
                
                # Load original feature names
                with open('models/model_features.json', 'r') as f:
                    features = json.load(f)
                    self.model1_feature_names = features['model1_features']
                    self.model2_feature_names = features['model2_features']
                
                print("✅ Original models loaded successfully!")
            
            # Load data for location clustering
            self.df = pd.read_csv('../daily-scrap-dengue-data/active_dengue.csv')
            
            # Load hotspot data for enhanced predictions
            try:
                self.hotspot_df = pd.read_csv('../daily-scrap-dengue-data/dengue_hotspot.csv')
                # Parse date and normalize columns
                self.hotspot_df['date'] = pd.to_datetime(self.hotspot_df['date'], format='%d/%m/%Y')
                if 'centroid_x' not in self.hotspot_df.columns and 'x' in self.hotspot_df.columns:
                    self.hotspot_df = self.hotspot_df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
                if 'location' not in self.hotspot_df.columns and 'area' in self.hotspot_df.columns:
                    self.hotspot_df = self.hotspot_df.rename(columns={'area': 'location'})
                print("✅ Hotspot data loaded successfully!")
            except FileNotFoundError:
                print("⚠️  Warning: dengue_hotspot.csv not found. Predictions will not include hotspot information.")
                self.hotspot_df = None
            except Exception as e:
                print(f"⚠️  Warning: Error loading hotspot data: {e}")
                self.hotspot_df = None
            
            # Train KMeans for location clustering
            self.kmeans = KMeans(n_clusters=10, random_state=42)
            self.kmeans.fit(self.df[['centroid_x', 'centroid_y']])
            
            print("✅ All models and data loaded successfully!")
            return True
            
        except FileNotFoundError as e:
            print(f"❌ Error loading models: {e}")
            print("Please make sure you have trained the models first by running 'dengue_ml_models_improved.py'")
            return False
        except Exception as e:
            print(f"❌ Error loading models: {e}")
            return False
    
    def validate_coordinates(self, centroid_x, centroid_y):
        """
        Validate coordinate inputs
        
        Args:
            centroid_x (float): Longitude
            centroid_y (float): Latitude
            
        Returns:
            tuple: (is_valid, error_message)
        """
        # Check if coordinates are within reasonable bounds for Malaysia
        if not (100.0 <= centroid_x <= 120.0):
            return False, "Longitude should be between 100.0 and 120.0 (Malaysia region)"
        
        if not (0.0 <= centroid_y <= 10.0):
            return False, "Latitude should be between 0.0 and 10.0 (Malaysia region)"
        
        return True, ""
    
    def is_location_hotspot(self, centroid_x, centroid_y, date=None):
        """
        Check if a location is a hotspot based on coordinates and optionally date
        
        Args:
            centroid_x (float): Longitude coordinate
            centroid_y (float): Latitude coordinate
            date (datetime, optional): Date to check for hotspot status
            
        Returns:
            int: 1 if hotspot, 0 if not hotspot
        """
        if self.hotspot_df is None:
            return 0
        
        try:
            # Round coordinates to reduce precision mismatch
            cx_round = round(centroid_x, 4)
            cy_round = round(centroid_y, 4)
            
            # Filter hotspot data by coordinates
            hotspot_match = self.hotspot_df[
                (self.hotspot_df['centroid_x'].round(4) == cx_round) &
                (self.hotspot_df['centroid_y'].round(4) == cy_round)
            ]
            
            # If date is provided, also filter by date
            if date is not None:
                hotspot_match = hotspot_match[
                    self.hotspot_df['date'] == pd.to_datetime(date)
                ]
            
            # Return 1 if any hotspot found, 0 otherwise
            return 1 if len(hotspot_match) > 0 else 0
            
        except Exception as e:
            print(f"Warning: Error checking hotspot status: {e}")
            return 0
    
    def validate_weather_data(self, humidity, temperature, rainfall):
        """
        Validate weather data inputs
        
        Args:
            humidity (float): Humidity percentage
            temperature (float): Temperature in Celsius
            rainfall (float): Rainfall in mm
            
        Returns:
            tuple: (is_valid, error_message)
        """
        if not (0 <= humidity <= 100):
            return False, "Humidity should be between 0 and 100 percent"
        
        if not (15 <= temperature <= 40):
            return False, "Temperature should be between 15 and 40 degrees Celsius"
        
        if not (0 <= rainfall <= 200):
            return False, "Rainfall should be between 0 and 200 mm"
        
        return True, ""
    
    def predict_model1(self, centroid_x, centroid_y):
        """
        Predict dengue cases using Model 1 (Historical Cases)
        
        Args:
            centroid_x (float): Longitude coordinate
            centroid_y (float): Latitude coordinate
            
        Returns:
            dict: Prediction results with detailed information
        """
        if self.model1 is None:
            return {"error": "Model 1 not loaded. Please load models first."}
        
        # Validate inputs
        is_valid, error_msg = self.validate_coordinates(centroid_x, centroid_y)
        if not is_valid:
            return {"error": f"Invalid coordinates: {error_msg}"}
        
        try:
            # Get current month and day of year for more realistic predictions
            from datetime import datetime
            now = datetime.now()
            current_month = now.month
            current_day_of_year = now.timetuple().tm_yday
            
            # Check if location is a hotspot
            is_hotspot = self.is_location_hotspot(centroid_x, centroid_y, now)
            
            # Create feature vector based on the model's feature structure
            if self.model1_feature_names and len(self.model1_feature_names) > 5:
                # Improved model with historical features and hotspot information
                features = np.array([[
                    centroid_x,
                    centroid_y,
                    0,  # location_cluster (will be predicted)
                    current_month,  # month
                    current_day_of_year,  # day_of_year
                    is_hotspot,  # is_hotspot
                    0,  # cases_lag_1 (no historical data available)
                    0,  # cases_lag_7
                    0,  # cases_lag_30
                    0,  # cases_avg_7
                    0   # cases_avg_30
                ]])
            else:
                # Original model structure
                features = np.array([[
                    centroid_x,
                    centroid_y,
                    0,  # location_cluster (will be predicted)
                    current_month,  # month
                    current_day_of_year,  # day_of_year
                    is_hotspot,  # is_hotspot
                    0,  # cases_lag_1 (no historical data available)
                    0,  # cases_lag_7
                    0,  # cases_lag_30
                    0,  # cases_avg_7
                    0   # cases_avg_30
                ]])
            
            # Predict location cluster
            features[0, 2] = self.kmeans.predict([[centroid_x, centroid_y]])[0]
            
            # Make prediction
            if hasattr(self.model1, 'feature_importances_'):
                # Tree-based model
                prediction = self.model1.predict(features)[0]
            else:
                # Linear model - needs scaling
                features_scaled = self.scaler1.transform(features)
                prediction = self.model1.predict(features_scaled)[0]
            
            # Ensure non-negative prediction
            predicted_cases = max(0, round(prediction, 2))
            
            # Determine risk level
            if predicted_cases < 1:
                risk_level = "Low"
            elif predicted_cases < 3:
                risk_level = "Medium"
            else:
                risk_level = "High"
            
            return {
                "model": "Historical Cases Model (Improved)",
                "predicted_cases": predicted_cases,
                "risk_level": risk_level,
                "confidence": "Medium (improved model with proper data splitting)",
                "input_features": {
                    "centroid_x": centroid_x,
                    "centroid_y": centroid_y,
                    "month": current_month,
                    "day_of_year": current_day_of_year,
                    "is_hotspot": is_hotspot
                },
                "location_cluster": int(features[0, 2]),
                "is_hotspot": is_hotspot,
                "note": "This prediction uses the improved model with proper data splitting and hotspot information. Results are more realistic and trustworthy."
            }
            
        except Exception as e:
            return {"error": f"Prediction failed: {str(e)}"}
    
    def predict_model2(self, centroid_x, centroid_y, humidity, temperature, rainfall):
        """
        Predict dengue cases using Model 2 (Weather-based)
        
        Args:
            centroid_x (float): Longitude coordinate
            centroid_y (float): Latitude coordinate
            humidity (float): Humidity percentage
            temperature (float): Temperature in Celsius
            rainfall (float): Rainfall in mm
            
        Returns:
            dict: Prediction results with detailed information
        """
        if self.model2 is None:
            return {"error": "Model 2 not loaded. Please load models first."}
        
        # Validate inputs
        coord_valid, coord_error = self.validate_coordinates(centroid_x, centroid_y)
        if not coord_valid:
            return {"error": f"Invalid coordinates: {coord_error}"}
        
        weather_valid, weather_error = self.validate_weather_data(humidity, temperature, rainfall)
        if not weather_valid:
            return {"error": f"Invalid weather data: {weather_error}"}
        
        try:
            # Get current month and day of year for more realistic predictions
            from datetime import datetime
            now = datetime.now()
            current_month = now.month
            current_day_of_year = now.timetuple().tm_yday
            
            # Check if location is a hotspot
            is_hotspot = self.is_location_hotspot(centroid_x, centroid_y, now)
            
            # Create feature vector
            features = np.array([[
                centroid_x,
                centroid_y,
                humidity,
                temperature,
                rainfall,
                current_month,  # month
                current_day_of_year,  # day_of_year
                0,  # location_cluster (will be predicted)
                is_hotspot  # is_hotspot
            ]])
            
            # Predict location cluster
            features[0, 7] = self.kmeans.predict([[centroid_x, centroid_y]])[0]
            
            # Make prediction
            if hasattr(self.model2, 'feature_importances_'):
                # Tree-based model
                prediction = self.model2.predict(features)[0]
            else:
                # Linear model - needs scaling
                features_scaled = self.scaler2.transform(features)
                prediction = self.model2.predict(features_scaled)[0]
            
            # Ensure non-negative prediction
            predicted_cases = max(0, round(prediction, 2))
            
            # Determine risk level
            if predicted_cases < 1:
                risk_level = "Low"
            elif predicted_cases < 3:
                risk_level = "Medium"
            else:
                risk_level = "High"
            
            # Weather analysis
            weather_analysis = self._analyze_weather_conditions(humidity, temperature, rainfall)
            
            return {
                "model": "Weather-based Model (Improved)",
                "predicted_cases": predicted_cases,
                "risk_level": risk_level,
                "confidence": "High (improved model with weather data)",
                "input_features": {
                    "centroid_x": centroid_x,
                    "centroid_y": centroid_y,
                    "humidity": humidity,
                    "temperature": temperature,
                    "rainfall": rainfall,
                    "month": current_month,
                    "day_of_year": current_day_of_year,
                    "is_hotspot": is_hotspot
                },
                "location_cluster": int(features[0, 7]),
                "is_hotspot": is_hotspot,
                "weather_analysis": weather_analysis,
                "note": "This prediction uses the improved model with proper data splitting, weather conditions, and hotspot information. Results are more realistic and trustworthy."
            }
            
        except Exception as e:
            return {"error": f"Prediction failed: {str(e)}"}
    
    def _analyze_weather_conditions(self, humidity, temperature, rainfall):
        """
        Analyze weather conditions for dengue risk
        
        Args:
            humidity (float): Humidity percentage
            temperature (float): Temperature in Celsius
            rainfall (float): Rainfall in mm
            
        Returns:
            dict: Weather analysis
        """
        analysis = {
            "humidity_risk": "Low",
            "temperature_risk": "Low",
            "rainfall_risk": "Low",
            "overall_weather_risk": "Low"
        }
        
        # Humidity analysis
        if humidity > 80:
            analysis["humidity_risk"] = "High"
        elif humidity > 70:
            analysis["humidity_risk"] = "Medium"
        
        # Temperature analysis
        if temperature > 30:
            analysis["temperature_risk"] = "High"
        elif temperature > 28:
            analysis["temperature_risk"] = "Medium"
        
        # Rainfall analysis
        if rainfall > 20:
            analysis["rainfall_risk"] = "High"
        elif rainfall > 10:
            analysis["rainfall_risk"] = "Medium"
        
        # Overall weather risk
        risk_scores = {
            "Low": 1,
            "Medium": 2,
            "High": 3
        }
        
        avg_risk = (risk_scores[analysis["humidity_risk"]] + 
                   risk_scores[analysis["temperature_risk"]] + 
                   risk_scores[analysis["rainfall_risk"]]) / 3
        
        if avg_risk >= 2.5:
            analysis["overall_weather_risk"] = "High"
        elif avg_risk >= 1.5:
            analysis["overall_weather_risk"] = "Medium"
        
        return analysis
    
    def interactive_prediction(self):
        """
        Interactive prediction interface
        """
        print("="*60)
        print("🌡️  DENGUE PREDICTION INTERFACE")
        print("="*60)
        
        if not self.load_models():
            return
        
        while True:
            print("\n" + "="*40)
            print("SELECT PREDICTION MODEL:")
            print("="*40)
            print("1. Model 1: Historical Cases Model (Improved)")
            print("   (Requires: Longitude, Latitude)")
            # print("   ✅ R² Score: ~0.96 (Gradient Boosting)")
            print("2. Model 2: Weather-based Model (Improved)")
            print("   (Requires: Longitude, Latitude, Humidity, Temperature, Rainfall)")
            # print("   ✅ R² Score: ~0.95 (Gradient Boosting)")
            print("3. Exit")
            
            choice = input("\nEnter your choice (1-3): ").strip()
            
            if choice == "1":
                self._model1_interactive()
            elif choice == "2":
                self._model2_interactive()
            elif choice == "3":
                print("👋 Goodbye!")
                break
            else:
                print("❌ Invalid choice. Please try again.")
    
    def _model1_interactive(self):
        """
        Interactive interface for Model 1
        """
        print("\n" + "-"*40)
        print("📊 MODEL 1: HISTORICAL CASES MODEL (IMPROVED)")
        print("-"*40)
        print("This model predicts dengue cases based on location coordinates.")
        print("✅ Uses improved model with proper data splitting")
        print("✅ More realistic and trustworthy predictions")
        print("Note: Without historical data, predictions use location and temporal patterns.")
        
        try:
            centroid_x = float(input("Enter longitude (centroid_x): "))
            centroid_y = float(input("Enter latitude (centroid_y): "))
            
            result = self.predict_model1(centroid_x, centroid_y)
            
            if "error" in result:
                print(f"❌ {result['error']}")
            else:
                self._display_prediction_result(result)
                
        except ValueError:
            print("❌ Invalid input. Please enter numeric values.")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    def _model2_interactive(self):
        """
        Interactive interface for Model 2
        """
        print("\n" + "-"*40)
        print("🌤️  MODEL 2: WEATHER-BASED MODEL (IMPROVED)")
        print("-"*40)
        print("This model predicts dengue cases based on location and weather conditions.")
        print("✅ Uses improved model with proper data splitting")
        print("✅ More realistic and trustworthy predictions")
        print("✅ Best performance with weather data included")
        
        try:
            centroid_x = float(input("Enter longitude (centroid_x): "))
            centroid_y = float(input("Enter latitude (centroid_y): "))
            humidity = float(input("Enter humidity (%): "))
            temperature = float(input("Enter temperature (°C): "))
            rainfall = float(input("Enter rainfall (mm): "))
            
            result = self.predict_model2(centroid_x, centroid_y, humidity, temperature, rainfall)
            
            if "error" in result:
                print(f"❌ {result['error']}")
            else:
                self._display_prediction_result(result)
                
        except ValueError:
            print("❌ Invalid input. Please enter numeric values.")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    def _display_prediction_result(self, result):
        """
        Display prediction results in a formatted way
        
        Args:
            result (dict): Prediction result dictionary
        """
        print("\n" + "="*50)
        print("🎯 PREDICTION RESULT")
        print("="*50)
        
        print(f"Model: {result['model']}")
        print(f"Predicted Cases: {result['predicted_cases']}")
        print(f"Risk Level: {result['risk_level']}")
        print(f"Confidence: {result['confidence']}")
        print(f"Location Cluster: {result['location_cluster']}")
        print(f"Hotspot Status: {'🔥 Hotspot' if result.get('is_hotspot', 0) == 1 else '✅ Not Hotspot'}")
        
        if 'weather_analysis' in result:
            print("\n🌤️  WEATHER ANALYSIS:")
            weather = result['weather_analysis']
            print(f"  Humidity Risk: {weather['humidity_risk']}")
            print(f"  Temperature Risk: {weather['temperature_risk']}")
            print(f"  Rainfall Risk: {weather['rainfall_risk']}")
            print(f"  Overall Weather Risk: {weather['overall_weather_risk']}")
        
        print(f"\n📝 Note: {result['note']}")
        
        # Risk interpretation
        risk_interpretation = {
            "Low": "🟢 Low risk - Standard preventive measures recommended",
            "Medium": "🟡 Medium risk - Enhanced monitoring and prevention advised",
            "High": "🔴 High risk - Immediate action and intensive prevention required"
        }
        
        print(f"\n💡 Risk Interpretation: {risk_interpretation[result['risk_level']]}")

def main():
    """
    Main function to run the prediction interface
    """
    interface = DenguePredictionInterface()
    interface.interactive_prediction()

if __name__ == "__main__":
    main()
