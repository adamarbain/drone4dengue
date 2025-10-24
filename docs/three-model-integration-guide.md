# Three-Model Dengue Prediction System Integration

## 🎯 Overview

The Drone4Dengue system now includes **three integrated models** for comprehensive dengue risk prediction:

1. **Model 1**: Historical Cases Prediction
2. **Model 2**: Weather-Based Prediction  
3. **Model 3**: Breeding Area Detection from Drone Images

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
            │ PostgreSQL   │ │   Redis   │ │ Roboflow  │
            │   Database   │ │   Cache   │ │   API     │
            └─────────────┘ └───────────┘ └───────────┘
```

## 🚀 New Features

### Model 3: Breeding Area Detection
- **Purpose**: Detects potential dengue breeding areas in drone images
- **Technology**: Roboflow API with custom trained model
- **Input**: Drone images (JPG, PNG)
- **Output**: Confidence scores, bounding boxes, risk levels

### Three-Model Integration
- **Combined Scoring**: Weighted combination of all three models
- **Model Weights**: Model 1 (40%), Model 2 (35%), Model 3 (25%)
- **Risk Levels**: Low (<40%), Medium (40-70%), High (≥70%)

## 📊 Database Schema Updates

### New Tables
- `BreedingAreaDetection`: Stores detection results for each image

### Updated Tables
- `CompanyPrediction`: Added `model3Score` and `combinedScore` fields
- `Image`: Added relation to `BreedingAreaDetection`

## 🔌 API Endpoints

### New Endpoints

#### 1. Three-Model Company Prediction
```http
POST /api/predict/company/three-models
```

**Request Body:**
```json
{
  "companyId": "uuid",
  "companyLocationId": "uuid", 
  "lat": 1.3521,
  "lon": 103.8198,
  "imageIds": ["image-uuid-1", "image-uuid-2"]
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "id": "prediction-uuid",
    "combinedScore": 0.75,
    "riskLevel": "high",
    "model1Score": 8.5,
    "model2Score": 7.2,
    "model3Score": 0.8,
    "breedingAreaDetections": [...],
    "imagesProcessed": 2,
    "modelsUsed": ["model1_historical", "model2_weather", "model3_breeding_area"]
  }
}
```

#### 2. Breeding Area Detection Only
```http
POST /api/predict/detect-breeding-areas
```

**Request Body:**
```json
{
  "imageIds": ["image-uuid-1", "image-uuid-2"],
  "companyId": "uuid",
  "companyLocationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "detection": {
    "breedingAreaScore": 0.8,
    "riskLevel": "high",
    "detections": [...],
    "detectionCount": 3,
    "imagesProcessed": 2,
    "recommendations": [...]
  }
}
```

### ML Service Endpoints

#### 1. Three-Model Prediction
```http
POST http://localhost:5001/predict/three-models
```

**Request Body:**
```json
{
  "latitude": 1.3521,
  "longitude": 103.8198,
  "image_urls": ["https://example.com/image1.jpg"],
  "historical_cases_data": [
    {"date": "2024-01-01", "cases": 5}
  ]
}
```

#### 2. Breeding Area Detection
```http
POST http://localhost:5001/detect-breeding-areas
```

**Request Body:**
```json
{
  "image_urls": ["https://example.com/image1.jpg"]
}
```

## 🛠️ Setup Instructions

### 1. Database Migration
```bash
cd server-api
npx prisma migrate dev --name add_model3_breeding_area_detection
npx prisma generate
```

### 2. Python ML Service
```bash
cd server-ml
pip install -r requirements.txt
python prediction_service.py
```

### 3. Node.js API Server
```bash
cd server-api
npm install
npm run dev
```

### 4. Test Integration
```bash
cd server-ml
python test_three_model_integration.py
```

## 📱 Usage Examples

### JavaScript/Node.js
```javascript
// Three-model prediction
const response = await fetch('/api/predict/company/three-models', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    companyId: 'company-uuid',
    companyLocationId: 'location-uuid',
    lat: 1.3521,
    lon: 103.8198,
    imageIds: ['image-uuid-1', 'image-uuid-2']
  })
});

const result = await response.json();
console.log('Combined Risk Score:', result.prediction.combinedScore);
console.log('Risk Level:', result.prediction.riskLevel);
```

### Python
```python
import requests

