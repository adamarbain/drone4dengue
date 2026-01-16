#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Store Dengue Data to Database
Reads active_dengue.csv and dengue_hotspot.csv and stores the latest data
into the production database DengueData table.
"""

import os
import sys
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from urllib.parse import urlparse
import logging
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database URL - can be overridden by DATABASE_URL environment variable
DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_zkRpJ0wqb1Og@ep-blue-scene-a1vazo7s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"  # Replace with your actual database URL

def parse_database_url(db_url):
    """Parse DATABASE_URL into connection parameters."""
    parsed = urlparse(db_url)
    return {
        'host': parsed.hostname,
        'port': parsed.port or 5432,
        'database': parsed.path[1:],  # Remove leading '/'
        'user': parsed.username,
        'password': parsed.password
    }

def get_db_connection(max_retries=3, retry_delay=2):
    """
    Get database connection from DATABASE_URL environment variable or default URL.
    Includes retry logic to handle Neon's pause/resume behavior.
    """
    db_url = os.getenv('DATABASE_URL') or DEFAULT_DATABASE_URL
    
    if not db_url or db_url == "postgresql://user:password@host:port/database":
        raise ValueError("DATABASE_URL environment variable is not set and default URL is not configured. Please set DEFAULT_DATABASE_URL in the script or set DATABASE_URL environment variable.")
    
    for attempt in range(max_retries):
        try:
            conn_params = parse_database_url(db_url)
            conn = psycopg2.connect(**conn_params)
            logger.info("Successfully connected to database")
            return conn
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                logger.warning(f"Failed to connect to database (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"Failed to connect to database after {max_retries} attempts: {e}")
                raise

def parse_date(date_str):
    """Parse date from DD/MM/YYYY format to datetime."""
    try:
        day, month, year = date_str.split('/')
        return datetime(int(year), int(month), int(day))
    except Exception as e:
        logger.warning(f"Failed to parse date '{date_str}': {e}")
        return None

def process_active_dengue_csv(csv_path):
    """Process active_dengue.csv and prepare data for insertion."""
    logger.info(f"Reading {csv_path}...")
    
    try:
        df = pd.read_csv(csv_path)
        logger.info(f"Found {len(df)} rows in active_dengue.csv")
        
        records = []
        for _, row in df.iterrows():
            try:
                date = parse_date(row['date'])
                if not date:
                    continue
                
                record = {
                    'date': date,
                    'location': str(row['location']).strip() if pd.notna(row['location']) else '',
                    'activeCases': int(row['total_active_cases']) if pd.notna(row['total_active_cases']) else 0,
                    'totalCases': None,
                    'days_duration': None,
                    'coverageArea': '',  # Empty string like seed.js
                    'status': 'Active Cases',
                    'source': 'active_dengue',
                    'latitude': float(row['centroid_y']) if pd.notna(row['centroid_y']) else None,
                    'longitude': float(row['centroid_x']) if pd.notna(row['centroid_x']) else None,
                }
                records.append(record)
            except Exception as e:
                logger.warning(f"Error processing row: {e}")
                continue
        
        logger.info(f"Processed {len(records)} valid records from active_dengue.csv")
        return records
        
    except Exception as e:
        logger.error(f"Error reading active_dengue.csv: {e}")
        raise

def process_hotspot_csv(csv_path):
    """Process dengue_hotspot.csv and prepare data for insertion."""
    logger.info(f"Reading {csv_path}...")
    
    try:
        df = pd.read_csv(csv_path)
        logger.info(f"Found {len(df)} rows in dengue_hotspot.csv")
        
        records = []
        seen = set()  # Track duplicates
        
        for _, row in df.iterrows():
            try:
                date = parse_date(row['date'])
                if not date:
                    continue
                
                # Create unique key matching seed.js format: `${dateStr}_${row.total_active_cases}`
                date_str = date.strftime('%Y-%m-%d')
                total_cases = row['total_active_cases'] if pd.notna(row['total_active_cases']) else ''
                key = f"{date_str}_{total_cases}"
                if key in seen:
                    continue
                seen.add(key)
                
                record = {
                    'date': date,
                    'location': str(row['area']).strip() if pd.notna(row['area']) else '',
                    'activeCases': int(row['total_active_cases']) if pd.notna(row['total_active_cases']) else 0,
                    'totalCases': int(row['total_active_cases']) if pd.notna(row['total_active_cases']) else 0,
                    'days_duration': int(row['days_duration']) if pd.notna(row['days_duration']) else None,
                    'coverageArea': '',  # Empty string like seed.js
                    'status': 'Hotspot',
                    'source': 'dengue_hotspot',
                    'latitude': float(row['y']) if pd.notna(row['y']) else None,
                    'longitude': float(row['x']) if pd.notna(row['x']) else None,
                }
                records.append(record)
            except Exception as e:
                logger.warning(f"Error processing row: {e}")
                continue
        
        logger.info(f"Processed {len(records)} valid records from dengue_hotspot.csv")
        return records
        
    except Exception as e:
        logger.error(f"Error reading dengue_hotspot.csv: {e}")
        raise

def upsert_dengue_data(records, conn):
    """Insert or update dengue data records in the database."""
    if not records:
        logger.info("No records to insert")
        return
    
    cur = conn.cursor()
    
    try:
        inserted_count = 0
        updated_count = 0
        skipped_count = 0
        
        insert_query = """
        INSERT INTO "DengueData" (
            id, location, date, "activeCases", "totalCases", 
            "days_duration", "coverageArea", status, source, 
            latitude, longitude, "createdAt", "updatedAt"
        )
        VALUES (
            gen_random_uuid(), %(location)s, %(date)s, %(activeCases)s, %(totalCases)s,
            %(days_duration)s, %(coverageArea)s, %(status)s, %(source)s,
            %(latitude)s, %(longitude)s, NOW(), NOW()
        )
        """
        
        for record in records:
            # Check if record already exists (date, location, source combination)
            check_query = """
            SELECT id FROM "DengueData"
            WHERE date = %s AND location = %s AND source = %s
            LIMIT 1
            """
            cur.execute(check_query, (record['date'], record['location'], record['source']))
            exists = cur.fetchone()
            
            if exists:
                # Update existing record
                update_query = """
                UPDATE "DengueData"
                SET "activeCases" = %(activeCases)s,
                    "totalCases" = %(totalCases)s,
                    "days_duration" = %(days_duration)s,
                    "coverageArea" = %(coverageArea)s,
                    status = %(status)s,
                    latitude = %(latitude)s,
                    longitude = %(longitude)s,
                    "updatedAt" = NOW()
                WHERE date = %(date)s AND location = %(location)s AND source = %(source)s
                """
                cur.execute(update_query, record)
                updated_count += 1
            else:
                # Insert new record
                cur.execute(insert_query, record)
                inserted_count += 1
        
        conn.commit()
        logger.info(f"Successfully processed {len(records)} records: {inserted_count} inserted, {updated_count} updated, {skipped_count} skipped")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error upserting data: {e}")
        raise
    finally:
        cur.close()

def process_and_store_csv(csv_path, process_func, description):
    """
    Process a CSV file and store it in the database using a fresh connection.
    This prevents idle connection timeouts with Neon's free tier.
    """
    try:
        # Process CSV file (no database connection needed)
        records = process_func(csv_path)
        
        if not records:
            logger.info(f"No records to process from {description}")
            return
        
        # Open a fresh connection for database operations
        conn = get_db_connection()
        try:
            upsert_dengue_data(records, conn)
            logger.info(f"Successfully stored {description} to database")
        finally:
            conn.close()
            logger.info(f"Database connection closed after processing {description}")
            
    except Exception as e:
        logger.error(f"Error processing {description}: {e}")
        raise

def main():
    """Main function to process CSV files and store data in database."""
    try:
        # Get current script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        active_dengue_csv = os.path.join(script_dir, 'active_dengue.csv')
        hotspot_csv = os.path.join(script_dir, 'dengue_hotspot.csv')
        
        # Check if CSV files exist
        if not os.path.exists(active_dengue_csv):
            logger.error(f"File not found: {active_dengue_csv}")
            sys.exit(1)
        
        if not os.path.exists(hotspot_csv):
            logger.error(f"File not found: {hotspot_csv}")
            sys.exit(1)
        
        # Process each CSV file with its own database connection
        # This prevents idle connection timeouts with Neon's free tier
        process_and_store_csv(active_dengue_csv, process_active_dengue_csv, "active_dengue.csv")
        
        # Process second CSV file with a fresh connection
        # Even if there's a delay, the connection will be fresh
        process_and_store_csv(hotspot_csv, process_hotspot_csv, "dengue_hotspot.csv")
        
        logger.info("Successfully stored all dengue data to database")
            
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

