# 📘 API Specification – Drone4Dengue Backend

This document outlines core API routes and role-based access for the Drone4Dengue backend (`server-api`).

---

## 🔐 Authentication Routes

| Method | Endpoint       | Description              | Access |
| ------ | -------------- | ------------------------ | ------ |
| POST   | /auth/login    | Login user               | Public |
| POST   | /auth/register | Register account         | Public |
| POST   | /auth/reset    | Reset forgotten password | Public |

---

## 👤 User Management (Admin Only)

| Method | Endpoint    | Description           |
| ------ | ----------- | --------------------- |
| GET    | /users      | List all users        |
| POST   | /users      | Add a new user        |
| PATCH  | /users/\:id | Update user info/role |
| DELETE | /users/\:id | Delete user           |

---

## 🚁 Drone & Location (Shared)

| Method | Endpoint         | Description              | Access                    |
| ------ | ---------------- | ------------------------ | ------------------------- |
| POST   | /drones/register | Register user drone      | User, Organisation, Admin |
| GET    | /drones          | View registered drones   | All Roles                 |
| PATCH  | /drones/\:id     | Assign drone to location | Admin                     |
| DELETE | /drones/\:id     | Remove drone             | Admin                     |

---

## 🖼️ Drone Images (Admin)

| Method | Endpoint            | Description             |
| ------ | ------------------- | ----------------------- |
| GET    | /drones/\:id/images | Get images for a drone  |
| DELETE | /images/\:imageId   | Delete a captured image |

---

## 🦟 Dengue Data (Admin)

| Method | Endpoint       | Description                   |
| ------ | -------------- | ----------------------------- |
| POST   | /dengue/upload | Upload dengue data (CSV/form) |
| GET    | /dengue        | List/filter dengue records    |

---

## ☁️ Weather Data (Admin)

| Method | Endpoint        | Description                  |
| ------ | --------------- | ---------------------------- |
| POST   | /weather/upload | Upload weather data          |
| GET    | /weather        | View historical weather data |

---

## 📊 Prediction & Alerts

### ML Prediction Service
| Method | Endpoint                    | Description                                    | Access     |
| ------ | --------------------------- | ---------------------------------------------- | ---------- |
| POST   | /api/predict/company        | Company dengue risk prediction                 | Admin      |
| POST   | /api/predict/public         | Public dengue risk prediction                  | Public     |
| GET    | /api/predict/company/:id    | Get company prediction history                 | Admin      |
| GET    | /api/predict/health         | Check prediction service health               | Public     |

### Input Requirements
- **Model 1 (Historical Cases)**: Uses only `latitude` and `longitude`
- **Model 2 (Weather-based)**: Uses `latitude`, `longitude`, `humidity`, `temperature`, `rainfall`
- Weather data is automatically fetched if not provided for Model 2

### Request Examples
```json
// Company Prediction
POST /api/predict/company
{
  "companyId": "company-uuid",
  "lat": 1.3521,
  "lon": 103.8198
}

// Public Prediction
POST /api/predict/public
{
  "lat": 1.3521,
  "lon": 103.8198,
  "userId": "user-uuid" // optional
}
```

### Response Format
```json
{
  "success": true,
  "prediction": {
    "latitude": 1.3521,
    "longitude": 103.8198,
    "riskScore": 0.65,
    "riskLevel": "medium",
    "model1Score": 0.7,
    "model2Score": 0.6,
    "timestamp": "2025-01-17T10:30:00Z",
    "cached": false
  }
}
```

### Admin Dashboard Prediction Features
| Method | Endpoint        | Description                  |
| ------ | --------------- | ---------------------------- |
| GET    | /prediction     | Get prediction map and stats |
| POST   | /alerts         | Configure alert rules        |
| GET    | /alerts/history | View alert history           |

---

## 📬 Notifications (User)

| Method | Endpoint       | Description     |
| ------ | -------------- | --------------- |
| GET    | /notifications | Get push alerts |

---

## 📑 Reports (Admin)

| Method | Endpoint          | Description                   |
| ------ | ----------------- | ----------------------------- |
| POST   | /reports/generate | Generate and download reports |
