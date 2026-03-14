# Simplified Architecture Diagram for Panel Presentation

## High-Level System Overview (For Slide Presentation)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         DRONE4DENGUE SYSTEM OVERVIEW                          │
└───────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           ┌──────────────────┐                              │
│                           │   DRONE FOOTAGE  │                              │
│                           │  (Images/Videos) │                              │
│                           └────────┬─────────┘                              │
│                                    │                                         │
│                                    │ Upload                                  │
│                                    ▼                                         │
│                           ┌──────────────────┐                              │
│                           │  ADMIN DASHBOARD │                              │
│                           │   (Next.js App)  │                              │
│                           └────────┬─────────┘                              │
│                                    │                                         │
│                                    │ POST API Request                        │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      BACKEND API (Node.js)                          │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  1. Authentication & Authorization                           │  │   │
│  │  │  2. Validate Drone & Company                                 │  │   │
│  │  │  3. Upload Images to Cloud Storage                           │  │   │
│  │  │  4. Store Metadata in Database                               │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────┬─────────────────────────────────┬─────────────────────┘   │
│                │                                  │                         │
│                │ Save to                          │ Save to                 │
│                ▼                                  ▼                         │
│    ┌────────────────────────┐      ┌──────────────────────────┐           │
│    │  PostgreSQL Database   │      │  Firebase Cloud Storage  │           │
│    │                        │      │                          │           │
│    │  • Drone metadata      │      │  • Actual image files    │           │
│    │  • Image metadata      │      │  • CDN delivery          │           │
│    │  • Company data        │      │  • Scalable storage      │           │
│    │  • Predictions         │      │  • Global access         │           │
│    │  • User accounts       │      │                          │           │
│    └────────────────────────┘      └──────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                    DENGUE RISK PREDICTION WORKFLOW                            │
└───────────────────────────────────────────────────────────────────────────────┘

                         Admin Initiates Prediction
                                    │
                                    │ POST /api/predict/three-models
                                    │ - Location coordinates
                                    │ - Image IDs
                                    ▼
                         ┌──────────────────────┐
                         │   Backend API        │
                         │   (Node.js)          │
                         │                      │
                         │ • Fetch images       │
                         │ • Get coordinates    │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP Request
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ML PREDICTION SERVICE (Python/Flask)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│   │   MODEL 1        │    │   MODEL 2        │    │   MODEL 3         │  │
│   │   Historical     │    │   Weather-Based  │    │   Breeding Area   │  │
│   │   Cases          │    │                  │    │   Detection (CV)  │  │
│   ├──────────────────┤    ├──────────────────┤    ├───────────────────┤  │
│   │                  │    │                  │    │                   │  │
│   │ Input:           │    │ Input:           │    │ Input:            │  │
│   │ • Past 7-30 days │    │ • Temperature    │    │ • Drone images    │  │
│   │   case data      │    │ • Rainfall       │    │                   │  │
│   │ • Hotspot status │    │ • Humidity       │    │ Detection:        │  │
│   │ • Location       │    │ • Lagged weather │    │ • Water containers│  │
│   │   cluster        │    │                  │    │ • Puddles         │  │
│   │                  │    │ Process:         │    │ • Drains          │  │
│   │ Process:         │    │ • Fetch weather  │    │ • Storage tanks   │  │
│   │ • Query dengue   │    │ • Calculate      │    │                   │  │
│   │   database       │    │   lagged         │    │ Process:          │  │
│   │ • Calculate      │    │   features       │    │ • Roboflow API    │  │
│   │   temporal       │    │ • Random Forest  │    │ • YOLOv8 object   │  │
│   │   features       │    │   prediction     │    │   detection       │  │
│   │ • Random Forest  │    │                  │    │ • Confidence      │  │
│   │   prediction     │    │ Output:          │    │   scoring         │  │
│   │                  │    │ Score: 0-10      │    │ • Area weighting  │  │
│   │ Output:          │    │                  │    │                   │  │
│   │ Score: 0-10      │    │                  │    │ Output:           │  │
│   │                  │    │                  │    │ Score: 0-10       │  │
│   │ Example: 2.8     │    │ Example: 3.2     │    │ Example: 2.9      │  │
│   └──────────────────┘    └──────────────────┘    └───────────────────┘  │
│                │                    │                        │              │
│                └────────────────────┼────────────────────────┘              │
│                                     │                                       │
│                                     ▼                                       │
│                          ┌──────────────────────┐                          │
│                          │  ENSEMBLE COMBINER   │                          │
│                          ├──────────────────────┤                          │
│                          │  Combined Score =    │                          │
│                          │  (2.8 × 0.35) +      │                          │
│                          │  (3.2 × 0.35) +      │                          │
│                          │  (2.9 × 0.30)        │                          │
│                          │  = 2.97              │                          │
│                          │                      │                          │
│                          │  Risk Level:         │                          │
│                          │  MEDIUM              │                          │
│                          └──────────┬───────────┘                          │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      │ Return Prediction
                                      ▼
                         ┌──────────────────────┐
                         │   Backend API        │
                         │                      │
                         │ • Store prediction   │
                         │ • Store detections   │
                         │ • Send notifications │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌────────────────┐  ┌──────────┐  ┌──────────────┐
         │   Database     │  │  Push    │  │  Dashboard   │
         │   • Prediction │  │  Notif   │  │  • Risk map  │
         │   • Detections │  │  Mobile  │  │  • Actions   │
         └────────────────┘  └──────────┘  └──────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                      RISK LEVEL DETERMINATION                                 │
