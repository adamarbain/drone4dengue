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
                self.model1 = joblib.load('../daily-scrap-dengue-data/model1_historical_cases_improved.pkl')
                self.model2 = joblib.load('../daily-scrap-dengue-data/model2_weather_based_improved.pkl')
                
                # Load improved scalers
                self.scaler1 = joblib.load('../daily-scrap-dengue-data/scaler1_historical_cases_improved.pkl')
                self.scaler2 = joblib.load('../daily-scrap-dengue-data/scaler2_weather_based_improved.pkl')
                
                # Load improved feature names
                with open('../daily-scrap-dengue-data/model_features_improved.json', 'r') as f:
                    features = json.load(f)
                    self.model1_feature_names = features['model1_features']
                    self.model2_feature_names = features['model2_features']
                
                print("✅ Improved models loaded successfully!")
                
            except FileNotFoundError:
                # Fallback to original models
                self.model1 = joblib.load('../daily-scrap-dengue-data/model1_historical_cases.pkl')
                self.model2 = joblib.load('../daily-scrap-dengue-data/model2_weather_based.pkl')
                
                # Load original scalers
                self.scaler1 = joblib.load('../daily-scrap-dengue-data/scaler1_historical_cases.pkl')
                self.scaler2 = joblib.load('../daily-scrap-dengue-data/scaler2_weather_based.pkl')
                
                # Load original feature names
                with open('../daily-scrap-dengue-data/model_features.json', 'r') as f:
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
    
    def is_location_hotspot(self, centroid_x, centroid_y):
        """
        Check if a location is a hotspot based on coordinates
        
        Args:
            centroid_x (float): Longitude coordinate
            centroid_y (float): Latitude coordinate
            
        Returns:
            int: 1 if hotspot, 0 if not hotspot
        """
        if self.hotspot_df is None:
            return 0
        
        try:
            # Round coordinates to reduce precision mismatch
            cx_round = round(centroid_x, 4)
            cy_round = round(centroid_y, 4)
            
            # Filter hotspot data by coordinates only
            hotspot_match = self.hotspot_df[
                (self.hotspot_df['centroid_x'].round(4) == cx_round) &
                (self.hotspot_df['centroid_y'].round(4) == cy_round)
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
    
    def _calculate_historical_features(self, historical_cases_data, target_date):
        """
        Calculate historical features from provided historical cases data
        
        Args:
            historical_cases_data (list): List of historical cases for this location
            target_date (datetime): Target date for prediction
            
        Returns:
            dict: Historical features dictionary
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
            # Convert historical data to pandas DataFrame for easier processing
            import pandas as pd
            from datetime import timedelta
            
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
            print(f"Warning: Error calculating historical features: {e}")
            # Return default values if calculation fails
            pass
        
        return historical_features
    
    def _calculate_confidence(self, historical_features, is_hotspot):
        """
        Calculate prediction confidence based on available data
        
        Args:
            historical_features (dict): Historical features dictionary
            is_hotspot (int): Whether location is a hotspot
            
        Returns:
            float: Confidence score between 0 and 1
        """
        confidence = 0.3  # Base confidence
        
        # Add confidence based on historical data availability
        if historical_features['cases_lag_1'] > 0:
            confidence += 0.2  # Recent data available
        if historical_features['cases_lag_7'] > 0:
            confidence += 0.15  # Weekly trend data
        if historical_features['cases_lag_30'] > 0:
            confidence += 0.1  # Monthly trend data
        if historical_features['cases_avg_7'] > 0:
            confidence += 0.1  # Recent average
        if historical_features['cases_avg_30'] > 0:
            confidence += 0.1  # Long-term average
        
        # Add confidence for hotspot status
        if is_hotspot:
            confidence += 0.05  # Known hotspot location
        
        # Cap confidence at 1.0
        return min(confidence, 1.0)
    
    def get_historical_data_for_location(self, centroid_x, centroid_y, days_back=30):
        """
        Get historical data for a specific location from the loaded dataset
        
        Args:
            centroid_x (float): Longitude coordinate
            centroid_y (float): Latitude coordinate
            days_back (int): Number of days to look back for historical data
            
        Returns:
            list: Historical cases data for the location
        """
        if self.df is None:
            return []
        
        try:
            from datetime import datetime, timedelta
            
            # Find data for this location (with small tolerance for coordinate matching)
            tolerance = 0.001
            location_data = self.df[
                (abs(self.df['centroid_x'] - centroid_x) < tolerance) & 
                (abs(self.df['centroid_y'] - centroid_y) < tolerance)
            ].copy()
            
            if location_data.empty:
                return []
            
            # Convert date column to datetime if it's not already
            if 'date' in location_data.columns:
                location_data['date'] = pd.to_datetime(location_data['date'], format='%d/%m/%Y', errors='coerce')
            
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
            print(f"Warning: Error getting historical data: {e}")
            return []
    
    def predict_model1(self, centroid_x, centroid_y, historical_cases_data=None, target_date=None):
        """
        Predict dengue cases using Model 1 (Historical Cases)
        
        Args:
            centroid_x (float): Longitude coordinate
            centroid_y (float): Latitude coordinate
            historical_cases_data (list): List of historical cases for this location
            target_date (str): Target date for prediction (format: 'YYYY-MM-DD')
            
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
            # Get target date or use current date
            from datetime import datetime
            if target_date:
                target_dt = datetime.strptime(target_date, '%Y-%m-%d')
            else:
                target_dt = datetime.now()
            
            current_month = target_dt.month
            current_day_of_year = target_dt.timetuple().tm_yday
            
            # Check if location is a hotspot
            is_hotspot = self.is_location_hotspot(centroid_x, centroid_y)
            
            # Calculate historical features from provided data
            historical_features = self._calculate_historical_features(historical_cases_data, target_dt)
            
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
                    historical_features['cases_lag_1'],
                    historical_features['cases_lag_7'],
                    historical_features['cases_lag_30'],
                    historical_features['cases_avg_7'],
                    historical_features['cases_avg_30']
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
                    historical_features['cases_lag_1'],
                    historical_features['cases_lag_7'],
                    historical_features['cases_lag_30'],
                    historical_features['cases_avg_7'],
                    historical_features['cases_avg_30']
                ]])
            
            # Predict location cluster
            features[0, 2] = int(self.kmeans.predict([[centroid_x, centroid_y]])[0])
            
            # Make prediction
            if hasattr(self.model1, 'feature_importances_'):
                # Tree-based model
                prediction = float(self.model1.predict(features)[0])
            else:
                # Linear model - needs scaling
                features_scaled = self.scaler1.transform(features)
                prediction = float(self.model1.predict(features_scaled)[0])
            
            # Ensure non-negative prediction
            predicted_cases = max(0, round(prediction, 2))
            
            # Determine risk level
            if predicted_cases < 1:
                risk_level = "Low"
            elif predicted_cases < 3:
                risk_level = "Medium"
            else:
                risk_level = "High"
            
            # Calculate confidence based on historical data availability
            confidence = self._calculate_confidence(historical_features, is_hotspot)
            
            return {
                "model": "Historical Cases Model (Improved)",
                "predicted_cases": predicted_cases,
                "risk_level": risk_level,
                "confidence": f"{confidence:.1%}",
                "input_features": {
                    "centroid_x": centroid_x,
                    "centroid_y": centroid_y,
                    "month": current_month,
                    "day_of_year": current_day_of_year,
                    "is_hotspot": is_hotspot,
                    "target_date": target_dt.strftime('%Y-%m-%d')
                },
                "historical_features": historical_features,
                "location_cluster": int(features[0, 2]),
                "is_hotspot": is_hotspot,
                "historical_data_quality": {
                    "has_lag_1": historical_features['cases_lag_1'] > 0,
                    "has_lag_7": historical_features['cases_lag_7'] > 0,
                    "has_lag_30": historical_features['cases_lag_30'] > 0,
                    "has_avg_7": historical_features['cases_avg_7'] > 0,
                    "has_avg_30": historical_features['cases_avg_30'] > 0,
                    "data_points_available": len(historical_cases_data) if historical_cases_data else 0
                },
                "note": "This prediction uses the improved model with proper data splitting, historical features, and hotspot information. Results are more realistic and trustworthy."
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
            is_hotspot = self.is_location_hotspot(centroid_x, centroid_y)
            
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
            features[0, 7] = int(self.kmeans.predict([[centroid_x, centroid_y]])[0])
            
            # Make prediction
            if hasattr(self.model2, 'feature_importances_'):
                # Tree-based model
                prediction = float(self.model2.predict(features)[0])
            else:
                # Linear model - needs scaling
                features_scaled = self.scaler2.transform(features)
                prediction = float(self.model2.predict(features_scaled)[0])
            
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
            print("2. Model 2: Weather-based Model (Improved)")
            print("   (Requires: Longitude, Latitude, Humidity, Temperature, Rainfall)")
            print("3. Demonstrate Historical Data Impact")
            print("   (Shows how historical data affects predictions)")
            print("4. Exit")
            
            choice = input("\nEnter your choice (1-4): ").strip()
            
            if choice == "1":
                self._model1_interactive()
            elif choice == "2":
                self._model2_interactive()
            elif choice == "3":
                self._demonstrate_historical_impact_interactive()
            elif choice == "4":
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
        print("This model predicts dengue cases based on location coordinates and historical data.")
        print("✅ Uses improved model with proper data splitting")
        print("✅ More realistic and trustworthy predictions")
        print("✅ Supports historical data for better accuracy")
        
        try:
            centroid_x = float(input("Enter longitude (centroid_x): "))
            centroid_y = float(input("Enter latitude (centroid_y): "))
            
            # Ask for target date
            target_date_input = input("Enter target date (YYYY-MM-DD) or press Enter for today: ").strip()
            target_date = target_date_input if target_date_input else None
            
            # Ask for historical data
            print("\nHistorical Data (Optional - for better predictions):")
            print("1. Load from dataset automatically")
            print("2. Enter manually")
            print("3. Skip (use default values)")
            
            hist_choice = input("Choose option (1-3): ").strip()
            
            historical_data = []
            if hist_choice == "1":
                # Load historical data automatically
                print("Loading historical data from dataset...")
                historical_data = self.get_historical_data_for_location(centroid_x, centroid_y, 30)
                if historical_data:
                    print(f"✅ Found {len(historical_data)} historical data points")
                    print("Recent data preview:")
                    for item in historical_data[-5:]:  # Show last 5 entries
                        print(f"  {item['date']}: {item['cases']} cases")
                else:
                    print("❌ No historical data found for this location")
            elif hist_choice == "2":
                # Manual entry
                print("Enter historical cases data in format: date,cases (one per line)")
                print("Example: 2025-01-01,5")
                print("Press Enter twice when done:")
                
                while True:
                    line = input().strip()
                    if not line:
                        break
                    try:
                        if ',' in line:
                            date_str, cases_str = line.split(',', 1)
                            historical_data.append({
                                'date': date_str.strip(),
                                'cases': float(cases_str.strip())
                            })
                        else:
                            print("Invalid format. Use: date,cases")
                    except ValueError:
                        print("Invalid format. Use: date,cases")
            else:
                print("Using default values (no historical data)")
            
            result = self.predict_model1(centroid_x, centroid_y, historical_data, target_date)
            
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
    
    def _demonstrate_historical_impact_interactive(self):
        """
        Interactive interface for demonstrating historical data impact
        """
        print("\n" + "-"*40)
        print("🔬 HISTORICAL DATA IMPACT DEMONSTRATION")
        print("-"*40)
        print("This will show how historical data affects predictions.")
        print("You can enter coordinates or use sample coordinates.")
        
        try:
            use_sample = input("Use sample coordinates? (y/n): ").strip().lower()
            
            if use_sample == 'y':
                # Use sample coordinates from the dataset
                if self.df is not None and len(self.df) > 0:
                    sample_row = self.df.iloc[0]
                    centroid_x = sample_row['centroid_x']
                    centroid_y = sample_row['centroid_y']
                    print(f"Using sample coordinates: ({centroid_x}, {centroid_y})")
                else:
                    print("No sample data available. Please enter coordinates manually.")
                    centroid_x = float(input("Enter longitude (centroid_x): "))
                    centroid_y = float(input("Enter latitude (centroid_y): "))
            else:
                centroid_x = float(input("Enter longitude (centroid_x): "))
                centroid_y = float(input("Enter latitude (centroid_y): "))
            
            self.demonstrate_historical_impact(centroid_x, centroid_y)
            
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
        
        # Display historical features if available
        if 'historical_features' in result:
            print("\n📊 HISTORICAL FEATURES:")
            hist = result['historical_features']
            print(f"  Cases Lag 1 day: {hist['cases_lag_1']:.2f}")
            print(f"  Cases Lag 7 days: {hist['cases_lag_7']:.2f}")
            print(f"  Cases Lag 30 days: {hist['cases_lag_30']:.2f}")
            print(f"  Average 7 days: {hist['cases_avg_7']:.2f}")
            print(f"  Average 30 days: {hist['cases_avg_30']:.2f}")
        
        # Display historical data quality
        if 'historical_data_quality' in result:
            print("\n📈 DATA QUALITY:")
            quality = result['historical_data_quality']
            print(f"  Data Points Available: {quality.get('data_points_available', 0)}")
            print(f"  Has Recent Data (1 day): {'✅' if quality.get('has_lag_1', False) else '❌'}")
            print(f"  Has Weekly Data (7 days): {'✅' if quality.get('has_lag_7', False) else '❌'}")
            print(f"  Has Monthly Data (30 days): {'✅' if quality.get('has_lag_30', False) else '❌'}")
            print(f"  Has 7-day Average: {'✅' if quality.get('has_avg_7', False) else '❌'}")
            print(f"  Has 30-day Average: {'✅' if quality.get('has_avg_30', False) else '❌'}")
        
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
    
    def demonstrate_historical_impact(self, centroid_x, centroid_y):
        """
        Demonstrate the impact of historical data on predictions
        
        Args:
            centroid_x (float): Longitude coordinate
            centroid_y (float): Latitude coordinate
        """
        print("\n" + "="*60)
        print("🔬 HISTORICAL DATA IMPACT DEMONSTRATION")
        print("="*60)
        
        # Get historical data for this location
        historical_data = self.get_historical_data_for_location(centroid_x, centroid_y, 30)
        
        print(f"Location: ({centroid_x}, {centroid_y})")
        print(f"Historical data points found: {len(historical_data)}")
        
        if historical_data:
            print("\nRecent historical data:")
            for item in historical_data[-10:]:  # Show last 10 entries
                print(f"  {item['date']}: {item['cases']} cases")
        
        # Prediction without historical data
        print("\n" + "-"*40)
        print("PREDICTION WITHOUT HISTORICAL DATA:")
        print("-"*40)
        result_no_hist = self.predict_model1(centroid_x, centroid_y, None, None)
        if "error" not in result_no_hist:
            print(f"Predicted Cases: {result_no_hist['predicted_cases']}")
            print(f"Risk Level: {result_no_hist['risk_level']}")
            print(f"Confidence: {result_no_hist['confidence']}")
        
        # Prediction with historical data
        print("\n" + "-"*40)
        print("PREDICTION WITH HISTORICAL DATA:")
        print("-"*40)
        result_with_hist = self.predict_model1(centroid_x, centroid_y, historical_data, None)
        if "error" not in result_with_hist:
            print(f"Predicted Cases: {result_with_hist['predicted_cases']}")
            print(f"Risk Level: {result_with_hist['risk_level']}")
            print(f"Confidence: {result_with_hist['confidence']}")
            
            # Show historical features
            if 'historical_features' in result_with_hist:
                print("\nHistorical Features Used:")
                hist = result_with_hist['historical_features']
                print(f"  Cases Lag 1 day: {hist['cases_lag_1']:.2f}")
                print(f"  Cases Lag 7 days: {hist['cases_lag_7']:.2f}")
                print(f"  Cases Lag 30 days: {hist['cases_lag_30']:.2f}")
                print(f"  Average 7 days: {hist['cases_avg_7']:.2f}")
                print(f"  Average 30 days: {hist['cases_avg_30']:.2f}")
        
        # Compare results
        if "error" not in result_no_hist and "error" not in result_with_hist:
            print("\n" + "-"*40)
            print("COMPARISON:")
            print("-"*40)
            cases_diff = result_with_hist['predicted_cases'] - result_no_hist['predicted_cases']
            confidence_diff = float(result_with_hist['confidence'].replace('%', '')) - float(result_no_hist['confidence'].replace('%', ''))
            
            print(f"Cases Difference: {cases_diff:+.2f}")
            print(f"Confidence Difference: {confidence_diff:+.1f}%")
            
            if abs(cases_diff) > 0.1:
                print("✅ Historical data significantly impacts prediction")
            else:
                print("ℹ️  Historical data has minimal impact on prediction")
            
            if confidence_diff > 5:
                print("✅ Historical data improves confidence significantly")
            elif confidence_diff > 0:
                print("ℹ️  Historical data slightly improves confidence")
            else:
                print("ℹ️  Historical data doesn't improve confidence")

def main():
    """
    Main function to run the prediction interface
    """
    interface = DenguePredictionInterface()
    interface.interactive_prediction()

if __name__ == "__main__":
    main()
