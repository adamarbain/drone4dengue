# FYP Panel Presentation - Quick Reference Guide

## 📋 Panel Questions Overview

### Question 1: Data Transfer Flow
**"How is data from the drone transferred into the database system?"**

### Question 2: Risk Algorithm
**"How does the algorithm determine whether an area is high risk or not?"**

---

## 🎯 Question 1: Data Transfer Flow - Key Points

### The 4-Step Journey

#### Step 1: Frontend Upload
- **File:** `client-admin/src/app/drone-management/page.tsx` (Line 410)
- **Action:** User uploads via `uploadImages()` function
- **Tech:** FormData with multiple files
- **Endpoint:** `POST /drones/:droneId/upload-images`

#### Step 2: Middleware Chain
- **File:** `server-api/routes/droneRoutes.js` (Line 59)
- **Security:** 
  1. `checkToken()` - JWT verification
  2. `checkRole('admin')` - Role check
  3. `uploadMiddleware` - Multer file handling

#### Step 3: Cloud Upload + Database Storage
- **File:** `server-api/controllers/droneController.js` (Line 478)
- **Process:**
  1. Validate drone ownership
  2. Upload to Firebase Storage → Get permanent URL
  3. Store metadata in PostgreSQL
  4. Delete temporary local file

#### Step 4: Database Record
- **Schema:** `server-api/prisma/schema.prisma` (Line 118)
- **Stored Data:**
  - Firebase URL (not the actual image)
  - Filename, size, MIME type
  - Foreign keys: droneId, companyId, locationId
  - Processing status flag

### Key Design Decision
**Hybrid Storage Strategy:**
- Binary data (images) → Firebase Cloud Storage (scalable, CDN)
- Metadata → PostgreSQL (queryable, relational)

### Security Features
- JWT authentication on all endpoints
- Company-based data isolation (multi-tenant)
- Firebase signed URLs for secure access

---

## 🧠 Question 2: Risk Algorithm - Key Points

### The Three-Model Ensemble

#### Model 1: Historical Cases (Weight: 35%)
- **File:** `server-ml/prediction_service.py` (Line 729)
- **Algorithm:** Random Forest Regressor
- **Features:**
  - Cases in last 7, 14, 30 days
  - Rolling averages
  - Hotspot status (yes/no)
  - Geographic clustering (k-means, k=5)
- **Output:** Score 0-10 (predicted case count)
- **Example:** 2.8 = "Recent outbreak detected"

#### Model 2: Weather-Based (Weight: 35%)
- **File:** `server-ml/prediction_service.py` (Line 750)
- **Algorithm:** Random Forest Regressor
- **Features:**
  - Temperature, rainfall, humidity
  - 7-day and 14-day lagged features
- **Scientific Basis:**
  - Aedes mosquitoes thrive at 25-30°C
  - 7-14 day lag: eggs → adult mosquitoes
  - High humidity extends lifespan
- **Output:** Score 0-10 (weather risk)
- **Example:** 3.2 = "Optimal breeding conditions"

#### Model 3: Breeding Area Detection (Weight: 30%)
- **File:** `server-ml/breeding_area_detection_service.py` (Line 50)
- **Algorithm:** YOLOv8 Object Detection (Roboflow API)
- **Detects:**
  - Stagnant water containers
  - Puddles, drains, storage tanks
  - Tires, bottles with water
- **Scoring:**
  ```python
  area = width × height
  area_weight = min(area / 10000, 1.0)
  weighted_score = confidence × (0.7 + 0.3 × area_weight)
  ```
- **Output:** Score 0-10 (breeding site density)
- **Example:** 2.9 = "8 breeding sites detected"

### Ensemble Combination

**Formula:**
```
combined_score = (model1_score × 0.35) + (model2_score × 0.35) + (model3_score × 0.30)
```

**Example Calculation:**
```
combined_score = (2.8 × 0.35) + (3.2 × 0.35) + (2.9 × 0.30)
               = 0.98 + 1.12 + 0.87
               = 2.97
```

### Risk Level Classification

**File:** `server-api/utils/riskLevelUtils.js`

```javascript
if (score >= 3.0)      → HIGH risk
else if (score >= 1.0) → MEDIUM risk
else                   → LOW risk
```

**Customizable:** Companies can adjust thresholds via `predictionModelParameters`

---

## 🌟 Real-World Example

### Location: KLCC Office, Kuala Lumpur
**After heavy monsoon rainfall**

| Model | Input | Score | Interpretation |
|-------|-------|-------|----------------|
| **Model 1** | 12 cases (7 days)<br>45 cases (30 days)<br>Known hotspot | **2.8** | Recent outbreak |
| **Model 2** | 29°C temperature<br>85mm rainfall<br>78% humidity | **3.2** | Optimal conditions |
| **Model 3** | 3 containers<br>1 puddle<br>2 drains<br>1 tank | **2.9** | 8 sites detected |

**Final Risk:** 2.97 → **MEDIUM** (close to HIGH)

**Actions Recommended:**
- Inspect parking area containers
- Schedule fogging treatment
- Clean clogged drains
- Cover water storage tank

---

## 📊 Code Locations - Quick Reference

| Component | File | Function/Line |
|-----------|------|---------------|
| **Frontend Upload** | `client-admin/src/app/drone-management/page.tsx` | `uploadImages()` (Line 410) |
| **API Route** | `server-api/routes/droneRoutes.js` | Line 59-65 |
| **Upload Controller** | `server-api/controllers/droneController.js` | `uploadImages()` (Line 478) |
| **Image Schema** | `server-api/prisma/schema.prisma` | `Image` model (Line 118) |
| **Model 1** | `server-ml/prediction_service.py` | Line 729-748 |
| **Model 2** | `server-ml/prediction_service.py` | Line 750-769 |
| **Model 3** | `server-ml/breeding_area_detection_service.py` | Line 50-238 |
| **Ensemble** | `server-ml/prediction_service.py` | Line 771-801 |
| **Risk Utils** | `server-api/utils/riskLevelUtils.js` | `getRiskLevel()` |
| **Prediction Controller** | `server-api/controllers/predictionController.js` | `predictCompanyThreeModels()` (Line 326) |

