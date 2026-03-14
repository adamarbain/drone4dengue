# User Acceptance Testing (UAT) - Drone4Dengue System

## Overview
This document outlines comprehensive User Acceptance Testing scenarios for the Drone4Dengue system, covering three primary actor types and their respective functionalities.

---

## Test Environment Setup
- **Mobile App**: React Native with Expo (client-mobile/)
- **Web Admin**: Next.js (client-admin/)
- **Backend API**: Node.js server (server-api/)
- **ML Services**: Python ML server (server-ml/)
- **Database**: PostgreSQL with Prisma ORM

---

## Actor Types

1. **Public User** (Mobile App User with companyId=comp-999)
2. **Company User** (Mobile App User with specific company authorization)
3. **Admin User** (Web App User with administrative privileges)

---

# 🔸 ACTOR 1: PUBLIC USER (companyId=comp-999)
*General public users accessing the mobile app for dengue risk information*

## UAT-PUB-001: Account Registration & Authentication

### Test Case 1.1: New User Registration
**Objective**: Verify public users can successfully register for the mobile app

**Prerequisites**: 
- Mobile app installed and launched
- Network connectivity available

**Test Steps**:
1. Launch the mobile application
2. Tap "Sign Up" or "Register" button
3. Enter valid email address
4. Enter password (minimum 6 characters)
5. Confirm password (matching)
6. Check "Agree to Terms and Conditions" checkbox
7. Tap "Register" button
8. Check email for verification (if applicable)

**Expected Results**:
- User successfully registered with companyId automatically set to 'comp-999'
- Registration success message displayed
- User redirected to login screen or dashboard
- Account created in database with appropriate permissions

**Test Data**:
```
Email: testuser@example.com
Password: Test123!
Company: Automatically assigned 'comp-999'
```

### Test Case 1.2: Standard Login Flow
**Objective**: Verify normal email and password login functionality

**Test Steps**:
1. On login screen, enter registered email address
2. Enter password
3. Tap "Login" or "Sign In" button

**Expected Results**:
- User is authenticated with email and password
- Account accessed with companyId 'comp-999'
- User redirected to main dashboard

### Test Case 1.3: Password Reset Flow
**Objective**: Verify password recovery functionality

**Test Steps**:
1. On login screen, tap "Forgot Password?"
2. Enter registered email address
3. Tap "Send Reset Code"
4. Check email for reset code
5. Enter received code in app
6. Enter new password
7. Confirm new password
8. Submit password reset

**Expected Results**:
- Reset code sent to email
- Code verification successful
- Password updated successfully
- User can login with new password

---

## UAT-PUB-002: Dashboard & Location Services

### Test Case 2.1: Current Location Dashboard
**Objective**: Verify dashboard displays user's current location and risk information

**Prerequisites**:
- User logged in successfully
- Location services enabled
- GPS signal available

**Test Steps**:
1. Navigate to Dashboard tab
2. Grant location permissions when prompted
3. Wait for location to be determined
4. Observe map display with user location
5. Check for risk prediction card
6. Verify location marker accuracy

**Expected Results**:
- User location displayed on map with appropriate marker
- Map centers on current location
- Risk prediction card shows current location risk level
- Location permissions handled gracefully

### Test Case 2.2: Dengue Cases View (comp-999 Specific)
**Objective**: Verify public users can view latest dengue cases data

**Test Steps**:
1. In Dashboard, tap "Dengue Cases" tab
2. Observe dengue cases markers on map
3. Tap on individual dengue case markers
4. View case details in popup
5. Test search functionality for locations
6. Verify map navigation controls

**Expected Results**:
- Map displays all recent dengue cases as red markers
- Case details show: location, date, active cases, coverage area
- Search functionality works for finding locations
- Map properly fits to show all cases

### Test Case 2.3: Location-Based Alerts
**Objective**: Verify users can create and manage location alerts

**Test Steps**:
1. In Dengue Cases view, tap "Location Alert" button
2. Choose "Create New Alert" option
3. Enter alert name (e.g., "Home", "Office")
4. Use search or tap map to select location
5. Confirm location selection
6. Submit alert creation
7. View existing alerts list
8. Test toggle alert on/off
9. Test delete alert functionality

