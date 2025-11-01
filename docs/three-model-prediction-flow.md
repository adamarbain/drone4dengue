# Three-Model Prediction Flow - Complete Guide

## Overview

The three-model prediction system combines:
1. **Model 1**: Historical cases prediction (time-series based)
2. **Model 2**: Weather-based prediction 
3. **Model 3**: Breeding area detection from drone images (AI object detection)

## Complete Flow Diagram

```
Client (Frontend)
    ↓
[1] Check if location has images
    ↓
[2] Fetch images from database (if available)
    ↓
API Server (predictionController.js)
    ↓
[3] Fetch Image records from database using imageIds
    ↓
[4] Convert database URLs to absolute URLs
    ↓
ML Service (prediction_service.py)
    ↓
[5] Process images through breeding_area_detection_service.py
    ↓
[6] Combine results from all 3 models
    ↓
[7] Store prediction + breeding area detections in database
```

## Step-by-Step Flow

### Step 1: Client-Side Decision (PredictionMap.tsx)

**Location**: `client-admin/src/components/PredictionMap.tsx`

The client checks if a company location has images before deciding which prediction type to use:

```typescript
// Check if location has images
const hasImages = await checkLocationHasImages(locationId)

if (hasImages) {
  // Get images for the location
  const imagesResponse = await getLocationImages(companyId, locationId)
  const imageIds = imagesResponse.images?.map(img => img.id) || []
  
  // Use three-model prediction
  await predictCompanyThreeModels({
    companyId,
    companyLocationId: locationId,
    lat, lon,
    imageIds
  })
} else {
  // Use standard two-model prediction
  await predictCompany({
    companyId,
    companyLocationId: locationId,
    lat, lon
  })
}
```

**Key Function**: `checkLocationHasImages()` uses `getLocationImages()` to check if any images exist for a location.

### Step 2: Fetching Images from Database

**Location**: `server-api/controllers/droneController.js`

**Endpoint**: `GET /api/drones/locations/:companyLocationId/images`

The API fetches all images associated with a company location:

```javascript
// From droneController.js - getLocationImages()
const images = await prisma.image.findMany({
  where: {
    companyId: companyId,
    companyLocationId: companyLocationId
  },
  include: {
    drone: { /* ... */ },
    company: { /* ... */ },
    companyLocation: { /* ... */ }
  },
  orderBy: { createdAt: 'desc' }
});
```

**Database Schema** (from `schema.prisma`):
```prisma
model Image {
  id                String   @id
  url               String   // Relative path like "/uploads/drones/filename.jpg"
  filename          String
  fileSize          Int
  mimeType          String
  companyId         String
  companyLocationId String?
  droneId           String
  // ... other fields
}
```

### Step 3: Image ID Extraction (Frontend)

**Location**: `client-admin/src/components/PredictionMap.tsx`

After fetching images, the client extracts only the image IDs:

```typescript
const imagesResponse = await getLocationImages(companyId, location.id)
const imageIds = imagesResponse.images?.map(img => img.id) || []
```

These IDs are then sent to the prediction endpoint.

### Step 4: Three-Model Prediction Request

**Location**: `server-api/controllers/predictionController.js`

**Endpoint**: `POST /api/predict/company/three-models`

**Input**:
```json
{
  "companyId": "uuid",
  "companyLocationId": "uuid",
  "lat": 3.1390,
  "lon": 101.6869,
  "imageIds": ["uuid1", "uuid2", "uuid3"]  // Optional
}
```

### Step 5: Fetch Images by IDs (Backend)

**Location**: `server-api/controllers/predictionController.js` - `predictCompanyThreeModels()`

The backend fetches images using the provided imageIds:

```javascript
// Get drone images for this location if imageIds are provided
let imageUrls = [];
if (imageIds && imageIds.length > 0) {
  const images = await prisma.image.findMany({
    where: {
      id: { in: imageIds },
      companyId: companyId,
      companyLocationId: companyLocationId
    },
    select: {
      id: true,
      url: true,
      filename: true
    }
  });

  // Convert relative URLs to absolute URLs
  imageUrls = images.map(img => {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    return `${baseUrl}${img.url}`;
  });
}
```

**Important**: 
- Images are filtered by `companyId` and `companyLocationId` for security
- Relative URLs (e.g., `/uploads/drones/image.jpg`) are converted to absolute URLs (e.g., `http://localhost:4000/uploads/drones/image.jpg`)

### Step 6: Send to ML Service

**Location**: `server-api/controllers/predictionController.js` - `getMLThreeModelPrediction()`

The backend sends a request to the ML service with image URLs:

```javascript
const payload = {
  latitude,
  longitude,
  image_urls: imageUrls  // Array of absolute URLs
};

const response = await axios.post(`${ML_SERVICE_URL}/predict/three-models`, payload, {
  timeout: 60000 // 60 second timeout
});
```

### Step 7: ML Service Processing

**Location**: `server-ml/prediction_service.py` - `predict_risk_with_breeding_areas()`

The ML service processes images through Model 3:

