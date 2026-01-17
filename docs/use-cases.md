## UC1: Login Account

**Module**: Authentication & User Account
**Actors**: User, Organisation, Admin
**Trigger**: User clicks the 'Login' button from the Home page
**Precondition**: Login page is opened
**Postcondition**: User successfully logs into their account

### Main Flow:

1. The user will fill in the email and password.
2. The user clicks on the ‘Login’ button.
3. The system will validate the user's credentials.
4. The system will prompt the message “successfully logged in.
5. The user is redirected to the Dashboard page


### Alternative Flow:

* A1.1: User clicks on 'Sign Up' → redirect to Registration Page.

### Exception Flows:

* E1.1: Required fields not filled → system shows error messages.
* E2.1: Wrong credentials → system shows “Wrong Credentials”.
* E3.1: Email not registered → system shows “User not found”.
* E4.1: User clicks ‘Forgot Password?’ → redirect to Reset Password page.

---

## UC2: Register Account

**Module**: Authentication & User Account
**Actors**: User, Organisation, Admin
**Trigger**: User clicks on the ‘Sign Up’ button
**Precondition**: Registration page is opened
**Postcondition**: User is registered and redirected to login

### Main Flow:

1. The user enters their Full Name.
2. The user enters a valid Email address.
3. The user creates a Password.
4. The user re-enters the password in the Confirm Password field.
5. The user selects their country code and enters a valid Phone Number.
6. The user checks the box to agree on Terms and Conditions Policy.
7. The user clicks on the ‘REGISTER’ button.
8. The system validates the form input.
9. The system creates the account if all fields are valid and the email is not already registered.
10. The system displays a confirmation message and redirects the user to the Login page.

### Alternative Flow:

* A1.1: User clicks ‘Log in’ → redirect to Login Page.

### Exception Flows:

* E1.1: Email already registered → system shows error.
* E2.1: Required fields not filled → system highlights them.
* E3.1: User clicks ‘Terms and Conditions’ → redirect to policy page.

---

## UC3: Reset Password

**Module**: Authentication & User Account
**Actors**: User, Organisation, Admin
**Trigger**: User clicks “Forgot Password?” on the login screen
**Precondition**: User has a valid registered email
**Postcondition**: Password is reset and user can log in

### Main Flow:

1. User clicks on the “Forgot Password?” link on the login page.
2. System prompts the user to enter their registered email address.
3. User enters their email and submits the request.
4. System validates the email and sends a code to the user’s email.
5. User accesses the email enters the code in the app/web.
6. System prompts the user to enter and confirm a new password.
7. User submits the new password.
8. System updates the password and confirms the reset was successful


### Alternative Flow:

* A1.1: Email not registered → show “Email not found”

### Exception Flows:

* E1.1: Email not received → allow resend/check spam
* E2.1: Passwords mismatch → prompt for re-entry

---

## UC4: Edit Profile

**Module**: Authentication & User Account
**Actors**: User, Organisation, Admin
**Trigger**: User selects 'Edit Profile' from profile/settings
**Precondition**: User is logged in
**Postcondition**: Updated profile info is saved and shown

### Main Flow:

1. User navigates to the Profile (DroneEye app) or Settings > Profile Settings (Admin web).
2. System displays the current profile information.
3. User selects the "Edit" option
4. User modifies desired fields (e.g., name, email, phone number, profile photo).
5. User submits the changes.
6. System validates the inputs and updates the user profile.
7. A success message is displayed confirming the changes.

### Alternative Flow:

* A1.1: Validation fails → system prompts for correction

### Exception Flow:

* E1.1: Update fails → show “Unable to update profile”

---

## UC5: Manage Drone and Location

**Module**: Drone & Surveillance Management
**Actors**: Admin, User
**Trigger**: Access drone section in dashboard/app
**Precondition**: Authenticated and authorized user
**Postcondition**: Drone is registered/assigned or data is viewed

