# FYP Panel Presentation - Slide Deck Outline

## Slide Structure for Answering Panel Questions

---

### SLIDE 1: Title Slide
**Title:** Drone4Dengue - Data Flow & Risk Algorithm Demonstration
**Subtitle:** FYP Monitoring Session
**Your Name & Student ID**
**Date**

---

### SLIDE 2: Agenda
**Title:** Today's Demonstration

1. **Question 1:** Data Transfer Flow
   - How drone data moves from capture to database

2. **Question 2:** Risk Determination Algorithm
   - Three-model ensemble approach
   - Real-world example

---

## SECTION 1: DATA TRANSFER FLOW

### SLIDE 3: Data Flow Overview
**Title:** Drone to Database - Complete Journey

**Visual:** Simple flow diagram
```
Drone Footage → Admin Dashboard → Backend API → Cloud Storage + Database
```

**Key Point:** Hybrid storage strategy for scalability

---

### SLIDE 4: Step 1 - Frontend Upload
**Title:** User Initiates Upload

**Code Snippet:**
```typescript
// client-admin/src/app/drone-management/page.tsx (Line 410)
const uploadImages = async (files: File[], droneId: string) => {
  const formData = new FormData()
  files.forEach(file => formData.append('images', file))
  
  await fetch(`/drones/${droneId}/upload-images`, {
    method: 'POST',
    body: formData
  })
}
```

**Key Points:**
- User selects images/videos in admin dashboard
- FormData allows multiple file upload
- Authenticated with JWT token

---

### SLIDE 5: Step 2 - Backend Processing
**Title:** Security & Validation Layers

**Visual:** Middleware chain diagram
```
Request → checkToken() → checkRole('admin') → uploadMiddleware → Controller
```

**Code Reference:**
```javascript
// server-api/routes/droneRoutes.js (Line 59)
router.post('/:droneId/upload-images', 
  checkToken,           // JWT verification
  checkRole('admin'),   // Admin authorization
  uploadMiddleware,     // Multer file handling
  uploadImages          // Main logic
);
```

---

### SLIDE 6: Step 3 - Cloud Upload
**Title:** Firebase Storage Integration

**Visual:** Split diagram showing dual storage

**Process:**
1. Validate drone ownership
2. Upload to Firebase Storage → Get permanent URL
3. Store metadata in PostgreSQL
4. Delete temporary local file

**Code Highlight:**
```javascript
// Generate Firebase Storage path
const storagePath = generateStoragePath(file.originalname, 'drone-images');

// Upload to Firebase
const firebaseUrl = await uploadImage(file.path, storagePath);

// Store metadata in database
await prisma.image.create({
  data: {
    url: firebaseUrl,    // Firebase URL
    filename: file.originalname,
    droneId: droneId,
    companyId: req.companyId
  }
});
```

---

### SLIDE 7: Step 4 - Database Schema
**Title:** Image Metadata Storage

**Visual:** Database table diagram

```
Image Table
├── id (UUID)
├── url (Firebase URL) ← Not the actual image!
├── filename
├── fileSize
├── mimeType
├── droneId (FK → Drone)
├── companyId (FK → Company)
├── companyLocationId (FK → Location)
├── isProcessed
└── createdAt
```

**Key Design Decision:**
- Binary data → Firebase (scalable, CDN)
- Metadata → PostgreSQL (queryable)

---

### SLIDE 8: Data Flow Summary
**Title:** Why This Architecture?

**3 Columns:**

**Security**
- JWT authentication
- Company data isolation
- Role-based access

**Performance**
- Firebase CDN delivery
- Database indexes
- Efficient queries

**Scalability**
- Unlimited cloud storage
- Microservices architecture
- Independent scaling

---

## SECTION 2: RISK DETERMINATION ALGORITHM

### SLIDE 9: Algorithm Overview
**Title:** Three-Model Ensemble Approach

