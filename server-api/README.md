# Server API (`server-api`)

Express + Prisma backend for Drone4Dengue. This service handles authentication, users, drone/company data, dengue prediction orchestration, notifications, and admin endpoints.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (local or remote)
- Redis (local or remote)
- ML service running from `../server-ml` (default: `http://localhost:5001`)

## 1) Install dependencies

```bash
cd server-api
npm install
```

## 2) Configure environment

Create a `.env` file from `env.example` and update values:

```bash
cp env.example .env
```

Minimum required variables for local development:

- `DATABASE_URL` (PostgreSQL connection string)
- `REDIS_HOST`, `REDIS_PORT` (and `REDIS_PASSWORD` if needed)
- `ML_SERVICE_URL` (typically `http://localhost:5001`)
- `JWT_SECRET`
- `PORT` (default is `4000`)

Firebase, email, and Twilio values are only needed for features that use them.

## 3) Prepare database

Run Prisma migrations, then seed:

```bash
npx prisma migrate dev
npm run seed
```

Helpful reset scripts:

- `npm run prisma-reset` - reset DB and reseed
- `npm run prisma-migrate` - reset DB, run migration flow, and reseed

## 4) Run locally

Development mode (with auto-reload):

```bash
npm run dev
```

Production-like local run:

```bash
npm start
```

Default local URL: `http://localhost:4000`

## Quick health checks

- API root:
  - `GET http://localhost:4000/`
- Prediction service bridge check:
  - `GET http://localhost:4000/api/predict/health`

## Testing notes

There is no automated Node test suite configured yet (`npm test` is a placeholder). For local verification:

1. Ensure `server-ml` is running.
2. Call `GET /api/predict/health`.
3. Verify login/auth and a few core data endpoints in Postman or your frontend clients.

