# CircleCI Schedule Setup Guide

This guide shows exactly how to fill out the CircleCI schedule trigger form for each scheduled workflow.

## 📋 Overview of Scheduled Workflows

You have **3 scheduled workflows** in your config:

1. **daily-data-processing** - Runs daily at 1pm UTC (9pm Malaysia time)
2. **daily-location-alerts** - Runs daily at 4am UTC (12pm Malaysia time)
3. **daily-bulk-prediction-workflow** - Runs daily at 4am UTC (12pm Malaysia time)

---

## 🕐 Schedule 1: Daily Data Processing

**Workflow Name:** `daily-data-processing`  
**Cron:** `0 13 * * *` (1pm UTC = 9pm Malaysia time)

### Form Fields:

| Field | Value |
|-------|-------|
| **Trigger Name*** | `Daily Data Processing` |
| **Trigger description** | `Run daily dengue data scraping and ML model training` |
| **Repeats** | `Daily` (change from "Weekly") |
| **Repeats on these days*** | ✅ Select All (all days checked) |
| **Repeats on these months*** | ✅ Select All (all months checked) |
| **Start Time (UTC)*** | `13:00` (1:00 PM) |
| **Repeats Per Hour*** | `1` (once per day) |
| **Branch or Tag Name*** | Select `branch` → Enter `main` |

### Pipeline Parameters:
- Leave this section collapsed (no parameters needed)

---

## 🕐 Schedule 2: Daily Location Alerts

**Workflow Name:** `daily-location-alerts`  
**Cron:** `0 4 * * *` (4am UTC = 12pm Malaysia time)

### Form Fields:

| Field | Value |
|-------|-------|
| **Trigger Name*** | `Daily Location Alerts` |
| **Trigger description** | `Send location-based dengue alert notifications to users` |
| **Repeats** | `Daily` (change from "Weekly") |
| **Repeats on these days*** | ✅ Select All (all days checked) |
| **Repeats on these months*** | ✅ Select All (all months checked) |
| **Start Time (UTC)*** | `04:00` (4:00 AM) |
| **Repeats Per Hour*** | `1` (once per day) |
| **Branch or Tag Name*** | Select `branch` → Enter `main` |

### Pipeline Parameters:
- Leave this section collapsed (no parameters needed)

---

## 🕐 Schedule 3: Daily Bulk Prediction

**Workflow Name:** `daily-bulk-prediction-workflow`  
**Cron:** `0 4 * * *` (4am UTC = 12pm Malaysia time)

### Form Fields:

| Field | Value |
|-------|-------|
| **Trigger Name*** | `Daily Bulk Prediction` |
| **Trigger description** | `Run daily bulk prediction for all company locations and mobile users` |
| **Repeats** | `Daily` (change from "Weekly") |
| **Repeats on these days*** | ✅ Select All (all days checked) |
| **Repeats on these months*** | ✅ Select All (all months checked) |
| **Start Time (UTC)*** | `04:00` (4:00 AM) |
| **Repeats Per Hour*** | `1` (once per day) |
| **Branch or Tag Name*** | Select `branch` → Enter `main` |

### Pipeline Parameters:
- Leave this section collapsed (no parameters needed)

---

## ⚠️ Important Notes

### 1. Repeats Field
- **Change from "Weekly" to "Daily"** for all three schedules
- The cron expressions (`0 13 * * *` and `0 4 * * *`) mean "daily", not weekly

### 2. Start Time (UTC)
- CircleCI uses **UTC time** for all schedules
- Malaysia time is **UTC+8**
- So:
  - `13:00 UTC` = `21:00 Malaysia time` (9pm)
  - `04:00 UTC` = `12:00 Malaysia time` (12pm)

### 3. Repeats Per Hour
- Set to `1` for all schedules
- This means "run once" at the specified time
- It does NOT mean "run every hour"

### 4. Branch Name
- Use `main` (or `master` if that's your default branch)
- Your config allows both `main` and `master`, but typically you'll use `main`

### 5. Workflow Selection
- After creating the schedule, you may need to select which workflow to trigger
- Select the workflow name that matches:
  - `daily-data-processing`
  - `daily-location-alerts`
  - `daily-bulk-prediction-workflow`

---

## ✅ Verification Steps

After creating all 3 schedules:

1. **Check Scheduled Pipelines:**
   - Go to **Project Settings → Scheduled Pipelines**
   - You should see all 3 schedules listed

2. **Verify Next Run Times:**
   - Check that the next run times match your expectations
   - Schedule 1: Should show next run at 1pm UTC
   - Schedules 2 & 3: Should show next run at 4am UTC

3. **Test Manual Trigger:**
   - Before waiting for the scheduled time, test manually:
     - `run-dengue-data-script-manual`
     - `location-alert-manual`
     - `daily-bulk-prediction-manual`

4. **Monitor First Scheduled Run:**
   - Wait for the scheduled time and verify the workflows run automatically
   - Check the Pipeline history to confirm

---

## 🔄 If You Need to Edit a Schedule

1. Go to **Project Settings → Scheduled Pipelines**
2. Find the schedule you want to edit
3. Click the **Edit** button (pencil icon)
4. Modify the fields as needed
5. Save changes

---

## 🆘 Troubleshooting

### Schedule Not Running?
- Verify the schedule is **enabled** (toggle should be ON)
- Check that the **branch name** matches your active branch
- Ensure the **workflow name** in the schedule matches the workflow name in config.yml

### Wrong Time Zone?
- Remember: CircleCI always uses **UTC**
- Malaysia time = UTC + 8 hours
- Your cron expressions are already in UTC, so the UI times should match

### Multiple Schedules at Same Time?
- Schedules 2 and 3 both run at 4am UTC - this is intentional
- They will run in parallel (CircleCI supports this)
