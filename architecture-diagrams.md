# System Architecture Diagrams - FYP Presentation

## Diagram 1: Complete Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DRONE4DENGUE SYSTEM ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   DRONE OPERATOR │
│  (Admin Panel)   │
└────────┬─────────┘
         │
         │ 1. Upload Images/Videos
         │ (HTTP POST with FormData)
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT ADMIN (Next.js)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  File: client-admin/src/app/drone-management/page.tsx               │  │
│  │  - uploadImages() function                                           │  │
│  │  - uploadVideoFrames() function                                      │  │
│  │  - Video frame extraction (HTML5 Canvas)                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ 2. POST /drones/:id/upload-images
                                 │    Authorization: Bearer <JWT>
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND API (Node.js/Express)                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  MIDDLEWARE CHAIN                                                    │  │
│  │  1. checkToken() - Verify JWT                                       │  │
│  │  2. checkRole('admin') - Verify admin role                         │  │
│  │  3. uploadMiddleware - Multer file upload                          │  │
│  │  4. uploadImages() - Controller                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  File: server-api/controllers/droneController.js                    │  │
│  │                                                                      │  │
│  │  uploadImages() Function Flow:                                      │  │
│  │  ┌─────────────────────────────────────────────────────┐           │  │
│  │  │ 1. Validate drone ownership                        │           │  │
│  │  │    - prisma.drone.findFirst()                      │           │  │
│  │  │    - Check companyId matches                       │           │  │
│  │  └─────────────────────────────────────────────────────┘           │  │
│  │                      │                                              │  │
│  │                      ▼                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐           │  │
│  │  │ 2. Upload to Firebase Storage                      │           │  │
│  │  │    - generateStoragePath()                         │           │  │
│  │  │    - uploadImage(file.path, storagePath)          │           │  │
│  │  │    - Returns: Firebase URL                         │           │  │
│  │  └─────────────────────────────────────────────────────┘           │  │
│  │                      │                                              │  │
│  │                      ▼                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐           │  │
│  │  │ 3. Store metadata in database                      │           │  │
│  │  │    - prisma.image.create()                         │           │  │
│  │  │    - Data: url, filename, fileSize, etc.          │           │  │
│  │  └─────────────────────────────────────────────────────┘           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────┬──────────────────────────────────────────┬──────────────────────────────┘
     │ 3a. Store Metadata                       │ 3b. Store Binary
     ▼                                          ▼
┌─────────────────────────────┐    ┌───────────────────────────────────┐
│   PostgreSQL Database        │    │   Firebase Cloud Storage          │
│                             │    │                                   │
│  Image Table:               │    │  Bucket: drone4dengue             │
│  ┌─────────────────────┐   │    │  Path: /drone-images/             │
│  │ id: UUID            │   │    │       company-{id}/               │
│  │ url: Firebase URL   │◄──┼────┼──     {timestamp}-{random}.jpg    │
│  │ filename: string    │   │    │                                   │
│  │ fileSize: int       │   │    │  Features:                        │
│  │ mimeType: string    │   │    │  - CDN delivery                   │
│  │ droneId: UUID       │   │    │  - Automatic scaling              │
│  │ companyId: UUID     │   │    │  - Signed URLs for security       │
│  │ sourceType: enum    │   │    │  - Geo-redundancy                 │
│  │ isProcessed: bool   │   │    │                                   │
│  │ createdAt: datetime │   │    │                                   │
│  └─────────────────────┘   │    │                                   │
│                             │    └───────────────────────────────────┘
│  Foreign Keys:              │
│  - droneId → Drone.id       │
│  - companyId → Company.id   │
│  - locationId → Location.id │
└─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    KEY DESIGN DECISIONS                                      │
│                                                                              │
│  1. HYBRID STORAGE:                                                         │
│     - Binary data (images) → Firebase Storage (cloud, scalable)            │
│     - Metadata → PostgreSQL (relational, queryable)                        │
│                                                                              │
│  2. SECURITY:                                                               │
│     - JWT authentication on all endpoints                                  │
│     - Company-based data isolation (multi-tenant)                          │
│     - Signed URLs for image access                                         │
│                                                                              │
│  3. PERFORMANCE:                                                            │
│     - Firebase CDN for global image delivery                               │
│     - Database indexes on droneId, companyId, locationId                   │
│     - Multer for efficient file handling                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 2: Three-Model Risk Determination Algorithm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              DENGUE RISK DETERMINATION - THREE MODEL ENSEMBLE                │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │  PREDICTION     │
                          │  REQUEST        │
                          │  - latitude     │
                          │  - longitude    │
                          │  - image_urls   │
                          └────────┬────────┘
                                   │
                                   │ POST /api/predict/three-models
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ML SERVICE (Python/Flask)                             │
│                   File: server-ml/prediction_service.py                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
        ┌──────────────────┐  ┌──────────────┐  ┌────────────────────┐
        │   MODEL 1        │  │   MODEL 2    │  │   MODEL 3          │
        │   Historical     │  │   Weather    │  │   Breeding Area    │
        │   Cases          │  │   Based      │  │   Detection (CV)   │
        └──────────────────┘  └──────────────┘  └────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              MODEL 1 DETAILS                                  │
