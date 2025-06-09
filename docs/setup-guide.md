# 🔧 Setup Guide – Drone4Dengue

This guide helps you run the project locally across all folders.

---

## 1. Prerequisites

* Node.js (v18+)
* Python 3.10+
* PostgreSQL (or Supabase for hosted DB)
* Expo CLI

---

## 2. Folder-by-Folder Setup

### 📱 client-mobile

```bash
cd client-mobile
npm install
npx expo start
```

### 💻 client-admin

```bash
cd client-admin
npm install
npm start
```

### 🔁 server-api

```bash
cd server-api
npm install
npm run dev
```

### 🧠 server-ml

```bash
cd server-ml
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

---

## 3. Environment Variables

Create `.env` files in `server-api/` and `client-admin/`:

### `.env.example` for `server-api`

```env
DATABASE_URL=your_postgres_url
JWT_SECRET=your_jwt_secret
ML_PREDICT_URL=http://localhost:5000/predict
```

---

## 4. Database (PostgreSQL)

Use Prisma to migrate schema:

```bash
npx prisma migrate dev --name init
```

---

## 5. ML Prediction Service

Access your ML service at `http://localhost:5000/predict`
Example request body:

```json
{
  "temperature": 31.5,
  "humidity": 78,
  "rainfall": 12
}
```

---

## ✅ You are now ready to develop and test Drone4Dengue!