**Expected Results**:
- Alert creation successful with location pinning
- Alert saved and displayed in alerts list
- Toggle functionality works (active/paused)
- Delete functionality removes alert
- Notification preferences saved

---

## UAT-PUB-003: Risk Analysis & Predictions

### Test Case 3.1: Risk Prediction Generation
**Objective**: Verify users can generate dengue risk predictions for their location

**Prerequisites**:
- User location determined
- ML prediction service available

**Test Steps**:
1. From dashboard, access risk prediction feature
2. Confirm current location or adjust if needed
3. Initiate risk prediction request
4. Wait for prediction processing
5. View prediction results

**Expected Results**:
- Prediction request processed successfully
- Risk level determined (High/Medium/Low)
- Risk score and factors displayed
- Weather data integrated
- Nearby cases information shown

### Test Case 3.2: Risk Analysis Deep Dive
**Objective**: Verify detailed risk analysis page functionality

**Test Steps**:
1. From dashboard with active prediction, tap "Risk Analysis"
2. View detailed map with risk location
3. Examine weather factors (temperature, humidity, rainfall)
4. Review nearby dengue cases count and locations
5. Check risk factor explanations
6. Test map navigation and zoom
7. Use "Return to Location" button

**Expected Results**:
- Detailed map shows prediction location and nearby cases
- Weather data displays current conditions
- Risk factors clearly explained with color coding
- Map navigation smooth and responsive
- Location return button functions correctly

### Test Case 3.3: Risk-Based Recommendations
**Objective**: Verify appropriate recommendations are shown based on risk level

**Test Steps**:
1. Generate prediction for different risk levels (if possible)
2. Access recommendations section
3. Review recommendations for High risk areas
4. Review recommendations for Medium risk areas  
5. Review recommendations for Low risk areas
6. Test external reference links

**Expected Results**:
- High risk: Immediate action items (fogging, repellent, authority contact)
- Medium risk: Preventive measures (standing water removal, nets)
- Low risk: General maintenance (cleanliness, hydration)
- Reference links open correctly
- Recommendations are actionable and clear

---

## UAT-PUB-004: User Profile & Settings

### Test Case 4.1: Profile Management
**Objective**: Verify users can view and update their profile information

**Test Steps**:
1. Navigate to Profile tab
2. View current profile information
3. Tap "Edit Profile"
4. Update name, phone number, or other details
5. Save changes
6. Verify updates are reflected

**Expected Results**:
- Profile information displays correctly
- Edit functionality works
- Changes saved successfully
- Updated information persists

### Test Case 4.2: Password Change
**Objective**: Verify users can change their password from within app

**Test Steps**:
1. In Profile section, access "Change Password"
2. Enter current password
3. Enter new password
4. Confirm new password
5. Submit password change
6. Test login with new password

**Expected Results**:
- Current password validation works
- New password requirements enforced
- Password change successful
- User can login with new credentials

### Test Case 4.3: Notification Preferences
**Objective**: Verify users can manage notification settings

**Test Steps**:
1. Access Notification settings
2. View current notification preferences
3. Toggle different notification types
4. Test push notification functionality
5. Verify notification delivery

**Expected Results**:
- Notification preferences save correctly
- Push notifications work as expected
- User can control notification frequency
- Important alerts still delivered when appropriate

---

# 🔸 ACTOR 2: COMPANY USER (Authorized Mobile App User)
*Employees of organizations with specific company authorization*

## UAT-COM-001: Company-Specific Authentication

### Test Case 1.1: Company User Registration
**Objective**: Verify company employees can register with proper company association

**Prerequisites**:
- Valid company registration code or invitation
- Company exists in system

**Test Steps**:
1. Launch mobile app and tap "Sign Up"
2. Enter personal details (email, password)
3. Enter company code or invitation link
4. Complete registration process
5. Verify company association

**Expected Results**:
- User registered with specific companyId (not comp-999)
- Company information associated with account
- Access to company-specific features enabled
- Welcome message includes company name