### Main Flow (Admin):

1. Admin logs into the system and navigates to Drone Management.
2. System displays a list of all registered drones and their assigned areas.
3. Admin adds, edits, or deletes drone records.
4. Admin assigns drones to specific locations via map interface.
5. Admin saves updates; system reflects changes immediately.

### Main Flow (User):

1. User navigates to the Drone section.
2. User selects Register My Drone and fills in drone details (ID, model, location).
3. System validates the input and registers the drone.
4. User can view the status and assigned monitoring zones.
User can also view other drone activities and monitoring areas nearby.

### Alternative Flows:

* A1.1: Invalid/duplicate ID → prompt for correction
* A2.1: Area overlaps with high-priority zone → alert admin

### Exception Flows:

* E1.1: DB update fails → retry or log issue
* E2.1: GPS permission denied → prompt for access

---

## UC6: Manage Images Captured by Drone

**Module**: Drone & Surveillance Management
**Actors**: Admin
**Trigger**: Admin selects a drone to manage images
**Precondition**: Images exist and drone is registered
**Postcondition**: Images are reviewed, edited or deleted

### Main Flow:

1. Admin logs in and navigates to the Drone Management module.
2. Admin selects a drone entry to view its associated images.
3. System displays all images captured by that drone, tagged by location or date.
4. Admin reviews images for dengue breeding site indicators or anomalies.
5. Admin may:
- Download or enlarge images for closer inspection.
- Edit metadata or notes linked to an image.
- Delete any unwanted or redundant images.
6. System confirms the update and refreshes the image gallery accordingly.

### Alternative Flows:

* A1.1: Images uploading → show “Uploading…”
* A2.1: Bulk delete → prompt for confirmation

### Exception Flows:

* E1.1: No images → show “No images available”
* E2.1: Server error → show message and log issue

---

## UC7: Manage User

**Module**: User Management & Access Control
**Actors**: Admin
**Trigger**: Admin navigates to the User Management section
**Precondition**: Admin is authenticated
**Postcondition**: User records are managed successfully

### Main Flow:

1. Admin logs into the Drone4Dengue Admin Web System.
2. Admin selects User Management from the sidebar menu.
3. System displays the user list with filters, search, and status indicators.
4. Admin may perform one or more of the following actions:
-  Add a new user by filling in registration details.
-  Edit user information such as address or role.
-  Manage user roles (e.g., change from Normal User to Admin).
-  Update user status (e.g., Verified, Pending, In Progress).
-  Remove users if no longer part of the system.
5. Admin submits changes.
6. System saves the updates and refreshes the user list.

### Alternative Flows:

* A1.1: Unregistered user → send invite
* A2.1: Role conflict → prompt confirmation or block

### Exception Flows:

* E1.1: Save fails → show error and log
* E2.1: User list fails to load → show message

---

## UC8: Manage Dengue Data

**Module**: Dengue Data Analytics
**Actors**: Admin
**Trigger**: Admin opens Data Management
**Precondition**: Authenticated admin with access rights
**Postcondition**: Data uploaded, filtered or viewed

### Main Flow:

1. Admin logs into the system and selects the Data Management module.
2. System displays a dashboard showing existing dengue records by date and location.
3. Admin may:
- Upload new data (CSV or form-based input).
- Filter data by location or date.
- View number of active and total cases, along with coverage area.
- Track processing status (e.g., Completed, Processing).
4. System updates the data table and visual elements:
- Historical trend graph.
- Map view by region (e.g., Kuala Lumpur).
5. Admin clicks "Details" for more granular data visualization or forecasting.

### Alternative Flows:

* A1.1: No matching records → show message
* A2.1: Incomplete upload → prompt correction

### Exception Flows:

* E1.1: Upload fails → show error and log it

---

## UC9: Generate Report

**Module**: Dengue Data Analytics
**Actors**: Admin
**Trigger**: Admin opens Reports module
**Precondition**: Existing data available
**Postcondition**: Report is generated and exported

