# Features to be Tested

## Mobile Application Features to Test

| Feature ID | Feature | Priority | Functional Requirements |
| ---------- | ------- | -------- | -------- |
| F001 | Authenticate Mobile User (register, login, token storage/expiry, password reset via email + multi-step code verification) | High | REQ-1, REQ-2, REQ-3, REQ-5, REQ-7 |
| F002 | Manage Profile (edit profile details, phone, username, basic account data) | Medium | REQ-4, REQ-5|
| F003 | View Current Location Risk (location permissions, map centering, risk prediction card, saving last prediction) | High | REQ-18, REQ-21, REQ-24, REQ-26 |
| F004 | View Organisation (company locations map, markers by risk level, selection of location and prediction details) | High | REQ-24, REQ-25, REQ-26, REQ-27 |
| F005 | Risk analysis screen (detailed risk metrics, nearby dengue cases integration, live weather fetch, dynamic risk cards and actions) | High | REQ-18, REQ-19, REQ-21, REQ-24, REQ-25 |
| F006 | Public recommendations by risk level (fetch recommendations per High/Medium/Low, list view, detailed modal) | High | REQ-28, REQ-29, REQ-30 |
| F007 | Notification center (fetch notifications, risk-type specific cards, mark single/all as read, pull-to-reREQesh, badge count sync) | High | REQ-26, REQ-27 |
| F008 | Prediction-linked navigation (from dashboard prediction to risk analysis and recommendations with correct risk-level context) | Medium | REQ-24, REQ-28, REQ-29, REQ-30 |
| F009 | Company-based data integration (using companyId to fetch company locations and predictions, map fit-to-markers behaviour) | High | REQ-24, REQ-25, REQ-26, REQ-27 |
| F010 | Location-aware navigation controls (map region tracking, "return to current/original location" controls on dashboard and risk-analysis maps) | Medium | REQ-24, REQ-30 |
| F025 | Monitor Daily Dengue Cases & Location Alerts (view dengue cases on map with search, case details modal, create/manage location-based alerts with notifications) | High | REQ-31, REQ-32 |

## Admin Web Features to Test

| Feature ID | Feature | Priority | Functional Requirements |
| ---------- | ------- | -------- | -------- |
| F011 | Authenticate Admin (login, password reset, session handling) | High | REQ-1, REQ-2, REQ-3, REQ-5 |
| F012 | Manage Admin Profile (view/update name, username, phone, company info) | Medium | REQ-4, REQ-5 |
| F013 | View Dashboard Analytics (aggregated stats, recent predictions, recent drone images) | High | REQ-18, REQ-24, REQ-25, REQ-26, REQ-27 |
| F014 | Manage Admin Module (list, search/filter, add/edit users, roles & status, bulk operations, CSV export) | High | REQ-13, REQ-14, REQ-15, REQ-16 |
| F015 | Manage Drone Registry & Lifecycle (list, register/edit drones, assign operational area and company location, status tracking) | High | REQ-8, REQ-9, REQ-10, REQ-12 |
| F016 | Manage Drone Media(upload images & videos, client-side video REQame extraction, image listing, view/download/delete, per-drone gallery) | High | REQ-11, REQ-12 |
| F017 | Manage Company Location (CRUD locations, map picker & reverse geocoding, active/inactive flags) | High | REQ-10, REQ-12, REQ-21, REQ-23 |
| F018 | Manage Dengue Data (CSV upload, validation, filtered listing, pagination, export, coverage map & historical trends) | High | REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-22, REQ-23 |
| F019 | Manage Prediction & Alert (prediction map interaction, prediction list with filters/export, risk scoring from multiple models) | High | REQ-24, REQ-25, REQ-26, REQ-27, REQ-21 |
| F020 | Alert rule & notification configuration (risk thresholds, recipients, channels, schedules, alert history UI) | High | REQ-25, REQ-26, REQ-27, REQ-6 |
| F021 | Generate Report (filter by date/type, generate analytical reports, preview charts, detailed drill-down, multi-format export: PDF/CSV/XLSX/JSON) | High |REQ-18, REQ-19, REQ-20, REQ-24 |
| F022 | Manage & Ingest Weather data (per-location fetch from API, manual/CSV upload, validation, statistics, export) | High | REQ-21, REQ-22, REQ-23 |
| F023 | Configure System for Prediction Model (weights for temperature/rainfall/population, sync mode, alert thresholds) | Medium | REQ-21, REQ-24, REQ-25 |
| F024 | Notification preferences and broadcast push notifications to mobile users | High | REQ-6, REQ-26, REQ-27 |