### Test Case 1.2: Company Domain Verification
**Objective**: Verify email domain validation for company users

**Test Steps**:
1. Register with company email domain
2. Attempt registration with non-company domain
3. Verify appropriate validation messages

**Expected Results**:
- Company domain emails accepted
- Non-company domains rejected with clear message
- Proper guidance provided for company registration

---

## UAT-COM-002: Organization Dashboard

### Test Case 2.1: Company Locations View
**Objective**: Verify company users can view organization locations and predictions

**Prerequisites**:
- User authenticated with valid company
- Company has registered locations
- Predictions available for company locations

**Test Steps**:
1. Navigate to Dashboard
2. Switch to "Organisation" tab
3. View company locations on map
4. Tap on location markers
5. Navigate between multiple locations
6. View location prediction details

**Expected Results**:
- Map displays all company locations with risk-colored markers
- Location details show predictions and risk levels
- Navigation between locations works smoothly
- Risk factors displayed for each location
- Historical prediction data available

### Test Case 2.2: Company Location Details
**Objective**: Verify detailed information for company locations

**Test Steps**:
1. In Organisation view, select a specific location
2. View prediction details panel
3. Check model scores (Historical, Weather, Breeding Area)
4. Review risk level determination
5. Navigate to previous/next locations
6. Close details panel

**Expected Results**:
- Location details show comprehensive risk analysis
- Model scores displayed with color coding
- Risk level calculation transparent
- Navigation controls work properly
- Details panel responsive and user-friendly

### Test Case 2.3: Multi-Location Risk Overview
**Objective**: Verify users can efficiently monitor multiple company locations

**Test Steps**:
1. View organisation map with all locations
2. Identify high-risk locations quickly
3. Compare risk levels across locations
4. Filter or sort locations by risk level
5. Generate summary report (if available)

**Expected Results**:
- Visual indicators make high-risk locations obvious
- Risk comparison across locations is clear
- Filtering/sorting functionality works
- Summary information helpful for decision making

---

## UAT-COM-003: Enhanced Company Features

### Test Case 3.1: Custom Risk Thresholds
**Objective**: Verify company-specific risk threshold settings are applied

**Prerequisites**:
- Company has custom risk threshold configuration
- Admin has configured thresholds in system

**Test Steps**:
1. View predictions for company locations
2. Observe risk level classifications
3. Compare with public user risk classifications
4. Verify threshold application consistency

**Expected Results**:
- Company-specific thresholds applied correctly
- Risk levels calculated using company parameters
- Consistent application across all company locations
- Appropriate adjustment from public defaults

### Test Case 3.2: Historical Data Access
**Objective**: Verify company users can access historical prediction data

**Test Steps**:
1. Navigate to company location details
2. Access historical data section
3. View past predictions and trends
4. Filter data by date ranges
5. Export historical data (if available)

**Expected Results**:
- Historical predictions displayed chronologically
- Trend analysis shows risk patterns
- Date filtering works correctly
- Data export functionality operational
- Charts and visualizations clear and informative

---

# 🔸 ACTOR 3: ADMIN USER (Web App User)
*Administrators managing the system through the web interface*

## UAT-ADM-001: Admin Authentication & Dashboard

### Test Case 1.1: Admin Login
**Objective**: Verify admin users can access the web administration panel

**Prerequisites**:
- Admin account created with appropriate privileges
- Web browser with network access

**Test Steps**:
1. Navigate to admin web interface URL
2. Enter admin credentials
3. Complete two-factor authentication (if enabled)
4. Access main dashboard

**Expected Results**:
- Successful authentication with admin privileges
- Dashboard displays system overview statistics
- Admin navigation menu accessible
- Role-based features visible

### Test Case 1.2: Dashboard Statistics
**Objective**: Verify admin dashboard shows comprehensive system metrics

**Test Steps**:
1. View dashboard statistics cards
2. Check recent predictions summary
3. Review system health indicators
4. Examine user activity metrics
5. Verify data refresh functionality

**Expected Results**:
- Statistics accurately reflect system state
- Recent activity displayed chronologically
- System health indicators show current status
- User metrics provide useful insights
- Real-time data updates properly

