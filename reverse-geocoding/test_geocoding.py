#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Script for Reverse Geocoding
=================================

This script tests the reverse geocoding functionality with sample Malaysian coordinates.
Use this to validate the implementation before running on the full dataset.

Usage:
    python test_geocoding.py
"""

import sys
import os
import time
from bulk_reverse_geocode import NominatimReverseGeocoder

def test_sample_coordinates():
    """Test reverse geocoding with sample Malaysian coordinates"""
    
    # Sample coordinates from Malaysia
    test_coordinates = [
        (3.1390, 101.6869, "Kuala Lumpur City Center"),
        (3.0738, 101.5183, "Shah Alam, Selangor"),
        (5.4164, 100.3327, "Georgetown, Penang"),
        (1.4927, 103.7414, "Johor Bahru, Johor"),
        (3.8077, 103.3260, "Kuantan, Pahang")
    ]
    
    print("="*60)
    print("TESTING REVERSE GEOCODING")
    print("="*60)
    
    geocoder = NominatimReverseGeocoder(delay_seconds=2.0)  # Slower for testing
    
    for i, (lat, lon, description) in enumerate(test_coordinates, 1):
        print(f"\n{i}. Testing: {description}")
        print(f"   Coordinates: {lat}, {lon}")
        
        try:
            result = geocoder.reverse_geocode(lat, lon)
            
            if result:
                print("   ✅ SUCCESS!")
                print(f"   Country: {result.get('country', 'N/A')}")
                print(f"   State: {result.get('state', 'N/A')}")
                print(f"   City: {result.get('city', 'N/A')}")
                print(f"   District: {result.get('district', 'N/A')}")
                print(f"   Postcode: {result.get('postcode', 'N/A')}")
                print(f"   Display Name: {result.get('displayName', 'N/A')[:100]}...")
                
                if result.get('boundingBox'):
                    bbox = result['boundingBox']
                    print(f"   Bounding Box: [{bbox[0]:.4f}, {bbox[1]:.4f}, {bbox[2]:.4f}, {bbox[3]:.4f}]")
            else:
                print("   ❌ FAILED - No data returned")
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
        
        # Wait between requests
        if i < len(test_coordinates):
            print("   Waiting 2 seconds...")
            time.sleep(2)
    
    print("\n" + "="*60)
    print("TEST COMPLETED")
    print("="*60)

def test_database_connection():
    """Test database connection (if DATABASE_URL is available)"""
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("⚠️  DATABASE_URL not set - skipping database test")
        return
    
    print("\nTesting database connection...")
    
    try:
        from bulk_reverse_geocode import DengueDataGeocoder
        
        geocoder = DengueDataGeocoder(database_url, batch_size=1)
        geocoder.connect_database()
        
        # Get progress stats
        stats = geocoder.get_progress_stats()
        print("✅ Database connection successful!")
        print(f"   Total records with coordinates: {stats.get('total_records', 'N/A')}")
        print(f"   Already geocoded: {stats.get('geocoded_records', 'N/A')}")
        print(f"   Pending geocoding: {stats.get('pending_records', 'N/A')}")
        
        geocoder.conn.close()
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

if __name__ == "__main__":
    print("Reverse Geocoding Test Script")
    print("============================")
    
    # Test 1: Sample coordinates
    test_sample_coordinates()
    
    # Test 2: Database connection (if available)
    test_database_connection()
    
    print("\n🎉 All tests completed!")
    print("\nIf the coordinate tests passed, the reverse geocoding is working correctly.")
    print("You can now run the full bulk geocoding process on your DengueData records.")