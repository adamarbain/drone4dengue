# Drone4Dengue – Selenium Test Suite

## Overview

Automated Selenium WebDriver tests for **UC5** (Manage Drone and Location) and **UC6** (Manage Images Captured by Drone) on the **Admin Web** (`http://localhost:3000`).

| Document | Reference |
|---|---|
| Test Design Specification | TDS-UC5-UC6 v2.0 |
| Test Case Specification | TCS-UC5-UC6 v2.0 |
| Test Procedure | TP-UC5-UC6 v2.0 |

---

## Directory Structure

```
test/
├── pytest.ini                         ← pytest configuration
├── run_tests.sh                       ← convenience runner script
├── selenium/
│   ├── conftest.py                    ← shared fixtures & helpers
│   ├── requirements.txt               ← Python dependencies
│   ├── test_uc5_drone_management.py   ← TC5-01 through TC5-15
│   ├── test_uc6_drone_images.py       ← TC6-01 through TC6-10
│   └── assets/
│       ├── test_image.jpg             ← JPEG for upload tests
│       ├── test_video.mp4             ← MP4 for TC6-05 (place manually)
│       └── test_document.pdf          ← PDF for TC6-06 (auto-generated)
└── reports/                           ← HTML report output (auto-created)
    └── test_report.html
```

---

## Setup

```bash
# 1. Activate virtual environment (already created by user)
source venv/bin/activate

# 2. Install dependencies
pip install -r selenium/requirements.txt

# 3. Ensure both servers are running (in separate terminals):
#    cd ../server-api && npm run dev      → http://localhost:4000
#    cd ../client-admin && npm run dev    → http://localhost:3000

# 4. (Optional) Place a short MP4 video for TC6-05:
#    cp /path/to/video.mp4 selenium/assets/test_video.mp4
```

---

## Running Tests

```bash
# All tests (headless Chrome)
./run_tests.sh

# With visible browser window
HEADLESS=false ./run_tests.sh

# Run only UC5 tests
./run_tests.sh -k "uc5"

# Run only UC6 tests
./run_tests.sh -k "uc6"

# Run specific test class
./run_tests.sh -k "TestTC507"

# Run with custom credentials
ADMIN_EMAIL=myadmin@example.com ADMIN_PASSWORD=mypass ./run_tests.sh
```

---
