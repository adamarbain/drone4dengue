# Drone4Dengue Admin Web Portal (client-admin)

Next.js **15** admin dashboard (App Router, TypeScript) for managing users, drones, dengue data, reports, and weather-related views. UI uses Tailwind CSS, Radix primitives, and maps (Leaflet / MapLibre) where applicable.

## Prerequisites

- Node.js 18+
- Running [server-api](../server-api/) (default `http://localhost:4000`)

## Setup

1. Install dependencies:

   ```bash
   cd client-admin
   npm install
   ```

2. Environment — create `.env.local` (or copy from your team’s template):

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

   The app reads the REST API base URL from `NEXT_PUBLIC_API_URL` (see `src/lib/api.ts` and feature pages). Do not commit secrets; production URLs belong in hosting env vars or `.env.production` that stays out of git.

3. Development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server (after `build`) |
| `npm run lint` | Run ESLint |

## Documentation

- [Root README](../README.md) — repository overview
- [Setup guide](../docs/setup-guide.md) — full stack
- [API specification](../docs/api-spec.md)