```python
# Process breeding area detection if image URLs are provided
if image_urls and len(image_urls) > 0:
    all_detections = []
    total_score = 0.0
    
    for image_url in image_urls:
        detection_result = self.breeding_area_service.detect_breeding_areas_from_url(image_url)
        
        if detection_result.get('success', False):
            all_detections.extend(detection_result.get('detections', []))
            total_score += detection_result.get('breeding_area_score', 0.0)
    
    # Calculate average score
    model3_score = total_score / len(image_urls)
```

**Location**: `server-ml/breeding_area_detection_service.py`

The breeding area detection service:
1. Downloads images from URLs
2. Uses Roboflow API for object detection
3. Returns detection results with bounding boxes and confidence scores

### Step 8: Combine All Three Models

**Location**: `server-ml/prediction_service.py`

Scores from all three models are combined:

```python
# Weighted combination
# Model 1 (40%), Model 2 (35%), Model 3 (25%)
model1_normalized = min(max(model1_score / 10.0, 0.0), 1.0)
model2_normalized = min(max(model2_score / 10.0, 0.0), 1.0)
model3_normalized = model3_score  # Already 0-1 range

combined_score = (
    0.40 * model1_normalized + 
    0.35 * model2_normalized + 
    0.25 * model3_normalized
)
```

### Step 9: Store Results in Database

**Location**: `server-api/controllers/predictionController.js`

The backend stores:
1. **Prediction record** in `CompanyPrediction` table:
   ```javascript
   const companyPrediction = await prisma.companyPrediction.create({
     data: {
       companyId,
       companyLocationId,
       latitude: lat,
       longitude: lon,
       riskScore: prediction.combined_score,
       model1Score: prediction.model1_score,
       model2Score: prediction.model2_score,
       model3Score: prediction.model3_score,
       combinedScore: prediction.combined_score
     }
   });
   ```

2. **Breeding area detection records** in `BreedingAreaDetection` table:
   ```javascript
   for (const image of processedImages) {
     const detection = await prisma.breedingAreaDetection.create({
       data: {
         imageId: image.id,
         companyId: companyId,
         companyLocationId: companyLocationId,
         breedingAreaScore: prediction.model3_score,
         detectedObjects: prediction.breeding_area_detections,
         boundingBoxes: prediction.breeding_area_detections.map(d => d.bbox),
         riskLevel: prediction.model3_risk_level,
         processingStatus: 'completed'
       }
     });
   }
   ```

## Database Relationships

```
CompanyLocation
    ↓ (has many)
Image (with companyLocationId)
    ↓ (has many)
BreedingAreaDetection
    ↓ (belongs to)
CompanyPrediction
```

## Image Storage Structure

Images are stored on the file system:
- **Upload directory**: `server-api/uploads/drones/`
- **Database URL**: `/uploads/drones/{filename}`
- **Absolute URL**: `{API_BASE_URL}/uploads/drones/{filename}`

## Key API Endpoints

### 1. Get Location Images
```
GET /api/drones/locations/:companyLocationId/images
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  images: [
    {
      id: "uuid",
      url: "/uploads/drones/image.jpg",
      filename: "image.jpg",
      companyLocationId: "uuid",
      createdAt: "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Three-Model Prediction
```
POST /api/predict/company/three-models
Headers: Authorization: Bearer <token>
Body: {
  companyId: "uuid",
  companyLocationId: "uuid",
  lat: 3.1390,
  lon: 101.6869,
  imageIds: ["uuid1", "uuid2"]  // Optional
}
Response: {
  success: true,
  prediction: {
    combined_score: 0.75,
    model1_score: 2.5,
    model2_score: 3.1,
    model3_score: 0.8,
    risk_level: "high",
    breeding_area_detections: [...],
    images_processed: 2
  }
}
```

## Security Considerations

1. **Image Access Control**: Images are filtered by `companyId` and `companyLocationId`
2. **Authentication Required**: All endpoints require Bearer token
3. **Validation**: Image IDs are validated before database queries
4. **URL Conversion**: Relative URLs are converted server-side to prevent client manipulation

## Error Handling

- If images fail to load: Falls back to two-model prediction
- If ML service is unavailable: Returns error with appropriate status code
- If image URLs are invalid: Breeding area detection fails gracefully, other models still work

## Performance Considerations

- **Timeout**: 60 seconds for three-model prediction (vs 30 seconds for two-model)
- **Batch Processing**: Multiple images processed sequentially
- **Caching**: Redis caching available for predictions (disabled in current config)
- **Image Size**: Large images may cause timeouts; consider image compression

## Summary

The three-model prediction flow:
1. Client checks if location has images
2. Fetches image IDs from database via API
3. Sends imageIds to prediction endpoint
4. Backend fetches images and converts URLs to absolute
5. ML service processes images through Model 3
6. All three models are combined with weights
7. Results stored in database with breeding area detection records

The key advantage is that **Model 3 provides visual evidence** of breeding areas in drone images, making predictions more accurate and actionable.

