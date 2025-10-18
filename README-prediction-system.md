# Dengue Risk Prediction System

A hybrid architecture system for dengue risk prediction using two pre-trained machine learning models with support for both company (admin dashboard) and public user (mobile app) predictions.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Dashboard │    │   Mobile App    │    │   Python ML     │
│   (Next.js)      │    │   (React Native) │    │   Service       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    Node.js API Server    │
                    │    (Express + Prisma)    │
                    └─────────────┬─────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
            │ PostgreSQL   │ │   Redis   │ │   ML     │
            │   Database   │ │   Cache   │ │ Models   │
            └─────────────┘ └───────────┘ └──────────┘
```

## 🚀 Features

### Company Predictions (Admin Dashboard)
- **Persistent Storage**: Predictions stored in PostgreSQL database
- **Authentication Required**: Company-specific predictions
- **Historical Data**: Access to past predictions
- **Real-time Updates**: Live prediction generation

### Public Predictions (Mobile App)
- **Cached Results**: Redis caching for performance (3-hour TTL)
- **No Authentication**: Public access for general users
- **Location-based**: GPS-based risk assessment
- **Minimal Logging**: Basic request logging for analytics

### ML Models
- **Model 1**: Historical cases-based prediction (60% weight)
  - **Input**: `latitude`, `longitude` only
  - **Purpose**: Location-based risk assessment
- **Model 2**: Weather-based prediction (40% weight)
  - **Input**: `latitude`, `longitude`, `humidity`, `temperature`, `rainfall`
  - **Purpose**: Weather-conditioned risk assessment
- **Hybrid Scoring**: Weighted average of both models
- **Risk Levels**: High (≥70%), Medium (≥40%), Low (<40%)
- **Weather Data**: Automatically fetched from Open Meteo API if not provided

## 📁 Project Structure

```
drone4dengue/
├── server-ml/                    # Python ML Service
│   ├── prediction_service.py     # Flask app with ML models
│   ├── requirements.txt          # Python dependencies
│   ├── start_service.bat         # Windows startup script
│   ├── start_service.sh          # Unix startup script
│   └── Dockerfile               # Docker configuration
├── server-api/                   # Node.js API Server
│   ├── controllers/
│   │   └── predictionController.js
│   ├── routes/
│   │   └── predictionRoutes.js
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── package.json             # Node.js dependencies
│   └── Dockerfile               # Docker configuration
├── client-admin/                 # Admin Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   └── PredictionMap.tsx
│   │   ├── lib/
│   │   │   └── api.ts           # API client functions
│   │   └── app/
│   │       └── prediction-alert/
│   │           └── page.tsx     # Updated prediction page
│   └── Dockerfile               # Docker configuration
├── client-mobile/               # Mobile App
│   ├── components/
│   │   └── DengueRiskCard.tsx   # Prediction component
│   ├── utils/
│   │   └── userApi.js          # API functions
│   └── app/
│       └── dashboard.tsx        # Updated dashboard
├── daily-scrap-dengue-data/     # ML Models & Data
│   ├── model1_historical_cases_improved.pkl
│   ├── model2_weather_based_improved.pkl
│   ├── scaler1_historical_cases_improved.pkl
│   ├── scaler2_weather_based_improved.pkl
│   └── model_features_improved.json
├── docs/
│   └── prediction-system-setup.md
└── docker-compose.yml           # Docker orchestration
```

## 🛠️ Setup Instructions

### Quick Start with Docker

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd drone4dengue
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations:**
   ```bash
   docker-compose exec api-server npx prisma migrate dev
   ```

4. **Access the applications:**
   - Admin Dashboard: http://localhost:3000
   - API Server: http://localhost:4000
   - ML Service: http://localhost:5001

### Manual Setup

See [prediction-system-setup.md](docs/prediction-system-setup.md) for detailed manual setup instructions.

## 📡 API Endpoints

### Company Predictions (Authenticated)
```http
POST /api/predict/company
Content-Type: application/json
Authorization: Bearer <token>

