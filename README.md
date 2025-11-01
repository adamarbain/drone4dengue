# Drone4Dengue Project

## 📦 Project Overview
Drone4Dengue is a hybrid system comprising a mobile app (DroneEye) and an admin dashboard designed to assist Malaysian public health authorities in dengue surveillance, prediction, and community awareness. It integrates drones, meteorological data, and machine learning for early intervention.

---

## 🧩 Modules & Use Cases
- [📄 Modules](./docs/modules.md)
- [📄 Use Cases](./docs/use-cases.md)

---

## 🛠️ Tech Stack

### 💻 Frontend
- **Mobile App**: React Native with Expo
- **Web Dashboard**: React.js with TypeScript

### 🧠 Backend
- Node.js with Express
- PostgreSQL + Prisma ORM

### 📊 ML Model
- Python + Flask (DengueTrendPredictor, DengueClimatePredictor)

### 🔔 Notifications
- Expo Push Notifications
- Optional: SendGrid / Twilio

### ☁️ Deployment & Storage
- Web & API: Vercel / Railway / Render
- DB: Supabase / Railway PostgreSQL
- ML Service: Render / PythonAnywhere
- Image Storage: Firebase Storage (migrated from local filesystem)

---

## 📁 Project Structure
/drone4dengue<br>
├── client-mobile/ # React Native Expo App<br>
├── client-admin/ # React Web Dashboard<br>
├── server-api/ # Node.js REST API<br>
├── server-ml/ # Python ML model<br>
└── docs/ # Design, diagrams, documentation<br>


---

## 📚 Documentation

- [📄 Use Case Descriptions](./docs/use-cases.md)
- [📄 UI Navigation](./docs/ui-navigation.md)
- [📄 API Specification](./docs/api-spec.md)
- [📄 Prediction Model](./docs/prediction-model.md)
- [📄 Firebase Storage Migration](./docs/firebase-storage-migration.md)
- [📄 Three-Model Prediction Flow](./docs/three-model-prediction-flow.md)

## ✅ Getting Started

### 🔧 Prerequisites
- Node.js + npm
- Python 3.10+
- PostgreSQL (or use Supabase)

### 🔌 Setup Instructions
- [📄 Setup Guide](./docs/setup-guide.md)