│                        (Historical Cases Analysis)                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Algorithm: Random Forest Regressor                                          │
│                                                                               │
│  Input Features:                                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  1. cases_last_7days     → Recent outbreak indicator         │            │
│  │  2. cases_last_14days    → Medium-term trend                 │            │
│  │  3. cases_last_30days    → Long-term pattern                 │            │
│  │  4. cases_avg_7days      → Rolling average                   │            │
│  │  5. cases_avg_14days     → Trend smoothing                   │            │
│  │  6. cases_avg_30days     → Seasonal pattern                  │            │
│  │  7. is_hotspot           → Known high-risk area (0 or 1)     │            │
│  │  8. location_cluster     → Geographical grouping (0-5)       │            │
│  │  9. latitude             → Geographic coordinate             │            │
│  │ 10. longitude            → Geographic coordinate             │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                               │
│  Processing Flow:                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  1. Query historical dengue data within 5km radius               │   │
│  │     SELECT * FROM dengue_data                                     │   │
│  │     WHERE distance(lat, lon, input_lat, input_lon) <= 5km        │   │
│  │                                                                    │   │
│  │  2. Calculate temporal features:                                  │   │
│  │     - Sum cases in last 7, 14, 30 days                           │   │
│  │     - Calculate rolling averages                                  │   │
│  │                                                                    │   │
│  │  3. Check if location is in hotspot database                     │   │
│  │     - Load dengue_hotspot.csv                                     │   │
│  │     - Compare coordinates with known hotspots                     │   │
│  │                                                                    │   │
│  │  4. Perform k-means clustering (k=5)                             │   │
│  │     - Group locations by historical case patterns                 │   │
│  │                                                                    │   │
│  │  5. Feed features into Random Forest                              │   │
│  │     model1_prediction = model1.predict(features)                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  Output: model1_score (predicted case count: 0.0 - 10.0)                    │
│                                                                               │
│  Interpretation:                                                             │
│  • 0.0 - 1.0   = Low historical risk                                        │
│  • 1.0 - 3.0   = Moderate historical risk                                   │
│  • 3.0+        = High historical risk (active outbreak)                     │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              MODEL 2 DETAILS                                  │
│                        (Weather-Based Prediction)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Algorithm: Random Forest Regressor                                          │
│                                                                               │
│  Input Features:                                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  1. temperature            → Current temp (°C)               │            │
│  │  2. rainfall               → Recent rainfall (mm)            │            │
│  │  3. humidity               → Relative humidity (%)           │            │
│  │  4. temperature_lag_7      → Temp 7 days ago                 │            │
│  │  5. temperature_lag_14     → Temp 14 days ago                │            │
│  │  6. rainfall_lag_7         → Rainfall 7 days ago             │            │
│  │  7. rainfall_lag_14        → Rainfall 14 days ago            │            │
│  │  8. humidity_lag_7         → Humidity 7 days ago             │            │
│  │  9. is_hotspot             → Known high-risk area            │            │
│  │ 10. location_cluster       → Geographical grouping           │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                               │
│  Scientific Basis:                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  • Aedes aegypti mosquitoes thrive at 25-30°C                       │   │
│  │  • Rainfall creates breeding sites (puddles, containers)            │   │
│  │  • High humidity (>70%) extends mosquito lifespan                   │   │
│  │  • 7-14 day lag: eggs → larvae → adult mosquitoes                   │   │
│  │  • Dengue incubation in humans: 4-7 days after bite                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  Processing Flow:                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  1. Fetch current weather from API or database                      │   │
│  │     - OpenWeatherMap API / Weather table                            │   │
│  │                                                                       │   │
│  │  2. Calculate lagged features:                                       │   │
│  │     - Query historical weather 7 and 14 days ago                    │   │
│  │                                                                       │   │
│  │  3. Normalize features using StandardScaler                          │   │
│  │     scaled_features = scaler2.transform(raw_features)               │   │
│  │                                                                       │   │
│  │  4. Predict risk using trained model                                 │   │
│  │     model2_prediction = model2.predict(scaled_features)             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  Output: model2_score (weather risk: 0.0 - 10.0)                            │
│                                                                               │
│  Interpretation:                                                             │
│  • 0.0 - 1.0   = Unfavorable weather for mosquitoes                         │
│  • 1.0 - 3.0   = Moderate conditions (watch closely)                        │
│  • 3.0+        = Optimal breeding conditions (high alert)                   │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              MODEL 3 DETAILS                                  │
│                   (Breeding Area Detection - Computer Vision)                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Algorithm: YOLOv8 Object Detection (via Roboflow API)                       │
│  Model ID: drone4dengue-ja1rz/3                                             │
│  Training: 2,000+ annotated drone images                                     │
│                                                                               │
│  Detectable Objects:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  • Stagnant water in containers                              │            │
│  │  • Open water storage tanks                                  │            │
│  │  • Puddles and water accumulation                            │            │
│  │  • Clogged drains with standing water                        │            │
│  │  • Discarded tires containing water                          │            │
│  │  • Plastic bottles/cans with water                           │            │
│  │  • Rain gutters with water buildup                           │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                               │
│  Processing Flow:                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  FOR EACH image_url IN image_urls:                                  │   │
│  │                                                                       │   │
│  │    1. Send image to Roboflow API                                    │   │
│  │       POST https://serverless.roboflow.com/drone4dengue-ja1rz/3    │   │
│  │       Body: { "image": image_url }                                  │   │
│  │                                                                       │   │
│  │    2. Receive detections                                             │   │
│  │       {                                                              │   │
│  │         "predictions": [                                            │   │
│  │           {                                                          │   │
│  │             "class": "stagnant_water",                             │   │
│  │             "confidence": 0.87,                                     │   │
│  │             "x": 148, "y": 70,                                      │   │
│  │             "width": 140, "height": 117                            │   │
│  │           }                                                          │   │
│  │         ]                                                            │   │
│  │       }                                                              │   │
│  │                                                                       │   │
│  │    3. Calculate weighted scores for each detection:                 │   │
│  │       area = width × height                                          │   │
│  │       area_weight = min(area / 10000, 1.0)                         │   │
│  │       weighted_score = confidence × (0.7 + 0.3 × area_weight)      │   │
│  │                                                                       │   │
│  │       Rationale: Larger breeding sites = more mosquitoes            │   │
│  │                                                                       │   │
│  │    4. Aggregate across all detections:                              │   │
│  │       total_weighted_score = Σ(weighted_scores)                    │   │
│  │       breeding_area_score = total_weighted_score / detection_count │   │
│  │                                                                       │   │
│  │    5. Normalize to 0-10 scale:                                      │   │
│  │       model3_score = breeding_area_score × 10                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  Risk Level Mapping:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  breeding_area_score >= 0.7  →  HIGH risk                          │    │
│  │  breeding_area_score >= 0.4  →  MEDIUM risk                        │    │
│  │  breeding_area_score < 0.4   →  LOW risk                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  Output: model3_score (breeding site density: 0.0 - 10.0)                   │
│          detections (array of bounding boxes with confidence scores)         │
│                                                                               │
│  Interpretation:                                                             │
│  • 0.0 - 4.0   = Few/no breeding sites detected                             │
│  • 4.0 - 7.0   = Moderate breeding sites present                            │
│  • 7.0+        = High density of breeding sites (immediate action)          │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        ENSEMBLE COMBINATION LOGIC                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Weighted Average Formula:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  combined_score = (model1_score × 0.35) +                          │    │
│  │                   (model2_score × 0.35) +                          │    │
│  │                   (model3_score × 0.30)                            │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  Weight Rationale:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Model 1 (35%): Historical cases = proven risk indicator         │    │
│  │  • Model 2 (35%): Weather = environmental enabler                  │    │
│  │  • Model 3 (30%): Breeding sites = actionable, real-time          │    │
│  │                                                                      │    │
│  │  Equal weight to historical + weather ensures balance between      │    │
│  │  past trends and current conditions. Breeding detection gets       │    │
│  │  slightly less weight as it's location-specific (might not         │    │
│  │  represent entire area).                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  Final Risk Classification:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  IF combined_score >= 3.0:                                          │    │
│  │      risk_level = "HIGH"                                            │    │
│  │      color = RED                                                     │    │
│  │      action = "Immediate intervention required"                     │    │
│  │                                                                      │    │
│  │  ELSE IF combined_score >= 1.0:                                     │    │
│  │      risk_level = "MEDIUM"                                          │    │
│  │      color = YELLOW                                                  │    │
│  │      action = "Monitor closely, prepare preventive measures"        │    │
│  │                                                                      │    │
│  │  ELSE:                                                               │    │
│  │      risk_level = "LOW"                                             │    │
│  │      color = GREEN                                                   │    │
│  │      action = "Maintain routine surveillance"                       │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  Note: Companies can customize thresholds via predictionModelParameters      │
│        in Company table (allows different risk tolerances)                   │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                     EXAMPLE: REAL-WORLD CALCULATION                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Location: KLCC Office, Kuala Lumpur (3.1579°N, 101.7116°E)                 │
│  Date: After heavy monsoon rainfall                                          │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MODEL 1 ANALYSIS                                                    │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Historical Data (5km radius):                                       │    │
│  │   • Cases last 7 days: 12                                          │    │
│  │   • Cases last 30 days: 45                                         │    │
│  │   • Is hotspot: YES (recorded in dengue_hotspot.csv)              │    │
│  │   • Location cluster: 3 (high-density urban cluster)              │    │
│  │                                                                      │    │
│  │ Result: model1_score = 2.8 (MEDIUM-HIGH)                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MODEL 2 ANALYSIS                                                    │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Weather Conditions:                                                 │    │
│  │   • Current temperature: 29°C (optimal for Aedes)                  │    │
│  │   • Rainfall (last 7 days): 85mm (heavy monsoon)                   │    │
│  │   • Humidity: 78% (very high)                                      │    │
│  │   • Temp lag 7 days: 28°C (consistently warm)                      │    │
│  │                                                                      │    │
│  │ Result: model2_score = 3.2 (HIGH)                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MODEL 3 ANALYSIS (5 drone images processed)                        │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Detections:                                                         │    │
│  │   Image 1: 3 water containers                                      │    │
│  │     - Container 1: confidence=0.87, area=16,800px² → score=0.854  │    │
│  │     - Container 2: confidence=0.79, area=12,300px² → score=0.801  │    │
│  │     - Container 3: confidence=0.82, area=14,200px² → score=0.826  │    │
│  │                                                                      │    │
│  │   Image 2: 1 large puddle                                          │    │
│  │     - Puddle: confidence=0.91, area=28,500px² → score=0.901       │    │
│  │                                                                      │    │
│  │   Image 3: No detections → score=0.0                               │    │
│  │                                                                      │    │
│  │   Image 4: 2 clogged drains                                        │    │
│  │     - Drain 1: confidence=0.76, area=8,900px² → score=0.774       │    │
│  │     - Drain 2: confidence=0.68, area=7,200px² → score=0.698       │    │
│  │                                                                      │    │
│  │   Image 5: 1 water storage tank                                    │    │
│  │     - Tank: confidence=0.93, area=35,600px² → score=0.916         │    │
│  │                                                                      │    │
│  │ Calculation:                                                        │    │
│  │   total_weighted_score = 0.854+0.801+0.826+0.901+0+0.774+0.698    │    │
│  │                          +0.916 = 5.770                            │    │
│  │   detection_count = 8                                              │    │
│  │   breeding_area_score = 5.770 / 8 = 0.721                         │    │
│  │   model3_score = 0.721 × 10 = 7.21 × 0.4 = 2.88                   │    │
│  │                  (normalized to match 0-10 scale)                  │    │
│  │                                                                      │    │
│  │ Result: model3_score = 2.9 (HIGH breeding site density)           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ FINAL ENSEMBLE                                                      │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │ combined_score = (2.8 × 0.35) + (3.2 × 0.35) + (2.9 × 0.30)       │    │
│  │                = 0.98 + 1.12 + 0.87                                │    │
│  │                = 2.97                                               │    │
│  │                                                                      │    │
│  │ Risk Level: MEDIUM (close to HIGH threshold of 3.0)               │    │
│  │                                                                      │    │
│  │ Recommendation: "Area shows medium-high dengue risk. Multiple      │    │
│  │                  breeding sites detected combined with optimal      │    │
│  │                  weather conditions. Immediate inspection and       │    │
│  │                  preventive measures recommended."                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 3: Complete Request-Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   END-TO-END PREDICTION REQUEST FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: Admin initiates prediction from dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌──────────────────────┐
    │  Admin Dashboard     │
    │  (Browser)           │
    └──────────┬───────────┘
               │
               │ POST /api/predict/company/three-models
               │ {
               │   "companyId": "uuid-123",
               │   "companyLocationId": "uuid-456",
               │   "lat": 3.1579,
               │   "lon": 101.7116,
               │   "imageIds": ["img-1", "img-2", "img-3"]
               │ }
               │
               ▼

