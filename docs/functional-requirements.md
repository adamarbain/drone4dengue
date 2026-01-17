# ✅ Functional Requirements – Drone4Dengue

Grouped by module, each requirement supports one or more use cases.

---

## Authentication & User Account

* **REQ-1**: The system shall allow users to register using full name, email, phone number, and password.
* **REQ-2**: The system shall validate login credentials for all user roles.
* **REQ-3**: The system shall allow users to reset forgotten passwords via email verification.
* **REQ-4**: The system shall allow users to edit their profile information.
* **REQ-5**: The system shall allow users to update their password securely.
* **REQ-6**: The system shall allow users to configure their notification preferences.
* **REQ-7**: The system shall prevent users from registering with an email address that is already in use.

---

## Drone & Surveillance Management

* **REQ-8**: The system shall allow users to register a drone with basic metadata (ID, model, location).
* **REQ-9**: The system shall allow admins to add, edit, or remove drone records.
* **REQ-10**: The system shall allow admins to assign drones to monitoring zones via a map or form interface.
* **REQ-11**: The system shall allow admins to view and manage images captured by drones, including deleting or downloading them.
* **REQ-12**: The system shall display a list of registered drones along with their assigned locations and current status.

---

## User Management & Access Control

* **REQ-13**: The system shall display a list of registered users with filter and search functionality.
* **REQ-14**: The system shall allow admins to add new users.
* **REQ-15**: The system shall allow admins to modify user roles and account status.
* **REQ-16**: The system shall allow admins to delete inactive or unwanted users.

---

## Dengue Data Analytics

* **REQ-17**: The system shall allow uploading dengue case data via CSV or form.
* **REQ-18**: The system shall display data analytics, including case trends and geographical heatmaps.
* **REQ-19**: The system shall allow filtering dengue data by date and location.
* **REQ-20**: The system shall allow generating and exporting reports in PDF or CSV format.
* **REQ-21**: The system shall integrate the latest weather data with the prediction engine to support dengue outbreak forecasting.
* **REQ-22**: The system shall validate the format and content of uploaded weather data (e.g., temperature, humidity, rainfall).
* **REQ-23**: The system shall allow administrators to view and filter historical weather data entries.

---

## Prediction & Alert Management

* **REQ-24**: The system shall display predicted dengue outbreak areas with risk levels.
* **REQ-25**: The system shall allow configuring alert rules based on risk thresholds.
* **REQ-26**: The system shall send notifications to relevant users based on alert rules.
* **REQ-27**: The system shall log and display alert history.

---

## Public Awareness & Prevention

* **REQ-28**: The system shall allow users to view recommendations categorized by risk level (High, Medium, Low).
* **REQ-29**: The system shall display detailed preventive tips upon user selection.
* **REQ-30**: The system shall allow navigating between categories or returning to the main menu.
* **REQ-31**: The system shall allow public users to view and monitor daily dengue cases.
* **REQ-32**: The system shall allow public users to create, manage, and receive notifications for location-based dengue alerts.