---

## UAT-ADM-002: Drone Management

### Test Case 2.1: Drone Registration & Configuration
**Objective**: Verify admins can add and configure drone devices

**Prerequisites**:
- Admin logged in with drone management privileges
- Drone device information available

**Test Steps**:
1. Navigate to Drone Management section
2. Click "Add New Drone"
3. Enter drone details (ID, model, status)
4. Set operational parameters
5. Assign to company/location
6. Save drone configuration
7. View drone in listing

**Expected Results**:
- Drone successfully added to system
- Configuration parameters saved correctly
- Drone appears in management listing
- Status indicators work properly
- Assignment to company/location successful

### Test Case 2.2: Image/Video Upload Processing
**Objective**: Verify admin can upload and process drone imagery

**Prerequisites**:
- Drone registered in system
- Image/video files available for upload
- ML processing service running

**Test Steps**:
1. Select drone from management interface
2. Click "Upload Images/Videos"
3. Select multiple files for upload
4. Add location metadata
5. Initiate upload process
6. Monitor upload progress
7. Verify file processing status
8. Check processed results

**Expected Results**:
- Multiple file upload works correctly
- Progress indicators show upload status
- Files stored in cloud storage (Firebase)
- Database records created with metadata
- Processing pipeline initiated automatically
- Results displayed in interface

### Test Case 2.3: Breeding Area Detection Results
**Objective**: Verify admin can review ML processing results for uploaded imagery

**Test Steps**:
1. Access uploaded drone imagery
2. View breeding area detection results
3. Review confidence scores and detections
4. Examine processed image annotations
5. Export detection results
6. Update detection status if needed

**Expected Results**:
- Detection results clearly displayed
- Confidence scores and bounding boxes visible
- Image annotations accurate and helpful
- Export functionality works
- Status updates save properly

---

## UAT-ADM-003: User Management

### Test Case 3.1: User Account Management
**Objective**: Verify admin can create, modify, and manage user accounts

**Prerequisites**:
- Admin privileges for user management
- User account data for testing

**Test Steps**:
1. Navigate to User Management section
2. View user listing with filters
3. Create new user account
4. Edit existing user details
5. Change user role/permissions
6. Activate/deactivate user accounts
7. Send user invitations
8. Reset user passwords

**Expected Results**:
- User listing displays comprehensive information
- Filters and search functionality work
- User creation successful with proper validation
- Role changes take effect immediately
- Account status changes work correctly
- Invitation emails sent successfully
- Password reset process functional

### Test Case 3.2: Company User Association
**Objective**: Verify admin can manage company-user associations

**Test Steps**:
1. View users by company affiliation
2. Assign users to companies
3. Modify user company associations
4. Remove users from companies
5. Bulk operations on user groups

**Expected Results**:
- Company associations display correctly
- Assignment process straightforward
- Changes take effect in real-time
- User permissions updated appropriately
- Bulk operations work efficiently

---

## UAT-ADM-004: Prediction Management & Monitoring

### Test Case 4.1: Manual Prediction Creation
**Objective**: Verify admin can create predictions for specific locations

**Prerequisites**:
- ML prediction service operational
- Location coordinates available

**Test Steps**:
1. Navigate to Prediction Management
2. Click "Create Prediction"
3. Enter location coordinates or select on map
4. Configure prediction parameters
5. Initiate prediction process
6. Monitor processing status
7. Review prediction results
8. Publish/share results

**Expected Results**:
- Prediction creation interface user-friendly
- Location selection accurate
- Processing status clearly indicated
- Results comprehensive and accurate
- Publishing mechanism works correctly

### Test Case 4.2: Prediction Alert Monitoring
**Objective**: Verify admin can monitor and manage prediction alerts

**Test Steps**:
1. Access Prediction Alert dashboard
2. View active high-risk alerts
3. Configure alert thresholds
4. Test alert notification system
5. Acknowledge/dismiss alerts
6. Generate alert reports

**Expected Results**:
- Alert dashboard shows current status
- High-risk locations clearly highlighted
- Threshold configuration saves properly
- Alert notifications delivered correctly
- Alert management controls functional
- Reports generate successfully

