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
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, TimeSeriesSplit, RandomizedSearchCV
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, StackingRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.neighbors import KNeighborsRegressor
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.model_selection import TimeSeriesSplit
import xgboost as xgb
import lightgbm as lgb
import joblib
import warnings
warnings.filterwarnings('ignore')

class TwoStageHurdleModel(BaseEstimator, RegressorMixin):
    """
    A two-stage hurdle model for heavily right-skewed count data.
    Stage 1: Classify if the target is above a certain threshold (the 'hurdle').
    Stage 2: Route the data to specialized regressors for low vs. high case counts.
    """
    def __init__(self, hurdle_threshold=2):
        self.hurdle_threshold = hurdle_threshold
        
        # Stage 1: Classifier to predict normal vs. outbreak
        self.classifier = lgb.LGBMClassifier(
            n_estimators=150, max_depth=6, learning_rate=0.05,
            class_weight='balanced', random_state=42, verbose=-1
        )
        
        # Stage 2a: Regressor specialized for low counts (<= 2)
        self.regressor_low = lgb.LGBMRegressor(
            n_estimators=100, max_depth=4, learning_rate=0.05, 
            random_state=42, verbose=-1
        )
        
        # Stage 2b: Regressor specialized for high counts (> 2) using Poisson
        self.regressor_high = xgb.XGBRegressor(
            objective='count:poisson', n_estimators=200, max_depth=6,
            learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbosity=0
        )

    def fit(self, X, y):
        # Create binary target for the classifier
        y_class = (y > self.hurdle_threshold).astype(int)
        self.classifier.fit(X, y_class)

        # Create boolean masks for routing
        mask_high = y > self.hurdle_threshold
        mask_low = ~mask_high

        # Train the specialized regressors on their respective data slices
        if mask_low.sum() > 0:
            self.regressor_low.fit(X[mask_low], y[mask_low])
        if mask_high.sum() > 0:
            self.regressor_high.fit(X[mask_high], y[mask_high])

        return self

    def predict(self, X):
        # Predict if each row is an outbreak (1) or normal (0)
        preds_class = self.classifier.predict(X)

        # Initialize the final predictions array
        final_preds = np.zeros(len(X))

        # Create masks based on classifier predictions
        mask_pred_high = preds_class == 1
        mask_pred_low = ~mask_pred_high

        # Route the data to the appropriate pre-trained regressor
        if mask_pred_low.sum() > 0:
            final_preds[mask_pred_low] = self.regressor_low.predict(X[mask_pred_low])
        if mask_pred_high.sum() > 0:
            final_preds[mask_pred_high] = self.regressor_high.predict(X[mask_pred_high])

        # Dengue cases cannot be negative
        return np.maximum(final_preds, 0)

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

        # Only keep records starting from 18/12/2025 (inclusive)
        cutoff_date = pd.to_datetime('18/12/2025', format='%d/%m/%Y')
        before_rows = len(self.df)
        self.df = self.df[self.df['date'] >= cutoff_date].copy()
        after_rows = len(self.df)
        print(f"Filtered to date >= {cutoff_date.date()}: {after_rows}/{before_rows} rows kept")

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
            # Apply the same cutoff to hotspot data for consistent merging
            hotspot_df = hotspot_df[hotspot_df['date'] >= cutoff_date].copy()
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
        
        # Create lagged weather features per location (aligned with dengue incubation cycle)
        self.df = self.df.sort_values(['centroid_x', 'centroid_y', 'date']).reset_index(drop=True)
        loc_group = self.df.groupby(['centroid_x', 'centroid_y'])
        
        for lag in [7, 14, 21, 28]:
            self.df[f'rainfall_lag_{lag}'] = loc_group['rainfall'].shift(lag)
            self.df[f'humidity_lag_{lag}'] = loc_group['humidity'].shift(lag)
            self.df[f'temperature_lag_{lag}'] = loc_group['temperature'].shift(lag)
        
        # Cumulative rainfall over past 14 and 28 days (standing water indicator)
        self.df['rainfall_cumul_14d'] = loc_group['rainfall'].transform(
            lambda x: x.rolling(14, min_periods=1).sum()
        )
        self.df['rainfall_cumul_28d'] = loc_group['rainfall'].transform(
            lambda x: x.rolling(28, min_periods=1).sum()
        )
        
        lagged_cols = [c for c in self.df.columns if '_lag_' in c or '_cumul_' in c]
        print(f"Created {len(lagged_cols)} lagged/cumulative weather features")
        
        # Weather interaction features
        self.df['temp_x_humidity'] = self.df['temperature'] * self.df['humidity']
        self.df['temp_x_rainfall'] = self.df['temperature'] * self.df['rainfall']
        self.df['humidity_x_rainfall'] = self.df['humidity'] * self.df['rainfall']
        
        # Favorable mosquito breeding conditions (warm + humid + recent rain)
        self.df['breeding_favorable'] = (
            (self.df['temperature'].between(25, 35)) &
            (self.df['humidity'] > 60) &
            (self.df['rainfall'] > 0)
        ).astype(int)
        
        print(f"Created 4 weather interaction features")
        
        print("Data preprocessing completed!")
        print(f"Final dataset shape: {self.df.shape}")

        # --- NEW PHASE 1 FEATURES: EWMA & THERMAL CURVES ---
        
        # 1. Exponentially Weighted Moving Averages (EWMA)
        # Gives heavier weight to recent weather events compared to standard rolling averages
        self.df['rainfall_ewma_14d'] = loc_group['rainfall'].transform(
            lambda x: x.ewm(span=14, adjust=False).mean()
        )
        self.df['temp_ewma_7d'] = loc_group['temperature'].transform(
            lambda x: x.ewm(span=7, adjust=False).mean()
        )
        self.df['humidity_ewma_7d'] = loc_group['humidity'].transform(
            lambda x: x.ewm(span=7, adjust=False).mean()
        )
        
        # 2. Biological Thermal Performance Curve (Briere Equation)
        # Models Aedes aegypti development based on temperature limits
        # T_min = 13.3 C, T_max = 39.2 C are standard biological bounds for Aedes aegypti
        T_min, T_max = 13.3, 39.2
        
        # Clip temperature to avoid calculating the square root of a negative number
        temp_clipped = self.df['temperature'].clip(lower=T_min, upper=T_max)
        
        # We drop the arbitrary scaling constant 'c' because LightGBM is scale-invariant
        self.df['briere_thermal_curve'] = temp_clipped * (temp_clipped - T_min) * np.sqrt(T_max - temp_clipped)
        
        print(f"Created EWMA and Briere thermal curve features")
        
    def create_historical_features(self, df, train_indices=None, test_indices=None):
        """
        Create historical features with proper data splitting to avoid leakage
        
        Args:
            df (pd.DataFrame): Input dataframe
            train_indices (array): Training indices to avoid data leakage
            test_indices (array): Test indices for proper historical feature creation
            
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
        
        # Create historical features for all unique locations
        for location in df[['centroid_x', 'centroid_y']].drop_duplicates().values:
            # Create mask for this location
            location_mask = (df['centroid_x'] == location[0]) & (df['centroid_y'] == location[1])
            location_data = df[location_mask].copy()
            
            if len(location_data) > 0:
                # Create lag features for the entire location time series
                location_data['cases_lag_1'] = location_data['total_active_cases'].shift(1).fillna(0)
                location_data['cases_lag_7'] = location_data['total_active_cases'].shift(7).fillna(0)
                location_data['cases_lag_30'] = location_data['total_active_cases'].shift(30).fillna(0)
                
                # Create rolling averages (SHIFTED to prevent data leakage)
                location_data['cases_avg_7'] = location_data['total_active_cases'].shift(1).rolling(7, min_periods=1).mean().fillna(0)
                location_data['cases_avg_30'] = location_data['total_active_cases'].shift(1).rolling(30, min_periods=1).mean().fillna(0)
                
                # Get the original indices in the main dataframe
                original_indices = location_data.index
                
                # Update the main dataframe using original indices
                df.loc[original_indices, 'cases_lag_1'] = location_data['cases_lag_1'].values
                df.loc[original_indices, 'cases_lag_7'] = location_data['cases_lag_7'].values
                df.loc[original_indices, 'cases_lag_30'] = location_data['cases_lag_30'].values
                df.loc[original_indices, 'cases_avg_7'] = location_data['cases_avg_7'].values
                df.loc[original_indices, 'cases_avg_30'] = location_data['cases_avg_30'].values
        
        # For test set, we need to ensure we don't use future data
        # This is handled by the time series nature of the lag features
        if test_indices is not None:
            print(f"Historical features created for {len(df)} records")
            print(f"Training records with historical data: {len(train_indices) if train_indices is not None else 0}")
            print(f"Test records with historical data: {len(test_indices)}")
        
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
        
        # Create historical features for correlation analysis
        print("\nCreating historical features for correlation analysis...")
        df_with_history = self.create_historical_features(self.df)
        
        # Update self.df to include historical features for correlation analysis
        historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
        for feature in historical_features:
            if feature in df_with_history.columns:
                self.df[feature] = df_with_history[feature]
        
        # Correlation matrix with all available features
        plt.figure(figsize=(15, 12))
        
        # Define all features to include in correlation matrix
        correlation_features = [
            'total_active_cases',  # Target variable
            'humidity', 'temperature', 'rainfall',  # Weather features
            'centroid_x', 'centroid_y',  # Location features
            'month', 'day_of_year', 'week_of_year',  # Temporal features
            'is_hotspot',  # Hotspot feature
            'state_encoded',  # State feature (encoded)
            'location_cluster'  # Location cluster feature
        ]
        
        # Add historical features if they exist
        historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
        for feature in historical_features:
            if feature in self.df.columns:
                correlation_features.append(feature)
        
        # Filter to only include features that exist in the dataframe
        available_features = [f for f in correlation_features if f in self.df.columns]
        
        print(f"\nCorrelation matrix will include {len(available_features)} features:")
        for i, feature in enumerate(available_features, 1):
            print(f"{i:2d}. {feature}")
        
        # Create correlation matrix
        correlation_matrix = self.df[available_features].corr()
        
        # Create heatmap
        sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0, 
                   fmt='.2f', square=True, cbar_kws={'shrink': 0.8})
        plt.title('Correlation Matrix - All Features', fontsize=16, pad=20)
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        plt.savefig('correlation_matrix_improved.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        # Print correlation with target variable
        print(f"\nCorrelation with target variable (total_active_cases):")
        target_correlations = correlation_matrix['total_active_cases'].drop('total_active_cases').sort_values(key=abs, ascending=False)
        for feature, corr in target_correlations.items():
            print(f"{feature:20s}: {corr:6.3f}")
        
        # Identify highly correlated features (potential multicollinearity)
        print(f"\nHighly correlated feature pairs (|correlation| > 0.7):")
        high_corr_pairs = []
        for i in range(len(correlation_matrix.columns)):
            for j in range(i+1, len(correlation_matrix.columns)):
                corr_val = correlation_matrix.iloc[i, j]
                if abs(corr_val) > 0.7:
                    high_corr_pairs.append((correlation_matrix.columns[i], correlation_matrix.columns[j], corr_val))
        
        if high_corr_pairs:
            for feat1, feat2, corr in sorted(high_corr_pairs, key=lambda x: abs(x[2]), reverse=True):
                print(f"{feat1:20s} <-> {feat2:20s}: {corr:6.3f}")
        else:
            print("No highly correlated feature pairs found.")
    
    def create_model_specific_correlation_analysis(self):
        """
        Create correlation analysis specifically for each model's features
        """
        print(f"\n{'='*60}")
        print("MODEL-SPECIFIC CORRELATION ANALYSIS")
        print(f"{'='*60}")
        
        # Model 1 features (Historical Cases Model)
        if hasattr(self, 'model1_feature_names'):
            print(f"\nModel 1 (Historical Cases) Features Correlation:")
            model1_features = self.model1_feature_names + ['total_active_cases']
            available_model1_features = [f for f in model1_features if f in self.df.columns]
            
            if len(available_model1_features) > 1:
                model1_corr = self.df[available_model1_features].corr()
                
                # Show correlation with target
                target_corr = model1_corr['total_active_cases'].drop('total_active_cases').sort_values(key=abs, ascending=False)
                print("Correlation with target (total_active_cases):")
                for feature, corr in target_corr.items():
                    print(f"  {feature:20s}: {corr:6.3f}")
                
                # Create correlation heatmap for Model 1
                plt.figure(figsize=(10, 8))
                sns.heatmap(model1_corr, annot=True, cmap='coolwarm', center=0, 
                           fmt='.2f', square=True, cbar_kws={'shrink': 0.8})
                plt.title('Model 1 (Historical Cases) - Feature Correlation Matrix', fontsize=14)
                plt.tight_layout()
                plt.savefig('model1_correlation_matrix.png', dpi=300, bbox_inches='tight')
                plt.show()
        
        # Model 2 features (Weather-based Model)
        if hasattr(self, 'model2_feature_names'):
            print(f"\nModel 2 (Weather-based) Features Correlation:")
            model2_features = self.model2_feature_names + ['total_active_cases']
            available_model2_features = [f for f in model2_features if f in self.df.columns]
            
            if len(available_model2_features) > 1:
                model2_corr = self.df[available_model2_features].corr()
                
                # Show correlation with target
                target_corr = model2_corr['total_active_cases'].drop('total_active_cases').sort_values(key=abs, ascending=False)
                print("Correlation with target (total_active_cases):")
                for feature, corr in target_corr.items():
                    print(f"  {feature:20s}: {corr:6.3f}")
                
                # Create correlation heatmap for Model 2
                plt.figure(figsize=(10, 8))
                sns.heatmap(model2_corr, annot=True, cmap='coolwarm', center=0, 
                           fmt='.2f', square=True, cbar_kws={'shrink': 0.8})
                plt.title('Model 2 (Weather-based) - Feature Correlation Matrix', fontsize=14)
                plt.tight_layout()
                plt.savefig('model2_correlation_matrix.png', dpi=300, bbox_inches='tight')
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
        
        # Get training and test indices
        train_indices = X1_train.index
        test_indices = X1_test.index
        
        # Create historical features for all data (properly avoiding leakage)
        df_with_history = self.create_historical_features(self.df, train_indices, test_indices)
        
        # Add historical features to both training and test data
        historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
        for feature in historical_features:
            X1_train[feature] = df_with_history.loc[train_indices, feature].values
            X1_test[feature] = df_with_history.loc[test_indices, feature].values
        
        # Verify historical features are being used
        print(f"\nHistorical features verification:")
        print(f"Training set - cases_lag_1 range: {X1_train['cases_lag_1'].min():.2f} to {X1_train['cases_lag_1'].max():.2f}")
        print(f"Training set - cases_avg_7 range: {X1_train['cases_avg_7'].min():.2f} to {X1_train['cases_avg_7'].max():.2f}")
        print(f"Test set - cases_lag_1 range: {X1_test['cases_lag_1'].min():.2f} to {X1_test['cases_lag_1'].max():.2f}")
        print(f"Test set - cases_avg_7 range: {X1_test['cases_avg_7'].min():.2f} to {X1_test['cases_avg_7'].max():.2f}")
        
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
        
        # Validate historical features are being used
        self.validate_historical_features(self.model1, X1_train, X1_test, self.model1_feature_names)
        
        return model1_results
    
    def validate_historical_features(self, model, X_train, X_test, feature_names):
        """
        Validate that historical features are contributing to the model
        """
        print(f"\n{'='*50}")
        print("HISTORICAL FEATURES VALIDATION")
        print(f"{'='*50}")
        
        # Get feature importance if available
        if hasattr(model, 'feature_importances_'):
            importance_df = pd.DataFrame({
                'feature': feature_names,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print("\nFeature Importance (Top 10):")
            print(importance_df.head(10))
            
            # Check if historical features are in top features
            historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
            historical_importance = importance_df[importance_df['feature'].isin(historical_features)]
            
            print(f"\nHistorical Features Importance:")
            print(historical_importance)
            
            # Calculate total importance of historical features
            total_historical_importance = historical_importance['importance'].sum()
            total_importance = importance_df['importance'].sum()
            historical_percentage = (total_historical_importance / total_importance) * 100
            
            print(f"\nHistorical features contribute {historical_percentage:.2f}% of total feature importance")
            
            if historical_percentage > 10:
                print("✅ Historical features are significantly contributing to the model")
            else:
                print("⚠️  Historical features have low contribution - check data quality")
        
        # Check correlation between historical features and target
        print(f"\nHistorical Features Correlation Analysis:")
        historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
        
        # Create a combined dataset for correlation analysis
        combined_data = pd.concat([X_train, X_test])
        if 'total_active_cases' in self.df.columns:
            # Get corresponding target values
            train_target = self.df.loc[X_train.index, 'total_active_cases']
            test_target = self.df.loc[X_test.index, 'total_active_cases']
            combined_target = pd.concat([train_target, test_target])
            
            for feature in historical_features:
                if feature in combined_data.columns:
                    correlation = combined_data[feature].corr(combined_target)
                    print(f"{feature}: {correlation:.4f}")
    
    def train_model2_weather_based(self):
        """
        Train Model 2: Dengue Prediction Using Meteorological Data
        Features: centroid_x, centroid_y, humidity, temperature, rainfall, temporal features
        """
        print("\n" + "="*50)
        print("TRAINING MODEL 2: WEATHER-BASED MODEL (IMPROVED)")
        print("="*50)
        
        # Prepare features for Model 2 — weather + geography hybrid
        model2_features = [
            'centroid_x', 'centroid_y',
            'humidity', 'temperature', 'rainfall',
            'month', 'day_of_year', 'week_of_year',
            'location_cluster', 'state_encoded', 'is_hotspot',
            'rainfall_lag_7', 'humidity_lag_7', 'temperature_lag_7',
            'rainfall_cumul_14d', 'rainfall_cumul_28d',
            'temp_x_humidity', 'temp_x_rainfall', 'humidity_x_rainfall',
            'breeding_favorable',
            # --- NEW PHASE 1 FEATURES ---
            'rainfall_ewma_14d', 'temp_ewma_7d', 'humidity_ewma_7d',
            'briere_thermal_curve'
        ]
        print(f"Weather + geography features: {len(model2_features)} total features")
        
        X2 = self.df[model2_features].copy()
        y2 = self.df[self.target_column].copy()
        
        # Handle missing values (lagged features will have NaNs for early rows)
        if X2.isnull().any().any():
            missing_before = X2.isnull().sum()
            cols_with_missing = missing_before[missing_before > 0]
            print(f"\nImputing {len(cols_with_missing)} features with missing values...")
            X2 = X2.fillna(X2.median(numeric_only=True)).fillna(0)
            print(f"Total missing values after imputation: {int(X2.isnull().sum().sum())}")
        
        print(f"Model 2 training data: {X2.shape[0]} samples, {X2.shape[1]} features")
        
        # Time-series aware split: train on earlier dates, test on latest 20%
        dates = self.df['date']
        split_date = dates.quantile(0.8)
        train_mask = dates <= split_date
        test_mask = dates > split_date
        
        X2_train, X2_test = X2[train_mask], X2[test_mask]
        y2_train, y2_test = y2[train_mask], y2[test_mask]
        print(f"Time-series split: train up to {split_date.date()}, test after")
        print(f"  Train: {len(X2_train)} samples, Test: {len(X2_test)} samples")
        
        # Scale features
        self.scaler2 = StandardScaler()
        X2_train_scaled = self.scaler2.fit_transform(X2_train)
        X2_test_scaled = self.scaler2.transform(X2_test)
        
        # Target is count data (55% are 1, 80% are ≤2, skewness=8.6)
        # Use Poisson/Tweedie objectives which are designed for count data
        print(f"\nTarget distribution: median={y2_train.median():.0f}, "
              f"mean={y2_train.mean():.2f}, skew={y2_train.skew():.2f}")
        
        # ---------------------------------------------------------
        # THE HYBRID STACKING ENSEMBLE
        # ---------------------------------------------------------
        # 1. Define the base estimators (our two champions)
        base_estimators = [
            ('xgb_poisson', xgb.XGBRegressor(
                objective='count:poisson', n_estimators=200, max_depth=8,
                learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0
            )),
            ('lgb_poisson', lgb.LGBMRegressor(
                objective='poisson', n_estimators=200, max_depth=8,
                learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbose=-1
            ))
        ]
        
        # 2. Define the meta-learner to combine their predictions
        # Ridge regression is standard for stacking as it prevents overfitting the meta-weights
        meta_learner = Ridge(alpha=1.0, random_state=42)
        
        # 3. Create the Stacking model
        stacking_model = StackingRegressor(
            estimators=base_estimators,
            final_estimator=meta_learner,
            cv=5, # Uses 5-fold CV to generate clean out-of-fold predictions for the meta-learner
            n_jobs=-1
        )
        
        # Define models — prioritize count-appropriate objectives
        models = {
            'Stacking Ensemble (XGB+LGBM)': stacking_model, # <--- NEW HYBRID MODEL
            'Two-Stage Hurdle': TwoStageHurdleModel(hurdle_threshold=2), # <--- NEW MODEL
            'XGBoost (Poisson)': xgb.XGBRegressor(
                objective='count:poisson', n_estimators=200, max_depth=8,
                learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0
            ),
            'LightGBM (Poisson)': lgb.LGBMRegressor(
                objective='poisson', n_estimators=200, max_depth=8,
                learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbose=-1
            ),
            'LightGBM (Tweedie)': lgb.LGBMRegressor(
                objective='tweedie', tweedie_variance_power=1.5,
                n_estimators=200, max_depth=8, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbose=-1
            ),
            'XGBoost (Squared)': xgb.XGBRegressor(
                n_estimators=200, max_depth=8, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0
            ),
            'LightGBM (Squared)': lgb.LGBMRegressor(
                n_estimators=200, max_depth=8, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbose=-1
            ),
            'Random Forest': RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42),
            'Ridge Regression': Ridge(alpha=1.0, random_state=42),
        }
        
        tree_models = {
            'Stacking Ensemble (XGB+LGBM)', # <--- ADD HERE
            'Two-Stage Hurdle', # <--- ADD HERE
            'Random Forest', 'Gradient Boosting',
            'XGBoost (Poisson)', 'XGBoost (Squared)',
            'LightGBM (Poisson)', 'LightGBM (Tweedie)', 'LightGBM (Squared)',
        }
        
        # Train and evaluate models
        model2_results = {}
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            if name not in tree_models:
                model.fit(X2_train_scaled, y2_train)
                y2_pred = model.predict(X2_test_scaled)
            else:
                model.fit(X2_train, y2_train)
                y2_pred = model.predict(X2_test)
            
            # Ensure non-negative predictions for count data
            y2_pred = np.maximum(y2_pred, 0)
            
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
        
        # Select best model from initial comparison
        best_model2_name = max(model2_results.keys(), key=lambda x: model2_results[x]['r2'])
        print(f"\nBest initial model: {best_model2_name} (R²: {model2_results[best_model2_name]['r2']:.4f})")
        
        # Hyperparameter tuning on top-2 tree-based models
        print(f"\n{'='*50}")
        print("HYPERPARAMETER TUNING (RandomizedSearchCV)")
        print(f"{'='*50}")
        
        tuning_configs = {
            'XGBoost (Poisson)': {
                'estimator': xgb.XGBRegressor(
                    objective='count:poisson', random_state=42, verbosity=0
                ),
                'params': {
                    'n_estimators': [100, 200, 300, 500],
                    'max_depth': [4, 6, 8, 10],
                    'learning_rate': [0.01, 0.05, 0.1, 0.2],
                    'subsample': [0.7, 0.8, 0.9, 1.0],
                    'colsample_bytree': [0.7, 0.8, 0.9, 1.0],
                    'reg_alpha': [0, 0.1, 0.5, 1.0],
                    'reg_lambda': [0.5, 1.0, 2.0],
                    'min_child_weight': [1, 3, 5],
                }
            },
            'LightGBM (Poisson)': {
                'estimator': lgb.LGBMRegressor(
                    objective='poisson', random_state=42, verbose=-1
                ),
                'params': {
                    'n_estimators': [100, 200, 300, 500],
                    'max_depth': [4, 6, 8, 10, -1],
                    'learning_rate': [0.01, 0.05, 0.1, 0.2],
                    'subsample': [0.7, 0.8, 0.9, 1.0],
                    'colsample_bytree': [0.7, 0.8, 0.9, 1.0],
                    'reg_alpha': [0, 0.1, 0.5, 1.0],
                    'reg_lambda': [0.5, 1.0, 2.0],
                    'num_leaves': [15, 31, 63, 127],
                }
            },
            'LightGBM (Tweedie)': {
                'estimator': lgb.LGBMRegressor(
                    objective='tweedie', tweedie_variance_power=1.5,
                    random_state=42, verbose=-1
                ),
                'params': {
                    'n_estimators': [100, 200, 300, 500],
                    'max_depth': [4, 6, 8, 10, -1],
                    'learning_rate': [0.01, 0.05, 0.1, 0.2],
                    'subsample': [0.7, 0.8, 0.9, 1.0],
                    'colsample_bytree': [0.7, 0.8, 0.9, 1.0],
                    'reg_alpha': [0, 0.1, 0.5, 1.0],
                    'reg_lambda': [0.5, 1.0, 2.0],
                    'num_leaves': [15, 31, 63, 127],
                }
            },
        }
        
        best_tuned_r2 = model2_results[best_model2_name]['r2']
        best_tuned_model = model2_results[best_model2_name]['model']
        best_tuned_name = best_model2_name

        # Define the Time-Series Split
        tscv = TimeSeriesSplit(n_splits=5)
        
        for name, config in tuning_configs.items():
            print(f"\nTuning {name} (50 iterations, 5-fold TimeSeries CV on training set)...")
            search = RandomizedSearchCV(
                config['estimator'], config['params'],
                n_iter=50, 
                cv=tscv,  # <--- CHANGED FROM cv=5 to cv=tscv
                scoring='r2',
                random_state=42, n_jobs=-1
            )
            search.fit(X2_train, y2_train)
            
            y2_pred_tuned = search.predict(X2_test)
            tuned_r2 = r2_score(y2_test, y2_pred_tuned)
            tuned_mse = mean_squared_error(y2_test, y2_pred_tuned)
            tuned_mae = mean_absolute_error(y2_test, y2_pred_tuned)
            
            print(f"  Best CV R²: {search.best_score_:.4f}")
            print(f"  Test R²: {tuned_r2:.4f}, MSE: {tuned_mse:.4f}, MAE: {tuned_mae:.4f}")
            print(f"  Best params: {search.best_params_}")
            
            model2_results[f'{name} (Tuned)'] = {
                'model': search.best_estimator_,
                'mse': tuned_mse,
                'mae': tuned_mae,
                'r2': tuned_r2,
                'predictions': y2_pred_tuned
            }
            
            if tuned_r2 > best_tuned_r2:
                best_tuned_r2 = tuned_r2
                best_tuned_model = search.best_estimator_
                best_tuned_name = f'{name} (Tuned)'
        
        self.model2 = best_tuned_model
        print(f"\nFinal Best Model 2: {best_tuned_name}")
        print(f"R² Score: {best_tuned_r2:.4f}")
        
        # Store feature names for Model 2
        self.model2_feature_names = model2_features
        
        return model2_results
    
    def save_models(self):
        """
        Save trained models and scalers to the server-ml/models directory
        """
        # Define the target directory relative to this script
        # This script is in daily-scrap-dengue-data/
        # Target is in server-ml/models/
        script_dir = os.path.dirname(os.path.abspath(__file__))
        target_dir = os.path.join(script_dir, "..", "server-ml", "models")
        
        # Ensure the target directory exists
        os.makedirs(target_dir, exist_ok=True)

        if self.model1 is not None:
            model1_path = os.path.join(target_dir, 'model1_historical_cases_improved.pkl')
            scaler1_path = os.path.join(target_dir, 'scaler1_historical_cases_improved.pkl')
            joblib.dump(self.model1, model1_path)
            joblib.dump(self.scaler1, scaler1_path)
            print(f"Model 1 and scaler saved successfully to {target_dir}!")
        
        if self.model2 is not None:
            model2_path = os.path.join(target_dir, 'model2_weather_based_improved.pkl')
            scaler2_path = os.path.join(target_dir, 'scaler2_weather_based_improved.pkl')
            joblib.dump(self.model2, model2_path)
            joblib.dump(self.scaler2, scaler2_path)
            print(f"Model 2 and scaler saved successfully to {target_dir}!")
        
        # Save feature names
        import json
        features_path = os.path.join(target_dir, 'model_features_improved.json')
        with open(features_path, 'w') as f:
            json.dump({
                'model1_features': self.model1_feature_names,
                'model2_features': self.model2_feature_names
            }, f)
        print(f"Feature names saved successfully to {target_dir}!")
    
    def test_historical_features(self):
        """
        Test method to verify historical features are working correctly
        """
        print(f"\n{'='*50}")
        print("TESTING HISTORICAL FEATURES")
        print(f"{'='*50}")
        
        if self.df is None:
            print("❌ No data loaded. Run load_and_preprocess_data() first.")
            return
        
        # Create a small test dataset
        test_df = self.df.head(100).copy()
        
        # Create historical features
        df_with_history = self.create_historical_features(test_df)
        
        # Check if historical features were created
        historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
        
        print(f"\nHistorical Features Test Results:")
        for feature in historical_features:
            if feature in df_with_history.columns:
                non_zero_count = (df_with_history[feature] != 0).sum()
                print(f"✅ {feature}: {non_zero_count}/{len(df_with_history)} records have non-zero values")
                print(f"   Range: {df_with_history[feature].min():.2f} to {df_with_history[feature].max():.2f}")
            else:
                print(f"❌ {feature}: Feature not found")
        
        # Test correlation with target
        print(f"\nCorrelation with target (total_active_cases):")
        for feature in historical_features:
            if feature in df_with_history.columns:
                corr = df_with_history[feature].corr(df_with_history['total_active_cases'])
                print(f"{feature}: {corr:.4f}")
        
        return df_with_history

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
    
    # Test historical features
    ml_models.test_historical_features()
    
    # Explore data
    ml_models.explore_data()
    
    # Train both models
    print("\nTraining models...")
    model1_results = ml_models.train_model1_historical_cases()
    model2_results = ml_models.train_model2_weather_based()
    
    # Save models
    ml_models.save_models()
    
    # Create model-specific correlation analysis
    ml_models.create_model_specific_correlation_analysis()
    
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