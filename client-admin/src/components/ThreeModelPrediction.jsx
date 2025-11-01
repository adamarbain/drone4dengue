/**
 * Three-Model Prediction Component
 * ================================
 * 
 * React component for performing three-model dengue predictions including
 * breeding area detection from drone images.
 */

import React, { useState, useEffect } from 'react';
import { 
  predictThreeModels, 
  detectBreedingAreas, 
  getLocationImages,
  formatRiskLevel, 
  formatModelScores, 
  getRecommendations,
  checkSystemHealth 
} from '../lib/threeModelPredictionApi';

const ThreeModelPrediction = ({ 
  companyId, 
  companyLocationId, 
  companyLocation, 
  token,
  onPredictionComplete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);

  // Load available images for the location
  useEffect(() => {
    if (companyId && companyLocationId && token) {
      loadAvailableImages();
    }
  }, [companyId, companyLocationId, token]);

  // Check system health on component mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const health = await checkSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const loadAvailableImages = async () => {
    try {
      const result = await getLocationImages({
        companyId,
        companyLocationId,
        token
      });
      
      if (result.success) {
        setAvailableImages(result.images || []);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const handleImageSelection = (imageId) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const handleThreeModelPrediction = async () => {
    if (!companyLocation?.latitude || !companyLocation?.longitude) {
      setError('Location coordinates are required for prediction');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const result = await predictThreeModels({
        companyId,
        companyLocationId,
        lat: companyLocation.latitude,
        lon: companyLocation.longitude,
        imageIds: selectedImages,
        token
      });

      if (result.success) {
        setPrediction(result.prediction);
        if (onPredictionComplete) {
          onPredictionComplete(result.prediction);
        }
      } else {
        setError(result.error || 'Prediction failed');
      }
    } catch (error) {
      setError(error.message || 'An error occurred during prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreedingAreaDetection = async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image for breeding area detection');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await detectBreedingAreas({
        imageIds: selectedImages,
        companyId,
        companyLocationId,
        token
      });

      if (result.success) {
        // Update prediction with breeding area detection results
        setPrediction(prev => ({
          ...prev,
          model3Score: result.detection.breedingAreaScore,
          model3RiskLevel: result.detection.riskLevel,
          breedingAreaDetections: result.detection.detections,
          imagesProcessed: result.detection.imagesProcessed
        }));
      } else {
        setError(result.error || 'Breeding area detection failed');
      }
    } catch (error) {
      setError(error.message || 'An error occurred during breeding area detection');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSystemHealth = () => {
    if (!systemHealth) return null;

    const services = systemHealth.services || {};
    const isHealthy = services.ml_service === 'healthy' && services.database === 'healthy';

    return (
      <div className={`p-3 rounded-lg mb-4 ${isHealthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center">
          <span className={`text-sm font-medium ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>
            System Status: {isHealthy ? 'Healthy' : 'Issues Detected'}
          </span>
        </div>
        <div className="mt-2 text-xs space-y-1">
          <div>ML Service: <span className={services.ml_service === 'healthy' ? 'text-green-600' : 'text-red-600'}>{services.ml_service}</span></div>
          <div>Database: <span className={services.database === 'healthy' ? 'text-green-600' : 'text-red-600'}>{services.database}</span></div>
          <div>Redis: <span className={services.redis === 'healthy' ? 'text-green-600' : 'text-yellow-600'}>{services.redis}</span></div>
        </div>
      </div>
    );
  };

  const renderImageSelection = () => {
    if (availableImages.length === 0) {
      return (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-sm">No drone images available for this location.</p>
          <p className="text-gray-500 text-xs mt-1">Upload images first to enable breeding area detection.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Select Images for Breeding Area Detection</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableImages.map((image) => (
            <div
              key={image.id}
              className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                selectedImages.includes(image.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleImageSelection(image.id)}
            >
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${image.url}`}
                alt={image.filename}
                className="w-full h-24 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2">
                {selectedImages.includes(image.id) ? (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-white rounded-full border border-gray-300"></div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-600 truncate">{image.filename}</p>
                <p className="text-xs text-gray-500">
                  {new Date(image.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Selected: {selectedImages.length} image(s)
        </p>
      </div>
    );
  };

  const renderPredictionResults = () => {
    if (!prediction) return null;

    const riskConfig = formatRiskLevel(prediction.riskLevel);
    const modelScores = formatModelScores(prediction);
    const recommendations = getRecommendations(
      prediction.riskLevel, 
      prediction.breedingAreaDetections?.length || 0
    );

    return (
      <div className="space-y-6">
        {/* Overall Risk Assessment */}
        <div className={`p-4 rounded-lg ${riskConfig.bgColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold ${riskConfig.textColor}`}>
                {riskConfig.icon} {riskConfig.label}
              </h3>
              <p className={`text-sm ${riskConfig.textColor}`}>
                Combined Risk Score: {(prediction.combinedScore || prediction.riskScore || 0).toFixed(3)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm ${riskConfig.textColor}`}>
                Models Used: {prediction.modelsUsed?.join(', ') || 'Standard Models'}
              </p>
              {prediction.imagesProcessed > 0 && (
                <p className={`text-sm ${riskConfig.textColor}`}>
                  Images Processed: {prediction.imagesProcessed}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Model Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(modelScores).map(([key, model]) => (
            <div key={key} className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 text-sm">{model.label}</h4>
              <div className="mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Score</span>
                  <span className="font-medium">{model.score.toFixed(3)}</span>
                </div>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(model.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{model.percentage}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Breeding Area Detections */}
        {prediction.breedingAreaDetections && prediction.breedingAreaDetections.length > 0 && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">
              Breeding Area Detections ({prediction.breedingAreaDetections.length})
            </h4>
            <div className="space-y-2">
              {prediction.breedingAreaDetections.map((detection, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">
                      Detection {index + 1}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      Confidence: {(detection.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Area: {detection.area?.toFixed(0) || 'N/A'} px²
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
          <ul className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span className="text-sm text-gray-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-500">
            Prediction generated on: {new Date(prediction.createdAt || Date.now()).toLocaleString()}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Three-Model Dengue Prediction
        </h2>
        
        {renderSystemHealth()}

        <div className="mb-4">
          <h3 className="font-medium text-gray-900 mb-2">Location Information</h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Location:</strong> {companyLocation?.name || 'Unknown'}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Coordinates:</strong> {companyLocation?.latitude?.toFixed(6)}, {companyLocation?.longitude?.toFixed(6)}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Address:</strong> {companyLocation?.address || 'Not specified'}
            </p>
          </div>
        </div>

        {renderImageSelection()}

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={handleThreeModelPrediction}
            disabled={isLoading || !companyLocation?.latitude}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Run Three-Model Prediction'}
          </button>
          
          {selectedImages.length > 0 && (
            <button
              onClick={handleBreedingAreaDetection}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Detecting...' : 'Detect Breeding Areas Only'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {renderPredictionResults()}
    </div>
  );
};

export default ThreeModelPrediction;