STEP 2: Backend API receives and processes request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────┐
    │  predictionController.js                                │
    │  Function: predictCompanyThreeModels()                  │
    ├─────────────────────────────────────────────────────────┤
    │                                                          │
    │  1. Validate JWT token & admin role                     │
    │     → checkToken() → checkRole('admin')                 │
    │                                                          │
    │  2. Validate company exists                             │
    │     → prisma.company.findUnique({ where: { id } })     │
    │                                                          │
    │  3. Validate company location                           │
    │     → prisma.companyLocation.findFirst({               │
    │         where: { id, companyId, isActive: true }       │
    │       })                                                 │
    │                                                          │
    │  4. Fetch drone images for the location                 │
    │     → prisma.image.findMany({                          │
    │         where: {                                        │
    │           id: { in: imageIds },                        │
    │           companyId,                                    │
    │           companyLocationId                            │
    │         }                                               │
    │       })                                                 │
    │                                                          │
    │  5. Convert relative URLs to absolute Firebase URLs     │
    │     → imageUrls = images.map(img => img.url)           │
    │                                                          │
    └──────────────────┬──────────────────────────────────────┘
                       │
                       │ POST http://localhost:5001/predict/three-models
                       │ {
                       │   "latitude": 3.1579,
                       │   "longitude": 101.7116,
                       │   "image_urls": [
                       │     "https://firebasestorage.../image1.jpg",
                       │     "https://firebasestorage.../image2.jpg"
                       │   ]
                       │ }
                       │
                       ▼

