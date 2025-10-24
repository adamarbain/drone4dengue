"""
Test Script for Three-Model Dengue Prediction System
===================================================

This script tests the complete integration of all three models:
1. Model 1: Historical cases prediction
2. Model 2: Weather-based prediction
3. Model 3: Breeding area detection from drone images

Author: AI Assistant
Date: 2025
"""

import requests
import json
import time
from datetime import datetime

# Configuration
ML_SERVICE_URL = "http://localhost:5001"
API_SERVICE_URL = "http://localhost:4000"

# Test data
TEST_COORDINATES = {
    "latitude": 1.3521,
    "longitude": 103.8198
}

TEST_IMAGE_URLS = [
    "https://i.imgur.com/PEEvqPN.png",  # Sample image for testing
    "https://i.imgur.com/PEEvqPN.png"   # Duplicate for testing multiple images
]

TEST_HISTORICAL_DATA = [
    {"date": "2024-01-01", "cases": 5},
    {"date": "2024-01-02", "cases": 3},
    {"date": "2024-01-03", "cases": 7},
    {"date": "2024-01-04", "cases": 4},
    {"date": "2024-01-05", "cases": 6}
]

def test_ml_service_health():
    """Test ML service health"""
    print("🔍 Testing ML Service Health...")
    try:
        response = requests.get(f"{ML_SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ ML Service Health: {data.get('status', 'unknown')}")
            return True
        else:
            print(f"❌ ML Service Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ ML Service Health Check Error: {str(e)}")
        return False

def test_breeding_area_detection():
    """Test Model 3: Breeding Area Detection"""
    print("\n🔍 Testing Model 3: Breeding Area Detection...")
    try:
        payload = {
            "image_urls": TEST_IMAGE_URLS
        }
        
        response = requests.post(f"{ML_SERVICE_URL}/detect-breeding-areas", 
                               json=payload, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ Breeding Area Detection Success")
                print(f"   Score: {data.get('breeding_area_score', 0)}")
                print(f"   Risk Level: {data.get('risk_level', 'unknown')}")
                print(f"   Detections: {data.get('detection_count', 0)}")
                print(f"   Images Processed: {data.get('images_processed', 0)}")
                return True
            else:
                print(f"❌ Breeding Area Detection Failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Breeding Area Detection HTTP Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Breeding Area Detection Error: {str(e)}")
        return False

def test_three_model_prediction():
    """Test Three-Model Prediction"""
    print("\n🔍 Testing Three-Model Prediction...")
    try:
        payload = {
            "latitude": TEST_COORDINATES["latitude"],
            "longitude": TEST_COORDINATES["longitude"],
            "historical_cases_data": TEST_HISTORICAL_DATA,
            "image_urls": TEST_IMAGE_URLS
        }
        
        response = requests.post(f"{ML_SERVICE_URL}/predict/three-models", 
                               json=payload, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                prediction = data.get('prediction', {})
                print(f"✅ Three-Model Prediction Success")
                print(f"   Combined Score: {prediction.get('combined_score', 0)}")
                print(f"   Risk Level: {prediction.get('risk_level', 'unknown')}")
                print(f"   Model 1 Score: {prediction.get('model1_score', 0)}")
                print(f"   Model 2 Score: {prediction.get('model2_score', 0)}")
                print(f"   Model 3 Score: {prediction.get('model3_score', 0)}")
                print(f"   Models Used: {prediction.get('models_used', [])}")
                print(f"   Images Processed: {prediction.get('images_processed', 0)}")
                return True
            else:
                print(f"❌ Three-Model Prediction Failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Three-Model Prediction HTTP Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Three-Model Prediction Error: {str(e)}")
        return False

def test_api_service_health():
    """Test API service health"""
    print("\n🔍 Testing API Service Health...")
    try:
        response = requests.get(f"{API_SERVICE_URL}/api/predict/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                services = data.get('services', {})
                print(f"✅ API Service Health Check")
                print(f"   ML Service: {services.get('ml_service', 'unknown')}")
                print(f"   Redis: {services.get('redis', 'unknown')}")
                print(f"   Database: {services.get('database', 'unknown')}")
                return True
            else:
                print(f"❌ API Service Health Check Failed")
                return False
        else:
            print(f"❌ API Service Health Check HTTP Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API Service Health Check Error: {str(e)}")
        return False

def test_public_prediction():
    """Test public prediction endpoint"""
    print("\n🔍 Testing Public Prediction...")
    try:
        payload = {
            "lat": TEST_COORDINATES["latitude"],
            "lon": TEST_COORDINATES["longitude"]
        }
        
        response = requests.post(f"{API_SERVICE_URL}/api/predict/public", 
                               json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                prediction = data.get('prediction', {})
                print(f"✅ Public Prediction Success")
                print(f"   Risk Score: {prediction.get('riskScore', 0)}")
                print(f"   Risk Level: {prediction.get('riskLevel', 'unknown')}")
                return True
            else:
                print(f"❌ Public Prediction Failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Public Prediction HTTP Error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Public Prediction Error: {str(e)}")
        return False

def run_comprehensive_test():
    """Run comprehensive test suite"""
    print("=" * 60)
    print("🧪 COMPREHENSIVE THREE-MODEL DENGUE PREDICTION TEST")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"ML Service URL: {ML_SERVICE_URL}")
    print(f"API Service URL: {API_SERVICE_URL}")
    
    test_results = []
    
    # Test ML Service Health
    test_results.append(("ML Service Health", test_ml_service_health()))
    
    # Test API Service Health
    test_results.append(("API Service Health", test_api_service_health()))
    
    # Test Breeding Area Detection (Model 3)
    test_results.append(("Breeding Area Detection", test_breeding_area_detection()))
    
    # Test Three-Model Prediction
    test_results.append(("Three-Model Prediction", test_three_model_prediction()))
    
    # Test Public Prediction
    test_results.append(("Public Prediction", test_public_prediction()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Three-model integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the error messages above.")
    
    return passed == total

if __name__ == "__main__":
    success = run_comprehensive_test()
    exit(0 if success else 1)
