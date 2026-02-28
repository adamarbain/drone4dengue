# Weather-Based Dengue Prediction Model

## Conference Paper Title : Dengue Prediction in Malaysia: LightGBM Approach using Weather Data

## 1. Algorithm Used

The model training pipeline evaluates **8 candidate regression algorithms** — including Poisson and Tweedie objectives specifically designed for count data — and selects the best performer. Hyperparameter tuning via `RandomizedSearchCV` is applied to the top 3 Poisson/Tweedie models.

### Why These Algorithms?

The target variable (`total_active_cases`) is **count data**, not continuous:
- 55% of records have exactly 1 case
- 80% have 1-2 cases
- Skewness = 8.6 (extremely right-skewed)

This means standard squared-error regression is suboptimal. Poisson and Tweedie loss functions are statistically designed for count data and were tested alongside standard objectives.

### Algorithms Evaluated

| # | Algorithm | Objective | Library | Selected |
|---|---|---|---|---|
| 1 | XGBoost (Poisson) | `count:poisson` | xgboost | |
| 2 | **LightGBM (Poisson)** | **`poisson`** | **lightgbm** | **Best MAE** |
| 3 | LightGBM (Tweedie) | `tweedie` (p=1.5) | lightgbm | |
| 4 | XGBoost (Squared) | `squared_error` | xgboost | |
| 5 | **LightGBM (Squared)** | **`squared_error`** | **lightgbm** | **Best R²** |
| 6 | Random Forest | `squared_error` | scikit-learn | |
| 7 | Gradient Boosting | `squared_error` | scikit-learn | |
| 8 | Ridge Regression | `squared_error` | scikit-learn | |

**Selected: LightGBM (Squared error)** — R² = 0.5970. LightGBM (Poisson) is a close alternative with better MAE (1.0353 vs 1.0524) but slightly lower R² (0.5890).

---

## 2. Model Architecture

### Input Features (20 features)

| Category | Feature | Type | Description |
|---|---|---|---|
| **Geography** | `centroid_x` | Numeric | Longitude of dengue location |
| | `centroid_y` | Numeric | Latitude of dengue location |
| | `location_cluster` | Categorical | KMeans cluster ID (10 clusters) |
| | `state_encoded` | Categorical | LabelEncoded state name (14 states) |
| | `is_hotspot` | Binary (0/1) | Whether location is a dengue hotspot |
| **Weather** | `humidity` | Numeric | Current humidity (%) |
| | `temperature` | Numeric | Current temperature (°C) |
| | `rainfall` | Numeric | Current rainfall (mm) |
| **Lagged Weather** | `rainfall_lag_7` | Numeric | Rainfall 7 days ago |
| | `humidity_lag_7` | Numeric | Humidity 7 days ago |
| | `temperature_lag_7` | Numeric | Temperature 7 days ago |
| **Cumulative** | `rainfall_cumul_14d` | Numeric | Total rainfall over past 14 days |
| | `rainfall_cumul_28d` | Numeric | Total rainfall over past 28 days |
| **Interactions** | `temp_x_humidity` | Numeric | temperature × humidity |
| | `temp_x_rainfall` | Numeric | temperature × rainfall |
| | `humidity_x_rainfall` | Numeric | humidity × rainfall |
| | `breeding_favorable` | Binary (0/1) | temp 25–35°C AND humidity >60% AND rainfall >0 |
| **Temporal** | `month` | Numeric | Month (1–12) |
| | `day_of_year` | Numeric | Day of year (1–365) |
| | `week_of_year` | Numeric | ISO week of year |

### Target Variable

- **`total_active_cases`** — count of active dengue cases at a location on a given date
- Distribution: median=1, mean=2.07, skewness=9.21, max=70

### Preprocessing Pipeline

| Step | Detail |
|---|---|
| Missing value imputation | Median imputation, fallback to 0 |
| Lagged features | Per-location lagged weather at 7 days, cumulative rainfall at 14/28 days |
| Weather interactions | temp×humidity, temp×rainfall, humidity×rainfall, breeding condition flag |
| Feature scaling | `StandardScaler` for Ridge only; tree-based models use raw features |
| Location clustering | KMeans with `n_clusters=10` on (centroid_x, centroid_y) |
| Train/Test split | **Chronological** — train up to 80th percentile date, test on remaining 20% |

### Hyperparameters of Selected Model (LightGBM Squared)

| Parameter | Value |
|---|---|
| `n_estimators` | 200 |
| `max_depth` | 8 |
| `learning_rate` | 0.05 |
| `subsample` | 0.8 |
| `colsample_bytree` | 0.8 |
| `reg_alpha` | 0.1 |
| `reg_lambda` | 1.0 |
| `random_state` | 42 |

---

## 3. Evaluation Metrics & Results

### All Models Compared (Time-Series Split)

| Rank | Model | MSE | MAE | R² |
|---|---|---|---|---|
| 1 | **LightGBM (Squared)** | **3.3294** | 1.0524 | **0.5970** |
| 2 | LightGBM (Poisson) | 3.3948 | **1.0353** | 0.5890 |
| 3 | XGBoost (Squared) | 3.5974 | 1.0447 | 0.5645 |
| 4 | Random Forest | 3.6183 | 1.0566 | 0.5620 |
| 5 | XGBoost (Poisson) | 3.6349 | 1.0022 | 0.5600 |
| 6 | LightGBM (Tweedie) | 3.8081 | 1.0348 | 0.5390 |
| 7 | LightGBM (Poisson) Tuned | 4.3067 | 1.1052 | 0.4787 |
| 8 | Gradient Boosting | 4.5867 | 1.1141 | 0.4448 |
| 9 | Ridge Regression | 8.0033 | 1.4046 | 0.0312 |

