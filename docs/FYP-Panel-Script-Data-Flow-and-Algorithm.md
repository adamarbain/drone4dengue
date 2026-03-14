# FYP Panel Questions - Technical Demonstration Script

## Panel Question 1: Data Transfer Flow - How Drone Data Moves to Database

### Opening Statement
"Thank you for this important question. Let me demonstrate how our system handles data transfer from drone imagery to the database, and then explain our multi-model risk determination algorithm."

---

## PART A: DATA TRANSFER FLOW (FROM DRONE TO DATABASE)

### Step 1: Frontend - User Initiates Upload
**Location:** `client-admin/src/app/drone-management/page.tsx`

**Line 410-435:** The uploadImages function
```typescript
const uploadImages = async (files: File[], droneId: string) => {
  try {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('images', file)
    })

    const response = await fetch(`${API_URL}/drones/${droneId}/upload-images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    })
    // ... handle response
  }
}
```

**Explanation to Panel:**
> "When a user uploads drone images through the admin dashboard, the frontend creates a FormData object containing multiple image files. This is sent to our backend API endpoint `/drones/{droneId}/upload-images` with authentication."

---

### Step 2: Backend API Receives Request
**Location:** `server-api/routes/droneRoutes.js`

**Line 59-65:** Route definition
```javascript
router.post('/:droneId/upload-images', 
  checkToken,                  // Authentication middleware
  checkRole('admin'),          // Authorization middleware
  uploadMiddleware,            // Multer file upload middleware
  handleUploadError,           // Error handling
  uploadImages                 // Controller function
);
```

**Explanation to Panel:**
> "The request first passes through three layers of middleware: authentication to verify the JWT token, authorization to ensure only admins can upload, and Multer middleware which temporarily stores the files on the server."

---

### Step 3: File Processing and Cloud Storage
**Location:** `server-api/controllers/droneController.js`

**Line 478-574:** The uploadImages controller function

**Key Operations:**

1. **Validate Drone Ownership (Lines 492-501)**
```javascript
const drone = await prisma.drone.findFirst({
  where: {
    id: droneId,
    companyId: req.companyId
  }
});
```

2. **Upload to Firebase Storage (Lines 505-524)**
```javascript
for (const file of files) {
  // Generate Firebase Storage path
  const storagePath = generateStoragePath(file.originalname, 'drone-images');
  
  // Upload to Firebase Storage
  const firebaseUrl = await uploadImage(file.path, storagePath, {
    contentType: file.mimetype,
    customMetadata: {
      originalName: file.originalname,
      droneId: droneId,
      uploadedBy: req.user?.userId || 'system',
    },
  });
  
  // Clean up temporary local file
  fs.unlinkSync(file.path);
}
```

3. **Store Metadata in Database (Lines 526-539)**
```javascript
const fileData = {
  url: firebaseUrl,              // Firebase URL (permanent storage)
  filename: file.originalname,
  fileSize: file.size,
  mimeType: file.mimetype,
  sourceType: 'upload',
  droneId: droneId,
  companyId: req.companyId,
  companyLocationId: drone.companyLocationId || null
};

