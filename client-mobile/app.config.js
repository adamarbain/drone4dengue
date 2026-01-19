module.exports = {
  expo: {
    name: "DengueEye",
    slug: "dengueeye-mobile-app",
    version: "1.0.7",
    orientation: "portrait",
    icon: "./assets/dengueeye_logo.png",
    scheme: "dengueeye",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.adamarbain.dengueeyemobileapp",
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          "DengueEye needs your location to show nearby dengue risk areas and help protect your community.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "DengueEye needs your location to show nearby dengue risk areas and provide alerts even when the app is in the background.",
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/dengueeye_logo.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.adamarbain.dengueeyemobileapp",
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        },
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/dengueeye_logo.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/dengueeye_logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/dengueeye_logo.png",
          color: "#A21C1C",
          sounds: [],
          mode: "production",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            buildReactNativeFromSource: true
          },
        },
      ],
    ],
    notification: {
      icon: "./assets/dengueeye_logo.png",
      color: "#A21C1C",
      iosDisplayInForeground: true,
      androidMode: "default",
      androidCollapsedTitle: "#{unread_notifications} new notifications",
    },
    experiments: {
      typedRoutes: true,
    },
    owner: "adamarbain",
    extra: {
      router: {},
      eas: {
        projectId: "fd6296bb-8c6f-4a3d-adbf-a42b3c032bea",
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000",
      googleWebClientId: "93522668734-450k3d6bf46ibs47e5dnmkiavds24i13.apps.googleusercontent.com",
    },
  },
};