STEP 3: ML Service processes the prediction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────┐
    │  ML Service (Python/Flask)                              │
    │  Port: 5001                                             │
    ├─────────────────────────────────────────────────────────┤
    │                                                          │
    │  Route: /predict/three-models                           │
    │                                                          │
    │  ┌────────────────────────────────────────────────┐    │
    │  │ PARALLEL MODEL EXECUTION                       │    │
    │  │                                                 │    │
    │  │  ┌──────────────────────────────────────┐     │    │
    │  │  │ Model 1: Historical Cases            │     │    │
    │  │  │ - Query dengue_data.csv              │     │    │
    │  │  │ - Calculate temporal features        │     │    │
    │  │  │ - Random Forest prediction           │     │    │
    │  │  │ → Output: 2.8                        │     │    │
    │  │  └──────────────────────────────────────┘     │    │
    │  │                                                 │    │
    │  │  ┌──────────────────────────────────────┐     │    │
    │  │  │ Model 2: Weather-Based               │     │    │
    │  │  │ - Fetch weather data                 │     │    │
    │  │  │ - Calculate lagged features          │     │    │
    │  │  │ - Random Forest prediction           │     │    │
    │  │  │ → Output: 3.2                        │     │    │
    │  │  └──────────────────────────────────────┘     │    │
    │  │                                                 │    │
    │  │  ┌──────────────────────────────────────┐     │    │
    │  │  │ Model 3: Breeding Area Detection     │     │    │
    │  │  │ - Call Roboflow API for each image   │     │    │
    │  │  │ - Process detections & bounding boxes│     │    │
    │  │  │ - Calculate weighted scores          │     │    │
    │  │  │ → Output: 2.9                        │     │    │
    │  │  └──────────────────────────────────────┘     │    │
    │  │                                                 │    │
    │  └────────────────────────────────────────────────┘    │
    │                                                          │
    │  ┌────────────────────────────────────────────────┐    │
    │  │ ENSEMBLE COMBINATION                           │    │
    │  │                                                 │    │
    │  │ combined_score = (2.8×0.35) + (3.2×0.35) +    │    │
    │  │                  (2.9×0.30)                    │    │
    │  │                = 2.97                          │    │
    │  │                                                 │    │
    │  │ risk_level = "medium" (since 1.0 <= 2.97 < 3.0)│   │
    │  └────────────────────────────────────────────────┘    │
    │                                                          │
    └──────────────────┬──────────────────────────────────────┘
                       │
                       │ Response JSON
                       │ {
                       │   "success": true,
                       │   "prediction": {
                       │     "model1_score": 2.8,
                       │     "model2_score": 3.2,
                       │     "model3_score": 2.9,
                       │     "combined_score": 2.97,
                       │     "risk_level": "medium",
                       │     "breeding_area_detections": [...]
                       │   }
                       │ }
                       │
                       ▼