const image = await prisma.image.create({
  data: fileData
});
```

**Explanation to Panel:**
> "The system performs three critical operations: First, it verifies the drone belongs to the company for security. Second, it uploads the actual image file to Firebase Cloud Storage, which provides scalability and CDN delivery. Third, it stores only the metadata—the Firebase URL, filename, size, and relationships—in our PostgreSQL database via Prisma ORM. This hybrid approach keeps the database lightweight while ensuring images are accessible worldwide."

---

### Step 4: Database Schema
**Location:** `server-api/prisma/schema.prisma`

**Lines 118-144:** Image model
```prisma
model Image {
  id                String           @id @default(uuid())
  url               String           // Firebase Storage URL
  filename          String
  fileSize          Int
  mimeType          String
  sourceType        String           @default("upload")
  droneId           String
  drone             Drone            @relation(fields: [droneId], references: [id])
  companyId         String
  company           Company          @relation(fields: [companyId], references: [id])
  companyLocationId String?
  companyLocation   CompanyLocation? @relation(fields: [companyLocationId], references: [id])
  isProcessed       Boolean          @default(false)
  createdAt         DateTime         @default(now())
  breedingAreaDetections BreedingAreaDetection[]
  
  @@index([droneId])
  @@index([companyId])
  @@index([companyLocationId])
  @@index([isProcessed])
}
```

**Explanation to Panel:**
> "Our database schema uses foreign keys to maintain referential integrity. Each image is linked to a drone, a company, and optionally a specific company location. The `isProcessed` flag tracks whether the image has been analyzed by our ML models. These indexes on key fields ensure fast queries even with thousands of images."

---

## PART B: RISK DETERMINATION ALGORITHM

### Overview Statement
> "Our dengue risk determination system uses a Three-Model Ensemble Approach: Model 1 analyzes historical dengue case patterns, Model 2 evaluates weather conditions, and Model 3 uses computer vision to detect mosquito breeding sites in drone imagery."

---

### Model 1: Historical Cases Prediction
**Location:** `server-ml/prediction_service.py`

**Lines 729-748:** Model 1 prediction logic

**Algorithm:**
```python
# Predict with Model 1 (Historical Cases)
if self.model1 and self.scaler1:
    # Check if it's a tree-based model (like RandomForest)
    if hasattr(self.model1, 'feature_importances_'):
        # Tree-based model - no scaling needed
        model1_prediction = float(self.model1.predict(model1_features.reshape(1, -1))[0])
    else:
        # Linear model - needs scaling
        model1_scaled = self.scaler1.transform(model1_features.reshape(1, -1))
        model1_prediction = float(self.model1.predict(model1_scaled)[0])
    
    results["model1_score"] = float(model1_prediction)
```

**Features Used:**
- `cases_last_7days` - Number of dengue cases in the last week
- `cases_last_14days` - Rolling 14-day case count
- `cases_last_30days` - Monthly case trend
- `is_hotspot` - Whether location is a known dengue hotspot
- `location_cluster` - Geographical clustering of cases

**Explanation to Panel:**
> "Model 1 uses a Random Forest Regressor trained on historical dengue data. It analyzes temporal patterns—how many cases occurred in the last 7, 14, and 30 days—and spatial patterns—whether the location is a known hotspot. The model outputs a predicted case count, which we normalize to a risk score."

---

### Model 2: Weather-Based Prediction
**Location:** `server-ml/prediction_service.py`

**Lines 750-769:** Model 2 prediction logic

**Algorithm:**
```python
# Predict with Model 2 (Weather-based)
if self.model2 and self.scaler2:
    if hasattr(self.model2, 'feature_importances_'):
        model2_prediction = float(self.model2.predict(model2_features.reshape(1, -1))[0])
    else:
        model2_scaled = self.scaler2.transform(model2_features.reshape(1, -1))
        model2_prediction = float(self.model2.predict(model2_scaled)[0])
    
    results["model2_score"] = float(model2_prediction)
```

**Features Used:**
- `temperature` - Current temperature (°C)
- `rainfall` - Recent rainfall (mm)
- `humidity` - Relative humidity (%)
- `temperature_lag_7` - Temperature 7 days ago
- `rainfall_lag_7` - Rainfall 7 days ago

**Scientific Basis:**
> "Dengue mosquitoes (Aedes aegypti) thrive in temperatures between 25-30°C. Rainfall creates breeding sites, but there's a 7-14 day lag before larvae mature into adult mosquitoes. Our model captures these temporal relationships."

**Explanation to Panel:**
> "Model 2 analyzes meteorological conditions that favor mosquito breeding. Research shows dengue cases spike 7-14 days after heavy rainfall when temperatures are optimal. Our model uses current weather plus lagged features to predict this incubation period."

---

### Model 3: Breeding Area Detection (Computer Vision)
**Location:** `server-ml/breeding_area_detection_service.py`

**Lines 50-81 & 130-238:** Detection and scoring logic

**Algorithm:**

1. **Object Detection via Roboflow API**
```python
def detect_breeding_areas_from_url(self, image_url: str) -> Dict:
    # Use Roboflow's trained model
    result = self.client.infer(image_url, model_id=self.model_id)
    
    # Process detections
    processed_result = self._process_detection_result(result)
    return processed_result
