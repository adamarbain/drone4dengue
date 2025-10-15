const prisma = require('../prisma/client');

exports.registerDrone = async (req, res) => {
  try {
    const { name, serial } = req.body;
    
    if (!name || !serial) {
      return res.status(400).json({ error: 'Name and serial are required' });
    }

    // Check if serial already exists
    const existingDrone = await prisma.drone.findUnique({ 
      where: { serial } 
    });
    
    if (existingDrone) {
      return res.status(409).json({ error: 'Drone with this serial already exists' });
    }

    // Create new drone
    const drone = await prisma.drone.create({
      data: {
        name,
        serial,
        userId: req.user.userId,
        companyId: req.companyId
      }
    });

    res.status(201).json({ 
      message: 'Drone registered successfully',
      drone 
    });
  } catch (err) {
    console.error('[DRONE REGISTER ERROR]', err);
    res.status(500).json({ error: 'Failed to register drone' });
  }
}; 