**Visual:** Three boxes feeding into one

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Model 1    │   │  Model 2    │   │  Model 3    │
│ Historical  │   │  Weather    │   │  Breeding   │
│   Cases     │   │   Based     │   │   Sites     │
│  (35%)      │   │  (35%)      │   │  (30%)      │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                    ┌────▼────┐
                    │ Ensemble│
                    │ Combiner│
                    └────┬────┘
                         │
                    Risk Level
```

**Key Point:** Multiple perspectives for robust prediction

---

### SLIDE 10: Model 1 - Historical Cases
**Title:** Analyzing Past Outbreak Patterns

**Algorithm:** Random Forest Regressor

**Input Features:**
- Cases in last 7, 14, 30 days
- Rolling averages
- Hotspot status (binary)
- Geographic clustering

**Example Output:** **2.8** = "Recent outbreak detected"

**Visual:** Line graph showing case trends

**Code Reference:**
```python
# server-ml/prediction_service.py (Line 729)
model1_prediction = model1.predict(historical_features)
```

---

### SLIDE 11: Model 2 - Weather Analysis
**Title:** Environmental Risk Factors

**Algorithm:** Random Forest Regressor

**Scientific Basis:**
- Aedes mosquitoes thrive at **25-30°C**
- Rainfall creates breeding sites
- **7-14 day lag:** eggs → adult mosquitoes
- High humidity extends lifespan

**Input Features:**
- Temperature, rainfall, humidity
- 7-day and 14-day lagged features

**Example Output:** **3.2** = "Optimal breeding conditions"

**Visual:** Weather icon with temperature/rainfall indicators

---

### SLIDE 12: Model 3 - Breeding Site Detection
**Title:** Computer Vision Analysis

**Algorithm:** YOLOv8 Object Detection

**What It Detects:**
- 🌊 Stagnant water containers
- 💧 Puddles and water accumulation
- 🚰 Open storage tanks
- 🛢️ Clogged drains
- 🛞 Tires with water

**Visual:** Sample drone image with bounding boxes

**Example Output:** **2.9** = "8 breeding sites detected"

**Training:** 2,000+ annotated drone images

---

### SLIDE 13: Model 3 - Scoring Logic
**Title:** How We Score Detections

**Formula:**
```python
area = width × height
area_weight = min(area / 10000, 1.0)
weighted_score = confidence × (0.7 + 0.3 × area_weight)
```

**Rationale:** Larger breeding sites = more mosquitoes

**Example:**
- Large puddle: 0.91 confidence, 28,500 px² → score: **0.901**
- Small drain: 0.68 confidence, 7,200 px² → score: **0.698**

**Visual:** Two side-by-side images showing size comparison

---

### SLIDE 14: Ensemble Combination
**Title:** Bringing It All Together

**Formula:**
```
combined_score = (model1_score × 0.35) + 
                 (model2_score × 0.35) + 
                 (model3_score × 0.30)
```

**Weight Rationale:**
- **35% Historical:** Proven risk indicator
- **35% Weather:** Environmental enabler
- **30% Breeding Sites:** Actionable, real-time

**Why Equal Weight for M1 & M2?**
Both are established epidemiological factors

**Why Less Weight for M3?**
Location-specific, may not represent entire area

---

### SLIDE 15: Risk Level Classification
**Title:** From Score to Action

**Visual:** Color-coded scale

```
0.0         1.0                   3.0              10.0
 │           │                     │                 │
 ├───────────┼─────────────────────┼─────────────────┤
 │   🟢 LOW  │    🟡 MEDIUM        │    🔴 HIGH      │
 └───────────┴─────────────────────┴─────────────────┘
