/**
 * Get risk level from risk score using company-specific thresholds
 * @param {number} riskScore - The risk score to evaluate
 * @param {Object} predictionModelParameters - Company's prediction model parameters containing thresholds
 * @returns {string} - 'low', 'medium', or 'high'
 */
function getRiskLevel(riskScore, predictionModelParameters = {}) {
  if (riskScore === null || riskScore === undefined || isNaN(riskScore)) {
    return 'low';
  }

  // Get thresholds from company settings, with defaults
  const lowThreshold = predictionModelParameters?.lowThreshold ?? 1.0;
  const highThreshold = predictionModelParameters?.highThreshold ?? 3.0;

  if (riskScore >= highThreshold) {
    return 'high';
  } else if (riskScore >= lowThreshold) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get risk level statistics from predictions array
 * @param {Array} predictions - Array of prediction objects with riskScore or combinedScore
 * @param {Object} predictionModelParameters - Company's prediction model parameters
 * @returns {Object} - Object with counts for highRiskPredictions, mediumRiskPredictions, lowRiskPredictions
 */
function getRiskLevelStats(predictions, predictionModelParameters = {}) {
  const lowThreshold = predictionModelParameters?.lowThreshold ?? 1.0;
  const highThreshold = predictionModelParameters?.highThreshold ?? 3.0;

  let highRiskPredictions = 0;
  let mediumRiskPredictions = 0;
  let lowRiskPredictions = 0;

  predictions.forEach(p => {
    const riskScore = p.riskScore ?? p.combined_score ?? p.combinedScore ?? 0;
    if (riskScore >= highThreshold) {
      highRiskPredictions++;
    } else if (riskScore >= lowThreshold) {
      mediumRiskPredictions++;
    } else {
      lowRiskPredictions++;
    }
  });

  return {
    highRiskPredictions,
    mediumRiskPredictions,
    lowRiskPredictions
  };
}

module.exports = {
  getRiskLevel,
  getRiskLevelStats
};