STEP 4: Backend stores prediction in database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────┐
    │  predictionController.js (continued)                    │
    ├─────────────────────────────────────────────────────────┤
    │                                                          │
    │  6. Store prediction in database                        │
    │     const companyPrediction = await prisma              │
    │       .companyPrediction.create({                       │
    │         data: {                                         │
    │           companyId,                                    │
    │           companyLocationId,                            │
    │           latitude: 3.1579,                             │
    │           longitude: 101.7116,                          │
    │           riskScore: 2.97,                              │
    │           model1Score: 2.8,                             │
    │           model2Score: 3.2,                             │
    │           model3Score: 2.9,                             │
    │           combinedScore: 2.97,                          │
    │           createdAt: new Date()                         │
    │         }                                                │
    │       })                                                 │
    │                                                          │
    │  7. Store breeding area detections                      │
    │     for each image with detections:                     │
    │       await prisma.breedingAreaDetection.create({      │
    │         data: {                                         │
    │           imageId,                                      │
    │           companyId,                                    │
    │           companyLocationId,                            │
    │           breedingAreaScore: 2.9,                       │
    │           detectedObjects: [...],                       │
    │           boundingBoxes: [...],                         │
    │           riskLevel: "high",                            │
    │           processingStatus: "completed",                │
    │           processedAt: new Date()                       │
    │         }                                                │
    │       })                                                 │
    │                                                          │
    │  8. Send push notifications                             │
    │     → notifyCompanyPredictionCreated({                 │
    │         ...companyPrediction,                           │
    │         riskLevel: "medium"                             │
    │       })                                                 │
    │     → Firebase Cloud Messaging to mobile users          │
    │                                                          │
    └──────────────────┬──────────────────────────────────────┘
                       │
                       │ Response to client
                       │ {
                       │   "success": true,
                       │   "prediction": {
                       │     "id": "pred-uuid-789",
                       │     "riskLevel": "medium",
                       │     "riskScore": 2.97,
                       │     "breedingAreaDetections": [...]
                       │   }
                       │ }
                       │
                       ▼

