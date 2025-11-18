const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function checkToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('[AUTH MIDDLEWARE] Token verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    req.companyId = user.companyId; // Add company context to request
    
    // Log for debugging (only in development or when debugging)
    // if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
    //   console.log('[AUTH MIDDLEWARE] Token decoded:', {
    //     userId: user.userId,
    //     role: user.role,
    //     companyId: user.companyId
    //   });
    // }
    
    next();
  });
}

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { checkToken, checkRole }; 