```

2. **Confidence and Area Weighting**
```python
for detection in detections:
    confidence = detection.get('confidence', 0)
    
    # Calculate area weight (larger areas are more significant)
    width = bbox.get('width', 0)
    height = bbox.get('height', 0)
    area = width * height
    area_weight = min(area / 10000, 1.0)
    
    # Combined score: confidence * area_weight
    weighted_score = confidence * (0.7 + 0.3 * area_weight)
    
    total_weighted_score += weighted_score
    total_weight += 1.0
```

3. **Risk Level Determination**
```python
# Calculate final breeding area score
breeding_area_score = total_weighted_score / total_weight

# Determine risk level based on score
if breeding_area_score >= 0.7:
    risk_level = "high"
elif breeding_area_score >= 0.4:
    risk_level = "medium"
else:
    risk_level = "low"
```

**What the Model Detects:**
- Stagnant water in containers
- Puddles and water accumulation
- Open water storage tanks
- Clogged drains
- Discarded tires with water
- Any potential mosquito breeding sites

**Explanation to Panel:**
> "Model 3 uses a custom-trained YOLOv8 object detection model deployed on Roboflow. We trained it on 2,000+ annotated drone images of potential breeding sites. When analyzing an image, it detects objects, assigns confidence scores, and weights them by area size—larger breeding sites pose higher risk. A container with 0.85 confidence covering 500 pixels² receives a higher weighted score than a small puddle with 0.6 confidence."

---

### Model Ensemble: Combining All Three Models
**Location:** `server-api/controllers/predictionController.js`

**Lines 396-417:** Three-model integration

**Ensemble Algorithm:**

1. **Call ML Service with Images**
```javascript
const mlResult = await getMLThreeModelPrediction(
  lat, 
  lon, 
  null,        // weather data (fetched by ML service)
  null,        // historical data (fetched by ML service)  
  null,        // target date
  imageUrls    // drone images for Model 3
);
```

2. **ML Service Combines Scores**
**Location:** `server-ml/prediction_service.py` (lines 1000-1050)

```python
# Weighted combination of all three models
model1_weight = 0.35  # Historical cases
model2_weight = 0.35  # Weather conditions
model3_weight = 0.30  # Breeding area detection

combined_score = (
    model1_score * model1_weight +
    model2_score * model2_weight +
    model3_score * model3_weight
)

# Risk level determination
if combined_score >= 3.0:
    risk_level = "high"
elif combined_score >= 1.0:
    risk_level = "medium"
else:
    risk_level = "low"
