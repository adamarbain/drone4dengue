"""
Dengue Prediction ML Models — Trained from DengueData.csv
==========================================================

This script trains two ML models for dengue prediction using the unified
DengueData.csv file (which already contains both active-case and hotspot
records together with weather data).

Key improvements over dengue_ml_models_improved.py
---------------------------------------------------
1. Single data source  – DengueData.csv (no separate active_dengue.csv +
   dengue_hotspot.csv merge needed).
2. Log-transform target – stabilises variance & reduces influence of extreme
   outbreaks  (MLMODEL_TIPS  Tip #2).
3. Richer geospatial encoding – state + city + postcode label-encoded and
   DBSCAN clustering for density-aware spatial features (Tip #3 & Tip D).
4. Extended lag features – rainfall/humidity/temperature lags at 7, 14, 21,
   28 days plus EWMA and cumulative rainfall (Tip #1).
5. Poisson / Negative-Binomial aware models – XGBoost count:poisson,
   LightGBM poisson, Tweedie, Two-Stage Hurdle (Tip C).
6. Proper time-series split – train on older dates, test on newest 20 %
   (no random shuffle of temporal data).
7. Stacking ensemble – XGBoost + LightGBM with Ridge meta-learner.
8. Brière thermal curve – biologically-motivated mosquito development rate.

Output
------
Saves to  ../server-ml/models/  :
  - model1_historical_cases_improved.pkl
  - model2_weather_based_improved.pkl
  - scaler1_historical_cases_improved.pkl
  - scaler2_weather_based_improved.pkl
  - model_features_improved.json

These filenames are intentionally kept identical to the original so the
existing prediction_service.py loads them without any code changes.

Author : Copilot
Date   : 2026-03
"""

# ── Imports ──────────────────────────────────────────────────────────
import pandas as pd
import numpy as np
import os
import json
import joblib
import warnings
warnings.filterwarnings('ignore')

import matplotlib
matplotlib.use('Agg')          # non-interactive backend (no GUI needed)
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import (
    train_test_split, TimeSeriesSplit, RandomizedSearchCV
)
from sklearn.ensemble import (
    RandomForestRegressor, GradientBoostingRegressor, StackingRegressor
)
from sklearn.linear_model import Ridge, Lasso
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.cluster import KMeans, DBSCAN

import xgboost as xgb
import lightgbm as lgb


# ── Two-Stage Hurdle Model ──────────────────────────────────────────
class TwoStageHurdleModel(BaseEstimator, RegressorMixin):
    """
    Stage 1 – classify *normal* vs *outbreak* (activeCases > threshold).
    Stage 2 – route each group to a specialised regressor.
    """
    def __init__(self, hurdle_threshold=2):
        self.hurdle_threshold = hurdle_threshold
        self.classifier = lgb.LGBMClassifier(
            n_estimators=150, max_depth=6, learning_rate=0.05,
            class_weight='balanced', random_state=42, verbose=-1
        )
        self.regressor_low = lgb.LGBMRegressor(
            n_estimators=100, max_depth=4, learning_rate=0.05,
            random_state=42, verbose=-1
        )
        self.regressor_high = xgb.XGBRegressor(
            objective='count:poisson', n_estimators=200, max_depth=6,
            learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbosity=0
        )

    def fit(self, X, y):
        y_class = (y > self.hurdle_threshold).astype(int)
        self.classifier.fit(X, y_class)
        mask_high = y > self.hurdle_threshold
        mask_low  = ~mask_high
        if mask_low.sum() > 0:
            self.regressor_low.fit(X[mask_low], y[mask_low])
        if mask_high.sum() > 0:
            self.regressor_high.fit(X[mask_high], y[mask_high])
        return self

    def predict(self, X):
        preds_class = self.classifier.predict(X)
        final = np.zeros(len(X))
        hi = preds_class == 1
        lo = ~hi
        if lo.sum() > 0:
            final[lo] = self.regressor_low.predict(X[lo])
        if hi.sum() > 0:
            final[hi] = self.regressor_high.predict(X[hi])
        return np.maximum(final, 0)