└───────────────────────────────────────────────────────────────────────────────┘

                    Combined Score Thresholds
                           (Customizable)

    0.0         1.0                   3.0              10.0
     │           │                     │                 │
     ├───────────┼─────────────────────┼─────────────────┤
     │    LOW    │       MEDIUM        │      HIGH       │
     │   RISK    │        RISK         │      RISK       │
     └───────────┴─────────────────────┴─────────────────┘
        ▲            ▲                      ▲
        │            │                      │
   Example: 0.5  Example: 2.97        Example: 4.2
   No breeding   Multiple sites        Heavy outbreak +
   sites, low    detected, recent      optimal weather +
   historical    cases, good           many breeding
   cases         weather               sites


┌───────────────────────────────────────────────────────────────────────────────┐
│                         KEY ADVANTAGES                                        │
└───────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │  1. COMPREHENSIVE RISK ASSESSMENT                                  │
  │     → Combines historical data, weather, and real-time imagery     │
  │     → No single point of failure                                   │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │  2. ACTIONABLE INSIGHTS                                            │
  │     → Model 3 identifies EXACT locations of breeding sites         │
  │     → Provides bounding boxes and confidence scores                │
  │     → Enables targeted interventions                               │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │  3. SCALABLE ARCHITECTURE                                          │
  │     → Cloud storage (Firebase) for unlimited images                │
  │     → Microservices: API (Node.js) + ML (Python) separate         │
  │     → Database indexes for fast queries                            │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │  4. EXPLAINABLE AI                                                 │
  │     → Individual model scores visible                              │
  │     → Transparent weighting (35%-35%-30%)                          │
  │     → Auditable predictions                                        │
  └────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────┐
  │  5. MULTI-TENANT & SECURE                                          │
  │     → Company data isolation                                       │
  │     → JWT authentication                                           │
  │     → Role-based access control                                    │
  └────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                    REAL-WORLD EXAMPLE OUTPUT                                  │
└───────────────────────────────────────────────────────────────────────────────┘

  Location: KLCC Office, Kuala Lumpur
  Date: After heavy monsoon rainfall

  ┌─────────────────────────────────────────────────────────────────┐
  │  PREDICTION RESULTS                                             │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  Overall Risk: MEDIUM (2.97 / 10)                               │
  │                                                                  │
  │  Model Breakdown:                                               │
  │  • Historical Cases (35%): 2.8 → Recent outbreak detected       │
  │  • Weather Conditions (35%): 3.2 → Optimal for mosquitoes       │
  │  • Breeding Sites (30%): 2.9 → 8 sites detected                 │
  │                                                                  │
  │  Detected Breeding Sites:                                       │
  │  ✓ 3 water containers (high confidence: 87%, 79%, 82%)         │
  │  ✓ 1 large puddle (91% confidence, 28,500 px²)                 │
  │  ✓ 2 clogged drains (76%, 68% confidence)                      │
  │  ✓ 1 water storage tank (93% confidence, 35,600 px²)           │
  │                                                                  │
  │  Recommendations:                                               │
  │  → Immediate inspection of parking area containers             │
  │  → Schedule fogging treatment                                  │
  │  → Repair/clean clogged drainage system                        │
  │  → Cover water storage tank                                     │
  │  → Follow-up surveillance in 48 hours                           │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGIES USED                                        │
└───────────────────────────────────────────────────────────────────────────────┘

  Frontend:         Next.js 14, TypeScript, Framer Motion
  Backend API:      Node.js 18, Express.js, Prisma ORM
  ML Service:       Python 3.11, Flask, scikit-learn
  Database:         PostgreSQL 16
  Cloud Storage:    Firebase Storage (CDN-backed)
  Object Detection: YOLOv8 via Roboflow API
  Authentication:   JWT (JSON Web Tokens)
  Real-time Notif:  Firebase Cloud Messaging
  
  Deployment:       Docker containers, Cloud Run / Render
```

---

## Panel Talking Points (To Accompany Diagrams)

### For Diagram 1 (Data Flow):
> "When a drone operator uploads images through our admin dashboard, the system employs a hybrid storage strategy. The actual image binaries are uploaded to Firebase Cloud Storage for scalability and global CDN delivery, while only the metadata—URLs, filenames, and relationships—is stored in our PostgreSQL database. This keeps our database lightweight and queries fast, even with thousands of images."

### For Diagram 2 (Risk Algorithm):
> "Our dengue risk algorithm uses a three-model ensemble. Model 1 analyzes historical case patterns using Random Forest, identifying temporal trends and hotspot locations. Model 2 evaluates weather conditions—temperature, rainfall, humidity—with lagged features to capture the 7-14 day mosquito maturation cycle. Model 3 is our computer vision system, using YOLOv8 to detect mosquito breeding sites in drone imagery with confidence scores and bounding boxes. We weight these 35%-35%-30% respectively, balancing historical data, environmental factors, and real-time conditions."

### For Diagram 3 (Example):
> "Let me walk through a real example. For a location in KLCC after heavy rainfall: Model 1 detected 12 recent cases nearby, scoring 2.8. Model 2 identified optimal breeding conditions—29°C and 85mm rainfall—scoring 3.2. Model 3 analyzed 5 drone images and detected 8 breeding sites including containers, puddles, and clogged drains, scoring 2.9. The weighted average gives us 2.97, classified as MEDIUM risk, just below the HIGH threshold. The system then provides actionable recommendations targeting the specific detected breeding sites."

### For Risk Level Thresholds:
> "Companies can customize these thresholds based on their risk tolerance. A hospital in a dengue-prone area might set lower thresholds to be more cautious, while a warehouse might accept higher thresholds. This flexibility makes our system adaptable to different industries and contexts while maintaining the same underlying prediction models."

---

**END OF SIMPLIFIED DIAGRAMS**
