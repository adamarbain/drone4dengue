const prisma = require('../prisma/client');
const logger = require('../utils/logger');
const {
  sendValidationError,
  sendInternalError
} = require('../utils/errorResponse');

// GET /recommendations/:risk
exports.getRecommendationsByRisk = async (req, res) => {
  const { risk } = req.params;
  if (!['high', 'medium', 'low'].includes(risk)) {
    return sendValidationError(res, ['Invalid risk level. Must be one of: high, medium, low']);
  }
  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { risk },
      select: {
        id: true,
        risk: true,
        title: true,
        details: true,
        referenceLink: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(recommendations);
  } catch (err) {
    logger.error('[GET RECOMMENDATIONS ERROR]', { error: err.message, stack: err.stack, risk });
    return sendInternalError(res, 'Failed to fetch recommendations', err);
  }
};
