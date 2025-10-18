#!/usr/bin/env python3
"""
Test script for dengue_prediction_interface.py
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dengue_prediction_interface import DenguePredictionInterface

def test_interface():
    """Test the dengue prediction interface"""
    print("Testing Dengue Prediction Interface...")
    print("=" * 50)
    
    try:
        # Initialize interface
        interface = DenguePredictionInterface()
        
        # Test model loading
        print("1. Testing model loading...")
        if interface.load_models():
            print("   ✓ Models loaded successfully")
        else:
            print("   ✗ Model loading failed")
            return False
        
        # Test Model 1 prediction
        print("\n2. Testing Model 1 prediction...")
        result1 = interface.predict_model1(103.8198, 1.3521)  # Singapore coordinates
        if "error" in result1:
            print(f"   ✗ Model 1 prediction failed: {result1['error']}")
        else:
            print(f"   ✓ Model 1 prediction: {result1['predicted_cases']} cases, Risk: {result1['risk_level']}")
        
        # Test Model 2 prediction
        print("\n3. Testing Model 2 prediction...")
        result2 = interface.predict_model2(103.8198, 1.3521, 75.0, 28.0, 5.0)  # Singapore with weather
        if "error" in result2:
            print(f"   ✗ Model 2 prediction failed: {result2['error']}")
        else:
            print(f"   ✓ Model 2 prediction: {result2['predicted_cases']} cases, Risk: {result2['risk_level']}")
        
        print("\n" + "=" * 50)
        print("✓ Interface test completed successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Interface test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_interface()
