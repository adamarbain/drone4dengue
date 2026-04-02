# GCP billing investigation (Artifact Registry vs Cloud Run)

**Investigated:** 2026-03-30 (repo: `drone4dengue`)

## What the billing screenshots indicate

- **Artifact Registry** is the line item that remains **after credits / “Other savings”** (especially visible in February where AR had **no** offset).
- **Cloud Run** usage is largely covered by savings/credits in those periods, so **compute** is not the main out-of-pocket cost.
- Charges are consistent with **stored container images** (and Cloud Build pushing new digests), not only with “running the service.”

## How this repo triggers GCP usage

| Workflow | Trigger | GCP impact |
|----------|---------|------------|
| `deploy-server-ml.yml` | Push to `main`/`master` with changes under **`server-ml/**`** (also `repository_dispatch` / `workflow_dispatch`) | `gcloud builds submit` → **Artifact Registry** + **Cloud Run** deploy |
| `deploy-server-api.yml` | Push to `main`/`master` with changes under **`server-api/**`** | Same pattern |

Paths are defined in each workflow (`paths:`). Anything under `server-ml/`, including **data and models**, matches `server-ml/**`.

## Git history: 2026-01-30

**Commit on that date (local `main` / `development`):**

| Hash | Date (author) | Summary |
|------|----------------|---------|
| `8a8193d` | 2026-01-30 10:22 +0800 | “Add new data entries for dengue hotspots on 30/01/2026” |

**Files changed (trigger path):**

- `server-ml/models/active_dengue.csv`
- `server-ml/models/dengue_hotspot.csv`
- (plus copies under `daily-scrap-dengue-data/`)

Because those paths are under **`server-ml/`**, a push to **`main`** or **`master`** would match `deploy-server-ml.yml` and **run a full container build and push** to:

`us-central1-docker.pkg.dev/<PROJECT>/drone-images/server-ml`

So **Jan 30 is aligned with a deploy-triggering change**, not only an unrelated app change.

## Important: deploys are not only “code changes”

The ML deploy workflow does **not** distinguish Python/Dockerfile changes from **CSV/model data** under `server-ml/`. Updating `server-ml/models/*.csv` **counts** as `server-ml/**` and can trigger **rebuild + new image versions** on every such push.

The data pipeline (`03-store-dengue-data-to-db.yml`) also documents intent to trigger deployment when `server-ml/` changes (including a `repository_dispatch` backup).

## Why the console might show “first” charges around Jan 29–30

`main` history in this repo shows **many** commits touching `server-ml/` throughout **January 2026** (e.g. daily “Daily update: …” merges), not only on Jan 30. So if GitHub Actions were succeeding, you might expect **Artifact Registry** activity earlier in the month too.

Plausible explanations for **charts showing little or nothing until ~Jan 29–30**:

1. **Credits / free tier / “Other savings”** masked AR until partial exhaustion or a different SKU split (your January table showed AR **partially** covered).
2. **Billing export granularity** or **timezone** (billable day in UTC vs Malaysia).
3. **Workflow failures** until a given date (missing secrets, quota, first successful `gcloud` auth) — **verify in GitHub → Actions** for failed runs before Jan 30.
4. **Project or billing linkage** to Artifact Registry effective around that window (less common but worth confirming in GCP).

**Action:** In GitHub, filter **Workflow “Deploy Server ML to Cloud Run”** for **January 2026** and note **first green run** and **frequency**; that should match when AR storage started growing.

## Recommended next checks (manual)

1. **GitHub Actions:** Runs of `Deploy Server ML` / `Deploy Server API` in Jan–Feb 2026 (success vs failure).
2. **GCP Console:** Artifact Registry → repository `drone-images` → **images / digests**, total size; **Lifecycle policies** (if any) for old versions.
3. **Billing → Reports:** Group by **SKU** under Artifact Registry (storage vs egress).
4. **Credits:** Billing → **Credits** — remaining balance, expiry, and whether they apply to Artifact Registry.

## Cost reduction directions (for later implementation)

- **Narrow `paths:`** so routine data updates under e.g. `server-ml/models/` do **not** trigger full redeploys (or move large data outside the image and load at runtime).
- **Lifecycle rules** on the Artifact Registry repo to delete untagged/old images.
- **Fewer rebuilds**: deploy only when `Dockerfile`, dependencies, or application code change—not on every CSV refresh.

## Re-running this analysis locally

From the repo root:

```powershell
.\scripts\list-server-ml-deploy-triggers.ps1 -Since "2026-01-01" -Branch main
```
