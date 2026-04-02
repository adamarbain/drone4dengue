# DengueEye (client-mobile)

React Native mobile app for the Drone4Dengue project, built with [Expo](https://expo.dev) and [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing under `app/`).

## Prerequisites

- Node.js 18+ and npm
- For device builds: Android Studio / Xcode, or [EAS Build](https://docs.expo.dev/build/introduction/)
- A running [server-api](../server-api/) instance (default local URL below)

## Setup

1. Install dependencies:

   ```bash
   cd client-mobile
   npm install
   ```

2. Environment variables — create `.env` in this directory:

   ```env
   EXPO_PUBLIC_API_URL=http://localhost:4000
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

   `EXPO_PUBLIC_API_URL` must match your API base URL (no trailing slash). Production values are often set via [EAS `eas.json`](https://docs.expo.dev/build-reference/variables/) profiles instead of committing `.env` files.

3. **Google Maps API key** (maps in the app):

   - [Google Cloud Console](https://console.cloud.google.com/) → enable **Maps SDK for Android** and **Maps SDK for iOS**
   - Create an API key under APIs & Services → Credentials
   - Restrict the key (HTTP referrers / app identifiers) for production

4. Start the dev server:

   ```bash
   npx expo start
   ```

   Use the Expo CLI menu to open an emulator/simulator, a [development build](https://docs.expo.dev/develop/development-builds/introduction/), or [Expo Go](https://expo.dev/go) (some native features may require a dev build).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run start` | Start Expo dev server (`expo start`) |
| `npm run android` / `npm run ios` | Run on native projects (`expo run:android` / `expo run:ios`) |
| `npm run web` | Web target (`expo start --web`) |
| `npm run lint` | Lint (`expo lint`) |

## Project context

This app talks to the Drone4Dengue backend over `EXPO_PUBLIC_*` variables. For full stack setup, see the [root README](../README.md) and [docs/setup-guide.md](../docs/setup-guide.md).
