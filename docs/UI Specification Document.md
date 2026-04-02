# User Interface Specification Document

for

**Drone4Dengue**

## Table of Contents  
[1. Introduction](#introduction)  
[1.1 Purpose](#purpose)  
[1.2 Scope](#scope)  
[2. User Interface Overview](#user-interface-overview)  
[2.1 Mobile Application Interface](#mobile-application-interface)  
[2.2 Web Portal Interface](#web-portal-interface)  
[2.3 UI Design Principles](#ui-design-principles)  
[3. Mobile Application UI Screens](#mobile-application-ui-screens)  
[3.1 Authentication Screens](#authentication-screens)  
[3.2 Dashboard Screen](#dashboard-screen)  
[3.3 Risk Analysis & Recommendations](#risk-analysis--recommendations)  
[3.4 Notifications Screen](#notifications-screen)  
[3.5 Drone Management Screen](#drone-management-screen)  
[3.6 Profile & Settings Screens](#profile--settings-screens)  
[4. Web Portal UI Screens](#web-portal-ui-screens)  
[4.1 Authentication Pages](#authentication-pages)  
[4.2 Admin Dashboard](#admin-dashboard)  
[4.3 Data Management Page](#data-management-page)  
[4.4 Drone Management Page](#drone-management-page)  
[4.5 Prediction & Alert Management Pages](#prediction--alert-management-pages)  
[4.6 User Management Page](#user-management-page)  
[4.7 Report Generation Page](#report-generation-page)  
[4.8 Settings Page](#settings-page)  

---

## 1. Introduction {#introduction}

### 1.1 Purpose {#purpose}

The purpose of this document is to describe the user interface (UI) design of the Drone4Dengue system. This specification outlines the layout, functionality, and interaction flow of the graphical user interfaces used in the Drone4Dengue mobile application and web portal. The document provides descriptions of each interface screen to illustrate how users interact with the system when performing tasks such as monitoring dengue cases, managing drone data, viewing predictions, and administrative management.

This document serves as a reference for understanding the interface structure of the Drone4Dengue system and documents the visual and functional design of the application interfaces.

### 1.2 Scope {#scope}

This document covers the graphical user interfaces implemented in the Drone4Dengue system, including both the mobile application used by public users and field workers for dengue monitoring, and the web-based platform used by administrators for system management and data analytics. 

The scope of this UI specification includes:

*   **Mobile application interfaces** used by users for login, viewing the dengue dashboard, receiving risk analysis, reading recommendations, and managing drone status.
*   **Web portal interfaces** used by administrators to monitor usage statistics, manage user accounts, oversee drone operations, analyze dengue and weather data, and configure prediction alerts.

---

## 2. User Interface Overview {#user-interface-overview}

### 2.1 Mobile Application Interface {#mobile-application-interface}

The Drone4Dengue mobile application is designed to assist public users, organizations, and field workers in monitoring dengue risks and receiving actionable recommendations. The interface prioritizes accessibility and clear visual indicators (like maps and color-coded risk levels) to ensure users can quickly understand potential dengue outbreaks in their vicinity.

### 2.2 Web Portal Interface {#web-portal-interface}

The Drone4Dengue web portal provides comprehensive management and monitoring functionality for system administrators. Administrators can upload and analyze dengue case data, manage drone deployments, review captured images, configure prediction alerts, and generate detailed reports.

### 2.3 UI Design Principles {#ui-design-principles}

*   **Map-Centric Visualization:** Both the mobile app and web portal heavily utilize interactive maps to display dengue hotspots, drone locations, and predicted risk areas.
*   **Clear Alerting:** High-risk areas and notifications are prominently displayed using distinct color-coding (e.g., red for high risk) to grab user attention immediately.
*   **Data-Dense Dashboards:** The web portal utilizes tables, charts, and summary statistics to present complex dengue and weather data efficiently for administrative review.
*   **Intuitive Navigation:** The mobile app uses a bottom navigation bar for quick access to core features like Dashboard, Notifications, and Profile.

---

## 3. Mobile Application UI Screens {#mobile-application-ui-screens}

### 3.1 Authentication Screens {#authentication-screens}

**Login Screen:** Allows users to authenticate into the Drone4Dengue mobile application using their registered email and password. Includes a link to reset forgotten passwords and a link to the registration screen.
*[Insert Screenshot: Mobile Login Screen here]*

| Component | Description |
| :--- | :--- |
| Email Field | Text input field for the user's registered email address. |
| Password Field | Secure text input field for the user's password. |
| Login Button | Submits the credentials for authentication. |
| Forgot Password Link | Redirects to the password recovery screen. |
| Register Link | Redirects new users to the account creation screen. |

**Register Screen:** Allows new users to create an account by providing their full name, email, phone number, and password, and agreeing to the Terms and Conditions.
*[Insert Screenshot: Mobile Registration Screen here]*

| Component | Description |
| :--- | :--- |
| Full Name Field | Text input for the user's full name. |
| Email Field | Text input for a valid email address. |
| Phone Number Field | Input for contact number, including country code. |
| Password Fields | Inputs for creating and confirming a secure password. |
| T&C Checkbox | Checkbox to agree to the Terms and Conditions. |
| Register Button | Submits the registration form. |

**Verify OTP / Update Phone:** Screens dedicated to verifying user contact information for secure communication and alerts.
*[Insert Screenshot: Mobile OTP Verification Screen here]*

| Component | Description |
| :--- | :--- |
| OTP Input Fields | Numeric fields to enter the verification code sent via SMS/Email. |
| Verify Button | Submits the OTP for validation. |
| Resend Code Link | Requests a new verification code. |

### 3.2 Dashboard Screen {#dashboard-screen}

The primary landing screen after login. It features a map interface displaying daily dengue cases reported within the last 24 hours.
*[Insert Screenshot: Mobile Dashboard Map View here]*
*[Insert Screenshot: Mobile Location Alert Creation Modal here]*

| Component | Description |
| :--- | :--- |
| View Tabs | Toggle buttons to switch between "Current" and "Dengue Cases" views. |
| Search Bar | Text input to search for specific locations or addresses on the map. |
| Interactive Map | Displays geographical data, user location, and dengue hotspots. |
| Case Markers | Red pins on the map indicating reported dengue cases. Tapping reveals details. |
| Location Alert Button | Floating action button to create a new location-based notification alert. |
| Case Details Modal | Popup showing active cases, total cases, and date for a selected marker. |

### 3.3 Risk Analysis & Recommendations {#risk-analysis--recommendations}

**Risk Analysis Screen:** Opened via a notification or from the dashboard when a high/moderate risk is detected nearby. Displays the risk level, location overview, visual threat indicators, and drone-captured images if available.
*[Insert Screenshot: Mobile Risk Analysis Details Screen here]*

| Component | Description |
| :--- | :--- |
| Risk Level Indicator | Prominent text and color-coded badge showing the current threat level (e.g., High, Moderate). |
| Location Overview | Text detailing the affected area, case count, and environmental factors. |
| Image Gallery | Carousel or grid of drone-captured images showing potential breeding sites. |
| Action Button | Button linking to suggested preventive actions or authority contact info. |

**Recommendations Screen:** Provides users with actionable preventive tips categorized by risk level (High, Medium, Low).
*[Insert Screenshot: Mobile Recommendations List Screen here]*

| Component | Description |
| :--- | :--- |
| Risk Category Buttons | Selectable buttons (High, Medium, Low) to filter recommendations. |
| Tip List | A scrollable list of actionable advice (e.g., clearing stagnant water). |
| Back Button | Navigates back to the previous screen. |

### 3.4 Notifications Screen {#notifications-screen}

A dedicated tab where users can view a history of all alerts and notifications received from the system, such as potential dengue outbreak warnings based on the prediction engine.
*[Insert Screenshot: Mobile Notifications List Screen here]*

| Component | Description |
| :--- | :--- |
| Notification List | Scrollable list of past and recent alerts. |
| Notification Item | Displays the alert title, brief description, timestamp, and read/unread status. |
| Filter/Sort Options | Controls to organize notifications by date or severity. |

### 3.5 Drone Management Screen {#drone-management-screen}

Allows authorized users to register their drone by inputting details (ID, model, location). Users can view the status of their drone and its assigned monitoring zones.
*[Insert Screenshot: Mobile Drone Registration/Status Screen here]*

| Component | Description |
| :--- | :--- |
| Drone List | Displays currently registered drones and their active status. |
| Register Drone Button | Opens the form to add a new drone to the system. |
| Drone Details Form | Input fields for Drone ID, Model, and Location assignment. |
| Status Indicator | Shows whether the drone is active, idle, or offline. |

### 3.6 Profile & Settings Screens {#profile--settings-screens}

**Profile Screen:** Displays the user's current account information.
*[Insert Screenshot: Mobile User Profile Screen here]*

| Component | Description |
| :--- | :--- |
| Profile Avatar | Displays the user's uploaded photo or a default placeholder. |
| User Info Display | Read-only text showing name, email, and phone number. |
| Edit Profile Button | Navigates to the profile editing screen. |
| Logout Button | Ends the current session and returns to the login screen. |

**Edit Profile:** Allows the user to modify their name, email, phone number, and profile photo.
*[Insert Screenshot: Mobile Edit Profile Screen here]*

| Component | Description |
| :--- | :--- |
| Editable Text Fields | Inputs for updating name, email, and phone number. |
| Photo Upload | Button to select and upload a new profile picture. |
| Save Button | Commits the changes to the user's profile. |

**Change Password:** A secure screen for updating the account password.
*[Insert Screenshot: Mobile Change Password Screen here]*

| Component | Description |
| :--- | :--- |
| Current Password Field | Input to verify the existing password. |
| New Password Fields | Inputs for the new password and confirmation. |
| Update Button | Saves the new password securely. |

**Organisation Details:** For users associated with specific organizations to view or manage their affiliation.
*[Insert Screenshot: Mobile Organisation Details Screen here]*

| Component | Description |
| :--- | :--- |
| Organisation Info | Displays the name and details of the affiliated organization. |
| Role Indicator | Shows the user's role within the organization. |

---

## 4. Web Portal UI Screens {#web-portal-ui-screens}

### 4.1 Authentication Pages {#authentication-pages}

**Login Page:** The entry point for administrators to access the web portal using their credentials.
*[Insert Screenshot: Web Portal Admin Login Page here]*

| Component | Description |
| :--- | :--- |
| Email/Username Field | Text input for the admin's login identifier. |
| Password Field | Secure text input for the admin's password. |
| Login Button | Submits credentials to access the admin dashboard. |
| Forgot Password Link | Redirects to the password recovery flow. |

**Signup & Forgot Password:** Pages for creating new admin accounts (if permitted) and recovering lost passwords.
*[Insert Screenshot: Web Portal Signup/Forgot Password Page here]*

| Component | Description |
| :--- | :--- |
| Registration Form | Fields for new admin details (Name, Email, Role request). |
| Recovery Email Field | Input to send a password reset link. |

### 4.2 Admin Dashboard {#admin-dashboard}

The main overview page providing a high-level summary of system activities. It includes key metrics such as total active dengue cases, registered drones, active alerts, and a summary map of current hotspots.
*[Insert Screenshot: Web Portal Admin Dashboard Overview here]*

| Component | Description |
| :--- | :--- |
| Summary Cards | High-level metric widgets (Total Cases, Active Drones, Alerts). |
| Overview Map | Interactive map highlighting current dengue hotspots and drone activities. |
| Recent Activity Log | A feed of the latest system events or recent case reports. |
| Navigation Sidebar | Persistent menu for accessing different administrative modules. |

### 4.3 Data Management Page {#data-management-page}

Allows administrators to manage the core datasets driving the system.

**Dengue Data:** Upload new dengue case data via CSV, filter historical records by date and location, and view geographical heatmaps.
*[Insert Screenshot: Web Portal Dengue Data Management Page here]*

| Component | Description |
| :--- | :--- |
| Upload Data Button | Opens a dialog to upload CSV files containing dengue case records. |
| Data Table | Tabular view of historical dengue cases with sorting and pagination. |
| Filter Controls | Dropdowns and date pickers to filter data by location and time period. |
| Heatmap Toggle | Button to switch the map view to a density heatmap of cases. |

**Weather Data:** Upload and manage weather datasets (temperature, humidity, rainfall) which are crucial for the prediction engine.
*[Insert Screenshot: Web Portal Weather Data Management Page here]*

| Component | Description |
| :--- | :--- |
| Weather Data Table | Displays historical weather records (temp, humidity, rainfall). |
| Upload Weather CSV | Tool to import bulk weather data for the prediction models. |

### 4.4 Drone Management Page {#drone-management-page}

A comprehensive interface for managing the drone fleet. Admins can view a list of all registered drones, add/edit records, and review images.
*[Insert Screenshot: Web Portal Drone Fleet List Page here]*
*[Insert Screenshot: Web Portal Drone Image Gallery/Review Page here]*

| Component | Description |
| :--- | :--- |
| Drone Fleet Table | List of all drones showing ID, Model, Assigned Area, and Status. |
| Add/Edit Drone Modal | Form to register a new drone or update an existing one's details. |
| Image Gallery | Grid view of photos captured by a selected drone. |
| Image Actions | Buttons to download, delete, or enlarge specific drone images. |

### 4.5 Prediction & Alert Management Pages {#prediction--alert-management-pages}

**Prediction Alert:** Displays the dengue prediction map and risk-level overview. Admins can configure alert rules and schedule notifications.
*[Insert Screenshot: Web Portal Prediction & Alert Configuration Page here]*

| Component | Description |
| :--- | :--- |
| Prediction Map | Visualizes forecasted risk areas based on ML models. |
| Alert Rules Form | Inputs to define risk thresholds (e.g., High >= 70%) that trigger alerts. |
| Recipient Selector | Dropdown or checkboxes to choose which user groups receive notifications. |
| Schedule Configurator | Controls to set notification frequency (Immediate, Daily, Weekly). |

**Prediction Accuracy:** A dashboard for reviewing the performance and accuracy metrics of the underlying machine learning models over time.
*[Insert Screenshot: Web Portal Prediction Accuracy Metrics Page here]*

| Component | Description |
| :--- | :--- |
| Accuracy Charts | Line or bar graphs showing model precision and recall over time. |
| Metric Summary | Text readouts of key performance indicators for the ML engine. |

### 4.6 User Management Page {#user-management-page}

Displays a searchable and filterable list of all registered users. Admins can add new users, modify user roles, update account statuses, and remove inactive users.
*[Insert Screenshot: Web Portal User Management List Page here]*

| Component | Description |
| :--- | :--- |
| User Data Table | Comprehensive list of users with columns for Name, Email, Role, and Status. |
| Search/Filter Bar | Tools to quickly find specific users or filter by role/status. |
| Action Menu | Options (Edit, Delete, Change Role) available for each user row. |
| Add User Button | Opens a form to manually register a new user or admin. |

### 4.7 Report Generation Page {#report-generation-page}

Allows admins to generate comprehensive reports based on specific filters. The interface provides a report preview and export options.
*[Insert Screenshot: Web Portal Report Generation & Preview Page here]*

| Component | Description |
| :--- | :--- |
| Report Filters | Selectors for Date Range, Location, and Data Type to include in the report. |
| Generate Button | Compiles the data based on selected filters. |
| Report Preview | On-screen document viewer showing the generated report layout. |
| Export Options | Buttons to download the report as PDF, CSV, or XLSX. |

### 4.8 Settings Page {#settings-page}

The configuration hub for the web portal. Admins can update their profile and configure system-wide settings.
*[Insert Screenshot: Web Portal System Settings Page here]*

| Component | Description |
| :--- | :--- |
| Profile Settings Form | Inputs to update the admin's personal details and password. |
| System Config Panel | Controls for global variables (e.g., default alert thresholds, sync intervals). |
| Save Changes Button | Applies the updated settings to the system. |