### Test Case 4.3: Historical Prediction Analysis
**Objective**: Verify admin can analyze historical prediction data

**Test Steps**:
1. Access historical predictions section
2. Filter by date ranges, locations, risk levels
3. Generate trend analysis charts
4. Export historical data
5. Compare prediction accuracy
6. Identify patterns and hotspots

**Expected Results**:
- Historical data filtering works correctly
- Charts and visualizations informative
- Data export includes all relevant fields
- Accuracy analysis provides insights
- Pattern identification useful for planning

---

## UAT-ADM-005: Data Management & Configuration

### Test Case 5.1: Weather Data Management
**Objective**: Verify admin can manage weather data sources and integration

**Test Steps**:
1. Navigate to Weather Data section
2. View current weather API status
3. Configure weather data sources
4. Test API connections
5. Import historical weather data
6. Set weather data refresh intervals

**Expected Results**:
- Weather API status accurately displayed
- Configuration options comprehensive
- API connection testing works
- Historical data import successful
- Refresh intervals configurable and functional

### Test Case 5.2: System Configuration
**Objective**: Verify admin can configure system-wide settings

**Test Steps**:
1. Access System Settings section
2. Configure risk threshold parameters
3. Set up notification preferences
4. Manage user role permissions
5. Configure API rate limits
6. Set data retention policies

**Expected Results**:
- All configuration options accessible
- Changes take effect system-wide
- Validation prevents invalid configurations
- Backup/restore functionality available
- Changes logged for audit trail

---

## UAT-ADM-006: Reports & Analytics

### Test Case 6.1: Comprehensive Reporting
**Objective**: Verify admin can generate various system reports

**Prerequisites**:
- Sufficient data available for reporting
- Report generation service operational

**Test Steps**:
1. Navigate to Reports section
2. Select report type (predictions, users, system health)
3. Configure report parameters and date ranges
4. Generate reports in different formats (PDF, CSV, Excel)
5. Schedule automated reports
6. Email report delivery

**Expected Results**:
- Multiple report types available
- Parameter configuration intuitive
- Reports generate in requested formats
- Scheduled reporting works correctly
- Email delivery successful with proper formatting

### Test Case 6.2: Real-time Analytics Dashboard
**Objective**: Verify real-time system monitoring and analytics

**Test Steps**:
1. Access analytics dashboard
2. Monitor real-time system metrics
3. View user activity streams
4. Check prediction processing queues
5. Monitor system resource usage
6. Set up custom alerts for metrics

**Expected Results**:
- Real-time data updates automatically
- Metrics display clearly and accurately
- Activity streams provide useful insights
- Queue monitoring helps with performance
- Resource usage tracking functional
- Custom alerts work as configured

---

## 📋 Test Execution Summary

### Coverage Areas
- **Authentication & Authorization**: ✅ All user types
- **Core Functionality**: ✅ Mobile app features, Admin features
- **Data Management**: ✅ Upload, processing, storage
- **User Experience**: ✅ Responsive design, error handling
- **Integration**: ✅ ML services, external APIs, notifications
- **Security**: ✅ Role-based access, data protection
- **Performance**: ✅ Load times, concurrent users

### Test Data Requirements
- Sample user accounts for each actor type
- Mock drone imagery with breeding sites
- Historical dengue case data
- Weather data samples
- Company configuration examples

### Success Criteria
- All critical user journeys complete successfully
- Error handling graceful and informative
- Performance meets acceptable standards
- Security measures properly implemented
- Data integrity maintained throughout operations

---

## 🔧 Test Environment Notes

### Mobile App Testing
- Test on both iOS and Android devices
- Include tablet and phone form factors
- Test with various network conditions
- Verify offline functionality where applicable

### Web Admin Testing
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Responsive design on different screen sizes
- Concurrent admin user sessions
- Browser security settings compliance

### Integration Testing
- End-to-end workflows across mobile and web
- API rate limiting and error handling
- External service dependencies (Google OAuth, weather APIs)
- Database consistency across concurrent operations

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Review Required**: Before production deployment