```

**Code:**
```javascript
if (score >= 3.0)      → HIGH
else if (score >= 1.0) → MEDIUM
else                   → LOW
```

**Note:** Thresholds are customizable per company

---

### SLIDE 16: Real-World Example (Part 1)
**Title:** Case Study - KLCC Office

**Location:** Kuala Lumpur City Centre
**Context:** After heavy monsoon rainfall

**Visual:** Map showing location

**Input Data:**
- 5 drone images uploaded
- GPS coordinates: 3.1579°N, 101.7116°E
- Recent weather: Heavy rainfall (85mm)

---

### SLIDE 17: Real-World Example (Part 2)
**Title:** Model Analysis Results

**Table Format:**

| Model | Input Data | Score | Interpretation |
|-------|-----------|-------|----------------|
| **Model 1<br>Historical** | • 12 cases (7 days)<br>• 45 cases (30 days)<br>• Known hotspot | **2.8** | Recent outbreak active |
| **Model 2<br>Weather** | • 29°C temperature<br>• 85mm rainfall<br>• 78% humidity | **3.2** | Optimal mosquito conditions |
| **Model 3<br>Breeding** | • 3 containers<br>• 1 puddle<br>• 2 drains<br>• 1 tank | **2.9** | 8 breeding sites found |

---

### SLIDE 18: Real-World Example (Part 3)
**Title:** Final Prediction

**Calculation:**
```
combined_score = (2.8 × 0.35) + (3.2 × 0.35) + (2.9 × 0.30)
               = 0.98 + 1.12 + 0.87
               = 2.97
