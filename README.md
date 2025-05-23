# Drone4Dengue Project

## 📦 Project Overview
Drone4Dengue is a hybrid system comprising a mobile app (DroneEye) and an admin dashboard designed to assist Malaysian public health authorities in dengue surveillance, prediction, and community awareness. It integrates drones, meteorological data, and machine learning for early intervention.

---

## 🧩 Modules & Use Cases

### ✅ Authentication & User Account
- UC1: Login Account
- UC2: Register Account
- UC3: Reset Password
- UC4: Edit Profile
- UC11: Manage Settings

### ✅ Drone & Surveillance Management
- UC5: Manage Drone and Location
- UC6: Manage Images Captured by Drone

### ✅ User Management & Access Control
- UC7: Manage User

### ✅ Dengue Data Analytics
- UC8: Manage Dengue Data
- UC9: Generate Report
- UC14: Manage Weather Data

### ✅ Prediction & Alert Management
- UC10: Manage Prediction and Alert
- UC12: Get Potential Dengue Notification

### ✅ Public Awareness & Prevention
- UC12: Get Potential Dengue Notification
- UC13: Get Recommendations

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

### ☁️ Deployment
- Web & API: Vercel / Railway / Render
- DB: Supabase / Railway PostgreSQL
- ML Service: Render / PythonAnywhere

---

## 📁 Project Structure
/drone4dengue
├── client-mobile/ # React Native Expo App
├── client-admin/ # React Web Dashboard
├── server-api/ # Node.js REST API
├── server-ml/ # Python ML model
└── docs/ # Design, diagrams, documentation


---

## ✅ Getting Started

### 🔧 Prerequisites
- Node.js + npm
- Python 3.10+
- PostgreSQL (or use Supabase)

### 🔌 Setup Instructions
```bash
# Mobile App
cd client-mobile
npm install
npx expo start

# Admin Web
cd client-admin
npm install
npm start

# Backend API
cd server-api
npm install
npm run dev

# ML Model
cd server-ml
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py






