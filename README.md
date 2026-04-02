# Drone4Dengue

Hybrid system for Malaysian public health dengue surveillance: a mobile app (**DroneEye**), an admin web dashboard, a Node.js API, Python ML services, and automation for data pipelines and geocoding. It combines drone imagery, meteorological data, and machine learning to support early awareness and operational decisions.

## Modules and use cases

- [Modules](docs/modules.md)
- [Use cases](docs/use-cases.md)

## Tech stack

| Area | Technologies |
|------|----------------|
| Mobile | React Native, Expo (file-based routing via Expo Router) |
| Admin web | Next.js 15, React 19, TypeScript, Tailwind CSS |
| API | Node.js, Express, Prisma, PostgreSQL |
| ML | Python (see `server-ml/`, `daily-scrap-dengue-data/`) |
| Notifications | Expo push notifications (server-driven flows via API) |
| Storage | Firebase Storage for drone imagery (see [Firebase Storage migration](docs/firebase-storage-migration.md)) |

Deployment targets in this project have included **Google Cloud Run**, **Render**, **Vercel**, and hosted PostgreSQL (e.g. Supabase/Railway), depending on environment.

## Repository layout

```
drone4dengue/
├── client-mobile/          # Expo app (DroneEye)
├── client-admin/           # Next.js admin dashboard
├── server-api/             # REST API (Express + Prisma)
├── server-ml/              # ML inference / prediction service
├── daily-scrap-dengue-data/  # Training and DB scripts used by CI
├── reverse-geocoding/      # Bulk Nominatim reverse geocoding
├── docs/                   # Specifications, diagrams, guides
└── .github/workflows/      # CI/CD and scheduled jobs (see .github/workflows/README.md)
```

## Documentation

- [Setup guide](docs/setup-guide.md) — run API, admin, mobile, and ML locally
- [API specification](docs/api-spec.md)
- [UI navigation](docs/ui-navigation.md)
- [Prediction model](docs/prediction-model.md)
- [Three-model prediction flow](docs/three-model-prediction-flow.md)
- [GitHub Actions setup](docs/github-actions-setup.md) — secrets and scheduled jobs

## Getting started

**Prerequisites:** Node.js 18+, Python 3.10+, PostgreSQL (or a hosted URL), and Expo tooling for mobile development.

Follow **[docs/setup-guide.md](docs/setup-guide.md)** for step-by-step installation, environment variables, Prisma migrations, and local URLs.

Before publishing this repository publicly, add a **LICENSE** file, remove or redact any committed secrets and environment files, and confirm [GitHub Actions secrets](.github/workflows/README.md) are only stored in the repository settings, not in the codebase.
