# Bulk reverse geocoding (DengueData)

Python tooling to **reverse geocode** existing `DengueData` rows using the [OpenStreetMap Nominatim](https://nominatim.org/) API (fair-use: throttle requests, identify your app in headers).

Enriched fields include country, state, district, city, suburb, postcode, address parts, bounding box, formatted display name, and timestamps/error text on failure.

## Features

- Rate limiting friendly (default 1.5s between calls; adjust for Nominatim policy)
- Resumable via `RESUME_FROM_ID`
- Batch size configurable
- Logging suitable for CI (see `progress.log` artifact in GitHub Actions)
- GitHub Actions workflow: **Reverse Geocode Dengue Data** (runs after **Store Dengue Data to Database** completes successfully, or manually)

## Local run

**Linux / macOS:**

```bash
export DATABASE_URL="postgresql://..."
export BATCH_SIZE="100"
export DELAY_SECONDS="1.5"
cd reverse-geocoding
python bulk_reverse_geocode.py
```

**Windows (PowerShell):**

```powershell
$env:DATABASE_URL = "postgresql://..."
$env:BATCH_SIZE = "100"
$env:DELAY_SECONDS = "1.5"
cd reverse-geocoding
python bulk_reverse_geocode.py
```

Resume after an interruption (use ID from logs):

```bash
export RESUME_FROM_ID="uuid-of-last-processed-record"
python bulk_reverse_geocode.py
```

## GitHub Actions

1. Repository **Actions** → **Reverse Geocode Dengue Data**
2. **Run workflow** — optional inputs: `batch_size`, `delay_seconds`, `resume_from_id`

Requires secret **`DATABASE_URL`** (PostgreSQL connection string). See also [.github/workflows/README.md](../.github/workflows/README.md).

## Parameters

| Variable / input | Description | Default |
|------------------|-------------|---------|
| `BATCH_SIZE` | Rows per batch | `100` |
| `DELAY_SECONDS` | Delay between Nominatim calls | `1.5` (use ≥ 1.0 for public usage policy) |
| `RESUME_FROM_ID` | Start after this record UUID | unset |

## Timing (rough)

With `DELAY_SECONDS=1.5`, wall time scales roughly linearly with pending rows (plus API latency). Very large runs may need multiple sessions or a self-hosted Nominatim instance.

## Database expectations

The script expects `DengueData` with at least coordinates and flags such as `isGeocoded`, and writes administrative fields (`country`, `state`, `city`, …), `geocodedAt`, `geocodeError`, etc., consistent with your Prisma schema. Adjust the script if your column names differ.

## Monitoring (SQL examples)

```sql
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE "isGeocoded" = TRUE) AS geocoded,
       COUNT(*) FILTER (WHERE "isGeocoded" = FALSE AND latitude IS NOT NULL) AS pending
FROM "DengueData"
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

## Nominatim usage

Follow the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/): limit request rate, cache results, use a valid `User-Agent`/contact, and prefer a local Nominatim server for heavy or production bulk loads.

## Troubleshooting

- **429 / rate limits:** Increase `DELAY_SECONDS` (e.g. `2.0`).
- **DB errors:** Verify `DATABASE_URL` and network access from the runner.
- **No rows processed:** Check filters (`isGeocoded`, null coordinates).
- **Long runs:** GitHub Actions job timeout is set in `reverse-geocode-dengue-data.yml` (currently 360 minutes); split work with `resume_from_id` if needed.