### Main Flow:

1. Admin logs into the system and navigates to the Reports section.
2. Admin selects filter criteria:
- Start Date and End Date
- Location
- Data Type (e.g., active cases, drone images, predictions)
3. System displays a Preview (e.g., Weekly Overview, Total Cases).
4. Admin clicks Generate Report.
5. System compiles and presents the full report preview.
6. Admin chooses export format:
- Export as PDF / CSV / XLSX / Other formats
7. Report is downloaded and saved.

### Alternative Flows:

* A1.1: Incomplete filters → disable button, prompt
* A2.1: Format change → regenerate in new format

### Exception Flows:

* E1.1: Generation failed → show error and log it

---

## UC10: Manage Prediction and Alert

**Module**: Prediction & Alert Management
**Actors**: Admin
**Trigger**: Admin accesses Prediction & Alert module
**Precondition**: Models and data exist
**Postcondition**: Alerts and predictions are configured

### Main Flow:

1. Admin opens Prediction & Alert section.
2. System displays dengue prediction map and risk-level overview.
3. Admin applies filters (State, City, Risk Level, Date Range).
4. System updates the Predicted Risk Areas list with:
- Area name
- Risk Level (Low, Medium, High)
- Confidence Score
- Prediction date
5. Admin clicks View Details for granular insight or Download Prediction for export.
6. Admin configures Alert Rules by:
- Setting thresholds for risk levels (e.g., High ≥ 70%)
- Setting user groups as recipients
- Choosing channels: Emails, SMS, Push Notification
7. Admin creates or modifies Notification Schedules (e.g., daily, weekly)
8. System saves and applies the schedule
9. Admin views Alert History and may resend or export notification

### Alternative Flows:

* A1.1: No areas match filters → show message
* A2.1: No recipients → prevent saving

### Exception Flows:

* E1.1: Model fails or data missing → show “Unavailable”
* E2.1: Schedule save fails → prompt retry

---

## UC11: Manage Settings

**Module**: Authentication & User Account
**Actors**: Admin
**Trigger**: Admin accesses Settings module
**Precondition**: Authenticated with permission
**Postcondition**: System settings are saved

### Main Flow:

#### Profile Settings
1. Admin accesses Profile Settings.
2. System displays current profile info: Name, Email, Organization.
3. Admin clicks Edit Profile, updates information, and clicks Save Changes.
4. System validates and updates the profile.

#### Password  Settings
1. Admin opens Password Settings.
2. Admin inputs current password, new password, and confirmation.
3. Admin clicks Update Password.
4. System validates and updates the password securely.

#### Notification Preferences
1. Admin toggles Email/SMS Notifications, selects Alert Frequency (Immediate, Daily, Weekly).
2. Admin clicks Save Preferences.
3. System stores the updated preferences.

#### System Configuration
1. Admin modifies values such as:
- Dengue Alert Threshold levels
- Prediction Model Parameters
- Data Synchronization
2. Admin clicks Apply Settings
3. System applies changes and confirms success.

### Alternative Flows:

* A1.1: Cancel edit → discard changes
* A2.1: Password confirm fails → prompt re-entry
* A3.1: Invalid inputs → prevent save and validate

### Exception Flow:

* E1.1: Save fails → show error and log

---

## UC12: Get Potential Dengue Notification

**Module**: Public Awareness & Prevention
**Actors**: User
**Trigger**: Prediction engine flags a high/moderate risk
**Precondition**: User has location enabled and app installed
**Postcondition**: Notification received and analyzed

### Main Flow:

