# GitHub Actions workflows

Overview of workflows under `.github/workflows/`. Configure **secrets** in the repository: **Settings → Secrets and variables → Actions**. Never commit secrets.

## Workflow index

| Workflow file | Name (in Actions UI) | Trigger | Purpose |
|---------------|----------------------|---------|---------|
| `daily-bulk-prediction.yml` | Daily Bulk Prediction | Cron (12:00 PM Malaysia ≈ 04:00 UTC), `workflow_dispatch` | Admin login → bulk prediction for company locations. |
| `location-alert-notification.yml` | Daily Location-based Alert Notifications | Same cron + `workflow_dispatch` | POST to API to evaluate location-based alerts / notifications. |
| `deploy-server-api.yml` | Deploy Server API to Cloud Run | Push to `main`/`master` changing `server-api/**`, `workflow_dispatch` | Build and deploy API container to Google Cloud Run. |
| `deploy-server-ml.yml` | Deploy Server ML to Cloud Run | Push changing `server-ml/**`, `workflow_dispatch`, `repository_dispatch` (`deploy-server-ml`) | Deploy ML service to Cloud Run. |
| `02-train-ml-models.yml` | Train ML Models | `workflow_dispatch`; `workflow_run` (see note below) | Runs training script in `daily-scrap-dengue-data/`, may commit artifacts. |
| `03-store-dengue-data-to-db.yml` | Store Dengue Data to Database | After **Train ML Models** succeeds, `workflow_dispatch` | Loads data into DB via `daily-scrap-dengue-data/`. |
| `reverse-geocode-dengue-data.yml` | Reverse Geocode Dengue Data | After **Store Dengue Data to Database** succeeds, `workflow_dispatch` | Runs `reverse-geocoding/bulk_reverse_geocode.py`. |
| `process-scraped-data-from-circleci.yml` | Process Scraped Data from CircleCI | `repository_dispatch` (`process-scraped-data`), `workflow_dispatch` | Triggers ML training via GitHub API (CircleCI integration). |

**Note:** Chaining between workflows often uses a **Personal Access Token** (`GH_PAT`) so pushes can trigger downstream workflows; see comments inside `02-train-ml-models.yml` and `03-store-dengue-data-to-db.yml`.

## Common secrets

| Secret | Used by |
|--------|---------|
| `API_BASE_URL` | Daily bulk prediction, location alerts (base URL, no auth path) |
| `API_ADMIN_EMAIL`, `API_ADMIN_PASSWORD` | Daily bulk prediction (admin login) |
| `LOCATION_ALERT_API_KEY` | Location alert workflow (`x-api-key` header) |
| `DATABASE_URL` | Store dengue data, reverse geocoding |
| `GCP_PROJECT_ID`, `GCP_SA_KEY` | Cloud Run deploy workflows |
| `GH_PAT` | Workflows that push or dispatch other workflows |

## Pipelines in plain language

1. **Scraping → ML → DB → geocode (optional):** External or CircleCI events can lead to **Train ML Models** → **Store Dengue Data** → **Reverse Geocode** when each step succeeds.
2. **Daily ops:** **Daily Bulk Prediction** and **Daily Location-based Alert Notifications** run on a schedule (Malaysia noon, UTC cron `0 4 * * *` — verify in each YAML if you change timezone).
3. **Deploy:** API and ML images deploy on pushes to default branches when relevant paths change.

## Detailed docs

- [docs/github-actions-setup.md](../../docs/github-actions-setup.md) — bulk prediction secrets and testing  
- [reverse-geocoding/README.md](../../reverse-geocoding/README.md) — geocoding script and `DATABASE_URL`
