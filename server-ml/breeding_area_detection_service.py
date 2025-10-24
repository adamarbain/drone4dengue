"""
Breeding Area Detection Service
=============================

Service for detecting dengue breeding areas in drone images using Roboflow API.
This is Model 3 of the dengue prediction system.

Author: AI Assistant
Date: 2025
"""

import os
import requests
import base64
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import numpy as np
from inference_sdk import InferenceHTTPClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BreedingAreaDetectionService:
    """
    Service for detecting dengue breeding areas in drone images using Roboflow API
    """
    
    def __init__(self):
        """
        Initialize the breeding area detection service
        """
        self.api_url = "https://serverless.roboflow.com"
        self.api_key = "1jgNe8OZcnOOk2JgN95a"
        self.model_id = "drone4dengue-ja1rz/3"
        self.endpoint = f"{self.api_url}/{self.model_id}"
        
        # Initialize the InferenceHTTPClient (same as working robofolow_api_detection.py)
        self.client = InferenceHTTPClient(
            api_url=self.api_url,
            api_key=self.api_key
        )
        
        logger.info(f"Breeding Area Detection Service initialized")
        logger.info(f"API Endpoint: {self.endpoint}")
    
    def detect_breeding_areas_from_url(self, image_url: str) -> Dict:
        """
        Detect breeding areas in an image using image URL
        
        Args:
            image_url (str): URL of the image to analyze
            
        Returns:
            Dict: Detection results with confidence scores and bounding boxes
        """
        try:
            logger.info(f"Detecting breeding areas in image: {image_url}")
            
            # Use the working InferenceHTTPClient approach (same as robofolow_api_detection.py)
            result = self.client.infer(image_url, model_id=self.model_id)
            
            # Process and normalize the results
            processed_result = self._process_detection_result(result)
            
            logger.info(f"Detection completed. Found {len(processed_result.get('detections', []))} potential breeding areas")
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Detection failed: {str(e)}")
            return {
                "success": False,
                "error": f"Detection failed: {str(e)}",
                "breeding_area_score": 0.0,
                "risk_level": "unknown",
                "detections": []
            }
    
    
    def detect_breeding_areas_from_file(self, image_path: str) -> Dict:
        """
        Detect breeding areas in an image file
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            Dict: Detection results with confidence scores and bounding boxes
        """
        try:
            logger.info(f"Detecting breeding areas in file: {image_path}")
            
            # Check if file exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            # Use the working InferenceHTTPClient approach (same as robofolow_api_detection.py)
            result = self.client.infer(image_path, model_id=self.model_id)
            
            # Process and normalize the results
            processed_result = self._process_detection_result(result)
            
            logger.info(f"Detection completed. Found {len(processed_result.get('detections', []))} potential breeding areas")
            
            return processed_result
            
        except FileNotFoundError as e:
            logger.error(f"File not found: {str(e)}")
            return {
                "success": False,
                "error": f"File not found: {str(e)}",
                "breeding_area_score": 0.0,
                "risk_level": "unknown",
                "detections": []
            }
        except Exception as e:
            logger.error(f"Detection failed: {str(e)}")
            return {
                "success": False,
                "error": f"Detection failed: {str(e)}",
                "breeding_area_score": 0.0,
                "risk_level": "unknown",
                "detections": []
            }
    
    def _process_detection_result(self, raw_result: Dict) -> Dict:
        """
        Process and normalize the raw detection result from Roboflow API
        Based on the working format from robofolow_api_detection.py
        
        Args:
            raw_result (Dict): Raw result from Roboflow API
            
        Returns:
            Dict: Processed result with normalized scores and risk levels
        """
        try:
            # Extract detections from the result (based on your working example)
            detections = raw_result.get('predictions', [])
            
            if not detections:
                return {
                    "success": True,
                    "breeding_area_score": 0.0,
                    "risk_level": "low",
                    "detections": [],
                    "raw_result": raw_result,
                    "message": "No breeding areas detected"
                }
            
            # Calculate overall breeding area score
            # Use the highest confidence score as the main indicator
            max_confidence = max([det.get('confidence', 0) for det in detections])
            
            # Calculate weighted average based on confidence and area
            total_weighted_score = 0.0
            total_weight = 0.0
            
            processed_detections = []
            
            for detection in detections:
                confidence = detection.get('confidence', 0)
                
                # Handle the bbox format from your working example
                # Your example shows: "x": 148.0, "y": 70.5, "width": 140.0, "height": 117.0
                bbox = {
                    "x": detection.get('x', 0),
                    "y": detection.get('y', 0),
                    "width": detection.get('width', 0),
                    "height": detection.get('height', 0)
                }
                
                # Calculate area weight (larger areas are more significant)
                width = bbox.get('width', 0)
                height = bbox.get('height', 0)
                area = width * height
                area_weight = min(area / 10000, 1.0)  # Normalize area weight
                
                # Combined score: confidence * area_weight
                weighted_score = confidence * (0.7 + 0.3 * area_weight)
                
                total_weighted_score += weighted_score
                total_weight += 1.0
                
                processed_detection = {
                    "confidence": confidence,
                    "class": detection.get('class', 'breeding_area'),
                    "class_id": detection.get('class_id', 0),
                    "detection_id": detection.get('detection_id', ''),
                    "bbox": bbox,
                    "area": area,
                    "weighted_score": weighted_score
                }
                
                processed_detections.append(processed_detection)
            
            # Calculate final breeding area score
            if total_weight > 0:
                breeding_area_score = total_weighted_score / total_weight
            else:
                breeding_area_score = max_confidence
            
            # Determine risk level based on score
            if breeding_area_score >= 0.7:
                risk_level = "high"
            elif breeding_area_score >= 0.4:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            return {
                "success": True,
                "breeding_area_score": round(breeding_area_score, 3),
                "risk_level": risk_level,
                "detections": processed_detections,
                "raw_result": raw_result,
                "detection_count": len(detections),
                "max_confidence": max_confidence,
                "inference_time": raw_result.get('time', 0),
                "image_dimensions": raw_result.get('image', {}),
                "inference_id": raw_result.get('inference_id', ''),
                "message": f"Detected {len(detections)} potential breeding areas"
            }
            
        except Exception as e:
            logger.error(f"Error processing detection result: {str(e)}")
            return {
                "success": False,
                "error": f"Error processing result: {str(e)}",
                "breeding_area_score": 0.0,
                "risk_level": "unknown",
                "detections": [],
                "raw_result": raw_result
            }
    
    def get_risk_recommendations(self, risk_level: str, detection_count: int) -> List[str]:
        """
        Get recommendations based on risk level and detection count
        
        Args:
            risk_level (str): Risk level ("high", "medium", "low")
            detection_count (int): Number of detected breeding areas
            
        Returns:
            List[str]: List of recommendations
        """
        recommendations = []
        
        if risk_level == "high":
            recommendations.extend([
                "Immediate action required - high risk of dengue breeding",
                "Conduct thorough inspection of the area",
                "Implement immediate mosquito control measures",
                "Consider fogging or larviciding",
                "Remove standing water sources",
                "Schedule follow-up inspection within 24-48 hours"
            ])
        elif risk_level == "medium":
            recommendations.extend([
                "Moderate risk detected - preventive measures recommended",
                "Inspect the identified areas closely",
                "Remove or treat standing water",
                "Implement regular monitoring",
                "Consider preventive fogging"
            ])
        else:
            recommendations.extend([
                "Low risk detected - maintain regular monitoring",
                "Continue routine inspections",
                "Keep area clean and dry",
                "Monitor for new water accumulation"
            ])
        
        # Add general recommendations based on detection count
        if detection_count > 0:
            recommendations.append(f"Found {detection_count} potential breeding area(s) requiring attention")
        
        return recommendations
    
    def health_check(self) -> Dict:
        """
        Check if the breeding area detection service is healthy
        
        Returns:
            Dict: Health status
        """
        try:
            # Test with a simple API call using the working InferenceHTTPClient
            test_result = self.client.infer("https://i.imgur.com/PEEvqPN.png", model_id=self.model_id)
            
            return {
                "status": "healthy",
                "service": "breeding_area_detection",
                "api_endpoint": self.endpoint,
                "test_result": test_result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "service": "breeding_area_detection",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Test the service
if __name__ == "__main__":
    # Initialize service
    service = BreedingAreaDetectionService()
    
    # Test health check
    health = service.health_check()
    print("Health Check:", json.dumps(health, indent=2))
    
    # Test with local image file (same as robofolow_api_detection.py)
    print("\n" + "="*50)
    print("Testing with local image file: YOUR_IMAGE.jpg")
    print("="*50)
    result_file = service.detect_breeding_areas_from_file("YOUR_IMAGE.jpg")
    print("\nFile Detection Result:", json.dumps(result_file, indent=2))
    
    # Test with sample image URL
    print("\n" + "="*50)
    print("Testing with sample image URL")
    print("="*50)
    test_url = "https://i.imgur.com/PEEvqPN.png"
    result_url = service.detect_breeding_areas_from_url(test_url)
    print("\nURL Detection Result:", json.dumps(result_url, indent=2))
    
    # Show recommendations if detection was successful
    if result_file.get('success', False):
        print("\n" + "="*50)
        print("RECOMMENDATIONS")
        print("="*50)
        risk_level = result_file.get('risk_level', 'unknown')
        detection_count = result_file.get('detection_count', 0)
        recommendations = service.get_risk_recommendations(risk_level, detection_count)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