1. User opens the DroneEye mobile app and lands on the Dashboard.
2. System automatically determines the user’s current or selected location.
3. Prediction engine checks for nearby dengue risks (based on UC12.1: Predict Potential Dengue Outbreak).
4. If high or moderate risk is detected, user receives a push notification with the mentioned area affected and dengue risk level.
5. User taps the notification or checks the Notification Tab in the app.
6. App opens the Risk Analysis Page:
- Level of Dengue risk
- Risk overview (location, case count, temperature/humidity)
- Visual indicators (map, color-coded threat levels)
- Drone-captured images (if available)
- Suggested actions (e.g., fogging, clearing stagnant water, wearing protective clothing)
7. User can also click Take Required Actions to view an actionable checklist or call authorities directly.

### Alternative Flows:

* A1.1: No risk → no notification
* A2.1: Location access denied → prompt user

---

## UC13: Get Recommendations

**Module**: Public Awareness & Prevention
**Actors**: User
**Trigger**: User taps on "Recommendation" in app
**Precondition**: User is logged in
**Postcondition**: Relevant tips are shown

### Main Flow:

1. The user taps on the “Recommendation” icon from the navigation menu.
2. The system displays three buttons: High Risk, Medium Risk, and Low Risk Recommendation.
3. The user selects one of the risk levels.
4. The system displays a list of general recommendations related to the selected risk level.
5. The user may tap on each recommendation to view additional details
6. The user can tap the Back button (top-left) to return to the category selection screen and choose a different risk level.

### Alternative Flow:

* A1.1: User taps other menu icon → app redirects

---

## UC14: Manage Weather Data

**Module**: Dengue Data Analytics
**Actors**: Admin
**Trigger**: Admin opens Weather Data module
**Precondition**: Authenticated and weather source available
**Postcondition**: Weather info saved or used in prediction

### Main Flow:

1. Admin logs into the system and navigates to the Weather Data module.
2. System displays current weather datasets, if any.
3. Admin uploads new weather data using a CSV or form input.
4. System validates the dataset format and values.
5. Upon successful validation, data is stored in the system.
6. The prediction engine accesses this data for integration with dengue risk calculations.
7. Admin can view or update specific weather records (temperature, humidity, rainfall).
8. System logs each data update with a timestamp for audit.

### Alternative Flow:

* A1.1: Format invalid → show error

### Exception Flows:

* E1.1: Save fails → show message and log it

## UC15: Monitor Daily Dengue Cases
**Module**: Public Awareness & Prevention
**Actors**: Public User
**Trigger**: User navigates to Dashboard and selects "Dengue Cases" tab
**Precondition**: User is logged in with companyId=comp-999, location permission is granted
**Postcondition**: User can view and interact with daily dengue cases on the map
**Description**: This use case enables public users to monitor and view daily dengue cases reported within the last 24 hours on an interactive map interface. Users can explore cases geographically, search for specific locations, view detailed case information, and navigate the map to understand the spatial distribution of dengue outbreaks in their area.
**Priority**: High

### Main Flow:

1. User opens the mobile app and navigates to the Dashboard page.
2. System checks if user has companyId='comp-999' (Public User).
3. System displays two tabs: "Current" and "Dengue Cases".
4. User taps on the "Dengue Cases" tab.
5. System fetches the latest dengue cases from the last 24 hours.
6. System displays a loading indicator while fetching data.
7. System displays all dengue cases as red markers on an interactive map.
8. Map automatically fits to show all available cases with appropriate padding.
9. User can interact with the map:
   - Pan to explore different areas
   - Zoom in/out to see more or less detail
   - View user's current location (blue marker)
10. User can search for locations using the search bar positioned above the map.
11. System performs geocoding search and displays up to 5 matching results.
12. User selects a search result from the dropdown.
13. Map animates to center on the selected location.
14. User taps on a dengue case marker (red pin).
15. System displays a modal dialog with case details:
    - Location name
    - Date of report (formatted as "DD Month YYYY")
    - Active cases count (highlighted in red)
    - Total cases count (if available)
    - Coverage area information (if available)
16. User can tap "View on Map" button to center the map on that specific case location.
17. User can close the modal by tapping the close button (X) or tapping outside the modal.
18. If user navigates away from their current location (>200m), a "Return to Location" button appears.
19. User taps the "Return to Location" button.
20. Map animates back to center on user's current location.

