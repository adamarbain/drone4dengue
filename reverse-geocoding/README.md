# Bulk Reverse Geocoding for Dengue Data

This directory contains tools for performing bulk reverse geocoding on DengueData records using OpenStreetMap Nominatim API.

## Overview

The system enriches existing DengueData records with detailed location information including:
- Country, State, District, City, Suburb
- Postal codes and street addresses
- Geographic bounding boxes
- Full formatted addresses

## Features

✅ **Rate Limited**: Respects Nominatim's free tier limits (1.5s between calls)  
✅ **Resumable**: Can continue from where it left off if interrupted  
✅ **Batch Processing**: Processes records in configurable batches  
✅ **Progress Tracking**: Detailed logging and progress reporting  
✅ **Error Handling**: Robust error handling with retry logic  
✅ **GitHub Actions**: Automated workflow for easy execution  

## Usage

### 1. Manual Execution (Local)

```bash
# Set environment variables
export DATABASE_URL="your_postgresql_connection_string"
export BATCH_SIZE="100"
export DELAY_SECONDS="1.5"

# Run the script
cd reverse-geocoding
python bulk_reverse_geocode.py
```

### 2. GitHub Actions (Recommended)

1. **Go to GitHub Actions** in your repository
2. **Find "Reverse Geocode Dengue Data" workflow**
3. **Click "Run workflow"**
4. **Configure parameters:**
   - `batch_size`: Records per batch (default: 100)
   - `delay_seconds`: Delay between API calls (default: 1.5)
   - `resume_from_id`: Resume from specific ID (optional)

### 3. Resume Interrupted Process

If the process is interrupted, you can resume from where it left off:

```bash
# The last processed ID will be logged
export RESUME_FROM_ID="uuid-of-last-processed-record"
python bulk_reverse_geocode.py
```

## Configuration Parameters

| Parameter | Description | Default | Notes |
|-----------|-------------|---------|-------|
| `BATCH_SIZE` | Records processed per batch | 100 | Smaller batches = more frequent progress updates |
| `DELAY_SECONDS` | Delay between API calls | 1.5 | Must be ≥1.0 for Nominatim free tier |
| `RESUME_FROM_ID` | Resume from specific record ID | - | Use UUID from logs to resume |

## Expected Processing Time

For **1000 records** with 1.5s delay:
- **Minimum time**: ~25 minutes (1.5s × 1000 = 1500s)
- **Realistic time**: ~35-45 minutes (including API response time)

For **5000 records**:
- **Estimated time**: ~3-4 hours

## Database Schema Requirements

The script expects these fields in the `DengueData` table:

```sql
-- Required fields (must exist)
id            UUID PRIMARY KEY
latitude      FLOAT
longitude     FLOAT
isGeocoded    BOOLEAN DEFAULT FALSE

-- Fields that will be populated
country       VARCHAR(100)
state         VARCHAR(100)
district      VARCHAR(100)
city          VARCHAR(100)
suburb        VARCHAR(100)
postcode      VARCHAR(20)
road          VARCHAR(255)
houseNumber   VARCHAR(50)
boundingBox   JSONB
displayName   TEXT
geocodedAt    TIMESTAMP
geocodeError  TEXT
```

## Monitoring Progress

### 1. Real-time Logs
- GitHub Actions: Check the workflow run logs
- Local: Watch the console output

### 2. Database Queries
```sql
-- Check overall progress
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN "isGeocoded" = TRUE THEN 1 END) as geocoded_records,
    COUNT(CASE WHEN "isGeocoded" = FALSE AND latitude IS NOT NULL THEN 1 END) as pending_records
FROM "DengueData"
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Check for errors
SELECT COUNT(*) as error_count 
FROM "DengueData" 
WHERE "geocodeError" IS NOT NULL;

-- View recent geocoded records
SELECT id, location, city, state, "displayName", "geocodedAt"
FROM "DengueData"
WHERE "isGeocoded" = TRUE
ORDER BY "geocodedAt" DESC
LIMIT 10;
```

## Error Handling

The system handles various error scenarios:

- **Rate Limiting**: Automatically waits and retries
- **Network Timeouts**: Logs error and continues with next record
- **Invalid Coordinates**: Marks record with error message
- **API Failures**: Records error details for manual review

## Nominatim API Limits

**Free Tier Restrictions:**
- 1 request per second maximum
- No bulk/batch endpoints
- Fair use policy applies

**Best Practices:**
- Use appropriate User-Agent header ✅
- Respect rate limits ✅
- Don't abuse the service ✅
- Cache results locally ✅

## Troubleshooting

### Common Issues

1. **"Rate Limited" errors**
   - Increase `DELAY_SECONDS` to 2.0 or higher
   - The script automatically handles 429 responses

2. **Database connection errors**
   - Verify `DATABASE_URL` is correct
   - Check database accessibility from GitHub Actions

3. **No records found**
   - Verify records exist with `latitude IS NOT NULL AND longitude IS NOT NULL`
   - Check if records are already geocoded (`isGeocoded = FALSE`)

4. **Workflow timeout**
   - GitHub Actions has 6-hour limit
   - Use smaller batch sizes for very large datasets
   - Resume using `resume_from_id` parameter

### Manual Testing

Test with a small batch first:

```bash
export BATCH_SIZE="10"
export DELAY_SECONDS="2.0"
python bulk_reverse_geocode.py
```

## Output Example

```
2026-01-15 10:30:15 - INFO - Starting bulk reverse geocoding
2026-01-15 10:30:15 - INFO - Initial state: {'total_records': 1500, 'geocoded_records': 0, 'pending_records': 1500}
2026-01-15 10:30:17 - INFO - Processing record abc-123: Kuala Lumpur (3.1390, 101.6869)
2026-01-15 10:30:19 - INFO - ✅ Successfully geocoded abc-123: Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia
2026-01-15 10:30:21 - INFO - Processing record def-456: Petaling Jaya (3.1073, 101.6067)
2026-01-15 10:30:23 - INFO - ✅ Successfully geocoded def-456: Petaling Jaya, Selangor, Malaysia
...
2026-01-15 10:35:30 - INFO - Progress: 100/100 in batch, Total: 100/1500 overall
2026-01-15 10:35:30 - INFO - Estimated time remaining: 2.1 hours
```

## Security Notes

- Database credentials are stored as GitHub Secrets
- No API keys required (Nominatim is free)
- Rate limiting prevents service abuse
- All data stays within your infrastructure