{
  "companyId": "uuid",
  "lat": 1.3521,
  "lon": 103.8198
}
```

```http
GET /api/predict/company/:companyId?limit=10&offset=0
Authorization: Bearer <token>
```

### Public Predictions (No Auth)
```http
POST /api/predict/public
Content-Type: application/json

{
  "lat": 1.3521,
  "lon": 103.8198,
  "userId": "optional-user-id"
}
```

### Health Check
```http
GET /api/predict/health
```

## 🔧 Configuration

### Environment Variables

**API Server (.env):**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dengue_db"
REDIS_HOST=localhost
REDIS_PORT=6379
ML_SERVICE_URL=http://localhost:5001
JWT_SECRET=your-secret-key
```

**ML Service (.env):**
```env
FLASK_ENV=development
PORT=5001
MODELS_DIR=models
CACHE_TTL=10800
```

### Cache Configuration
- **TTL**: 3 hours (10800 seconds)
- **Key Format**: `prediction:{lat}:{lon}` (rounded to 4 decimal places)
- **Strategy**: Cache-aside pattern

### Model Weights
- **Historical Model**: 60% weight
- **Weather Model**: 40% weight
- **Combined Score**: Weighted average

## 🧪 Testing

### Health Checks
```bash
# ML Service
curl http://localhost:5001/health

# API Server
curl http://localhost:4000/api/predict/health

# Redis
redis-cli ping
```

### Test Predictions
```bash
# Public prediction
curl -X POST http://localhost:4000/api/predict/public \
  -H "Content-Type: application/json" \
  -d '{"lat": 1.3521, "lon": 103.8198}'

# Company prediction (requires auth token)
curl -X POST http://localhost:4000/api/predict/company \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"companyId": "uuid", "lat": 1.3521, "lon": 103.8198}'
```

## 📊 Monitoring

### Service Health
- **ML Service**: Model loading status, prediction success rate
- **API Server**: Database connectivity, Redis connectivity, ML service connectivity
- **Redis**: Memory usage, hit/miss ratio
- **Database**: Connection pool, query performance

### Logging
- **ML Service**: Python logging to stdout
- **API Server**: Console logging with request/response details
- **Prediction Logs**: Minimal logging for public predictions (location, timestamp, userId)

## 🚀 Production Deployment

### Scaling Considerations
- **Load Balancer**: For ML service instances
- **Redis Cluster**: For high availability caching
- **Database**: Connection pooling and read replicas
- **Rate Limiting**: For public prediction endpoints

### Security
- **Authentication**: JWT tokens for company endpoints
- **CORS**: Configured for specific domains
- **Input Validation**: Coordinate validation and sanitization
- **Rate Limiting**: Prevent abuse of public endpoints

## 🔍 Troubleshooting

### Common Issues

1. **ML Service Not Starting**
   - Check if model files exist in `server-ml/models/`
   - Verify Python dependencies are installed
   - Check port 5001 is available

2. **Redis Connection Failed**
   - Ensure Redis server is running
   - Check Redis host/port configuration
   - Verify Redis password (if set)

3. **Database Connection Issues**
   - Check PostgreSQL is running
   - Verify connection string format
   - Run database migrations

4. **Prediction Failures**
   - Check ML service health endpoint
   - Verify coordinate ranges (-90 to 90 for lat, -180 to 180 for lon)
   - Check service logs for detailed errors

### Debug Mode
Set `NODE_ENV=development` and `FLASK_ENV=development` for detailed logging.

## 📈 Performance

### Benchmarks
- **ML Prediction**: ~200-500ms per request
- **Cache Hit**: ~10-20ms response time
- **Database Query**: ~50-100ms for company predictions
- **Concurrent Users**: Tested up to 100 concurrent requests

### Optimization
- **Model Caching**: Models loaded once at startup
- **Feature Preprocessing**: Optimized numpy operations
- **Redis Pipeline**: Batch operations for multiple predictions
- **Database Indexing**: Indexed on companyId and createdAt

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review service logs
3. Test individual components
4. Create an issue with detailed information

---

**Note**: This system is designed for dengue risk prediction and should be used in conjunction with proper medical advice and public health guidelines.