### Alternative Flow:

* A1.1: User searches for location → system displays search results dropdown, user selects result → map navigates to location
* A2.1: User clears search query → search results are cleared, search bar is reset
* A3.1: No dengue cases available → system displays message "No dengue cases found - No active cases in the last 24 hours"

### Exception Flow:

* E1.1: Failed to fetch dengue cases → system displays error alert "Failed to load dengue cases"
* E2.1: Location permission denied → system shows warning in console, user can still use app but without location features
* E3.1: Network error during search → system displays error alert "Failed to search location"
* E4.1: Geocoding service unavailable → search results remain empty, user can still use map

---

## UC16: Create Dengue Location Alert
**Module**: Public Awareness & Prevention
**Actors**: Public User
**Trigger**: User taps "Location Alert" button on the Dengue Cases map view
**Precondition**: User is logged in and viewing the Dengue Cases tab
**Postcondition**: Location alert is created and saved, user can receive notifications for that location
**Description**: This use case allows public users to create location-based alerts for monitoring dengue cases near specific areas of interest (e.g., home, office, school). Users can pin locations on a map or search for addresses, name their alerts, and receive notifications when dengue cases are detected within approximately 500 meters of their saved locations. Users can also manage existing alerts by toggling their active status or deleting them.
**Priority**: High

### Main Flow:

1. User is viewing the Dengue Cases map with dengue case markers displayed.
2. User taps the "Location Alert" button (bottom-left floating button with notification icon).
3. System fetches user's existing location alerts.
4. System displays an alert options modal with two options:
   - "View Existing Alerts" (shows count of saved alerts)
   - "Create New Alert"
5. User taps "Create New Alert".
6. System displays the alert creation modal (slides up from bottom, 85% screen height).
7. User enters an alert name in the "Alert Name" field (e.g., "Home", "Office", "School").
8. User selects a location using one of two methods:
   - **Method A (Search)**: User types in the location search bar, system performs geocoding and displays results, user selects a result
   - **Method B (Map Tap)**: User taps directly on the interactive map to pin a location
9. System performs reverse geocoding to get the address name for the selected coordinates.
10. System displays the selected location with:
    - Blue marker pin on the map
    - Location address/name in a highlighted box below the map
11. System displays an informational note: "You will receive notifications when dengue cases are detected within approximately 500m of your pinned location."
12. User reviews the alert name and location.
13. User taps the "Create Alert" button.
14. System validates that both alert name and location are provided.
15. System creates the location alert with:
    - Alert name
    - Latitude and longitude coordinates
    - Bounding box (500m radius)
    - Address (from reverse geocoding)
    - Active status (default: true)
16. System displays success message: "Location alert created successfully".
17. System closes the creation modal and refreshes the alerts list.
18. Alert is saved and user will receive notifications when dengue cases are detected near this location.

### Alternative Flow:

* A1.1: User taps "View Existing Alerts" → system displays modal with list of all saved alerts, user can toggle active/paused status, delete alerts, or create new alert
* A2.1: User changes selected location → user can search again or tap different point on map, system updates marker and address
* A3.1: User clears search query → search results are cleared, user can continue with map selection
* A4.1: User closes modal without creating → system discards all entered data, returns to map view

### Exception Flow:

* E1.1: Alert name is empty → system displays error alert "Please enter a name for the alert", create button remains disabled
* E2.1: Location is not selected → system displays error alert "Please pin a location on the map", create button remains disabled
* E3.1: Failed to create alert → system displays error alert "Failed to create location alert"
* E4.1: Reverse geocoding fails → system displays coordinates instead of address name (format: "lat, lon")
* E5.1: Network error during search → search results remain empty, user can still use map to select location
* E6.1: Failed to fetch existing alerts → system still allows creating new alert, but cannot show existing count