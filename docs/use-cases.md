## UC1: Login Account

**Module**: Authentication & User Account
**Actors**: User, Organisation, Admin
**Trigger**: User clicks the 'Login' button from the Home page
**Precondition**: Login page is opened
**Postcondition**: User successfully logs into their account

### Main Flow:

1. User enters email and password.
2. User clicks the 'Login' button.
3. System validates credentials.
4. If valid, display success message and redirect to dashboard.

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

1. User enters full name, email, password, confirm password, country code, phone number.
2. User checks Terms and Conditions checkbox.
3. User clicks 'REGISTER'.
4. System validates inputs and checks email uniqueness.
5. Account is created → confirmation shown → redirect to login.

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

1. User clicks “Forgot Password?”
2. System prompts email input → user submits
3. System sends code
4. User inputs code inside the app
5. User sets and confirms new password
6. System confirms success

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

1. Navigate to Profile/Settings
2. System shows current profile info
3. User clicks “Edit” and modifies fields
4. User submits changes
5. System validates and updates data
6. Show success message

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

1. Admin accesses Drone Management
2. View list of drones and areas
3. Add/edit/delete drones
4. Assign drones via map interface
5. Save changes

### Main Flow (User):

1. User accesses Drone section
2. Registers drone with ID, model, location
3. System validates and registers
4. User can view assigned zones and nearby drones

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

1. Admin logs in and opens Drone Management
2. Selects drone → views images
3. Reviews each image (tags, metadata)
4. Downloads, enlarges, edits notes, or deletes
5. System confirms and updates gallery

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

1. Admin accesses User Management
2. Views user list with filters
3. Adds, edits, updates roles/status, or removes users
4. System saves and refreshes list

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

1. Admin uploads CSV or form data
2. System validates and shows trend/heatmap
3. Admin filters by date/location
4. Views status and clicks details for analysis

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

1. Admin selects filter criteria (date, location, type)
2. System shows preview
3. Admin clicks Generate
4. System creates report
5. Admin exports as PDF/CSV/XLSX

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

1. System displays map and risk overview
2. Admin filters by location/risk/date
3. System updates risk area list
4. Admin sets alert rules, thresholds, recipients, channels
5. Configures schedules
6. Views alert history and resends/export if needed

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

1. Admin opens Profile, Password, Notifications, or Config sections
2. Updates personal info or credentials
3. Sets alert thresholds or model parameters
4. System saves changes and confirms

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

1. User opens app, location determined
2. System runs prediction
3. If risk detected → sends push alert
4. User views notification → opens risk page
5. Shows map, risk level, indicators, tips
6. User acts on suggestions or contacts authority

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

1. User taps “Recommendation”
2. Sees 3 buttons: High, Medium, Low Risk
3. Selects risk level
4. System shows related tips
5. User views detail or navigates back

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

1. Admin navigates to Weather module
2. Uploads CSV or fills form
3. System validates and saves
4. Sends to prediction model
5. Admin views and filters past weather

### Alternative Flow:

* A1.1: Format invalid → show error

### Exception Flows:

* E1.1: Save fails → show message and log it
