#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bulk Reverse Geocoding for Dengue Data
=====================================

This script performs bulk reverse geocoding on DengueData records using 
OpenStreetMap Nominatim API with proper rate limiting and resumability.

Features:
- Rate limiting to respect Nominatim's free tier (1-2 seconds between calls)
- Batch processing with progress tracking
- Resumable processing (can continue from where it left off)
- Error handling and retry logic
- Detailed logging and progress reporting

Author: AI Assistant
Date: 2026-01-15
"""

import os
import sys
import time
import json
import logging
import requests
import psycopg2
from urllib.parse import urlparse
from datetime import datetime
from typing import Optional, Dict, List, Tuple

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('progress.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class NominatimReverseGeocoder:
    """
    Handles reverse geocoding using OpenStreetMap Nominatim API
    """
    
    def __init__(self, delay_seconds: float = 1.5):
        """
        Initialize the reverse geocoder
        
        Args:
            delay_seconds: Delay between API calls to respect rate limits
        """
        self.delay_seconds = delay_seconds
        self.base_url = "https://nominatim.openstreetmap.org/reverse"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Drone4Dengue-ReverseGeocoding/1.0 (https://github.com/yourusername/drone4dengue)'
        })
        self.last_request_time = 0
        
    def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict]:
        """
        Perform reverse geocoding for given coordinates
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            Dictionary with address components or None if failed
        """
        # Respect rate limiting
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.delay_seconds:
            sleep_time = self.delay_seconds - time_since_last
            time.sleep(sleep_time)
        
        try:
            params = {
                'format': 'json',
                'lat': latitude,
                'lon': longitude,
                'addressdetails': 1,
                'extratags': 1,
                'namedetails': 1,
                'zoom': 18  # Highest detail level
            }
            
            response = self.session.get(self.base_url, params=params, timeout=30)
            self.last_request_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_nominatim_response(data)
            elif response.status_code == 429:
                logger.warning(f"Rate limited. Waiting 60 seconds...")
                time.sleep(60)
                return self.reverse_geocode(latitude, longitude)  # Retry
            else:
                logger.error(f"Nominatim API error: {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout for coordinates {latitude}, {longitude}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error for {latitude}, {longitude}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error for {latitude}, {longitude}: {e}")
            return None
    
    def _parse_nominatim_response(self, data: Dict) -> Dict:
        """
        Parse Nominatim response and extract relevant address components
        
        Args:
            data: Raw Nominatim response
            
        Returns:
            Parsed address components
        """
        address = data.get('address', {})
        
        # Extract bounding box
        bounding_box = None
        if 'boundingbox' in data:
            bbox = data['boundingbox']
            if len(bbox) == 4:
                # Nominatim returns [south, north, west, east]
                bounding_box = [float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])]
        
        # Map Nominatim fields to our schema
        result = {
            'country': address.get('country'),
            'state': address.get('state') or address.get('region'),
            'district': address.get('county') or address.get('state_district'),
            'city': (address.get('city') or 
                    address.get('town') or 
                    address.get('municipality') or 
                    address.get('village')),
            'suburb': (address.get('suburb') or 
                      address.get('neighbourhood') or 
                      address.get('quarter')),
            'postcode': address.get('postcode'),
            'road': address.get('road') or address.get('street'),
            'houseNumber': address.get('house_number'),
            'boundingBox': bounding_box,
            'displayName': data.get('display_name')
        }
        
        # Clean up None values and empty strings
        result = {k: v for k, v in result.items() if v is not None and str(v).strip()}
        
        return result

class DengueDataGeocoder:
    """
    Main class for bulk reverse geocoding of DengueData records
    """
    
    def __init__(self, database_url: str, batch_size: int = 100, delay_seconds: float = 1.5):
        """
        Initialize the bulk geocoder
        
        Args:
            database_url: PostgreSQL database connection URL
            batch_size: Number of records to process per batch
            delay_seconds: Delay between API calls
        """
        self.database_url = database_url
        self.batch_size = batch_size
        self.geocoder = NominatimReverseGeocoder(delay_seconds)
        self.conn = None
        
    def connect_database(self):
        """Connect to the PostgreSQL database"""
        try:
            parsed = urlparse(self.database_url)
            conn_params = {
                'host': parsed.hostname,
                'port': parsed.port or 5432,
                'database': parsed.path[1:],
                'user': parsed.username,
                'password': parsed.password
            }
            self.conn = psycopg2.connect(**conn_params)
            logger.info("Successfully connected to database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def get_records_to_geocode(self, resume_from_id: Optional[str] = None) -> List[Tuple]:
        """
        Get records that need reverse geocoding
        
        Args:
            resume_from_id: Optional ID to resume processing from
            
        Returns:
            List of tuples (id, latitude, longitude)
        """
        cursor = self.conn.cursor()
        
        try:
            base_query = """
                SELECT id, latitude, longitude, location
                FROM "DengueData"
                WHERE latitude IS NOT NULL 
                  AND longitude IS NOT NULL 
                  AND "isGeocoded" = FALSE
            """
            
            if resume_from_id:
                # First try to find records with id > resume_from_id
                query = base_query + " AND id > %s ORDER BY id LIMIT %s"
                cursor.execute(query, (resume_from_id, self.batch_size))
                records = cursor.fetchall()
                
                # If no records found with id > resume_from_id, check if there are any pending records
                if len(records) == 0:
                    # Check if there are any pending records at all
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM "DengueData"
                        WHERE latitude IS NOT NULL 
                          AND longitude IS NOT NULL 
                          AND "isGeocoded" = FALSE
                    """)
                    pending_count = cursor.fetchone()[0]
                    
                    if pending_count > 0:
                        # There are pending records, but none with id > resume_from_id
                        # This means resume_from_id is past all pending records
                        # Fall back to processing from the beginning
                        logger.warning(f"No records found with id > {resume_from_id}, but {pending_count} pending records exist. "
                                     f"Resuming from the beginning of pending records.")
                        query = base_query + " ORDER BY id LIMIT %s"
                        cursor.execute(query, (self.batch_size,))
                        records = cursor.fetchall()
                    else:
                        # No pending records at all
                        logger.info("No pending records found")
            else:
                query = base_query + " ORDER BY id LIMIT %s"
                cursor.execute(query, (self.batch_size,))
                records = cursor.fetchall()
            
            logger.info(f"Found {len(records)} records to geocode")
            return records
            
        except Exception as e:
            logger.error(f"Error fetching records: {e}")
            return []
        finally:
            cursor.close()
    
    def update_record(self, record_id: str, geocode_data: Dict, success: bool = True, error: str = None):
        """
        Update a record with geocoding results
        
        Args:
            record_id: ID of the record to update
            geocode_data: Geocoding results dictionary
            success: Whether geocoding was successful
            error: Error message if geocoding failed
        """
        cursor = self.conn.cursor()
        
        try:
            if success and geocode_data:
                update_query = """
                    UPDATE "DengueData"
                    SET country = %s,
                        state = %s,
                        district = %s,
                        city = %s,
                        suburb = %s,
                        postcode = %s,
                        road = %s,
                        "houseNumber" = %s,
                        "boundingBox" = %s,
                        "displayName" = %s,
                        "isGeocoded" = TRUE,
                        "geocodedAt" = NOW(),
                        "geocodeError" = NULL,
                        "updatedAt" = NOW()
                    WHERE id = %s
                """
                
                cursor.execute(update_query, (
                    geocode_data.get('country'),
                    geocode_data.get('state'),
                    geocode_data.get('district'),
                    geocode_data.get('city'),
                    geocode_data.get('suburb'),
                    geocode_data.get('postcode'),
                    geocode_data.get('road'),
                    geocode_data.get('houseNumber'),
                    json.dumps(geocode_data.get('boundingBox')) if geocode_data.get('boundingBox') else None,
                    geocode_data.get('displayName'),
                    record_id
                ))
            else:
                # Mark as geocoded with error
                error_query = """
                    UPDATE "DengueData"
                    SET "isGeocoded" = TRUE,
                        "geocodedAt" = NOW(),
                        "geocodeError" = %s,
                        "updatedAt" = NOW()
                    WHERE id = %s
                """
                cursor.execute(error_query, (error or "Unknown geocoding error", record_id))
            
            self.conn.commit()
            
        except Exception as e:
            logger.error(f"Error updating record {record_id}: {e}")
            self.conn.rollback()
        finally:
            cursor.close()
    
    def get_progress_stats(self) -> Dict:
        """Get current progress statistics"""
        cursor = self.conn.cursor()
        
        try:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN "isGeocoded" = TRUE THEN 1 END) as geocoded_records,
                    COUNT(CASE WHEN "isGeocoded" = FALSE AND latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as pending_records,
                    COUNT(CASE WHEN "geocodeError" IS NOT NULL THEN 1 END) as error_records
                FROM "DengueData"
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            """)
            
            result = cursor.fetchone()
            return {
                'total_records': result[0],
                'geocoded_records': result[1],
                'pending_records': result[2],
                'error_records': result[3]
            }
            
        except Exception as e:
            logger.error(f"Error getting progress stats: {e}")
            return {}
        finally:
            cursor.close()
    
    def process_batch(self, resume_from_id: Optional[str] = None) -> Tuple[int, str]:
        """
        Process a batch of records
        
        Args:
            resume_from_id: Optional ID to resume from
            
        Returns:
            Tuple of (processed_count, last_processed_id)
        """
        records = self.get_records_to_geocode(resume_from_id)
        
        if not records:
            logger.info("No more records to process")
            return 0, None
        
        processed_count = 0
        last_processed_id = None
        
        for record_id, latitude, longitude, location in records:
            try:
                logger.info(f"Processing record {record_id}: {location} ({latitude}, {longitude})")
                
                # Perform reverse geocoding
                geocode_data = self.geocoder.reverse_geocode(latitude, longitude)
                
                if geocode_data:
                    self.update_record(record_id, geocode_data, success=True)
                    logger.info(f"[OK] Successfully geocoded {record_id}: {geocode_data.get('displayName', 'N/A')}")
                else:
                    self.update_record(record_id, {}, success=False, error="No geocoding data returned")
                    logger.warning(f"[FAIL] Failed to geocode {record_id}")
                
                processed_count += 1
                last_processed_id = record_id
                
                # Log progress every 10 records
                if processed_count % 10 == 0:
                    stats = self.get_progress_stats()
                    logger.info(f"Progress: {processed_count}/{len(records)} in batch, "
                              f"Total: {stats.get('geocoded_records', 0)}/{stats.get('total_records', 0)} overall")
                
            except Exception as e:
                logger.error(f"Error processing record {record_id}: {e}")
                self.update_record(record_id, {}, success=False, error=str(e))
                processed_count += 1
                last_processed_id = record_id
        
        return processed_count, last_processed_id
    
    def run_bulk_geocoding(self, resume_from_id: Optional[str] = None):
        """
        Run the complete bulk geocoding process
        
        Args:
            resume_from_id: Optional ID to resume processing from
        """
        logger.info("="*60)
        logger.info("STARTING BULK REVERSE GEOCODING")
        logger.info("="*60)
        
        start_time = datetime.now()
        total_processed = 0
        current_resume_id = resume_from_id
        
        # Initial progress stats
        initial_stats = self.get_progress_stats()
        logger.info(f"Initial state: {initial_stats}")
        
        try:
            while True:
                batch_start = time.time()
                processed_count, last_id = self.process_batch(current_resume_id)
                batch_time = time.time() - batch_start
                
                if processed_count == 0:
                    break
                
                total_processed += processed_count
                current_resume_id = last_id
                
                # Progress update
                current_stats = self.get_progress_stats()
                logger.info(f"Batch completed: {processed_count} records in {batch_time:.1f}s")
                logger.info(f"Overall progress: {current_stats.get('geocoded_records', 0)}/{current_stats.get('total_records', 0)} "
                          f"({current_stats.get('pending_records', 0)} remaining)")
                
                # Estimate completion time
                if total_processed > 0:
                    elapsed_time = (datetime.now() - start_time).total_seconds()
                    avg_time_per_record = elapsed_time / total_processed
                    remaining_records = current_stats.get('pending_records', 0)
                    estimated_remaining_time = remaining_records * avg_time_per_record
                    
                    logger.info(f"Estimated time remaining: {estimated_remaining_time/3600:.1f} hours")
                
                # Small break between batches
                time.sleep(2)
        
        except KeyboardInterrupt:
            logger.info("Process interrupted by user")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            # Final statistics
            final_stats = self.get_progress_stats()
            total_time = (datetime.now() - start_time).total_seconds()
            
            logger.info("="*60)
            logger.info("BULK REVERSE GEOCODING COMPLETED")
            logger.info("="*60)
            logger.info(f"Total processing time: {total_time/3600:.2f} hours")
            logger.info(f"Records processed in this run: {total_processed}")
            logger.info(f"Final statistics: {final_stats}")
            
            if current_resume_id:
                logger.info(f"To resume from where left off, use resume_from_id: {current_resume_id}")

def main():
    """Main function"""
    # Get configuration from environment variables
    database_url = "postgresql://neondb_owner:npg_zkRpJ0wqb1Og@ep-blue-scene-a1vazo7s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    # database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        sys.exit(1)
    
    batch_size = int(os.getenv('BATCH_SIZE', '100'))
    delay_seconds = float(os.getenv('DELAY_SECONDS', '1.5'))
    resume_from_id = os.getenv('RESUME_FROM_ID', '').strip() or None
    
    logger.info(f"Configuration:")
    logger.info(f"  Batch size: {batch_size}")
    logger.info(f"  Delay between calls: {delay_seconds}s")
    logger.info(f"  Resume from ID: {resume_from_id or 'Start from beginning'}")
    
    # Initialize and run geocoder
    geocoder = DengueDataGeocoder(database_url, batch_size, delay_seconds)
    
    try:
        geocoder.connect_database()
        geocoder.run_bulk_geocoding(resume_from_id)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
    finally:
        if geocoder.conn:
            geocoder.conn.close()
            logger.info("Database connection closed")

if __name__ == "__main__":
    main()