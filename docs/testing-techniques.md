# Testing Techniques

## 1. Equivalence Partitioning Testing 

Equivalence Partitioning is a software testing technique used to group input data into partitions that are expected to behave similarly, allowing efficient and comprehensive coverage of system functionalities. For Drone4Dengue, this method was applied across both the mobile app and the admin web system to validate inputs such as user authentication details, drone registration data, dengue and weather dataset uploads, and prediction configuration parameters . By categorizing inputs into classes, such as valid and invalid login credentials, correctly and incorrectly formatted CSV files, valid and out-of-range numerical values, and complete versus incomplete form submissions, the system’s response could be thoroughly evaluated without testing every possible input. This ensured that features like account access, data ingestion, outbreak prediction, and alert notifications handled all expected input scenarios robustly while improving testing efficiency and overall system reliability.

## 2. GUI Testing 

GUI Testing focuses on validating the graphical user interface to ensure it is intuitive, consistent, and user-friendly across both the DengueEye mobile app and the Drone4Dengue admin web system. For this project, GUI testing involved verifying the layout, navigation flow, color consistency, and responsiveness of essential interface elements such as the dashboard, risk prediction cards, notification panels, drone management pages, data upload forms, and interactive map visualizations . Since the system is used by different user groups, including the general public, and organization administrators, ensuring clarity and accessibility was a key non-functional requirement. GUI Testing helped confirm that all users could seamlessly interact with features like real-time dengue alerts, map-based risk displays, profile management, and analytics dashboards, regardless of device type or technical expertise, ultimately supporting a smooth and reliable user experience.

# Testing Approach

## 1. Integration Testing

- For Test Data column, must be in format like this :
[ Verb] [ UI Element ] 
User clicks on the 'Login' button from the Home page.


OR

[ Input Data Name ] : [ Input Data Value ]
Email Address: admin1@drone4dengue.com

## 2. Unit Testing

- For Test Data column, must be in format like this :
[ Input Data Name ] : [ Input Data Value ]
Email Address: admin1@drone4dengue.com


## 3. System Testing

- For Test Data column, must be in format like this :
[ Actor Name] [ Verb ] 
Admin logs into the Drone4Dengue Admin Web System.