```

**Result:** **MEDIUM Risk** (close to HIGH threshold)

**Visual:** Gauge meter showing 2.97 on 0-10 scale

**Recommendation Generated:**
✓ Immediate inspection recommended
✓ Schedule fogging treatment
✓ Clean clogged drains
✓ Cover water storage tank

---

### SLIDE 19: Actionable Intelligence
**Title:** From Prediction to Intervention

**Visual:** Drone image with bounding boxes

**Specific Locations Identified:**
1. Parking area: 3 water containers (high confidence)
2. Rooftop: Large puddle accumulation
3. Drainage system: 2 clogged drains
4. Service area: Uncovered storage tank

**What Makes This Powerful:**
- Not just "there's risk"
- Shows EXACTLY WHERE to act
- Prioritized by confidence & size

---

### SLIDE 20: System Architecture
**Title:** Complete Technical Stack

**Visual:** Layered architecture diagram

```
┌─────────────────────────────────────────┐
│  Frontend: Next.js + TypeScript         │
├─────────────────────────────────────────┤
│  Backend API: Node.js + Express + Prisma│
├─────────────────────────────────────────┤
│  ML Service: Python + Flask + sklearn   │
├─────────────────────────────────────────┤
│  Storage: Firebase + PostgreSQL         │
├─────────────────────────────────────────┤
│  CV Model: YOLOv8 via Roboflow API      │
└─────────────────────────────────────────┘
```

**Performance:**
- Image upload: 1-2 seconds
- Prediction (5 images): 3-6 seconds
- Real-time notifications via FCM

---

### SLIDE 21: Key Advantages
**Title:** Why This Approach Works

**4 Quadrants:**

**1. Comprehensive**
- Multiple data sources
- No single point of failure
- Scientific grounding

**2. Explainable**
- Individual scores visible
- Transparent weighting
- Auditable decisions

**3. Actionable**
- Exact breeding site locations
- Confidence scores
- Bounding boxes

**4. Scalable**
- Cloud storage
- Microservices
- Multi-tenant architecture

---

### SLIDE 22: Comparison with Traditional Methods
**Title:** Innovation Over Convention

**Table:**

| Aspect | Traditional Method | Our System |
|--------|-------------------|------------|
| **Data Collection** | Manual inspections | Automated drone imagery |
| **Analysis** | Historical data only | 3-model ensemble |
| **Specificity** | Area-level risk | Exact breeding site locations |
| **Response Time** | Days to weeks | Real-time (seconds) |
| **Scalability** | Limited by manpower | Cloud-based, unlimited |
| **Accuracy** | Subject to human error | ML-validated with confidence scores |

---

### SLIDE 23: Technical Challenges Solved
**Title:** Engineering Solutions

**Problem-Solution Format:**

**Challenge 1:** Large image files slow down system
**Solution:** Firebase CDN + metadata-only database

**Challenge 2:** Single model might be inaccurate
**Solution:** Three-model ensemble for robustness

**Challenge 3:** How to provide actionable insights?
**Solution:** Computer vision with bounding boxes

**Challenge 4:** Multi-tenant data security
**Solution:** Company-based isolation + JWT auth

---

### SLIDE 24: Future Enhancements
**Title:** Potential Improvements

1. **Real-time Processing**
   - Live drone feed analysis
   - Instant alerts during flight

2. **Model Improvements**
   - Fine-tune Model 3 with more images
   - Add Model 4: Population density

3. **Advanced Analytics**
   - Trend analysis over time
   - Predictive modeling (7-day forecast)

4. **Integration**
   - Government health department APIs
   - Weather forecast APIs
   - GIS mapping systems

---

### SLIDE 25: Summary
**Title:** Key Takeaways

**Data Transfer:**
✓ Secure, authenticated upload process
✓ Hybrid storage (Firebase + PostgreSQL)
✓ Scalable architecture with CDN delivery

**Risk Algorithm:**
✓ Three-model ensemble (35%-35%-30%)
✓ Historical + Weather + Computer Vision
✓ Explainable, actionable predictions
✓ Customizable thresholds per company

**Result:**
Comprehensive dengue surveillance system with specific intervention points

---

### SLIDE 26: Q&A
**Title:** Questions & Discussion

**Prepared for:**
- Technical deep-dives into specific models
- Code walkthrough if requested
- Demo of live system (optional)
- Comparison with related works

**Contact Information:**
Your email/GitHub/Portfolio

---

## BONUS SLIDES (If Time Permits)

### BONUS 1: Code Walkthrough - Upload Function
**Title:** Live Code Demonstration

Show actual code from:
- `droneController.js` uploadImages function
- Firebase upload utility
- Database schema

---

### BONUS 2: Model Training Process
**Title:** How We Trained Model 3

- Dataset: 2,000+ annotated drone images
- Tool: Roboflow annotation platform
- Model: YOLOv8 (state-of-the-art)
- Training time: 12 hours on GPU
- Validation accuracy: 87%

---

### BONUS 3: Security Architecture
**Title:** Multi-layer Security

- JWT token authentication
- Role-based access control
- Company data isolation
- Firebase signed URLs
- SQL injection prevention (Prisma ORM)
- Rate limiting on API endpoints

---

## SLIDE DESIGN TIPS

**Color Scheme:**
- Primary: Blue (#2563EB) - for headers
- Secondary: Yellow (#F59E0B) - for highlights
- Success: Green (#10B981) - for low risk
- Warning: Orange (#F97316) - for medium risk
- Danger: Red (#EF4444) - for high risk

**Fonts:**
- Headers: Bold, 36-44pt
- Body: Regular, 18-24pt
- Code: Monospace (Consolas, Monaco), 14-16pt

**Visual Elements:**
- Use diagrams over text where possible
- Code snippets with syntax highlighting
- Screenshots of actual system interface
- Icons for quick visual reference
- Consistent alignment and spacing

**Animation:**
- Minimal, professional transitions
- Use appear/fade for bullet points
- Highlight key numbers/metrics
- Flow diagrams with sequential reveal

---

## PRESENTATION TIPS

**Timing:**
- Allocate 5-7 minutes per section
- Practice to stay within time limit
- Prepare for 2-3 minutes Q&A after each section

**Delivery:**
- Start with the big picture, then dive into details
- Use real numbers from your example
- Refer to specific line numbers when showing code
- Demonstrate confidence in technical decisions

**Panel Interaction:**
- Make eye contact
- Pause for questions between major sections
- If asked about code, pull up the actual file
- If demonstration is requested, have system ready

---

**Good luck with your presentation! 🎓🚀**