---

## 💡 Key Talking Points

### Why Three Models?
> "We use three models because dengue risk is multifaceted. Historical cases show where outbreaks are happening, weather determines if conditions favor mosquitoes, and breeding site detection provides actionable, specific locations for intervention. No single model tells the complete story."

### Why These Weights (35-35-30)?
> "We give equal importance to historical trends and weather conditions because both are proven risk indicators in epidemiological research. Breeding site detection gets slightly less weight because it's location-specific and might not represent the entire area, but it's the most actionable."

### How is This Better Than Traditional Methods?
> "Traditional methods rely on manual inspections and historical data alone. Our system adds real-time computer vision to detect breeding sites automatically, combines multiple data sources for robustness, and provides exact locations with bounding boxes for targeted action."

### What Makes Model 3 Special?
> "Model 3 uses computer vision trained on 2,000+ drone images to detect breeding sites. It doesn't just say 'there's risk'—it shows you exactly where the water containers, puddles, and drains are, with confidence scores and sizes. This makes interventions specific and measurable."

### Can Companies Customize This?
> "Yes. Companies can adjust risk thresholds based on their needs. A hospital might want to be alerted at lower risk levels, while a warehouse might accept higher thresholds. The underlying models remain the same, but the classification adapts to their risk tolerance."

---

## 🔒 Technical Highlights

### Architecture Strengths
1. **Microservices:** Node.js API + Python ML service (independent scaling)
2. **Hybrid Storage:** Firebase (images) + PostgreSQL (metadata)
3. **Multi-tenant:** Company data isolation with JWT authentication
4. **Scalable:** CDN delivery, database indexes, Redis caching
5. **Real-time:** Push notifications via Firebase Cloud Messaging

### Performance Metrics
- Image upload: ~1-2 seconds
- Prediction (with 5 images): ~3-6 seconds
- ML service endpoint: `/predict/three-models`
- API timeout: 10 minutes (for image processing)

### Data Flow Summary
```
User Upload → Multer Middleware → Firebase Upload → Database Save → ML Processing → Notification
```

---

## 🎤 Opening Statement

> "Thank you for this important question. Our system demonstrates a comprehensive approach to dengue risk assessment. For data transfer, we employ a hybrid storage strategy where actual images are stored in Firebase Cloud Storage for scalability, while metadata is maintained in PostgreSQL for efficient querying and relationships. For risk determination, we use a three-model ensemble: Model 1 analyzes historical dengue cases, Model 2 evaluates weather conditions, and Model 3 uses computer vision to detect breeding sites in drone imagery. Each model contributes unique insights, and their weighted combination provides robust, explainable, and actionable risk assessments."

---

## 🎤 Closing Statement

> "In summary, our system ensures secure, efficient data flow from drone to database using Firebase Storage and PostgreSQL. Our three-model ensemble—historical cases, weather analysis, and computer vision—provides comprehensive, explainable dengue risk assessments that are scientifically grounded and actionable. The breeding site detection component is particularly valuable as it identifies specific intervention points, making our predictions not just informative but directly useful for dengue prevention efforts."

---

## ⚡ Quick Answers to Common Follow-Up Questions

**Q: Why not just use historical data?**
> "Historical data tells us where outbreaks were, but weather tells us where conditions are right now, and breeding site detection shows us where mosquitoes are actively reproducing. We need all three perspectives."

**Q: How accurate is the computer vision model?**
> "Our YOLOv8 model was trained on 2,000+ annotated images and achieves 85-93% confidence on typical breeding sites. We use a weighted scoring system that considers both confidence and area size for robust predictions."

**Q: What if there's no historical data for a location?**
> "Model 1 can use nearest-neighbor hotspot data and geographic clustering. Models 2 and 3 don't depend on historical data, so we still get meaningful predictions from weather and breeding sites."

**Q: How do you handle false positives?**
> "We use confidence thresholds (typically >0.6) and area weighting. Small detections with low confidence contribute less to the score. The ensemble approach also helps—if Model 3 detects sites but Models 1 and 2 show low risk, the combined score balances this."

**Q: Can this work in real-time?**
> "Yes. Once images are uploaded, prediction takes 3-6 seconds. For continuous monitoring, we can schedule daily predictions for all company locations, which runs automatically and sends push notifications to mobile app users."

---

## 📱 Demo Script (If Panel Asks)

1. **Show Upload:** "Here's the admin dashboard where operators upload drone footage"
2. **Show Processing:** "The system extracts frames, uploads to cloud, stores metadata"
3. **Show Prediction:** "When we request a prediction, all three models run in parallel"
4. **Show Results:** "The interface displays the risk level, individual model scores, and detected breeding sites with bounding boxes"
5. **Show Action:** "Administrators can then schedule interventions based on specific locations"

---

## 📚 Reference Files for Panel

1. **Full Technical Script:** `FYP-Panel-Script-Data-Flow-and-Algorithm.md`
2. **Detailed Diagrams:** `architecture-diagrams.md`
3. **Simple Visual:** `simple-architecture-diagram.md`
4. **This Quick Reference:** `Panel-Presentation-Quick-Reference.md`

---

**Good luck with your FYP monitoring! 🚀**