# Three-model prediction
payload = {
    "latitude": 1.3521,
    "longitude": 103.8198,
    "image_urls": ["https://example.com/image1.jpg"],
    "historical_cases_data": [
        {"date": "2024-01-01", "cases": 5}
    ]
}

response = requests.post(
    "http://localhost:5001/predict/three-models",
    json=payload,
    timeout=60
)

result = response.json()
print(f"Combined Score: {result['prediction']['combined_score']}")
print(f"Risk Level: {result['prediction']['risk_level']}")
```

## 🔧 Configuration

### Environment Variables

#### ML Service (.env)
```env
ROBOFLOW_API_KEY=1jgNe8OZcnOOk2JgN95a
ROBOFLOW_MODEL_ID=drone4dengue-ja1rz/3
```

#### API Service (.env)
```env
ML_SERVICE_URL=http://localhost:5001
API_BASE_URL=http://localhost:4000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Model Weights (Configurable)
```python
# In prediction_service.py
combined_score = (
    0.40 * model1_normalized +  # Historical cases
    0.35 * model2_normalized +  # Weather-based
    0.25 * model3_normalized    # Breeding area detection
)
```

## 📈 Performance Considerations

### Image Processing
- **Timeout**: 60 seconds for image processing
- **Batch Processing**: Multiple images processed in parallel
- **Caching**: Results cached for 3 hours
- **Error Handling**: Graceful degradation if images fail

### API Rate Limits
- **Roboflow API**: Respect rate limits (check documentation)
- **Concurrent Requests**: Limit concurrent image processing
- **Retry Logic**: Automatic retry for failed requests

## 🧪 Testing

### Test Script
```bash
cd server-ml
python test_three_model_integration.py
```

### Manual Testing
1. Upload drone images via admin dashboard
2. Run three-model prediction with image IDs
3. Verify breeding area detection results
4. Check database records

## 🚨 Error Handling

### Common Issues
1. **ML Service Unavailable**: Check if Python service is running
2. **Image Processing Failed**: Verify image URLs are accessible
3. **Database Connection**: Check PostgreSQL connection
4. **Roboflow API**: Verify API key and model ID

### Error Responses
```json
{
  "success": false,
  "error": "ML service is not running or not accessible",
  "prediction": {
    "combined_score": 0.0,
    "risk_level": "unknown"
  }
}
```

## 📚 Model Details

### Model 1: Historical Cases
- **Features**: 11 features including historical case patterns
- **Algorithm**: Random Forest, Gradient Boosting
- **Input**: Coordinates, historical data, temporal features

### Model 2: Weather-Based
- **Features**: 9 features including weather data
- **Algorithm**: Random Forest, Linear Regression
- **Input**: Coordinates, temperature, humidity, rainfall

### Model 3: Breeding Area Detection
- **Technology**: Roboflow API with custom model
- **Input**: Drone images (JPG, PNG)
- **Output**: Confidence scores, bounding boxes, risk levels

## 🔄 Workflow

1. **Image Upload**: Admin uploads drone images
2. **Image Processing**: Images stored in database
3. **Prediction Request**: Three-model prediction initiated
4. **Model Execution**: All three models run in parallel
5. **Result Combination**: Weighted combination of scores
6. **Database Storage**: Results stored with metadata
7. **Response**: Comprehensive prediction returned

## 📊 Monitoring

### Health Checks
- **ML Service**: `GET /health`
- **API Service**: `GET /api/predict/health`
- **Database**: Prisma connection check
- **Redis**: Connection status

### Logging
- **ML Service**: Python logging to stdout
- **API Service**: Console logging with timestamps
- **Database**: Query performance monitoring

## 🎯 Future Enhancements

1. **Real-time Processing**: WebSocket support for live updates
2. **Batch Processing**: Queue system for large image sets
3. **Model Retraining**: Automated model updates
4. **Advanced Analytics**: Trend analysis and reporting
5. **Mobile Integration**: Direct image capture and processing

## 📞 Support

For issues or questions:
1. Check the logs for error messages
2. Verify all services are running
3. Test individual components
4. Check network connectivity between services
5. Review API documentation and examples
