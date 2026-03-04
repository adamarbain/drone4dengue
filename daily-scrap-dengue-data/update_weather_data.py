# -*- coding: utf-8 -*-
"""
Update weather data in dengue CSV files using Open-Meteo Historical Forecast API.
Calls API once per row and updates each row immediately.
Updates active_dengue.csv and dengue_hotspot.csv in both daily-scrap-dengue-data and server-ml/models.
"""

import os
import time
import requests
import pandas as pd
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DAILY_SCRAP_DIR = SCRIPT_DIR
SERVER_ML_DIR = os.path.join(SCRIPT_DIR, "..", "server-ml", "models")

WEATHER_COLUMNS = [
    "humidity",
    "temperature",
    "rainfall",
    "weather_code",
    "apparent_temperature_mean",
    "rain_sum",
]

API_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"
DAILY_VARIABLES = [
    "temperature_2m_mean",
    "relative_humidity_2m_mean",
    "precipitation_sum",
    "weather_code",
    "apparent_temperature_mean",
    "rain_sum",
]

# Delay between API calls (seconds) to avoid 429 Too Many Requests
REQUEST_DELAY_SECONDS = 0.5
# On 429, wait this many seconds before retry
RATE_LIMIT_BACKOFF_SECONDS = 60


def parse_date_ddmmyyyy(date_str):
    """Convert DD/MM/YYYY to YYYY-MM-DD."""
    try:
        dt = datetime.strptime(str(date_str).strip(), "%d/%m/%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def fetch_weather_for_row(latitude, longitude, date_iso, timezone="Asia/Singapore", max_retries=5):
    """
    Fetch historical weather for a single (lat, lon, date) from Open-Meteo.
    Returns dict with keys: temperature, humidity, rainfall, weather_code, apparent_temperature_mean, rain_sum.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": date_iso,
        "end_date": date_iso,
        "daily": ",".join(DAILY_VARIABLES),
        "models": "best_match",
        "timezone": timezone,
    }

    for attempt in range(max_retries):
        try:
            response = requests.get(API_URL, params=params, timeout=60)
            if response.status_code == 429:
                wait = RATE_LIMIT_BACKOFF_SECONDS * (attempt + 1)
                print(f"  429 Too Many Requests — waiting {wait}s before retry {attempt + 1}/{max_retries}")
                time.sleep(wait)
                continue
            response.raise_for_status()
            data = response.json()

            if "daily" not in data:
                return None

            daily = data["daily"]
            times = daily.get("time", [])
            if not times:
                return None

            i = 0
            row_data = {}
            if "temperature_2m_mean" in daily and i < len(daily["temperature_2m_mean"]):
                row_data["temperature"] = daily["temperature_2m_mean"][i]
            if "relative_humidity_2m_mean" in daily and i < len(daily["relative_humidity_2m_mean"]):
                row_data["humidity"] = daily["relative_humidity_2m_mean"][i]
            if "precipitation_sum" in daily and i < len(daily["precipitation_sum"]):
                row_data["rainfall"] = daily["precipitation_sum"][i]
            if "weather_code" in daily and i < len(daily["weather_code"]):
                row_data["weather_code"] = daily["weather_code"][i]
            if "apparent_temperature_mean" in daily and i < len(daily["apparent_temperature_mean"]):
                row_data["apparent_temperature_mean"] = daily["apparent_temperature_mean"][i]
            if "rain_sum" in daily and i < len(daily["rain_sum"]):
                row_data["rain_sum"] = daily["rain_sum"][i]

            return row_data

        except requests.exceptions.Timeout:
            print(f"  API timeout attempt {attempt + 1}/{max_retries} for lat={latitude}, lon={longitude}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                return None
        except requests.exceptions.RequestException as e:
            print(f"  API request failed for lat={latitude}, lon={longitude}: {e}")
            return None
        except Exception as e:
            print(f"  Error for lat={latitude}, lon={longitude}: {e}")
            return None
    return None


def ensure_weather_columns(df):
    """Add missing weather columns to DataFrame."""
    for col in WEATHER_COLUMNS:
        if col not in df.columns:
            df[col] = None
    return df


def process_csv_pair(file_paths, lon_col, lat_col):
    """
    Process a pair of CSV files: for each row, call API, update row, then save both files.
    """
    source_path = file_paths[0]
    if not os.path.exists(source_path):
        print(f"Skipping {source_path} (not found)")
        return

    print(f"\nProcessing {source_path}...")
    df = pd.read_csv(source_path)
    df = ensure_weather_columns(df)

    date_col = "date"
    if date_col not in df.columns:
        print("  No 'date' column, skipping")
        return

    total = len(df)
    for idx in reversed(df.index):
        row = df.loc[idx]
        lat = row[lat_col]
        lon = row[lon_col]
        date_str = row[date_col]
        date_iso = parse_date_ddmmyyyy(date_str)
        if date_iso is None:
            continue

        row_num = idx + 1
        weather = fetch_weather_for_row(float(lat), float(lon), date_iso)
        if weather:
            for col, val in weather.items():
                if col in df.columns:
                    df.at[idx, col] = val
            print(f"  Row {row_num}/{total} updated: ({lat}, {lon}) {date_str} -> temp={weather.get('temperature')}, humidity={weather.get('humidity')}, rainfall={weather.get('rainfall')}")
        else:
            print(f"  Row {row_num}/{total} skipped (no data): ({lat}, {lon}) {date_str}")

        time.sleep(REQUEST_DELAY_SECONDS)

    for file_path in file_paths:
        df.to_csv(file_path, index=False)
        print(f"  Saved {file_path}")


def main():
    print("Updating weather data in dengue CSV files (one API call per row)...")
    active_dengue_paths = [
        os.path.join(DAILY_SCRAP_DIR, "active_dengue.csv"),
    ]
    dengue_hotspot_paths = [
        os.path.join(DAILY_SCRAP_DIR, "dengue_hotspot.csv"),
    ]
    process_csv_pair(active_dengue_paths, "centroid_x", "centroid_y")
    process_csv_pair(dengue_hotspot_paths, "x", "y")
    print("\nDone.")


if __name__ == "__main__":
    main()
