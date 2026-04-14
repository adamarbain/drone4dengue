# Mobile Client (`client-mobile`)

Expo + React Native mobile app for Drone4Dengue. Routing is file-based through Expo Router (`app/`), and API access is configured through `EXPO_PUBLIC_*` variables.

## Prerequisites

- Node.js 18+ and npm
- `server-api` running locally (usually `http://localhost:4000`)
- One of:
  - Expo Go app on your phone, or
  - Android emulator / iOS simulator, or
  - Expo development build

## 1) Install dependencies

```bash
cd client-mobile
npm install
```

## 2) Configure environment

Create `.env` from `env.example` and set at least:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
```

Notes:

- `EXPO_PUBLIC_API_URL` must point to your running backend.
- For Android emulator, `localhost` from the emulator is not your PC. Use host mapping (for example `10.0.2.2`) when needed.

## 3) Start development server

```bash
npm run start
```

Then choose target from Expo CLI:

- `a` for Android
- `i` for iOS (macOS only)
- `w` for web
- Scan QR for Expo Go

## Build and test commands

- `npm run start` - start Expo dev server
- `npm run android` - run Android native project
- `npm run ios` - run iOS native project
- `npm run web` - run web target
- `npm run lint` - lint checks

## Local verification checklist

1. Confirm auth screens can call backend successfully.
2. Verify dashboard/risk pages load without API base URL errors.
3. Test maps-related screens with valid `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

