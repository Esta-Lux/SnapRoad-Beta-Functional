// SnapRoad Mobile - App Configuration
// API_URL is the base domain — screens append /api/... themselves
// Set EXPO_PUBLIC_API_URL in your .env file to point to your backend server
// For local dev: EXPO_PUBLIC_API_URL=http://localhost:8001
// For production: EXPO_PUBLIC_API_URL=https://your-backend.example.com

// Throws an error if EXPO_PUBLIC_API_URL is not set, making it clear the config is missing
const getApiUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    console.warn('EXPO_PUBLIC_API_URL not set in .env - using localhost:8001 as fallback');
    return 'http://localhost:8001';
  }
  return url;
};

export const API_URL = getApiUrl();
