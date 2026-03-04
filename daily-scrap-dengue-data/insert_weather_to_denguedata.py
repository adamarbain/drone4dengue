#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insert Weather Data into DengueData.csv

This script reads weather data (humidity, temperature, rainfall) from
active_dengue.csv and dengue_hotspot.csv, then merges it into DengueData.csv.

Matching Strategy:
  1. PRIMARY: Match by location name + date
  2. FALLBACK: Match by rounded coordinates (lat/lon to 3 decimal places) + date

For duplicate entries in source files (same location+date), weather values are
averaged to get the most representative reading.

Author: Auto-generated
"""

import pandas as pd
import numpy as np
import logging
import os
import sys
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# File paths (relative to script directory)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DENGUE_DATA_CSV = os.path.join(SCRIPT_DIR, 'DengueData.csv')
ACTIVE_DENGUE_CSV = os.path.join(SCRIPT_DIR, 'active_dengue.csv')
DENGUE_HOTSPOT_CSV = os.path.join(SCRIPT_DIR, 'dengue_hotspot.csv')
OUTPUT_CSV = os.path.join(SCRIPT_DIR, 'DengueData.csv')  # Overwrite in-place
BACKUP_CSV = os.path.join(SCRIPT_DIR, 'DengueData_backup.csv')


def load_dengue_data():
    """Load DengueData.csv."""
    logger.info(f"Loading DengueData.csv...")
    df = pd.read_csv(DENGUE_DATA_CSV)
    logger.info(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
    logger.info(f"  Columns: {list(df.columns)}")

    # Normalize date to YYYY-MM-DD string for matching
    df['match_date'] = df['date'].str[:10]

    return df


def load_active_dengue():
    """Load and prepare active_dengue.csv weather data."""
    logger.info(f"Loading active_dengue.csv...")
    df = pd.read_csv(ACTIVE_DENGUE_CSV)
    logger.info(f"  Loaded {len(df)} rows")

    # Parse date from DD/MM/YYYY to YYYY-MM-DD
    df['match_date'] = pd.to_datetime(df['date'], format='%d/%m/%Y').dt.strftime('%Y-%m-%d')

    # Rename columns for consistency
    df = df.rename(columns={
        'location': 'match_location',
        'centroid_x': 'lon',
        'centroid_y': 'lat',
    })

    # Select only needed columns
    weather_cols = ['match_location', 'match_date', 'lat', 'lon', 'humidity', 'temperature', 'rainfall']
    df = df[weather_cols].copy()

    return df


def load_dengue_hotspot():
    """Load and prepare dengue_hotspot.csv weather data."""
    logger.info(f"Loading dengue_hotspot.csv...")
    df = pd.read_csv(DENGUE_HOTSPOT_CSV)
    logger.info(f"  Loaded {len(df)} rows")

    # Parse date from DD/MM/YYYY to YYYY-MM-DD
    df['match_date'] = pd.to_datetime(df['date'], format='%d/%m/%Y').dt.strftime('%Y-%m-%d')

    # Rename columns for consistency (x=longitude, y=latitude)
    df = df.rename(columns={
        'area': 'match_location',
        'x': 'lon',
        'y': 'lat',
    })

    # Select only needed columns
    weather_cols = ['match_location', 'match_date', 'lat', 'lon', 'humidity', 'temperature', 'rainfall']
    df = df[weather_cols].copy()

    return df


def create_weather_lookup(source_df):
    """
    Create a deduplicated weather lookup from source data.

    For duplicate entries (same location + date), we take the mean of weather values
    to get the most representative reading.

    Returns:
        - loc_date_lookup: dict of (location, date) -> (humidity, temperature, rainfall)
        - coord_date_lookup: dict of (lat_round, lon_round, date) -> (humidity, temperature, rainfall)
    """
    # Deduplicate by location + date, averaging weather values
    loc_date_agg = source_df.groupby(['match_location', 'match_date']).agg({
        'humidity': 'mean',
        'temperature': 'mean',
        'rainfall': 'mean',
        'lat': 'first',
        'lon': 'first',
    }).reset_index()

    # Build location+date lookup dict
    loc_date_lookup = {}
    for _, row in loc_date_agg.iterrows():
        key = (row['match_location'], row['match_date'])
        loc_date_lookup[key] = (row['humidity'], row['temperature'], row['rainfall'])

    # Build coordinate+date lookup dict (rounded to 3 decimal places)
    coord_date_agg = source_df.copy()
    coord_date_agg['lat_round'] = coord_date_agg['lat'].round(3)
    coord_date_agg['lon_round'] = coord_date_agg['lon'].round(3)
    coord_grouped = coord_date_agg.groupby(['lat_round', 'lon_round', 'match_date']).agg({
        'humidity': 'mean',
        'temperature': 'mean',
        'rainfall': 'mean',
    }).reset_index()

    coord_date_lookup = {}
    for _, row in coord_grouped.iterrows():
        key = (row['lat_round'], row['lon_round'], row['match_date'])
        coord_date_lookup[key] = (row['humidity'], row['temperature'], row['rainfall'])

    return loc_date_lookup, coord_date_lookup


def merge_weather_data(dengue_df, active_df, hotspot_df):
    """
    Merge weather data into DengueData DataFrame.

    Matching priority:
      1. Location name + date (exact match)
      2. Coordinates (rounded) + date (fallback)
    """
    logger.info("Building weather lookup tables...")

    # Create lookup tables for each source
    active_loc_lookup, active_coord_lookup = create_weather_lookup(active_df)
    hotspot_loc_lookup, hotspot_coord_lookup = create_weather_lookup(hotspot_df)

    logger.info(f"  Active dengue lookups: {len(active_loc_lookup)} location+date, {len(active_coord_lookup)} coord+date")
    logger.info(f"  Hotspot lookups: {len(hotspot_loc_lookup)} location+date, {len(hotspot_coord_lookup)} coord+date")

    # Initialize weather columns
    humidity_values = []
    temperature_values = []
    rainfall_values = []

    # Counters for reporting
    matched_by_location = 0
    matched_by_coords = 0
    unmatched = 0
    total = len(dengue_df)

    logger.info(f"Matching {total} DengueData rows to weather data...")

    for idx, row in dengue_df.iterrows():
        source = row['source']
        location = row['location']
        match_date = row['match_date']
        lat = row['latitude']
        lon = row['longitude']

        weather = None

        # Select the right lookup based on source
        if source == 'active_dengue':
            loc_lookup = active_loc_lookup
            coord_lookup = active_coord_lookup
        elif source == 'dengue_hotspot':
            loc_lookup = hotspot_loc_lookup
            coord_lookup = hotspot_coord_lookup
        else:
            # Unknown source - try both
            loc_lookup = {**hotspot_loc_lookup, **active_loc_lookup}
            coord_lookup = {**hotspot_coord_lookup, **active_coord_lookup}

        # Strategy 1: Match by location + date
        key_loc = (location, match_date)
        if key_loc in loc_lookup:
            weather = loc_lookup[key_loc]
            matched_by_location += 1

        # Strategy 2: Match by coordinates + date (fallback)
        if weather is None and pd.notna(lat) and pd.notna(lon):
            lat_round = round(float(lat), 3)
            lon_round = round(float(lon), 3)
            key_coord = (lat_round, lon_round, match_date)
            if key_coord in coord_lookup:
                weather = coord_lookup[key_coord]
                matched_by_coords += 1

        if weather is not None:
            humidity_values.append(round(weather[0], 2))
            temperature_values.append(round(weather[1], 2))
            rainfall_values.append(round(weather[2], 2))
        else:
            humidity_values.append(None)
            temperature_values.append(None)
            rainfall_values.append(None)
            unmatched += 1

    # Add weather columns to DataFrame
    dengue_df['humidity'] = humidity_values
    dengue_df['temperature'] = temperature_values
    dengue_df['rainfall'] = rainfall_values

    # Report
    logger.info("=" * 60)
    logger.info("MATCHING RESULTS:")
    logger.info(f"  Total rows:                {total}")
    logger.info(f"  Matched by location+date:  {matched_by_location} ({matched_by_location/total*100:.1f}%)")
    logger.info(f"  Matched by coords+date:    {matched_by_coords} ({matched_by_coords/total*100:.1f}%)")
    logger.info(f"  Total matched:             {matched_by_location + matched_by_coords} ({(matched_by_location + matched_by_coords)/total*100:.1f}%)")
    logger.info(f"  Unmatched (no weather):    {unmatched} ({unmatched/total*100:.1f}%)")
    logger.info("=" * 60)

    return dengue_df


def save_result(dengue_df):
    """Save the merged DataFrame back to CSV."""
    # Remove temporary matching column
    dengue_df = dengue_df.drop(columns=['match_date'], errors='ignore')

    # Create backup of original
    if os.path.exists(DENGUE_DATA_CSV):
        logger.info(f"Creating backup at {BACKUP_CSV}...")
        import shutil
        shutil.copy2(DENGUE_DATA_CSV, BACKUP_CSV)

    # Save with same formatting as original
    logger.info(f"Saving updated DengueData.csv ({len(dengue_df)} rows, {len(dengue_df.columns)} columns)...")
    dengue_df.to_csv(OUTPUT_CSV, index=False, quoting=1)  # quoting=1 = QUOTE_ALL to match original format
    logger.info("Done! Weather data has been inserted into DengueData.csv")

    # Summary of new columns
    for col in ['humidity', 'temperature', 'rainfall']:
        non_null = dengue_df[col].notna().sum()
        logger.info(f"  {col}: {non_null}/{len(dengue_df)} values populated ({non_null/len(dengue_df)*100:.1f}%)")


def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("INSERT WEATHER DATA INTO DengueData.csv")
    logger.info("=" * 60)

    # Validate input files exist
    for fpath, label in [(DENGUE_DATA_CSV, 'DengueData.csv'),
                         (ACTIVE_DENGUE_CSV, 'active_dengue.csv'),
                         (DENGUE_HOTSPOT_CSV, 'dengue_hotspot.csv')]:
        if not os.path.exists(fpath):
            logger.error(f"File not found: {fpath}")
            sys.exit(1)

    # Check if DengueData.csv already has weather columns
    dengue_df = load_dengue_data()
    existing_weather_cols = [c for c in ['humidity', 'temperature', 'rainfall'] if c in dengue_df.columns]
    if existing_weather_cols:
        logger.warning(f"DengueData.csv already has weather columns: {existing_weather_cols}")
        response = input("Do you want to overwrite existing weather data? (y/N): ").strip().lower()
        if response != 'y':
            logger.info("Aborted by user.")
            sys.exit(0)
        # Drop existing weather columns to re-merge
        dengue_df = dengue_df.drop(columns=existing_weather_cols)

    # Load source files
    active_df = load_active_dengue()
    hotspot_df = load_dengue_hotspot()

    # Merge weather data
    dengue_df = merge_weather_data(dengue_df, active_df, hotspot_df)

    # Save result
    save_result(dengue_df)

    logger.info("Script completed successfully!")


if __name__ == '__main__':
    main()