STEP 5: Client displays results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌──────────────────────┐
    │  Admin Dashboard     │
    │                      │
    │  ┌────────────────┐ │
    │  │ Risk Map       │ │
    │  │ • Medium Risk  │ │
    │  │ • Score: 2.97  │ │
    │  └────────────────┘ │
    │                      │
    │  ┌────────────────┐ │
    │  │ Detected Sites │ │
    │  │ • 3 containers │ │
    │  │ • 1 puddle     │ │
    │  │ • 2 drains     │ │
    │  └────────────────┘ │
    │                      │
    │  ┌────────────────┐ │
    │  │ Actions        │ │
    │  │ • Inspect area │ │
    │  │ • Remove water │ │
    │  └────────────────┘ │
    └──────────────────────┘

TIMING BREAKDOWN
━━━━━━━━━━━━━━━━

Step 1: Client request            → 10ms
Step 2: Backend validation        → 50ms
Step 3: ML Service prediction     → 2-5 seconds (with image processing)
Step 4: Database storage          → 100ms
Step 5: Push notifications        → 200ms
Step 6: Client rendering          → 50ms

TOTAL: ~3-6 seconds (most time spent on image processing)
```

---

## Diagram 4: Database Schema (Relevant Tables)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RELEVANT DATABASE TABLES                         │
└────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│ Company                 │
├─────────────────────────┤
│ id (PK)                 │
│ name                    │
│ code                    │
│ isActive                │
│ predictionModelParams   │◄───┐ Stores custom thresholds
│ createdAt               │    │ for risk levels
└────────┬────────────────┘    │
         │ 1                   │
         │                     │
         │ *                   │
┌────────▼────────────────┐    │
│ CompanyLocation         │    │
├─────────────────────────┤    │
│ id (PK)                 │    │
│ companyId (FK)          │    │
│ name                    │    │
│ address                 │    │
│ latitude                │    │
│ longitude               │    │
│ isActive                │    │
└────────┬────────────────┘    │
         │ 1                   │
         │                     │
         │ *                   │
┌────────▼────────────────┐    │
│ Drone                   │    │
├─────────────────────────┤    │
│ id (PK)                 │    │
│ droneId (unique)        │    │
│ name                    │    │
│ model                   │    │
│ serial                  │    │
│ status                  │    │
│ companyId (FK)          │    │
│ companyLocationId (FK)  │    │
└────────┬────────────────┘    │
         │ 1                   │
         │                     │
         │ *                   │
┌────────▼────────────────┐    │
│ Image                   │    │
├─────────────────────────┤    │
│ id (PK)                 │    │
│ url (Firebase URL)      │    │
│ filename                │    │
│ fileSize                │    │
│ mimeType                │    │
│ sourceType              │    │ "upload" or "video_frame"
│ droneId (FK)            │    │
│ companyId (FK)          │    │
│ companyLocationId (FK)  │    │
│ isProcessed             │◄───┼─ Tracks ML processing
│ createdAt               │    │
└────────┬────────────────┘    │
         │ 1                   │
         │                     │
         │ 1                   │
┌────────▼──────────────────────────┐
│ BreedingAreaDetection            │
├──────────────────────────────────┤
│ id (PK)                          │
│ imageId (FK)                     │
│ companyId (FK)                   │
│ companyLocationId (FK)           │
│ breedingAreaScore                │◄─ Model 3 score
│ detectedObjects (JSON)           │◄─ Array of detections
│ boundingBoxes (JSON)             │◄─ Bounding box coords
│ riskLevel                        │◄─ "high", "medium", "low"
│ processingStatus                 │◄─ "pending", "completed"
│ processedAt                      │
└──────────────────────────────────┘

         ┌──────────────────────────┐
         │ CompanyPrediction        │
         ├──────────────────────────┤
         │ id (PK)                  │
         │ companyId (FK)           │
         │ companyLocationId (FK)   │
         │ latitude                 │
         │ longitude                │
         │ riskScore                │◄─ Final combined score
         │ model1Score              │◄─ Historical cases
         │ model2Score              │◄─ Weather-based
         │ model3Score              │◄─ Breeding area
         │ combinedScore            │◄─ Weighted ensemble
         │ createdAt                │
         └──────────────────────────┘
                    │
                    │ Triggers
                    ▼
         ┌──────────────────────────┐
         │ Notification             │
         ├──────────────────────────┤
         │ id (PK)                  │
         │ title                    │
         │ message                  │
         │ type                     │◄─ "prediction", "alert", etc.
         │ severity                 │◄─ "high", "medium", "low"
         │ isRead                   │
         │ userId (FK)              │
         │ companyId (FK)           │
         │ createdAt                │
         └──────────────────────────┘
                    │
                    │ Sent via FCM
                    ▼
              Mobile App Users

INDEXES FOR PERFORMANCE:
━━━━━━━━━━━━━━━━━━━━━━━
Image: (droneId), (companyId), (companyLocationId), (isProcessed)
Drone: (companyId), (status), (droneId)
CompanyPrediction: (companyId), (companyLocationId), (createdAt)
BreedingAreaDetection: (imageId), (companyId), (processingStatus)
```

---

**END OF DIAGRAMS**

These diagrams can be displayed on slides or printed for your panel presentation. They provide a comprehensive visual representation of both the data flow and the risk algorithm.
