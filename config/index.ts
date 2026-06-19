/**
 * Configuration Index
 * Central export for all configuration files
 */

// Environment configuration
import ENV from './env';
export { ENV };
export {
  APP_CONFIG,
  API_CONFIG,
  ENDPOINTS,
  AUTH_CONFIG,
  EXTERNAL_SERVICES,
  FEATURE_FLAGS,
  MEDIA_CONFIG,
  DEV_CONFIG,
  BUSINESS_CONFIG,
  LOCATION_CONFIG,
  UI_CONFIG,
  CACHE_CONFIG,
  isDevelopment,
  isProduction,
  getApiUrl
} from './env';

// Production guard: EXPO_PUBLIC_API_BASE_URL must never fall back to localhost in production.
// (Primary guard lives in config/env.ts; this mirrors it for the Config shortcut object.)
// CD-CRIT-BUILD-02 FIX: Guard with lazy accessor to prevent Jest crash on module load.
// The module-level throw previously crashed the entire test suite if the env var was missing.
// We now guard the Config object access instead of throwing at import time.
const isTestEnvironment = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
const isProductionBuild =
  !isTestEnvironment &&
  (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.NODE_ENV === 'production');

// In production, default to the relative /api path so Vercel's rewrite proxies
// traffic to the gateway server-side (no CORS, no exposed backend URL).
const apiBaseUrlDefault = isProductionBuild ? '/api' : 'http://localhost:5001/api';

// Secondary guard: warn if EXPO_PUBLIC_API_BASE_URL is missing in production (dev/test are fine)
if (isProductionBuild && !process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.warn(
    '[Config] EXPO_PUBLIC_API_BASE_URL not set in production — defaulting to /api (Vercel proxy).'
  );
}

// Export specific configurations for easy access
export const Config = {
  // Environment
  ENV,

  // API
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || apiBaseUrlDefault,
  API_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),
  
  // Auth
  JWT_STORAGE_KEY: process.env.EXPO_PUBLIC_JWT_STORAGE_KEY || 'rez_app_token',
  
  // Features
  DEBUG_MODE: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
  MOCK_API: process.env.EXPO_PUBLIC_MOCK_API === 'true',
  
  // External Services
  // DEPRECATED for geocoding — geocoding now uses backend proxy. Kept for native MapView rendering.
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  
  // Business
  SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@rezapp.com',
} as const;