```

3. **Store Results in Database**
**Location:** `server-api/controllers/predictionController.js` (lines 406-429)

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

**Explanation to Panel:**
> "Our ensemble approach gives equal weight to historical patterns and weather conditions (35% each), with breeding site detection contributing 30%. This balance ensures no single factor dominates. For example, even if historical cases are low, the presence of many breeding sites can elevate the risk level. The combined score is stored with individual model scores, allowing auditing and model performance tracking."

---

### Risk Level Thresholds (Customizable per Company)
**Location:** `server-api/utils/riskLevelUtils.js`

```javascript
function getRiskLevel(riskScore, predictionModelParameters = {}) {
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
```

**Explanation to Panel:**
> "Companies can customize risk thresholds based on their risk tolerance. A hospital might set lower thresholds (more sensitive), while a warehouse might accept higher thresholds. This flexibility makes our system adaptable to different industries and risk profiles."

---

## Real-World Example Walkthrough

### Scenario: Dengue Risk Assessment for Kuala Lumpur Office

**Input:**
- Location: KLCC Office (3.1579°N, 101.7116°E)
- Drone images: 5 images uploaded from recent surveillance
- Date: After heavy rainfall

**Step-by-Step Processing:**

1. **Model 1 Analysis:**
   - Queries historical dengue data within 5km radius
   - Last 7 days: 12 cases
   - Last 30 days: 45 cases
   - Location is a known hotspot
   - **Model 1 Score: 2.8** (Medium-High)

2. **Model 2 Analysis:**
   - Current temperature: 29°C (optimal for mosquitoes)
   - Rainfall last 7 days: 85mm (heavy)
   - Humidity: 78% (high)
   - **Model 2 Score: 3.2** (High)

3. **Model 3 Analysis:**
   - Image 1: Detected 3 water containers (confidence: 0.87, 0.79, 0.82)
   - Image 2: Detected 1 large puddle (confidence: 0.91)
   - Image 3: No breeding sites detected
   - Image 4: Detected 2 clogged drains (confidence: 0.76, 0.68)
   - Image 5: Detected 1 water storage tank (confidence: 0.93)
   - **Weighted Average Score: 0.73**
   - **Model 3 Score: 2.9** (High)

4. **Final Ensemble:**
```
Combined Score = (2.8 × 0.35) + (3.2 × 0.35) + (2.9 × 0.30)
               = 0.98 + 1.12 + 0.87
               = 2.97
```
**Final Risk Level: MEDIUM (close to HIGH threshold of 3.0)**

**System Actions:**
- Store prediction in `CompanyPrediction` table
- Store breeding detections in `BreedingAreaDetection` table
- Send push notifications to mobile app users
- Generate actionable recommendations:
  - "Immediate action recommended - multiple breeding sites detected"
  - "Schedule inspection of water containers in parking area"
  - "Consider fogging treatment due to recent rainfall"

---

## Advantages of Our Three-Model Approach

1. **Robustness:** If one model has poor data quality, others compensate
2. **Explainability:** We can show which factors contributed most to risk
3. **Actionability:** Breeding site detection provides specific locations to address
4. **Validation:** Cross-validation between historical trends and environmental factors
5. **Real-time:** Combines real-time drone imagery with historical and weather data

---

## Technical Architecture Highlights

### Security:
- JWT authentication on all API endpoints
- Role-based access control (admin vs user)
- Company data isolation (multi-tenant architecture)

### Scalability:
- Images stored in Firebase Storage (CDN-backed)
- Database indexes on frequently queried fields
- Redis caching for predictions (3-hour TTL)
- Microservice architecture (Node.js API + Python ML service)

### Data Integrity:
- Foreign key constraints prevent orphaned records
- Transaction-based operations for multi-step processes
- Automatic cleanup of temporary files after Firebase upload

---

## Closing Statement

> "In summary, our system ensures secure, efficient data flow from drone to database using Firebase Storage and PostgreSQL. Our three-model ensemble—historical cases, weather analysis, and computer vision—provides comprehensive, explainable dengue risk assessments. Each component is designed for scalability, accuracy, and real-world actionability."

---

## Appendix: Key Technologies

- **Frontend:** Next.js (React), TypeScript, Framer Motion
- **Backend API:** Node.js, Express, Prisma ORM
- **ML Service:** Python, Flask, scikit-learn, Roboflow
- **Database:** PostgreSQL
- **Cloud Storage:** Firebase Storage
- **Authentication:** JWT (JSON Web Tokens)
- **Object Detection:** YOLOv8 via Roboflow API
- **Real-time Notifications:** Firebase Cloud Messaging

---

**End of Script**
