# Dengue Risk Prediction System Setup Guide

This guide will help you set up the hybrid dengue risk prediction system with two pre-trained ML models.

## Architecture Overview

The system consists of:
- **Python ML Service** (`server-ml/`) - Flask microservice running the ML models
- **Node.js API Server** (`server-api/`) - Main API with Redis caching
- **Admin Dashboard** (`client-admin/`) - Company prediction interface
- **Mobile App** (`client-mobile/`) - Public user prediction interface

### Model Input Requirements
- **Model 1 (Historical Cases)**: Only requires `latitude` and `longitude`
- **Model 2 (Weather-based)**: Requires `latitude`, `longitude`, `humidity`, `temperature`, `rainfall`
- Weather data is automatically fetched from Open Meteo API if not provided

## Prerequisites

- Python 3.8+
- Node.js 16+
- Redis server
- PostgreSQL database

## Setup Instructions

### 1. Database Setup

1. Update your PostgreSQL database with the new schema:
```bash
cd server-api
npx prisma migrate dev --name add_prediction_models
npx prisma generate
```

### 2. Python ML Service Setup

1. Navigate to the ML service directory:
```bash
cd server-ml
```

2. Create and activate virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the ML service:
```bash
# Windows
start_service.bat

# macOS/Linux
chmod +x start_service.sh
./start_service.sh
```

The ML service will run on `http://localhost:5001`

### 3. Node.js API Server Setup

1. Navigate to the API server directory:
```bash
cd server-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/dengue_db"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
ML_SERVICE_URL=http://localhost:5001
JWT_SECRET=your_jwt_secret
```

4. Start the API server:
```bash
npm run dev
```

The API server will run on `http://localhost:4000`

### 4. Redis Setup

Install and start Redis:

**Windows:**
- Download Redis from https://github.com/microsoftarchive/redis/releases
- Run `redis-server.exe`

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 5. Admin Dashboard Setup

1. Navigate to the admin dashboard:
```bash
cd client-admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

4. Start the development server:
```bash
npm run dev
```

The admin dashboard will run on `http://localhost:3000`

### 6. Mobile App Setup

1. Navigate to the mobile app:
```bash
cd client-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

4. Start the Expo development server:
```bash
npm start
```

## API Endpoints

### Company Predictions (Requires Authentication)
- `POST /api/predict/company` - Create company prediction
- `GET /api/predict/company/:companyId` - Get company predictions

### Public Predictions (No Authentication)
- `POST /api/predict/public` - Get public prediction (cached)

### Health Check
- `GET /api/predict/health` - Check service health

## Usage Examples

### Company Prediction (Admin Dashboard)
```javascript
const response = await predictCompany({
  companyId: "company-uuid",
  lat: 1.3521,
  lon: 103.8198
});
```

### Public Prediction (Mobile App)
```javascript
const response = await predictPublic({
  lat: 1.3521,
  lon: 103.8198,
  userId: "user-id" // optional
});
```

## Configuration

### Cache Settings
- Public predictions are cached for 3 hours (10800 seconds)
- Cache key format: `prediction:{lat}:{lon}` (rounded to 4 decimal places)

### Model Configuration
- Model 1 (Historical Cases): 60% weight
- Model 2 (Weather-based): 40% weight
- Risk levels: High (≥70%), Medium (≥40%), Low (<40%)

## Troubleshooting

### ML Service Issues
- Check if model files are copied to `server-ml/models/`
- Verify Python dependencies are installed
- Check ML service logs for errors

### Redis Connection Issues
- Ensure Redis server is running
- Check Redis connection settings in `.env`
- Verify Redis port (default: 6379)

### Database Issues
- Run `npx prisma migrate dev` to apply schema changes
- Check database connection string in `.env`
- Verify PostgreSQL is running

### API Connection Issues
- Check ML service URL in `.env`
- Verify all services are running on correct ports
- Check CORS settings if accessing from different domains

## Production Deployment

### Environment Variables
Set the following environment variables for production:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# ML Service
ML_SERVICE_URL=https://your-ml-service.com

# Security
JWT_SECRET=your-secure-jwt-secret
```

### Scaling Considerations
- Use Redis Cluster for high availability
- Deploy ML service with load balancer
- Use connection pooling for database
- Implement rate limiting for public predictions

## Monitoring

### Health Checks
- ML Service: `GET /health`
- API Server: `GET /api/predict/health`
- Redis: Check connection status
- Database: Check Prisma connection

### Logging
- ML Service: Python logging to stdout
- API Server: Console logging
- Redis: Monitor cache hit/miss rates
- Database: Monitor query performance

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify all services are running
3. Test individual components
4. Check network connectivity between services
