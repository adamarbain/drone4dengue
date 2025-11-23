import Constants from 'expo-constants';

/**
 * Get the API URL from environment variables or app config
 * This works both at build time (via process.env) and runtime (via Constants)
 */
export const getApiUrl = (): string => {
  // Try environment variable first (available at build time)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Fallback to Constants.extra (available at runtime in built apps)
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }
  // Final fallback
  return 'http://localhost:4000';
};

export const API_URL = getApiUrl();

