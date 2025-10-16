"""
Improved Dengue Prediction Machine Learning Models
=================================================

This script creates two machine learning models for dengue prediction with proper
data splitting to avoid data leakage and overfitting.

Author: AI Assistant
Date: 2025
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, TimeSeriesSplit
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.neighbors import KNeighborsRegressor
import joblib
import warnings
warnings.filterwarnings('ignore')

class ImprovedDengueMLModels:
    """
    An improved class to handle dengue prediction using machine learning models
    with proper data splitting to avoid data leakage
    """
    
    def __init__(self, csv_file='active_dengue.csv'):
        """
        Initialize the ImprovedDengueMLModels class
        
        Args:
            csv_file (str): Path to the CSV file containing dengue data
        """
        self.csv_file = csv_file
        self.df = None
        self.model1 = None  # Historical cases model
        self.model2 = None  # Weather-based model
        self.scaler1 = None
        self.scaler2 = None
        self.label_encoders = {}
        self.target_column = 'total_active_cases'
        
    def load_and_preprocess_data(self):
        """
        Load and preprocess the dengue dataset
        """
        print("Loading and preprocessing data...")
        
        # Load data
        self.df = pd.read_csv(self.csv_file)
        print(f"Dataset loaded: {self.df.shape[0]} rows, {self.df.shape[1]} columns")
        
        # Convert date to datetime
        self.df['date'] = pd.to_datetime(self.df['date'], format='%d/%m/%Y')

        # Normalize column names if needed (support both x/y and centroid_x/centroid_y)
        if 'centroid_x' not in self.df.columns and 'x' in self.df.columns:
            self.df = self.df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
        if 'location' not in self.df.columns and 'area' in self.df.columns:
            self.df = self.df.rename(columns={'area': 'location'})

        # Load hotspot data and merge as a binary feature
        try:
            hotspot_df = pd.read_csv('dengue_hotspot.csv')
            # Parse date
            hotspot_df['date'] = pd.to_datetime(hotspot_df['date'], format='%d/%m/%Y')
            # Normalize columns if needed
            if 'centroid_x' not in hotspot_df.columns and 'x' in hotspot_df.columns:
                hotspot_df = hotspot_df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
            if 'location' not in hotspot_df.columns and 'area' in hotspot_df.columns:
                hotspot_df = hotspot_df.rename(columns={'area': 'location'})

            # Create rounded coordinate columns to reduce precision mismatch
            self.df['cx_round'] = self.df['centroid_x'].round(4)
            self.df['cy_round'] = self.df['centroid_y'].round(4)
            hotspot_df['cx_round'] = hotspot_df['centroid_x'].round(4)
            hotspot_df['cy_round'] = hotspot_df['centroid_y'].round(4)

            # Primary merge: date + rounded coordinates
            hotspot_keys = hotspot_df[['cx_round', 'cy_round', 'date']].drop_duplicates()
            hotspot_keys = hotspot_keys.assign(is_hotspot=1)
            self.df = self.df.merge(hotspot_keys, on=['cx_round', 'cy_round', 'date'], how='left')
            self.df['is_hotspot'] = self.df['is_hotspot'].fillna(0).astype(int)

            # Fallback: if still zero matches, try merging on standardized location/state/date
            if self.df['is_hotspot'].sum() == 0:
                def _norm_text(s):
                    return s.astype(str).str.strip().str.lower()
                if 'location' in self.df.columns and 'location' in hotspot_df.columns:
                    df_loc = self.df.copy()
                    hs_loc = hotspot_df.copy()
                    df_loc['location_norm'] = _norm_text(df_loc['location'])
                    hs_loc['location_norm'] = _norm_text(hs_loc['location'])
                    if 'state' in df_loc.columns and 'state' in hs_loc.columns:
                        df_loc['state_norm'] = _norm_text(df_loc['state'])
                        hs_loc['state_norm'] = _norm_text(hs_loc['state'])
                        hs_keys2 = hs_loc[['location_norm', 'state_norm', 'date']].drop_duplicates().assign(is_hotspot2=1)
                        df_loc = df_loc.merge(hs_keys2, on=['location_norm', 'state_norm', 'date'], how='left')
                    else:
                        hs_keys2 = hs_loc[['location_norm', 'date']].drop_duplicates().assign(is_hotspot2=1)
                        df_loc = df_loc.merge(hs_keys2, on=['location_norm', 'date'], how='left')
                    df_loc['is_hotspot2'] = df_loc['is_hotspot2'].fillna(0).astype(int)
                    # Combine results back
                    self.df['is_hotspot'] = np.maximum(self.df['is_hotspot'], df_loc['is_hotspot2'])

            # Cleanup helper columns
            self.df.drop(columns=['cx_round', 'cy_round'], inplace=True)
            print(f"Hotspot feature merged. Hotspot days: {self.df['is_hotspot'].sum()} (of {len(self.df)})")
        except Exception as e:
            # If hotspot data is unavailable or malformed, default to 0
            self.df['is_hotspot'] = 0
            print(f"Warning: Failed to merge hotspot data ({e}). Proceeding without hotspot feature.")
        
        # Create additional features
        self.df['year'] = self.df['date'].dt.year
        self.df['month'] = self.df['date'].dt.month
        self.df['day'] = self.df['date'].dt.day
        self.df['day_of_year'] = self.df['date'].dt.dayofyear
        self.df['week_of_year'] = self.df['date'].dt.isocalendar().week
        
        # Encode categorical variables
        le_state = LabelEncoder()
        self.df['state_encoded'] = le_state.fit_transform(self.df['state'])
        self.label_encoders['state'] = le_state
        
        # Create location clusters based on coordinates
        from sklearn.cluster import KMeans
        kmeans = KMeans(n_clusters=10, random_state=42)
        self.df['location_cluster'] = kmeans.fit_predict(self.df[['centroid_x', 'centroid_y']])
        
        print("Data preprocessing completed!")
        print(f"Final dataset shape: {self.df.shape}")
        
    def create_historical_features(self, df, train_indices=None):
        """
        Create historical features with proper data splitting to avoid leakage
        
        Args:
            df (pd.DataFrame): Input dataframe
            train_indices (array): Training indices to avoid data leakage
            
        Returns:
            pd.DataFrame: DataFrame with historical features
        """
        df = df.copy()
        
        # Sort by location and date
        df = df.sort_values(['centroid_x', 'centroid_y', 'date']).reset_index(drop=True)
        
        # Initialize lag features
        df['cases_lag_1'] = 0.0
        df['cases_lag_7'] = 0.0
        df['cases_lag_30'] = 0.0
        df['cases_avg_7'] = 0.0
        df['cases_avg_30'] = 0.0
        
        # Only create historical features for training data to avoid leakage
        if train_indices is not None:
            train_df = df.iloc[train_indices].copy()
            
            # Create lag features for training data only
            for location in train_df[['centroid_x', 'centroid_y']].drop_duplicates().values:
                # Create mask for this location in the training data
                train_mask = (train_df['centroid_x'] == location[0]) & (train_df['centroid_y'] == location[1])
                location_data = train_df[train_mask].copy()
                
                if len(location_data) > 0:
                    # Create lag features
                    location_data['cases_lag_1'] = location_data['total_active_cases'].shift(1).fillna(0)
                    location_data['cases_lag_7'] = location_data['total_active_cases'].shift(7).fillna(0)
                    location_data['cases_lag_30'] = location_data['total_active_cases'].shift(30).fillna(0)
                    
                    # Create rolling averages
                    location_data['cases_avg_7'] = location_data['total_active_cases'].rolling(7, min_periods=1).mean()
                    location_data['cases_avg_30'] = location_data['total_active_cases'].rolling(30, min_periods=1).mean()
                    
                    # Get the original indices in the main dataframe
                    original_indices = location_data.index
                    
                    # Update the main dataframe using original indices
                    df.loc[original_indices, 'cases_lag_1'] = location_data['cases_lag_1'].values
                    df.loc[original_indices, 'cases_lag_7'] = location_data['cases_lag_7'].values
                    df.loc[original_indices, 'cases_lag_30'] = location_data['cases_lag_30'].values
                    df.loc[original_indices, 'cases_avg_7'] = location_data['cases_avg_7'].values
                    df.loc[original_indices, 'cases_avg_30'] = location_data['cases_avg_30'].values
        
        return df
        
    def explore_data(self):
        """
        Explore the dataset and create visualizations
        """
        print("\n" + "="*50)
        print("DATA EXPLORATION")
        print("="*50)
        
        # Basic statistics
        print("\nDataset Overview:")
        print(f"Total records: {len(self.df)}")
        print(f"Date range: {self.df['date'].min()} to {self.df['date'].max()}")
        print(f"Total active cases: {self.df['total_active_cases'].sum()}")
        print(f"Average cases per location: {self.df['total_active_cases'].mean():.2f}")
        print(f"Max cases in single location: {self.df['total_active_cases'].max()}")
        
        # Cases by state
        print("\nCases by State:")
        state_cases = self.df.groupby('state')['total_active_cases'].agg(['sum', 'mean', 'count']).round(2)
        print(state_cases)
        
        # Weather data statistics
        print("\nWeather Data Statistics:")
        weather_stats = self.df[['humidity', 'temperature', 'rainfall']].describe()
        print(weather_stats)
        
        # Create visualizations
        plt.figure(figsize=(15, 10))
        
        # Cases distribution
        plt.subplot(2, 3, 1)
        plt.hist(self.df['total_active_cases'], bins=20, alpha=0.7, color='red')
        plt.title('Distribution of Active Cases')
        plt.xlabel('Active Cases')
        plt.ylabel('Frequency')
        
        # Cases by month
        plt.subplot(2, 3, 2)
        monthly_cases = self.df.groupby('month')['total_active_cases'].mean()
        plt.plot(monthly_cases.index, monthly_cases.values, marker='o')
        plt.title('Average Cases by Month')
        plt.xlabel('Month')
        plt.ylabel('Average Cases')
        
        # Cases by state
        plt.subplot(2, 3, 3)
        state_totals = self.df.groupby('state')['total_active_cases'].sum()
        plt.bar(range(len(state_totals)), state_totals.values)
        plt.title('Total Cases by State')
        plt.xlabel('State')
        plt.ylabel('Total Cases')
        plt.xticks(range(len(state_totals)), state_totals.index, rotation=45)
        
        # Temperature vs Cases
        plt.subplot(2, 3, 4)
        plt.scatter(self.df['temperature'], self.df['total_active_cases'], alpha=0.5)
        plt.title('Temperature vs Active Cases')
        plt.xlabel('Temperature (°C)')
        plt.ylabel('Active Cases')
        
        # Humidity vs Cases
        plt.subplot(2, 3, 5)
        plt.scatter(self.df['humidity'], self.df['total_active_cases'], alpha=0.5)
        plt.title('Humidity vs Active Cases')
        plt.xlabel('Humidity (%)')
        plt.ylabel('Active Cases')
        
        # Rainfall vs Cases
        plt.subplot(2, 3, 6)
        plt.scatter(self.df['rainfall'], self.df['total_active_cases'], alpha=0.5)
        plt.title('Rainfall vs Active Cases')
        plt.xlabel('Rainfall (mm)')
        plt.ylabel('Active Cases')
        
        plt.tight_layout()
        plt.savefig('dengue_data_exploration_improved.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        # Correlation matrix
        plt.figure(figsize=(10, 8))
        correlation_matrix = self.df[['total_active_cases', 'humidity', 'temperature', 'rainfall', 
                                    'centroid_x', 'centroid_y', 'month', 'day_of_year']].corr()
        sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0)
        plt.title('Correlation Matrix')
        plt.tight_layout()
        plt.savefig('correlation_matrix_improved.png', dpi=300, bbox_inches='tight')
        plt.show()
        
    def train_model1_historical_cases(self):
        """
        Train Model 1: Dengue Prediction Using Historical Dengue Cases
        Features: centroid_x, centroid_y, historical cases, location clusters, temporal features
        """
        print("\n" + "="*50)
        print("TRAINING MODEL 1: HISTORICAL CASES MODEL (IMPROVED)")
        print("="*50)
        
        # Prepare features for Model 1 (without historical features initially)
        basic_features = ['centroid_x', 'centroid_y', 'location_cluster', 'month', 'day_of_year', 'is_hotspot']
        
        X1 = self.df[basic_features].copy()
        y1 = self.df[self.target_column].copy()
        
        print(f"Model 1 training data: {X1.shape[0]} samples, {X1.shape[1]} features")
        
        # Split data first to avoid data leakage
        X1_train, X1_test, y1_train, y1_test = train_test_split(
            X1, y1, test_size=0.2, random_state=42, stratify=None
        )
        
        # Get training indices
        train_indices = X1_train.index
        
        # Create historical features only for training data
        df_with_history = self.create_historical_features(self.df, train_indices)
        
        # Add historical features to training data
        historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
        for feature in historical_features:
            X1_train[feature] = df_with_history.loc[train_indices, feature].values
            X1_test[feature] = 0  # No historical data for test set
        
        # Scale features
        self.scaler1 = StandardScaler()
        X1_train_scaled = self.scaler1.fit_transform(X1_train)
        X1_test_scaled = self.scaler1.transform(X1_test)
        
        # Define models to test
        models = {
            'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42),
            'Linear Regression': LinearRegression(),
            'Ridge Regression': Ridge(alpha=1.0, random_state=42),
            'Lasso Regression': Lasso(alpha=0.1, random_state=42),
            'SVR': SVR(kernel='rbf', C=1.0),
            'KNN': KNeighborsRegressor(n_neighbors=5)
        }
        
        # Train and evaluate models
        model1_results = {}
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            # Use scaled data for models that need it
            if name in ['Linear Regression', 'Ridge Regression', 'Lasso Regression', 'SVR', 'KNN']:
                model.fit(X1_train_scaled, y1_train)
                y1_pred = model.predict(X1_test_scaled)
            else:
                model.fit(X1_train, y1_train)
                y1_pred = model.predict(X1_test)
            
            # Calculate metrics
            mse = mean_squared_error(y1_test, y1_pred)
            mae = mean_absolute_error(y1_test, y1_pred)
            r2 = r2_score(y1_test, y1_pred)
            
            model1_results[name] = {
                'model': model,
                'mse': mse,
                'mae': mae,
                'r2': r2,
                'predictions': y1_pred
            }
            
            print(f"{name} - MSE: {mse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")
        
        # Select best model
        best_model1_name = max(model1_results.keys(), key=lambda x: model1_results[x]['r2'])
        self.model1 = model1_results[best_model1_name]['model']
        
        print(f"\nBest Model 1: {best_model1_name}")
        print(f"R² Score: {model1_results[best_model1_name]['r2']:.4f}")
        
        # Store feature names for Model 1
        self.model1_feature_names = basic_features + historical_features
        
        return model1_results
    
    def train_model2_weather_based(self):
        """
        Train Model 2: Dengue Prediction Using Meteorological Data
        Features: centroid_x, centroid_y, humidity, temperature, rainfall, temporal features
        """
        print("\n" + "="*50)
        print("TRAINING MODEL 2: WEATHER-BASED MODEL (IMPROVED)")
        print("="*50)
        
        # Prepare features for Model 2
        model2_features = ['centroid_x', 'centroid_y', 'humidity', 'temperature', 'rainfall',
                          'month', 'day_of_year', 'location_cluster', 'is_hotspot']
        
        X2 = self.df[model2_features].copy()
        y2 = self.df[self.target_column].copy()
        
        print(f"Model 2 training data: {X2.shape[0]} samples, {X2.shape[1]} features")
        
        # Split data
        X2_train, X2_test, y2_train, y2_test = train_test_split(X2, y2, test_size=0.2, random_state=42)
        
        # Scale features
        self.scaler2 = StandardScaler()
        X2_train_scaled = self.scaler2.fit_transform(X2_train)
        X2_test_scaled = self.scaler2.transform(X2_test)
        
        # Define models to test
        models = {
            'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42),
            'Linear Regression': LinearRegression(),
            'Ridge Regression': Ridge(alpha=1.0, random_state=42),
            'Lasso Regression': Lasso(alpha=0.1, random_state=42),
            'SVR': SVR(kernel='rbf', C=1.0),
            'KNN': KNeighborsRegressor(n_neighbors=5)
        }
        
        # Train and evaluate models
        model2_results = {}
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            # Use scaled data for models that need it
            if name in ['Linear Regression', 'Ridge Regression', 'Lasso Regression', 'SVR', 'KNN']:
                model.fit(X2_train_scaled, y2_train)
                y2_pred = model.predict(X2_test_scaled)
            else:
                model.fit(X2_train, y2_train)
                y2_pred = model.predict(X2_test)
            
            # Calculate metrics
            mse = mean_squared_error(y2_test, y2_pred)
            mae = mean_absolute_error(y2_test, y2_pred)
            r2 = r2_score(y2_test, y2_pred)
            
            model2_results[name] = {
                'model': model,
                'mse': mse,
                'mae': mae,
                'r2': r2,
                'predictions': y2_pred
            }
            
            print(f"{name} - MSE: {mse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}")
        
        # Select best model
        best_model2_name = max(model2_results.keys(), key=lambda x: model2_results[x]['r2'])
        self.model2 = model2_results[best_model2_name]['model']
        
        print(f"\nBest Model 2: {best_model2_name}")
        print(f"R² Score: {model2_results[best_model2_name]['r2']:.4f}")
        
        # Store feature names for Model 2
        self.model2_feature_names = model2_features
        
        return model2_results
    
    def save_models(self):
        """
        Save trained models and scalers
        """
        if self.model1 is not None:
            joblib.dump(self.model1, 'model1_historical_cases_improved.pkl')
            joblib.dump(self.scaler1, 'scaler1_historical_cases_improved.pkl')
            print("Model 1 and scaler saved successfully!")
        
        if self.model2 is not None:
            joblib.dump(self.model2, 'model2_weather_based_improved.pkl')
            joblib.dump(self.scaler2, 'scaler2_weather_based_improved.pkl')
            print("Model 2 and scaler saved successfully!")
        
        # Save feature names
        import json
        with open('model_features_improved.json', 'w') as f:
            json.dump({
                'model1_features': self.model1_feature_names,
                'model2_features': self.model2_feature_names
            }, f)
        print("Feature names saved successfully!")

def main():
    """
    Main function to demonstrate the improved dengue prediction models
    """
    print("="*60)
    print("IMPROVED DENGUE PREDICTION MACHINE LEARNING MODELS")
    print("="*60)
    
    # Initialize the models
    ml_models = ImprovedDengueMLModels('active_dengue.csv')
    
    # Load and preprocess data
    ml_models.load_and_preprocess_data()
    
    # Explore data
    ml_models.explore_data()
    
    # Train both models
    print("\nTraining models...")
    model1_results = ml_models.train_model1_historical_cases()
    model2_results = ml_models.train_model2_weather_based()
    
    # Save models
    ml_models.save_models()
    
    print("\n" + "="*50)
    print("IMPROVED MODEL COMPARISON")
    print("="*50)
    
    # Compare model performance
    print("\nModel Performance Comparison:")
    print("Model 1 (Historical Cases) - R² scores:")
    for name, results in model1_results.items():
        print(f"  {name}: {results['r2']:.4f}")
    
    print("\nModel 2 (Weather-based) - R² scores:")
    for name, results in model2_results.items():
        print(f"  {name}: {results['r2']:.4f}")
    
    print("\n✅ Improved models trained and saved successfully!")
    print("These results should be more realistic and avoid data leakage.")

if __name__ == "__main__":
    main()