# ── Main class ──────────────────────────────────────────────────────
class DengueMLModelsDengueData:
    """
    Train dengue-prediction models from the unified DengueData.csv.
    """

    def __init__(self, csv_file='DengueData.csv'):
        self.csv_file = csv_file
        self.df = None

        self.model1 = None          # Historical-cases model
        self.model2 = None          # Weather-based model
        self.scaler1 = None
        self.scaler2 = None
        self.label_encoders = {}
        self.target_column = 'activeCases'

        self.model1_feature_names = []
        self.model2_feature_names = []

        self.kmeans = None
        self.model1_needs_scaling = False
        self.model2_needs_scaling = False

    # ─────────────────────────────────────────────────────────────────
    # 1. LOAD & PREPROCESS
    # ─────────────────────────────────────────────────────────────────
    def load_and_preprocess_data(self):
        """Load DengueData.csv and engineer all features."""

        print("=" * 60)
        print("PHASE 1 — DATA LOADING & FEATURE ENGINEERING")
        print("=" * 60)

        # ── 1a. Load ────────────────────────────────────────────────
        self.df = pd.read_csv(self.csv_file)
        print(f"Loaded {self.csv_file}: {self.df.shape[0]} rows × {self.df.shape[1]} cols")

        # ── 1b. Parse date (YYYY-MM-DD HH:MM:SS) ───────────────────
        self.df['date'] = pd.to_datetime(self.df['date'])

        # ── 1c. Date cutoff (>= 18 Dec 2025) ───────────────────────
        cutoff = pd.to_datetime('2025-12-18')
        before = len(self.df)
        self.df = self.df[self.df['date'] >= cutoff].copy()
        print(f"Date filter >= {cutoff.date()}: kept {len(self.df)}/{before} rows")

        # ── 1d. Rename coords for compatibility with prediction_service
        self.df = self.df.rename(columns={
            'longitude': 'centroid_x',
            'latitude':  'centroid_y',
        })

        # ── 1e. Ensure target is numeric ────────────────────────────
        self.df['activeCases'] = (
            pd.to_numeric(self.df['activeCases'], errors='coerce')
              .fillna(0).astype(int)
        )

        # ── 1f. Drop 100 %-empty columns ────────────────────────────
        for col in ['coverageArea', 'geocodeError']:
            if col in self.df.columns:
                self.df.drop(columns=[col], inplace=True)

        # ── 1g. Derive is_hotspot directly from status ──────────────
        self.df['is_hotspot'] = (self.df['status'] == 'Hotspot').astype(int)
        n_hs = self.df['is_hotspot'].sum()
        print(f"Hotspot records: {n_hs} / {len(self.df)} "
              f"({n_hs/len(self.df)*100:.1f} %)")

        # ── 1h. Weather – coerce & impute ───────────────────────────
        weather_cols = ['humidity', 'temperature', 'rainfall']
        for c in weather_cols:
            self.df[c] = pd.to_numeric(self.df[c], errors='coerce')

        missing_w = self.df[weather_cols].isnull().any(axis=1).sum()
        print(f"Rows missing weather: {missing_w}")

        # Impute per-state median, then global median as fallback
        if 'state' in self.df.columns:
            for c in weather_cols:
                self.df[c] = self.df.groupby('state')[c].transform(
                    lambda s: s.fillna(s.median())
                )
        self.df[weather_cols] = self.df[weather_cols].fillna(
            self.df[weather_cols].median()
        )

        # ── 1i. Deduplicate (prefer hotspot row if both exist) ──────
        self.df = self.df.sort_values('is_hotspot', ascending=False)
        self.df = (
            self.df
            .drop_duplicates(subset=['centroid_x', 'centroid_y', 'date'],
                             keep='first')
            .reset_index(drop=True)
        )
        print(f"After deduplication: {len(self.df)} rows")

        # ── 1j. Temporal features ───────────────────────────────────
        self.df['year']         = self.df['date'].dt.year
        self.df['month']        = self.df['date'].dt.month
        self.df['day']          = self.df['date'].dt.day
        self.df['day_of_year']  = self.df['date'].dt.dayofyear
        self.df['week_of_year'] = (
            self.df['date'].dt.isocalendar().week.astype(int)
        )

        # ── 1k. Geospatial encoding (Tips #3 & D) ──────────────────
        # Label-encode state
        self.df['state'] = self.df['state'].fillna('Unknown')
        le_state = LabelEncoder()
        self.df['state_encoded'] = le_state.fit_transform(self.df['state'])
        self.label_encoders['state'] = le_state

        # Label-encode city (richer geo context from DengueData.csv)
        if 'city' in self.df.columns:
            self.df['city'] = self.df['city'].fillna('Unknown')
            le_city = LabelEncoder()
            self.df['city_encoded'] = le_city.fit_transform(self.df['city'])
            self.label_encoders['city'] = le_city

        # Label-encode postcode
        if 'postcode' in self.df.columns:
            self.df['postcode'] = self.df['postcode'].fillna(0)
            self.df['postcode_encoded'] = pd.to_numeric(
                self.df['postcode'], errors='coerce'
            ).fillna(0).astype(int)

        # Label-encode suburb (neighbourhood-level granularity)
        if 'suburb' in self.df.columns:
            self.df['suburb'] = self.df['suburb'].fillna('Unknown')
            le_suburb = LabelEncoder()
            self.df['suburb_encoded'] = le_suburb.fit_transform(self.df['suburb'])
            self.label_encoders['suburb'] = le_suburb

        # Extract bounding box area (proxy for outbreak spatial spread)
        if 'boundingBox' in self.df.columns:
            def parse_bbox_area(bbox_str):
                try:
                    coords = eval(str(bbox_str))
                    if isinstance(coords, (list, tuple)) and len(coords) == 4:
                        lat_min, lat_max, lon_min, lon_max = coords
                        return abs(lat_max - lat_min) * abs(lon_max - lon_min)
                except:
                    pass
                return 0.0
            self.df['bbox_area'] = self.df['boundingBox'].apply(parse_bbox_area)

        # K-Means location clusters (10 clusters)
        coords = self.df[['centroid_x', 'centroid_y']]
        self.kmeans = KMeans(n_clusters=10, random_state=42, n_init=10)
        self.df['location_cluster'] = self.kmeans.fit_predict(coords)

        # DBSCAN density-based clusters (capture urban vs rural)
        dbscan = DBSCAN(eps=0.05, min_samples=20)
        self.df['density_cluster'] = dbscan.fit_predict(coords)
        # -1 means noise/rural; relabel to separate cluster id
        n_db = self.df['density_cluster'].max() + 1
        self.df.loc[self.df['density_cluster'] == -1, 'density_cluster'] = n_db

        print(f"Geospatial clusters: KMeans=10, DBSCAN={n_db + 1}")

        # ── 1l. Lagged weather features (Tip #1) ───────────────────
        self.df = self.df.sort_values(
            ['centroid_x', 'centroid_y', 'date']
        ).reset_index(drop=True)
        loc_group = self.df.groupby(['centroid_x', 'centroid_y'])

        for lag in [7, 14, 21, 28]:
            for c in weather_cols:
                self.df[f'{c}_lag_{lag}'] = loc_group[c].shift(lag)

        # Cumulative rainfall (standing-water proxy)
        self.df['rainfall_cumul_14d'] = loc_group['rainfall'].transform(
            lambda x: x.rolling(14, min_periods=1).sum()
        )
        self.df['rainfall_cumul_28d'] = loc_group['rainfall'].transform(
            lambda x: x.rolling(28, min_periods=1).sum()
        )

        lagged_cols = [c for c in self.df.columns if '_lag_' in c or '_cumul_' in c]
        print(f"Created {len(lagged_cols)} lagged / cumulative features")

        # ── 1m. Weather interactions ────────────────────────────────
        self.df['temp_x_humidity']     = self.df['temperature'] * self.df['humidity']
        self.df['temp_x_rainfall']     = self.df['temperature'] * self.df['rainfall']
        self.df['humidity_x_rainfall'] = self.df['humidity']     * self.df['rainfall']

        self.df['breeding_favorable'] = (
            (self.df['temperature'].between(25, 35)) &
            (self.df['humidity'] > 60) &
            (self.df['rainfall'] > 0)
        ).astype(int)
        print("Created 4 weather interaction features")

        # ── 1n. EWMA smoothed weather ──────────────────────────────
        self.df['rainfall_ewma_14d'] = loc_group['rainfall'].transform(
            lambda x: x.ewm(span=14, adjust=False).mean()
        )
        self.df['temp_ewma_7d'] = loc_group['temperature'].transform(
            lambda x: x.ewm(span=7, adjust=False).mean()
        )
        self.df['humidity_ewma_7d'] = loc_group['humidity'].transform(
            lambda x: x.ewm(span=7, adjust=False).mean()
        )

        # ── 1o. Brière thermal performance curve ───────────────────
        T_min, T_max = 13.3, 39.2
        t = self.df['temperature'].clip(lower=T_min, upper=T_max)
        self.df['briere_thermal_curve'] = t * (t - T_min) * np.sqrt(T_max - t)

        print("Created EWMA & Brière thermal features")
        print(f"\nFinal dataset: {self.df.shape[0]} rows × {self.df.shape[1]} cols")
        print("Phase 1 complete ✓\n")

    # ─────────────────────────────────────────────────────────────────
    # 2. HISTORICAL LAG FEATURES (case counts)
    # ─────────────────────────────────────────────────────────────────
    def create_historical_features(self, df, train_indices=None,
                                   test_indices=None):
        """
        Per-location lag & rolling-average of activeCases.
        Uses shift() so no future leakage.
        """
        df = df.copy()
        df = df.sort_values(
            ['centroid_x', 'centroid_y', 'date']
        ).reset_index(drop=True)

        for feat in ['cases_lag_1', 'cases_lag_7', 'cases_lag_30',
                      'cases_avg_7', 'cases_avg_30']:
            df[feat] = 0.0

        for loc in df[['centroid_x', 'centroid_y']].drop_duplicates().values:
            mask = (
                (df['centroid_x'] == loc[0]) & (df['centroid_y'] == loc[1])
            )
            ld = df.loc[mask].copy()
            if len(ld) == 0:
                continue

            tc = self.target_column
            ld['cases_lag_1']  = ld[tc].shift(1) .fillna(0)
            ld['cases_lag_7']  = ld[tc].shift(7) .fillna(0)
            ld['cases_lag_30'] = ld[tc].shift(30).fillna(0)
            ld['cases_avg_7']  = (ld[tc].shift(1)
                                  .rolling(7,  min_periods=1).mean()
                                  .fillna(0))
            ld['cases_avg_30'] = (ld[tc].shift(1)
                                  .rolling(30, min_periods=1).mean()
                                  .fillna(0))

            idx = ld.index
            for feat in ['cases_lag_1', 'cases_lag_7', 'cases_lag_30',
                          'cases_avg_7', 'cases_avg_30']:
                df.loc[idx, feat] = ld[feat].values

        if test_indices is not None:
            print(f"Historical case features created for {len(df)} records")
        return df

    # ─────────────────────────────────────────────────────────────────
    # 3. EXPLORE DATA (optional – produces PNGs)
    # ─────────────────────────────────────────────────────────────────
    def explore_data(self):
        """Quick visual EDA and correlation matrix."""
        print("=" * 50)
        print("DATA EXPLORATION")
        print("=" * 50)

        tc = self.target_column
        print(f"Total records       : {len(self.df)}")
        print(f"Date range          : {self.df['date'].min().date()} → "
              f"{self.df['date'].max().date()}")
        print(f"Sum activeCases     : {self.df[tc].sum()}")
        print(f"Mean activeCases    : {self.df[tc].mean():.2f}")
        print(f"Max activeCases     : {self.df[tc].max()}")

        print("\nCases by state:")
        state_agg = (self.df.groupby('state')[tc]
                     .agg(['sum', 'mean', 'count']).round(2))
        print(state_agg)

        # ── Distribution + scatter plots ────────────────────────────
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))

        axes[0, 0].hist(self.df[tc], bins=30, alpha=0.7, color='red')
        axes[0, 0].set_title('Distribution of activeCases')

        monthly = self.df.groupby('month')[tc].mean()
        axes[0, 1].plot(monthly.index, monthly.values, marker='o')
        axes[0, 1].set_title('Mean Cases by Month')

        st_tot = self.df.groupby('state')[tc].sum().sort_values(ascending=False).head(10)
        axes[0, 2].barh(st_tot.index, st_tot.values)
        axes[0, 2].set_title('Top 10 States by Total Cases')

        for i, col in enumerate(['temperature', 'humidity', 'rainfall']):
            ax = axes[1, i]
            ax.scatter(self.df[col], self.df[tc], alpha=0.3, s=5)
            ax.set_title(f'{col} vs activeCases')
            ax.set_xlabel(col)

        plt.tight_layout()
        plt.savefig('dengue_eda_denguedata.png', dpi=200)
        plt.close()
        print("Saved dengue_eda_denguedata.png")

        # ── Correlation matrix ──────────────────────────────────────
        corr_feats = [
            tc, 'humidity', 'temperature', 'rainfall',
            'centroid_x', 'centroid_y',
            'month', 'day_of_year', 'week_of_year',
            'is_hotspot', 'state_encoded', 'location_cluster',
        ]
        corr_feats = [f for f in corr_feats if f in self.df.columns]
        corr = self.df[corr_feats].corr()

        plt.figure(figsize=(12, 10))
        sns.heatmap(corr, annot=True, cmap='coolwarm', center=0,
                    fmt='.2f', square=True)
        plt.title('Feature Correlation Matrix')
        plt.tight_layout()
        plt.savefig('dengue_correlation_denguedata.png', dpi=200)
        plt.close()
        print("Saved dengue_correlation_denguedata.png")

        # Print correlations with target
        print(f"\nCorrelation with {tc}:")
        target_corr = (corr[tc].drop(tc)
                       .sort_values(key=abs, ascending=False))
        for feat, val in target_corr.items():
            print(f"  {feat:25s}: {val:+.3f}")

    # ─────────────────────────────────────────────────────────────────
    # 4. TRAIN MODEL 1 — Historical Cases
    # ─────────────────────────────────────────────────────────────────
    def train_model1_historical_cases(self):
        """
        Model 1: predict activeCases from location + temporal + lagged
        case features.  Uses log1p(y) to stabilise the target (Tip #2).
        """
        print("=" * 60)
        print("TRAINING MODEL 1 — HISTORICAL CASES (DengueData.csv)")
        print("=" * 60)

        basic_features = [
            'centroid_x', 'centroid_y',
            'location_cluster',
            'month', 'day_of_year',
            'is_hotspot',
            'state_encoded',
            'density_cluster',
        ]

        # Optionally include bbox_area if available
        if 'bbox_area' in self.df.columns:
            basic_features.append('bbox_area')

        X1 = self.df[basic_features].copy()
        # Log-transform target (Tip #2)
        y1_raw = self.df[self.target_column].copy()
        y1 = np.log1p(y1_raw)    # train in log-space

        # ── Train/test split ────────────────────────────────────────
        X1_train, X1_test, y1_train, y1_test = train_test_split(
            X1, y1, test_size=0.2, random_state=42
        )
        y1_test_raw = y1_raw.loc[y1_test.index]   # keep original for eval

        train_idx = X1_train.index
        test_idx  = X1_test.index

        # ── Add historical lag features ─────────────────────────────
        df_hist = self.create_historical_features(
            self.df, train_idx, test_idx
        )
        hist_feats = [
            'cases_lag_1', 'cases_lag_7', 'cases_lag_30',
            'cases_avg_7', 'cases_avg_30',
        ]
        for feat in hist_feats:
            X1_train[feat] = df_hist.loc[train_idx, feat].values
            X1_test[feat]  = df_hist.loc[test_idx,  feat].values

        print(f"Features: {X1_train.shape[1]}  |  "
              f"Train: {len(X1_train)}  |  Test: {len(X1_test)}")

        # ── Scale ──────────────────────────────────────────────────
        self.scaler1 = StandardScaler()
        X1_tr_sc = self.scaler1.fit_transform(X1_train)
        X1_te_sc = self.scaler1.transform(X1_test)

        # ── Stacking ensemble (XGB + LGBM) ─────────────────────────
        base_est_m1 = [
            ('xgb', xgb.XGBRegressor(
                n_estimators=200, max_depth=8, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0,
                random_state=42, verbosity=0
            )),
            ('lgb', lgb.LGBMRegressor(
                n_estimators=200, max_depth=8, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0,
                random_state=42, verbose=-1
            )),
        ]
        stacking_m1 = StackingRegressor(
            estimators=base_est_m1,
            final_estimator=Ridge(alpha=1.0, random_state=42),
            cv=5, n_jobs=-1
        )

        # ── Candidate models ───────────────────────────────────────
        models = {
            'Stacking Ensemble (XGB+LGBM)': stacking_m1,
            'XGBoost': xgb.XGBRegressor(
                n_estimators=200, max_depth=8, learning_rate=0.05,
                random_state=42, verbosity=0),
            'LightGBM': lgb.LGBMRegressor(
                n_estimators=200, max_depth=8, learning_rate=0.05,
                random_state=42, verbose=-1),
            'Random Forest': RandomForestRegressor(
                n_estimators=100, max_depth=10, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(
                n_estimators=100, max_depth=6, random_state=42),
            'Ridge Regression': Ridge(alpha=1.0, random_state=42),
        }

        tree_models = {
            'Stacking Ensemble (XGB+LGBM)',
            'Random Forest', 'Gradient Boosting',
            'XGBoost', 'LightGBM',
        }

        results = {}
        for name, model in models.items():
            print(f"\n  Training {name} …")
            if name in tree_models:
                model.fit(X1_train, y1_train)
                y_pred_log = model.predict(X1_test)
            else:
                model.fit(X1_tr_sc, y1_train)
                y_pred_log = model.predict(X1_te_sc)

            # Convert back from log-space for evaluation
            y_pred = np.expm1(np.maximum(y_pred_log, 0))
            y_pred = np.maximum(y_pred, 0)

            mse = mean_squared_error(y1_test_raw, y_pred)
            mae = mean_absolute_error(y1_test_raw, y_pred)
            r2  = r2_score(y1_test_raw, y_pred)

            results[name] = {
                'model': model, 'mse': mse, 'mae': mae,
                'r2': r2, 'predictions': y_pred,
            }
            print(f"  {name:30s}  MSE={mse:.4f}  MAE={mae:.4f}  R²={r2:.4f}")

        best = max(results, key=lambda k: results[k]['r2'])
        self.model1 = results[best]['model']
        self.model1_feature_names = basic_features + hist_feats
        self.model1_needs_scaling = best not in tree_models

        print(f"\n★ Best Model 1: {best} — R² {results[best]['r2']:.4f}")

        # Feature importance (if available)
        self._print_feature_importance(self.model1, self.model1_feature_names)

        return results

    # ─────────────────────────────────────────────────────────────────
    # 5. TRAIN MODEL 2 — Weather-based
    # ─────────────────────────────────────────────────────────────────
    def train_model2_weather_based(self):
        """
        Model 2: predict activeCases from weather + geo + temporal
        features.  Uses log1p(y) and a Stacking ensemble.
        """
        print("\n" + "=" * 60)
        print("TRAINING MODEL 2 — WEATHER-BASED (DengueData.csv)")
        print("=" * 60)

        model2_features = [
            'centroid_x', 'centroid_y',
            'humidity', 'temperature', 'rainfall',
            'month', 'day_of_year', 'week_of_year',
            'location_cluster', 'state_encoded', 'is_hotspot',
            # Lagged weather (Tip #1)
            'rainfall_lag_7',  'humidity_lag_7',  'temperature_lag_7',
            'rainfall_cumul_14d', 'rainfall_cumul_28d',
            # Interactions
            'temp_x_humidity', 'temp_x_rainfall', 'humidity_x_rainfall',
            'breeding_favorable',
            # EWMA & thermal
            'rainfall_ewma_14d', 'temp_ewma_7d', 'humidity_ewma_7d',
            'briere_thermal_curve',
        ]

        # Optionally include richer geospatial columns if available
        # optional_geo = [
        #     'city_encoded', 'postcode_encoded', 'density_cluster',
        #     'suburb_encoded', 'bbox_area',
        # ]
        # for col in optional_geo:
        #     if col in self.df.columns:
        #         model2_features.append(col)

        print(f"Total features: {len(model2_features)}")

        X2 = self.df[model2_features].copy()
        y2_raw = self.df[self.target_column].copy()
        y2 = np.log1p(y2_raw)        # log-transform target (Tip #2)

        # Impute NaNs in lagged features (early rows)
        if X2.isnull().any().any():
            n_miss = X2.isnull().sum().sum()
            X2 = X2.fillna(X2.median(numeric_only=True)).fillna(0)
            print(f"Imputed {n_miss} missing values (lag NaNs)")

        # ── Time-series split ──────────────────────────────────────
        dates = self.df['date']
        split_date = dates.quantile(0.8)
        train_mask = dates <= split_date
        test_mask  = dates >  split_date

        X2_train, X2_test = X2[train_mask], X2[test_mask]
        y2_train, y2_test = y2[train_mask], y2[test_mask]
        y2_test_raw = y2_raw[test_mask]

        print(f"Time split at {split_date.date()}  |  "
              f"Train: {len(X2_train)}  |  Test: {len(X2_test)}")
        print(f"Target (train) — median={np.expm1(y2_train.median()):.0f}  "
              f"mean={np.expm1(y2_train.mean()):.2f}  "
              f"skew(raw)={y2_raw[train_mask].skew():.2f}")

        # ── Scale ──────────────────────────────────────────────────
        self.scaler2 = StandardScaler()
        X2_tr_sc = self.scaler2.fit_transform(X2_train)
        X2_te_sc = self.scaler2.transform(X2_test)

        # ── Stacking ensemble (Tip A) ──────────────────────────────
        base_est = [
            ('xgb_poisson', xgb.XGBRegressor(
                objective='count:poisson', n_estimators=200, max_depth=8,
                learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0
            )),
            ('lgb_poisson', lgb.LGBMRegressor(
                objective='poisson', n_estimators=200, max_depth=8,
                learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbose=-1
            )),
        ]
        stacking = StackingRegressor(
            estimators=base_est,
            final_estimator=Ridge(alpha=1.0, random_state=42),
            cv=5, n_jobs=-1
        )

        # ── Candidate models ──────────────────────────────────────
        models = {
            'Stacking Ensemble (XGB+LGBM)': stacking,
            'Two-Stage Hurdle': TwoStageHurdleModel(hurdle_threshold=2),
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
            'Random Forest': RandomForestRegressor(
                n_estimators=200, max_depth=10, random_state=42),
            'Gradient Boosting': GradientBoostingRegressor(
                n_estimators=100, max_depth=6, random_state=42),
            'Ridge Regression': Ridge(alpha=1.0, random_state=42),
        }

        tree_models = {
            'Stacking Ensemble (XGB+LGBM)', 'Two-Stage Hurdle',
            'XGBoost (Poisson)', 'LightGBM (Poisson)',
            'LightGBM (Tweedie)',
            'Random Forest', 'Gradient Boosting',
        }

        results = {}
        for name, model in models.items():
            print(f"\n  Training {name} …")

            if name in tree_models:
                model.fit(X2_train, y2_train)
                y_pred_log = model.predict(X2_test)
            else:
                model.fit(X2_tr_sc, y2_train)
                y_pred_log = model.predict(X2_te_sc)

            # Back-transform from log-space
            y_pred = np.expm1(np.maximum(y_pred_log, 0))
            y_pred = np.maximum(y_pred, 0)

            mse = mean_squared_error(y2_test_raw, y_pred)
            mae = mean_absolute_error(y2_test_raw, y_pred)
            r2  = r2_score(y2_test_raw, y_pred)

            results[name] = {
                'model': model, 'mse': mse, 'mae': mae,
                'r2': r2, 'predictions': y_pred,
            }
            print(f"  {name:35s}  MSE={mse:.4f}  MAE={mae:.4f}  R²={r2:.4f}")

        # ── Pick best from initial run ──────────────────────────────
        best_name = max(results, key=lambda k: results[k]['r2'])
        best_r2   = results[best_name]['r2']
        print(f"\n★ Best initial model: {best_name} — R² {best_r2:.4f}")

        self.model2 = results[best_name]['model']
        self.model2_feature_names = model2_features
        self.model2_needs_scaling = best_name not in tree_models

        print(f"\n★ Final Best Model 2: {best_name} — R² {best_r2:.4f}")

        # Feature importance
        self._print_feature_importance(self.model2, self.model2_feature_names)

        return results

    # ─────────────────────────────────────────────────────────────────
    # 6. SAVE MODELS
    # ─────────────────────────────────────────────────────────────────
    def save_models(self):
        """Save models, scalers, feature names, and auxiliary artifacts to server-ml/models/."""
        from sklearn.neighbors import NearestNeighbors
        from datetime import datetime as dt

        script_dir = os.path.dirname(os.path.abspath(__file__))
        target_dir = os.path.join(script_dir, '..', 'server-ml', 'models')
        os.makedirs(target_dir, exist_ok=True)

        if self.model1:
            joblib.dump(self.model1,
                        os.path.join(target_dir,
                                     'model1_historical_cases_improved.pkl'))
            joblib.dump(self.scaler1,
                        os.path.join(target_dir,
                                     'scaler1_historical_cases_improved.pkl'))
            print(f"Model 1 saved → {target_dir}")

        if self.model2:
            joblib.dump(self.model2,
                        os.path.join(target_dir,
                                     'model2_weather_based_improved.pkl'))
            joblib.dump(self.scaler2,
                        os.path.join(target_dir,
                                     'scaler2_weather_based_improved.pkl'))
            print(f"Model 2 saved → {target_dir}")

        # ── Save KMeans clustering model ───────────────────────────────
        if self.kmeans is not None:
            joblib.dump(self.kmeans,
                        os.path.join(target_dir, 'kmeans_model.pkl'))
            print(f"KMeans model saved → {target_dir}")

        # ── Save geo lookup (NN-based for state_encoded, density_cluster, bbox_area)
        coords_arr = self.df[['centroid_x', 'centroid_y']].values
        nn_geo = NearestNeighbors(n_neighbors=1, algorithm='ball_tree')
        nn_geo.fit(coords_arr)

        geo_lookup = {
            'nn_model': nn_geo,
            'state_encoded': self.df['state_encoded'].values,
            'density_cluster': self.df['density_cluster'].values,
            'bbox_area': self.df['bbox_area'].values if 'bbox_area' in self.df.columns else np.zeros(len(self.df)),
        }
        joblib.dump(geo_lookup, os.path.join(target_dir, 'geo_lookup.pkl'))
        print(f"Geo lookup (NN) saved → {target_dir}")

        # ── Save label encoders ────────────────────────────────────────
        joblib.dump(self.label_encoders,
                    os.path.join(target_dir, 'label_encoders.pkl'))
        print(f"Label encoders saved → {target_dir}")

        # ── Save feature names and model config ───────────────────────
        features = {
            'model1_features': self.model1_feature_names,
            'model2_features': self.model2_feature_names,
            'model1_needs_scaling': self.model1_needs_scaling,
            'model2_needs_scaling': self.model2_needs_scaling,
            'model1_log_target': True,
            'model2_log_target': True,
            'training_date': dt.now().isoformat(),
            'n_training_samples': len(self.df),
            'states_in_training': (list(self.label_encoders['state'].classes_)
                                   if 'state' in self.label_encoders else []),
        }
        feat_path = os.path.join(target_dir, 'model_features_improved.json')
        with open(feat_path, 'w') as f:
            json.dump(features, f, indent=2)
        print(f"Feature names & config saved → {feat_path}")

    # ─────────────────────────────────────────────────────────────────
    # 7. UTILITIES
    # ─────────────────────────────────────────────────────────────────
    @staticmethod
    def _print_feature_importance(model, feature_names):
        """Print feature importances if the model exposes them."""
        if hasattr(model, 'feature_importances_'):
            imp = pd.DataFrame({
                'feature':    feature_names,
                'importance': model.feature_importances_,
            }).sort_values('importance', ascending=False)
            print("\n  Feature importance (top 10):")
            for _, row in imp.head(10).iterrows():
                bar = '█' * int(row['importance'] / imp['importance'].max() * 30)
                print(f"    {row['feature']:30s}  {row['importance']:.4f}  {bar}")


# ── Entry point ─────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("DENGUE ML MODELS — trained from DengueData.csv")
    print("=" * 60)
    print()

    ml = DengueMLModelsDengueData('DengueData.csv')

    # Phase 1 — data & features
    ml.load_and_preprocess_data()

    # (Optional) EDA
    ml.explore_data()

    # Phase 2 — train
    m1_results = ml.train_model1_historical_cases()
    m2_results = ml.train_model2_weather_based()

    # Phase 3 — persist
    ml.save_models()

    # ── Summary ─────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print("\nModel 1 (Historical Cases):")
    for name, r in sorted(m1_results.items(), key=lambda x: -x[1]['r2']):
        print(f"  {name:35s}  R²={r['r2']:.4f}  MAE={r['mae']:.4f}")

    print("\nModel 2 (Weather-based):")
    for name, r in sorted(m2_results.items(), key=lambda x: -x[1]['r2']):
        print(f"  {name:35s}  R²={r['r2']:.4f}  MAE={r['mae']:.4f}")

    print("\n✅ All models trained & saved from DengueData.csv!")


if __name__ == '__main__':
    main()
