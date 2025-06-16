const prisma = require('../prisma/client');

// GET /recommendations/:risk
exports.getRecommendationsByRisk = async (req, res) => {
  const { risk } = req.params;
  if (!['high', 'medium', 'low'].includes(risk)) {
    return res.status(400).json({ error: 'Invalid risk level' });
  }
  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { risk },
      orderBy: { createdAt: 'asc' }
    });
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};