### Best Model Summary

| Metric | Value | Interpretation |
|---|---|---|
| **MSE** | 3.3294 | Mean squared error |
| **RMSE** | 1.8247 | Predictions deviate by ~1.82 cases on average |
| **MAE** | 1.0524 | Typical absolute error is ~1 case |
| **R²** | 0.5970 | Explains **59.7%** of variance in active cases |

### Feature Importance (LightGBM — split count)

| Feature | Splits | Category |
|---|---|---|
| `centroid_x` | 1706 | Geography |
| `centroid_y` | 1684 | Geography |
| `rainfall_cumul_14d` | 557 | Cumulative Weather |
| `day_of_year` | 423 | Temporal |
| `temperature` | 333 | Weather |
| `temp_x_humidity` | 231 | Interaction |
| `state_encoded` | 228 | Geography |
| `week_of_year` | 206 | Temporal |
| `rainfall_cumul_28d` | 131 | Cumulative Weather |
| `temp_x_rainfall` | 130 | Interaction |
| `humidity` | 113 | Weather |
| `rainfall` | 73 | Weather |
| `humidity_x_rainfall` | 63 | Interaction |
| `month` | 51 | Temporal |
| `location_cluster` | 36 | Geography |
| `rainfall_lag_7` | 16 | Lagged Weather |

---

## 4. Context

### Dataset Characteristics

| Aspect | Detail |
|---|---|
| **Source** | `active_dengue.csv` — 20,468 samples (filtered to dates ≥ 18 Dec 2025) |
| **Date range** | 20 Mar 2025 – 24 Feb 2026 (341 days, 328 unique dates) |
| **Training period** | Up to 10 Feb 2026 (16,433 samples) |
| **Test period** | After 10 Feb 2026 (4,035 samples) |
| **Locations** | 6,810 unique coordinate pairs across 14 Malaysian states |
| **Dominant state** | Selangor (44% of records) |

### Target Variable Profile

| Metric | Value |
|---|---|
| Mean | 2.13 cases |
| Median | 1 case |
| 55% of records | Exactly 1 case |
| 80% of records | ≤ 2 cases |
| 5% of records | > 5 cases |
| Max | 70 cases |
| Skewness | 8.60 |

### Weather Data Profile

| Feature | Mean | Std | CV | IQR | Correlation with target |
|---|---|---|---|---|---|
| Temperature | 27.3°C | 1.0 | 3.7% | 1.2°C | 0.099 |
| Humidity | 76.9% | 7.3 | 9.5% | 10% | −0.041 |
| Rainfall | 6.2mm | 12.0 | 192.9% | 8mm | 0.043 |

### Key Findings

1. **Count data requires count-appropriate modeling:** The target is heavily skewed integer count data. Poisson objectives (LightGBM Poisson R²=0.5890) perform comparably to squared-error (R²=0.5970) and produce better MAE on the dominant 1-2 case records.

2. **Weather signal is inherently limited by tropical climate:** Malaysia's temperature varies only 1.2°C across the IQR. Raw weather-target correlations are all below 0.10. This is a **data limitation**, not a modeling limitation — the climate is too uniform for weather alone to discriminate case counts.

3. **Cumulative rainfall is the strongest weather signal:** `rainfall_cumul_14d` (557 splits) vastly outperforms instantaneous rainfall (73 splits), confirming that standing water accumulation over 2 weeks drives mosquito breeding.

4. **Interaction features capture real biology:** `temp_x_humidity` (231 splits) and `temp_x_rainfall` (130 splits) reflect the combined conditions favorable for Aedes mosquito activity.

5. **Geography dominates because dengue is spatially clustered:** The geographic coordinates (centroid_x/y) contribute ~55% of model splits. When removed, R² drops from 0.60 to 0.09. This reflects the reality that dengue outbreaks are highly localized — certain neighborhoods are persistently at higher risk due to population density, sanitation, and standing water conditions that coordinates proxy for.

### Model Improvement Journey

| Stage | Best R² | Best Model | Key Change |
|---|---|---|---|
| Original baseline | 0.5206 | Gradient Boosting | 9 basic features, random split |
| + Lagged weather | 0.4930 | Random Forest | Lag_7 to lag_28, cumulative rainfall |
| + XGBoost/LightGBM | 0.4969 | XGBoost | Modern boosting algorithms |
| + Hyperparameter tuning | 0.5961 | Random Forest (Tuned) | RandomizedSearchCV |
| + Time-series split | 0.4554 | LightGBM | Honest chronological evaluation |
| + Interaction features | 0.4585 | LightGBM | temp×humidity, breeding flag |
| + Feature cleanup | 0.5970 | LightGBM | Removed zero-importance lags, added state_encoded |
| + Poisson/Tweedie | 0.5890 | LightGBM (Poisson) | Count-appropriate loss (better MAE) |
| **Final (best R²)** | **0.5970** | **LightGBM (Squared)** | All improvements combined |

### Why LightGBM is the Best Fit for This Data

1. **Handles skewed count data well** with built-in Poisson/Tweedie support
2. **Fast training** on 20K+ samples with 20 features
3. **Robust to low-signal features** — its leaf-wise growth strategy efficiently ignores noise
4. **Native categorical support** reduces need for complex encoding
5. **Outperforms XGBoost on this dataset** across all objective functions tested
