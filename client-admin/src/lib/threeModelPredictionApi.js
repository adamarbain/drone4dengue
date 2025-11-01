/**
 * Three-Model Prediction API Client
 * =================================
 * 
 * Client functions for the admin dashboard to interact with the three-model
 * dengue prediction system including breeding area detection.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Perform three-model prediction for a company location
 * @param {Object} params - Prediction parameters
 * @param {string} params.companyId - Company ID
 * @param {string} params.companyLocationId - Company Location ID
 * @param {number} params.lat - Latitude
 * @param {number} params.lon - Longitude
 * @param {string[]} params.imageIds - Array of image IDs for breeding area detection
 * @param {string} params.token - Authentication token
 * @returns {Promise<Object>} Prediction result
 */
export async function predictThreeModels({
  companyId,
  companyLocationId,
  lat,
  lon,
  imageIds = [],
  token
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/predict/company/three-models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        companyId,
        companyLocationId,
        lat,
        lon,
        imageIds
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Three-model prediction error:', error);
    throw error;
  }
}

/**
 * Perform breeding area detection on specific images
 * @param {Object} params - Detection parameters
 * @param {string[]} params.imageIds - Array of image IDs
 * @param {string} params.companyId - Company ID
 * @param {string} params.companyLocationId - Company Location ID (optional)
 * @param {string} params.token - Authentication token
 * @returns {Promise<Object>} Detection result
 */
export async function detectBreedingAreas({
  imageIds,
  companyId,
  companyLocationId,
  token
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/predict/detect-breeding-areas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        imageIds,
        companyId,
        companyLocationId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Breeding area detection error:', error);
    throw error;
  }
}

/**
 * Get company predictions with three-model support
 * @param {Object} params - Query parameters
 * @param {string} params.companyId - Company ID
 * @param {number} params.limit - Number of results to return
 * @param {number} params.offset - Offset for pagination
 * @param {string} params.companyLocationId - Filter by location ID (optional)
 * @param {string} params.token - Authentication token
 * @returns {Promise<Object>} Predictions result
 */
export async function getCompanyPredictions({
  companyId,
  limit = 10,
  offset = 0,
  companyLocationId,
  token
}) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (companyLocationId) {
      params.append('companyLocationId', companyLocationId);
    }

    const response = await fetch(`${API_BASE_URL}/api/predict/company/${companyId}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get company predictions error:', error);
    throw error;
  }
}

/**
 * Get company locations
 * @param {Object} params - Query parameters
 * @param {string} params.companyId - Company ID
 * @param {string} params.token - Authentication token
 * @returns {Promise<Object>} Locations result
 */
export async function getCompanyLocations({
  companyId,
  token
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/predict/company/${companyId}/locations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get company locations error:', error);
    throw error;
  }
}

/**
 * Get images for a company location
 * @param {Object} params - Query parameters
 * @param {string} params.companyId - Company ID
 * @param {string} params.companyLocationId - Company Location ID
 * @param {string} params.token - Authentication token
 * @returns {Promise<Object>} Images result
 */
export async function getLocationImages({
  companyId,
  companyLocationId,
  token
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/drones/images`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // Filter images by company and location
    const filteredImages = result.images?.filter(image => 
      image.companyId === companyId && 
      image.companyLocationId === companyLocationId
    ) || [];

    return {
      success: true,
      images: filteredImages
    };
  } catch (error) {
    console.error('Get location images error:', error);
    throw error;
  }
}

/**
 * Upload drone images
 * @param {Object} params - Upload parameters
 * @param {string} params.droneId - Drone ID
 * @param {File[]} params.files - Array of image files
 * @param {string} params.token - Authentication token
 * @returns {Promise<Object>} Upload result
 */
export async function uploadDroneImages({
  droneId,
  files,
  token
}) {
  try {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await fetch(`${API_BASE_URL}/api/drones/${droneId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Upload drone images error:', error);
    throw error;
  }
}

/**
 * Check system health
 * @returns {Promise<Object>} Health status
 */
export async function checkSystemHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/predict/health`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}

/**
 * Utility function to format risk level for display
 * @param {string} riskLevel - Risk level from API
 * @returns {Object} Formatted risk level with color and icon
 */
export function formatRiskLevel(riskLevel) {
  const riskConfig = {
    low: {
      label: 'Low Risk',
      color: 'green',
      icon: '🟢',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800'
    },
    medium: {
      label: 'Medium Risk',
      color: 'yellow',
      icon: '🟡',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800'
    },
    high: {
      label: 'High Risk',
      color: 'red',
      icon: '🔴',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800'
    },
    unknown: {
      label: 'Unknown',
      color: 'gray',
      icon: '⚪',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800'
    }
  };

  return riskConfig[riskLevel] || riskConfig.unknown;
}

/**
 * Utility function to format model scores for display
 * @param {Object} prediction - Prediction result
 * @returns {Object} Formatted model scores
 */
export function formatModelScores(prediction) {
  return {
    model1: {
      label: 'Historical Cases',
      score: prediction.model1Score || 0,
      percentage: Math.round((prediction.model1Score || 0) * 10)
    },
    model2: {
      label: 'Weather-Based',
      score: prediction.model2Score || 0,
      percentage: Math.round((prediction.model2Score || 0) * 10)
    },
    model3: {
      label: 'Breeding Area Detection',
      score: prediction.model3Score || 0,
      percentage: Math.round((prediction.model3Score || 0) * 100)
    },
    combined: {
      label: 'Combined Score',
      score: prediction.combinedScore || prediction.riskScore || 0,
      percentage: Math.round((prediction.combinedScore || prediction.riskScore || 0) * 100)
    }
  };
}

/**
 * Utility function to get recommendations based on risk level
 * @param {string} riskLevel - Risk level
 * @param {number} detectionCount - Number of breeding areas detected
 * @returns {string[]} Array of recommendations
 */
export function getRecommendations(riskLevel, detectionCount = 0) {
  const recommendations = {
    low: [
      'Maintain regular monitoring',
      'Keep area clean and dry',
      'Monitor for new water accumulation'
    ],
    medium: [
      'Moderate risk detected - preventive measures recommended',
      'Inspect the identified areas closely',
      'Remove or treat standing water',
      'Implement regular monitoring',
      'Consider preventive fogging'
    ],
    high: [
      'Immediate action required - high risk of dengue breeding',
      'Conduct thorough inspection of the area',
      'Implement immediate mosquito control measures',
      'Consider fogging or larviciding',
      'Remove standing water sources',
      'Schedule follow-up inspection within 24-48 hours'
    ]
  };

  const baseRecommendations = recommendations[riskLevel] || recommendations.low;
  
  if (detectionCount > 0) {
    baseRecommendations.push(`Found ${detectionCount} potential breeding area(s) requiring attention`);
  }

  return baseRecommendations;
}
