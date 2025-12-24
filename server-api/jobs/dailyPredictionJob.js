const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifyDailyPrediction } = require('../services/notificationService');
const { getRiskLevel } = require('../utils/riskLevelUtils');

// Import prediction function from controller
// We'll need to extract the getMLPrediction function or create a utility
const axios = require('axios');
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

async function getMLPrediction(latitude, longitude) {
  try {
    const payload = { latitude, longitude };
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    console.error('ML Service Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Daily prediction job - runs at 12:00 PM Malaysia time (GMT+8)
 * Malaysia time is UTC+8, so 12:00 PM Malaysia = 04:00 UTC
 */
const scheduleDailyPredictions = () => {
  // Schedule job to run at 12:00 PM Malaysia time (04:00 UTC)
  // Cron format: minute hour day month dayOfWeek
  // '0 4 * * *' = Every day at 04:00 UTC (12:00 PM Malaysia time)
  cron.schedule('0 4 * * *', async () => {
    console.log('[DAILY PREDICTION JOB] Starting daily prediction job at', new Date().toISOString());
    
    try {
      // Get all mobile users (role='user') with their company info
      const users = await prisma.user.findMany({
        where: {
          role: 'user',
          status: 'Verified' // Only verified users
        },
        select: {
          id: true,
          companyId: true,
          email: true,
          name: true
        }
      });

      console.log(`[DAILY PREDICTION JOB] Found ${users.length} users to process`);

      // For each user, we need to get their current location
      // Since we don't store user locations, we'll need to get it from their last prediction or ask them
      // For now, we'll skip users without location data
      // In a real implementation, you might want to:
      // 1. Store user's last known location
      // 2. Use a default location for the company
      // 3. Skip users without location

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Get user's last prediction to use their location
          const lastPrediction = await prisma.predictionLog.findFirst({
            where: {
              userId: user.id
            },
            orderBy: {
              requestedAt: 'desc'
            }
          });

          if (!lastPrediction) {
            console.log(`[DAILY PREDICTION JOB] No location found for user ${user.id}, skipping`);
            continue;
          }

          const { latitude, longitude } = lastPrediction;

          // Call prediction API
          const mlResult = await getMLPrediction(latitude, longitude);
          
          if (!mlResult.success || !mlResult.prediction) {
            console.error(`[DAILY PREDICTION JOB] Prediction failed for user ${user.id}`);
            errorCount++;
            continue;
          }

          const prediction = mlResult.prediction;
          
          // Get company settings for risk level thresholds
          const company = await prisma.company.findUnique({
            where: { id: user.companyId },
            select: { predictionModelParameters: true }
          });
          const predictionModelParameters = company?.predictionModelParameters || {};
          
          // Determine risk level using company-specific thresholds
          const riskScore = prediction.combined_score || prediction.risk_score || 0;
          const riskLevel = getRiskLevel(riskScore, predictionModelParameters);

          // Send notification to user
          await notifyDailyPrediction(user.id, user.companyId, {
            riskLevel,
            riskScore,
            latitude,
            longitude
          });

          // Log the prediction
          await prisma.predictionLog.create({
            data: {
              latitude,
              longitude,
              userId: user.id,
              riskScore
            }
          });

          successCount++;
          console.log(`[DAILY PREDICTION JOB] Successfully processed user ${user.id}`);

        } catch (userError) {
          console.error(`[DAILY PREDICTION JOB] Error processing user ${user.id}:`, userError);
          errorCount++;
        }
      }

      console.log(`[DAILY PREDICTION JOB] Completed. Success: ${successCount}, Errors: ${errorCount}`);

    } catch (error) {
      console.error('[DAILY PREDICTION JOB] Fatal error:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kuala_Lumpur" // Malaysia timezone
  });

  console.log('[DAILY PREDICTION JOB] Scheduled daily prediction job for 12:00 PM Malaysia time');
};

module.exports = {
  scheduleDailyPredictions
};

