// SnapRoad Mobile - App Configuration
// API_URL is the base domain — screens append /api/... themselves
// For local dev: set EXPO_PUBLIC_API_URL=http://localhost:8001
// For production/Emergent preview: falls back to the deployed backend
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://privacy-first-app-3.preview.emergentagent.com';
