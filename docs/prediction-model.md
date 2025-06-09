# 🧠 Dengue Prediction Models – Drone4Dengue

Drone4Dengue uses two ML models to forecast outbreak risk:

---

## 1. DengueTrendPredictor

**Type**: Supervised ML (e.g., XGBoost/Random Forest)
**Input**: Historical dengue case data

### Input Features:

* Week number / date
* Case count (past 3–5 weeks)
* Region code

### Output:

```json
{
  "risk_level": "High",
  "confidence": 0.89
}
```

### Usage:

* Supports report generation, prediction overview dashboard
* Triggered via `/prediction` endpoint

---

## 2. DengueClimatePredictor

**Type**: Regression + Classification
**Input**: Meteorological data + location

### Input Features:

* Temperature (°C)
* Humidity (%)
* Rainfall (mm)
* District / Region

### Output:

```json
{
  "risk_level": "Medium",
  "confidence": 0.74,
  "recommended_actions": ["fogging", "eliminate standing water"]
}
```

### Usage:

* Used by the `/alerts` and `/notifications` modules
* Powered by uploaded weather data via admin dashboard

---

## Service Integration

* Both models run in a Flask server at `http://localhost:5000`
* Backend makes a POST request to `/predict`

Example request:

```json
{
  "temperature": 29.5,
  "humidity": 85,
  "rainfall": 11.2
}
```

---

## Notes:

* Models must be retrained periodically with updated datasets
* Admins can upload case and weather data via UI (UC8, UC14)
