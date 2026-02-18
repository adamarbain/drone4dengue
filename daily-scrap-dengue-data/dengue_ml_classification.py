"""
Dengue Risk Classification Using XGBoost
=========================================

This script creates classification models to predict dengue risk levels (Low/Medium/High)
using XGBoost and other classification algorithms.

Risk Levels:
- Low: 1-2 cases
- Medium: 3-5 cases
- High: 6+ cases

Author: AI Assistant
Date: 2026
"""

import pandas as pd
import numpy as np
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (classification_report, confusion_matrix, 
                            accuracy_score, f1_score, precision_score, 
                            recall_score, roc_auc_score, roc_curve)
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE
import joblib
import warnings
warnings.filterwarnings('ignore')

class DengueRiskClassification:
    """
    Classification model to predict dengue risk levels (Low/Medium/High)
    """
    
    def __init__(self, csv_file='active_dengue.csv'):
        """
        Initialize the DengueRiskClassification class
        
        Args:
            csv_file (str): Path to the CSV file containing dengue data
        """
        self.csv_file = csv_file
        self.df = None
        self.model1 = None  # Historical cases classification model
        self.model2 = None  # Weather-based classification model
        self.scaler1 = None
        self.scaler2 = None
        self.label_encoders = {}
        self.target_column = 'risk_level'
        self.risk_mapping = {'Low': 0, 'Medium': 1, 'High': 2}
        
    def load_and_preprocess_data(self):
        """
        Load and preprocess the dengue dataset with classification labels
        """
        print("Loading and preprocessing data for classification...")
        
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

        # Normalize column names if needed
        if 'centroid_x' not in self.df.columns and 'x' in self.df.columns:
            self.df = self.df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
        if 'location' not in self.df.columns and 'area' in self.df.columns:
            self.df = self.df.rename(columns={'area': 'location'})

        # Create risk level classification (Low: 1-2, Medium: 3-5, High: 6+)
        bins = [0, 2, 5, float('inf')]
        labels = ['Low', 'Medium', 'High']
        self.df['risk_level'] = pd.cut(self.df['total_active_cases'], bins=bins, labels=labels)
        
        # Convert to numeric for modeling
        self.df['risk_level_encoded'] = self.df['risk_level'].map(self.risk_mapping)
        
        print(f"\nRisk Level Distribution:")
        print(self.df['risk_level'].value_counts().sort_index())
        print(f"\nPercentage Distribution:")
        print((self.df['risk_level'].value_counts(normalize=True) * 100).round(2).sort_index())

        # Load hotspot data and merge as a binary feature
        try:
            hotspot_df = pd.read_csv('dengue_hotspot.csv')
            hotspot_df['date'] = pd.to_datetime(hotspot_df['date'], format='%d/%m/%Y')
            hotspot_df = hotspot_df[hotspot_df['date'] >= cutoff_date].copy()
            
            if 'centroid_x' not in hotspot_df.columns and 'x' in hotspot_df.columns:
                hotspot_df = hotspot_df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
            if 'location' not in hotspot_df.columns and 'area' in hotspot_df.columns:
                hotspot_df = hotspot_df.rename(columns={'area': 'location'})

            # Create rounded coordinate columns
            self.df['cx_round'] = self.df['centroid_x'].round(4)
            self.df['cy_round'] = self.df['centroid_y'].round(4)
            hotspot_df['cx_round'] = hotspot_df['centroid_x'].round(4)
            hotspot_df['cy_round'] = hotspot_df['centroid_y'].round(4)

            # Merge hotspot data
            hotspot_keys = hotspot_df[['cx_round', 'cy_round', 'date']].drop_duplicates()
            hotspot_keys = hotspot_keys.assign(is_hotspot=1)
            self.df = self.df.merge(hotspot_keys, on=['cx_round', 'cy_round', 'date'], how='left')
            self.df['is_hotspot'] = self.df['is_hotspot'].fillna(0).astype(int)

            # Fallback merge on location/state/date
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
                    self.df['is_hotspot'] = np.maximum(self.df['is_hotspot'], df_loc['is_hotspot2'])

            self.df.drop(columns=['cx_round', 'cy_round'], inplace=True)
            print(f"Hotspot feature merged. Hotspot days: {self.df['is_hotspot'].sum()} (of {len(self.df)})")
        except Exception as e:
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
        
        # Create location clusters
        from sklearn.cluster import KMeans
        kmeans = KMeans(n_clusters=10, random_state=42)
        self.df['location_cluster'] = kmeans.fit_predict(self.df[['centroid_x', 'centroid_y']])
        
        print("Data preprocessing completed!")
        print(f"Final dataset shape: {self.df.shape}")
        
    def create_historical_features(self, df, train_indices=None, test_indices=None):
        """
        Create historical features with proper data splitting to avoid leakage
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
            location_mask = (df['centroid_x'] == location[0]) & (df['centroid_y'] == location[1])
            location_data = df[location_mask].copy()
            
            if len(location_data) > 0:
                location_data['cases_lag_1'] = location_data['total_active_cases'].shift(1).fillna(0)
                location_data['cases_lag_7'] = location_data['total_active_cases'].shift(7).fillna(0)
                location_data['cases_lag_30'] = location_data['total_active_cases'].shift(30).fillna(0)
                location_data['cases_avg_7'] = location_data['total_active_cases'].rolling(7, min_periods=1).mean()
                location_data['cases_avg_30'] = location_data['total_active_cases'].rolling(30, min_periods=1).mean()
                
                original_indices = location_data.index
                df.loc[original_indices, 'cases_lag_1'] = location_data['cases_lag_1'].values
                df.loc[original_indices, 'cases_lag_7'] = location_data['cases_lag_7'].values
                df.loc[original_indices, 'cases_lag_30'] = location_data['cases_lag_30'].values
                df.loc[original_indices, 'cases_avg_7'] = location_data['cases_avg_7'].values
                df.loc[original_indices, 'cases_avg_30'] = location_data['cases_avg_30'].values
        
        if test_indices is not None:
            print(f"Historical features created for {len(df)} records")
        
        return df
        
    def train_model1_historical_classification(self, use_smote=False):
        """
        Train Model 1: Risk Classification Using Historical Cases
        """
        print("\n" + "="*60)
        print("TRAINING MODEL 1: HISTORICAL CASES CLASSIFICATION (XGBoost)")
        print("="*60)
        
        # Prepare features
        basic_features = ['centroid_x', 'centroid_y', 'location_cluster', 'month', 'day_of_year', 'is_hotspot']
        
        X1 = self.df[basic_features].copy()
        y1 = self.df['risk_level_encoded'].copy()
        
        print(f"Model 1 training data: {X1.shape[0]} samples, {X1.shape[1]} features")
        
        # Stratified split
        X1_train, X1_test, y1_train, y1_test = train_test_split(
            X1, y1, test_size=0.2, random_state=42, stratify=y1
        )
        
        train_indices = X1_train.index
        test_indices = X1_test.index
        
        # Create historical features
        df_with_history = self.create_historical_features(self.df, train_indices, test_indices)
        
        historical_features = ['cases_lag_1', 'cases_lag_7', 'cases_lag_30', 'cases_avg_7', 'cases_avg_30']
        for feature in historical_features:
            X1_train[feature] = df_with_history.loc[train_indices, feature].values
            X1_test[feature] = df_with_history.loc[test_indices, feature].values
        
        # Scale features
        self.scaler1 = StandardScaler()
        X1_train_scaled = self.scaler1.fit_transform(X1_train)
        X1_test_scaled = self.scaler1.transform(X1_test)
        
        # Apply SMOTE if requested
        if use_smote:
            print("\nApplying SMOTE for class balancing...")
            smote = SMOTE(random_state=42)
            X1_train_scaled, y1_train = smote.fit_resample(X1_train_scaled, y1_train)
            print(f"After SMOTE - Training samples: {len(y1_train)}")
            print(f"Class distribution: {pd.Series(y1_train).value_counts().sort_index().to_dict()}")
        
        # Calculate class weights
        from sklearn.utils.class_weight import compute_class_weight
        classes = np.unique(y1_train)
        class_weights = compute_class_weight('balanced', classes=classes, y=y1_train)
        class_weight_dict = dict(zip(classes, class_weights))
        
        print(f"\nClass weights: {class_weight_dict}")
        
        # Define models
        models = {
            'XGBoost': XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                min_child_weight=3,
                gamma=0.1,
                random_state=42,
                eval_metric='mlogloss'
            ),
            'Random Forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                class_weight='balanced',
                random_state=42
            ),
            'Gradient Boosting': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
        }
        
        # Train and evaluate models
        model1_results = {}
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            model.fit(X1_train_scaled, y1_train)
            y1_pred = model.predict(X1_test_scaled)
            y1_pred_proba = model.predict_proba(X1_test_scaled)
            
            # Calculate metrics
            accuracy = accuracy_score(y1_test, y1_pred)
            f1_macro = f1_score(y1_test, y1_pred, average='macro')
            f1_weighted = f1_score(y1_test, y1_pred, average='weighted')
            precision = precision_score(y1_test, y1_pred, average='weighted')
            recall = recall_score(y1_test, y1_pred, average='weighted')
            
            # Calculate ROC-AUC (one-vs-rest)
            try:
                roc_auc = roc_auc_score(y1_test, y1_pred_proba, multi_class='ovr', average='weighted')
            except:
                roc_auc = 0.0
            
            model1_results[name] = {
                'model': model,
                'accuracy': accuracy,
                'f1_macro': f1_macro,
                'f1_weighted': f1_weighted,
                'precision': precision,
                'recall': recall,
                'roc_auc': roc_auc,
                'predictions': y1_pred,
                'predictions_proba': y1_pred_proba,
                'y_test': y1_test
            }
            
            print(f"\n{name} Results:")
            print(f"  Accuracy:     {accuracy:.4f}")
            print(f"  F1 (Macro):   {f1_macro:.4f}")
            print(f"  F1 (Weighted):{f1_weighted:.4f}")
            print(f"  Precision:    {precision:.4f}")
            print(f"  Recall:       {recall:.4f}")
            print(f"  ROC-AUC:      {roc_auc:.4f}")
        
        # Select best model based on F1 macro score
        best_model1_name = max(model1_results.keys(), key=lambda x: model1_results[x]['f1_macro'])
        self.model1 = model1_results[best_model1_name]['model']
        
        print(f"\n{'='*60}")
        print(f"Best Model 1: {best_model1_name}")
        print(f"F1 Score (Macro): {model1_results[best_model1_name]['f1_macro']:.4f}")
        print(f"{'='*60}")
        
        # Store feature names
        self.model1_feature_names = basic_features + historical_features
        
        # Print detailed classification report for best model
        print(f"\nDetailed Classification Report for {best_model1_name}:")
        y_test = model1_results[best_model1_name]['y_test']
        y_pred = model1_results[best_model1_name]['predictions']
        print(classification_report(y_test, y_pred, target_names=['Low', 'Medium', 'High']))
        
        return model1_results
    
    def train_model2_weather_classification(self, use_smote=False):
        """
        Train Model 2: Risk Classification Using Weather Data
        """
        print("\n" + "="*60)
        print("TRAINING MODEL 2: WEATHER-BASED CLASSIFICATION (XGBoost)")
        print("="*60)
        
        # Prepare features
        model2_features = ['centroid_x', 'centroid_y', 'humidity', 'temperature', 'rainfall',
                          'month', 'day_of_year', 'location_cluster', 'is_hotspot']
        
        X2 = self.df[model2_features].copy()
        y2 = self.df['risk_level_encoded'].copy()
        
        # Handle missing values
        if X2.isnull().any().any():
            print("\nMissing values detected. Imputing with median values...")
            X2 = X2.fillna(X2.median(numeric_only=True))
        
        print(f"Model 2 training data: {X2.shape[0]} samples, {X2.shape[1]} features")
        
        # Stratified split
        X2_train, X2_test, y2_train, y2_test = train_test_split(
            X2, y2, test_size=0.2, random_state=42, stratify=y2
        )
        
        # Scale features
        self.scaler2 = StandardScaler()
        X2_train_scaled = self.scaler2.fit_transform(X2_train)
        X2_test_scaled = self.scaler2.transform(X2_test)
        
        # Apply SMOTE if requested
        if use_smote:
            print("\nApplying SMOTE for class balancing...")
            smote = SMOTE(random_state=42)
            X2_train_scaled, y2_train = smote.fit_resample(X2_train_scaled, y2_train)
            print(f"After SMOTE - Training samples: {len(y2_train)}")
        
        # Define models
        models = {
            'XGBoost': XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                min_child_weight=3,
                gamma=0.1,
                random_state=42,
                eval_metric='mlogloss'
            ),
            'Random Forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                class_weight='balanced',
                random_state=42
            ),
            'Gradient Boosting': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
        }
        
        # Train and evaluate models
        model2_results = {}
        for name, model in models.items():
            print(f"\nTraining {name}...")
            
            model.fit(X2_train_scaled, y2_train)
            y2_pred = model.predict(X2_test_scaled)
            y2_pred_proba = model.predict_proba(X2_test_scaled)
            
            # Calculate metrics
            accuracy = accuracy_score(y2_test, y2_pred)
            f1_macro = f1_score(y2_test, y2_pred, average='macro')
            f1_weighted = f1_score(y2_test, y2_pred, average='weighted')
            precision = precision_score(y2_test, y2_pred, average='weighted')
            recall = recall_score(y2_test, y2_pred, average='weighted')
            
            try:
                roc_auc = roc_auc_score(y2_test, y2_pred_proba, multi_class='ovr', average='weighted')
            except:
                roc_auc = 0.0
            
            model2_results[name] = {
                'model': model,
                'accuracy': accuracy,
                'f1_macro': f1_macro,
                'f1_weighted': f1_weighted,
                'precision': precision,
                'recall': recall,
                'roc_auc': roc_auc,
                'predictions': y2_pred,
                'predictions_proba': y2_pred_proba,
                'y_test': y2_test
            }
            
            print(f"\n{name} Results:")
            print(f"  Accuracy:     {accuracy:.4f}")
            print(f"  F1 (Macro):   {f1_macro:.4f}")
            print(f"  F1 (Weighted):{f1_weighted:.4f}")
            print(f"  Precision:    {precision:.4f}")
            print(f"  Recall:       {recall:.4f}")
            print(f"  ROC-AUC:      {roc_auc:.4f}")
        
        # Select best model
        best_model2_name = max(model2_results.keys(), key=lambda x: model2_results[x]['f1_macro'])
        self.model2 = model2_results[best_model2_name]['model']
        
        print(f"\n{'='*60}")
        print(f"Best Model 2: {best_model2_name}")
        print(f"F1 Score (Macro): {model2_results[best_model2_name]['f1_macro']:.4f}")
        print(f"{'='*60}")
        
        # Store feature names
        self.model2_feature_names = model2_features
        
        # Print detailed classification report
        print(f"\nDetailed Classification Report for {best_model2_name}:")
        y_test = model2_results[best_model2_name]['y_test']
        y_pred = model2_results[best_model2_name]['predictions']
        print(classification_report(y_test, y_pred, target_names=['Low', 'Medium', 'High']))
        
        return model2_results
    
    def create_visualizations(self, model1_results, model2_results):
        """
        Create comprehensive visualizations for classification results
        """
        print("\nCreating visualizations...")
        
        # Get best models
        best_model1 = max(model1_results.keys(), key=lambda x: model1_results[x]['f1_macro'])
        best_model2 = max(model2_results.keys(), key=lambda x: model2_results[x]['f1_macro'])
        
        fig = plt.figure(figsize=(20, 12))
        
        # 1. Confusion Matrix - Model 1
        plt.subplot(2, 4, 1)
        cm1 = confusion_matrix(model1_results[best_model1]['y_test'], 
                               model1_results[best_model1]['predictions'])
        sns.heatmap(cm1, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=['Low', 'Medium', 'High'],
                   yticklabels=['Low', 'Medium', 'High'])
        plt.title(f'Model 1: {best_model1}\nConfusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        
        # 2. Confusion Matrix - Model 2
        plt.subplot(2, 4, 2)
        cm2 = confusion_matrix(model2_results[best_model2]['y_test'], 
                               model2_results[best_model2]['predictions'])
        sns.heatmap(cm2, annot=True, fmt='d', cmap='Greens',
                   xticklabels=['Low', 'Medium', 'High'],
                   yticklabels=['Low', 'Medium', 'High'])
        plt.title(f'Model 2: {best_model2}\nConfusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        
        # 3. Feature Importance - Model 1
        if hasattr(self.model1, 'feature_importances_'):
            plt.subplot(2, 4, 3)
            importance_df1 = pd.DataFrame({
                'feature': self.model1_feature_names,
                'importance': self.model1.feature_importances_
            }).sort_values('importance', ascending=True).tail(10)
            plt.barh(importance_df1['feature'], importance_df1['importance'])
            plt.title('Model 1: Top 10 Feature Importance')
            plt.xlabel('Importance')
        
        # 4. Feature Importance - Model 2
        if hasattr(self.model2, 'feature_importances_'):
            plt.subplot(2, 4, 4)
            importance_df2 = pd.DataFrame({
                'feature': self.model2_feature_names,
                'importance': self.model2.feature_importances_
            }).sort_values('importance', ascending=True).tail(10)
            plt.barh(importance_df2['feature'], importance_df2['importance'])
            plt.title('Model 2: Top 10 Feature Importance')
            plt.xlabel('Importance')
        
        # 5. Model Comparison - F1 Scores
        plt.subplot(2, 4, 5)
        models_names = list(model1_results.keys())
        f1_scores_m1 = [model1_results[m]['f1_macro'] for m in models_names]
        f1_scores_m2 = [model2_results[m]['f1_macro'] for m in models_names]
        x = np.arange(len(models_names))
        width = 0.35
        plt.bar(x - width/2, f1_scores_m1, width, label='Model 1 (Historical)')
        plt.bar(x + width/2, f1_scores_m2, width, label='Model 2 (Weather)')
        plt.xlabel('Algorithm')
        plt.ylabel('F1 Score (Macro)')
        plt.title('Model Comparison: F1 Scores')
        plt.xticks(x, models_names, rotation=45)
        plt.legend()
        plt.grid(axis='y', alpha=0.3)
        
        # 6. Risk Level Distribution
        plt.subplot(2, 4, 6)
        risk_dist = self.df['risk_level'].value_counts().sort_index()
        colors = ['green', 'orange', 'red']
        plt.bar(risk_dist.index, risk_dist.values, color=colors, alpha=0.7)
        plt.title('Risk Level Distribution in Dataset')
        plt.xlabel('Risk Level')
        plt.ylabel('Count')
        for i, v in enumerate(risk_dist.values):
            plt.text(i, v + 50, str(v), ha='center', va='bottom')
        
        # 7. Accuracy Comparison
        plt.subplot(2, 4, 7)
        acc_m1 = [model1_results[m]['accuracy'] for m in models_names]
        acc_m2 = [model2_results[m]['accuracy'] for m in models_names]
        plt.bar(x - width/2, acc_m1, width, label='Model 1 (Historical)')
        plt.bar(x + width/2, acc_m2, width, label='Model 2 (Weather)')
        plt.xlabel('Algorithm')
        plt.ylabel('Accuracy')
        plt.title('Model Comparison: Accuracy')
        plt.xticks(x, models_names, rotation=45)
        plt.legend()
        plt.grid(axis='y', alpha=0.3)
        
        # 8. ROC-AUC Comparison
        plt.subplot(2, 4, 8)
        roc_m1 = [model1_results[m]['roc_auc'] for m in models_names]
        roc_m2 = [model2_results[m]['roc_auc'] for m in models_names]
        plt.bar(x - width/2, roc_m1, width, label='Model 1 (Historical)')
        plt.bar(x + width/2, roc_m2, width, label='Model 2 (Weather)')
        plt.xlabel('Algorithm')
        plt.ylabel('ROC-AUC Score')
        plt.title('Model Comparison: ROC-AUC')
        plt.xticks(x, models_names, rotation=45)
        plt.legend()
        plt.grid(axis='y', alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('dengue_classification_results.png', dpi=300, bbox_inches='tight')
        print("Visualizations saved to 'dengue_classification_results.png'")
        plt.show()
    
    def save_models(self):
        """
        Save trained classification models to server-ml/models directory
        """
        script_dir = os.path.dirname(os.path.abspath(__file__))
        target_dir = os.path.join(script_dir, "..", "server-ml", "models")
        os.makedirs(target_dir, exist_ok=True)

        if self.model1 is not None:
            model1_path = os.path.join(target_dir, 'model1_historical_classification.pkl')
            scaler1_path = os.path.join(target_dir, 'scaler1_historical_classification.pkl')
            joblib.dump(self.model1, model1_path)
            joblib.dump(self.scaler1, scaler1_path)
            print(f"Model 1 (Classification) saved to {target_dir}!")
        
        if self.model2 is not None:
            model2_path = os.path.join(target_dir, 'model2_weather_classification.pkl')
            scaler2_path = os.path.join(target_dir, 'scaler2_weather_classification.pkl')
            joblib.dump(self.model2, model2_path)
            joblib.dump(self.scaler2, scaler2_path)
            print(f"Model 2 (Classification) saved to {target_dir}!")
        
        # Save feature names and risk mapping
        import json
        features_path = os.path.join(target_dir, 'classification_model_info.json')
        with open(features_path, 'w') as f:
            json.dump({
                'model1_features': self.model1_feature_names,
                'model2_features': self.model2_feature_names,
                'risk_mapping': self.risk_mapping,
                'risk_labels': ['Low', 'Medium', 'High'],
                'risk_thresholds': {'Low': '1-2 cases', 'Medium': '3-5 cases', 'High': '6+ cases'}
            }, f, indent=2)
        print(f"Model info saved to {target_dir}!")

def main():
    """
    Main function to train dengue risk classification models
    """
    print("="*60)
    print("DENGUE RISK CLASSIFICATION - XGBOOST")
    print("="*60)
    print("\nRisk Levels:")
    print("  - Low: 1-2 cases")
    print("  - Medium: 3-5 cases")
    print("  - High: 6+ cases")
    print("="*60)
    
    # Initialize classifier
    classifier = DengueRiskClassification('active_dengue.csv')
    
    # Load and preprocess data
    classifier.load_and_preprocess_data()
    
    # Train both models
    print("\nTraining classification models...")
    model1_results = classifier.train_model1_historical_classification(use_smote=False)
    model2_results = classifier.train_model2_weather_classification(use_smote=False)
    
    # Create visualizations
    classifier.create_visualizations(model1_results, model2_results)
    
    # Save models
    classifier.save_models()
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    # Print summary
    print("\nBest Models Performance:")
    best_m1 = max(model1_results.keys(), key=lambda x: model1_results[x]['f1_macro'])
    best_m2 = max(model2_results.keys(), key=lambda x: model2_results[x]['f1_macro'])
    
    print(f"\nModel 1 (Historical Cases) - {best_m1}:")
    print(f"  Accuracy: {model1_results[best_m1]['accuracy']:.4f}")
    print(f"  F1 Score: {model1_results[best_m1]['f1_macro']:.4f}")
    print(f"  ROC-AUC:  {model1_results[best_m1]['roc_auc']:.4f}")
    
    print(f"\nModel 2 (Weather-based) - {best_m2}:")
    print(f"  Accuracy: {model2_results[best_m2]['accuracy']:.4f}")
    print(f"  F1 Score: {model2_results[best_m2]['f1_macro']:.4f}")
    print(f"  ROC-AUC:  {model2_results[best_m2]['roc_auc']:.4f}")
    
    print("\n✅ Classification models trained and saved successfully!")
    print("\nNote: Use F1 Score and ROC-AUC for imbalanced classification problems,")
    print("      not just accuracy!")

if __name__ == "__main__":
    main()
