// API Client
// Base client for all backend API communications

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { parseConnectionError, formatConnectionError, isConnectionError } from '@/utils/connectionUtils';
import { Sentry } from '@/config/sentry';
import { API_CONFIG as ENV_API_CONFIG } from '@/config/env';
import { globalDeduplicator, createRequestKey } from '@/utils/requestDeduplicator';
import { globalConcurrencyLimiter } from '@/utils/concurrencyLimiter';
import AsyncStorage from '@react-native-async-storage/async-storage';
// OG-D005/OG-D006 FIX: Register every fetch's AbortController so the
// app-level background listener can cancel in-flight requests on OS kill.
import { requestRegistry } from '@/utils/requestRegistry';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePriveStore } from '@/stores/priveStore';

// Cached device fingerprint (loaded once, reused for all requests)
let _cachedDeviceFingerprint: string | null = null;
let _fingerprintLoadPromise: Promise<string | null> | null = null;

async function getDeviceFingerprintHeader(): Promise<string | null> {
  if (_cachedDeviceFingerprint) return _cachedDeviceFingerprint;
  if (_fingerprintLoadPromise) return _fingerprintLoadPromise;
  _fingerprintLoadPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem('@security_device_fingerprint');
      if (stored) {
        const fp = JSON.parse(stored);
        _cachedDeviceFingerprint = fp.hash || fp.id || null;
      }
    } catch { /* non-critical */ }
    return _cachedDeviceFingerprint;
  })();
  return _fingerprintLoadPromise;
}

// Emulators can't reach the host's localhost directly.
// Standard Android emulator (AVD/Genymotion): host is at 10.0.2.2.
// iOS simulator: localhost resolves to host natively — no rewrite needed.
// Guard with __DEV__ so production Android builds use the real API URL unchanged.
function resolveBaseURL(url: string): string {
  if (__DEV__ && Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
  errors?: { [key: string]: string[] };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    timestamp?: string;
    [key: string]: unknown;
  };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown> | unknown[] | FormData | string | null;
  timeout?: number;
  deduplicate?: boolean; // Enable/disable deduplication per-request
  signal?: AbortSignal; // AbortController signal for request cancellation
}

/** Typed Sentry scope interface (subset used by ApiClient) */
interface SentryScope {
  setTag(key: string, value: string): void;
}

// Region getter - will be set by RegionContext
let getRegionFn: (() => string) | null = null;

export function setRegionGetter(fn: (() => string) | null) {
  getRegionFn = fn;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private authToken: string | null = null;
  private refreshTokenCallback: (() => Promise<boolean>) | null = null;
  private logoutCallback: (() => void | Promise<void>) | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  private isLoggingOut: boolean = false;
  // System page callbacks
  private maintenanceCallback: (() => void) | null = null;
  private appUpdateCallback: ((minVersion: string) => void) | null = null;
  private currentAppVersion: string = '1.0.0';
  // Region
  private currentRegion: string = 'bangalore';
  // Slow request warning callback (fires before timeout)
  private slowRequestCallback: ((endpoint: string) => void) | null = null;

  constructor() {
    // CONS-009: Require explicit API URL — no silent localhost fallback
    // In dev: set EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api in .env
    // In prod: set EXPO_PUBLIC_API_BASE_URL=https://api.rez.app/api
    const rawURL = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (!rawURL) {
      if (__DEV__) {
        console.error('[ApiClient] EXPO_PUBLIC_API_BASE_URL is not set. Defaulting to localhost for dev.');
      } else {
        // During `expo export` static pre-rendering, env vars may not be present.
        // Log a warning but don't throw — the app will show API errors at runtime
        // rather than crashing the entire build.
        console.error('[ApiClient] WARNING: EXPO_PUBLIC_API_BASE_URL is not configured. API calls will fail at runtime.');
      }
    }
    const resolvedURL = resolveBaseURL(rawURL || 'http://localhost:5001/api');

    // CA-AUT-033 FIX: On web, enforce HTTPS to prevent credential leakage over plaintext.
    // On native, this is less critical since network traffic is encrypted at the OS level
    // (except on Android with user-installed root certs, which this code mitigates).
    // In production, enforce HTTPS.
    if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' && !resolvedURL.startsWith('https://')) {
      throw new Error(`[ApiClient] FATAL: Production API URL must use HTTPS. Got: ${resolvedURL}`);
    }
    // TODO: On native, implement certificate pinning via react-native-cert-pinning
    // to validate the API server's certificate hash and prevent MITM attacks on compromised devices.

    this.baseURL = resolvedURL;
    // BUG-048 (consumer): Send X-App-Version so the server's 426-Upgrade-Required
    // minimum-version check can evaluate the client. Mirrors the admin apiClient.
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    this.currentAppVersion = appVersion;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-App-Version': appVersion,
    };
  }

  // Set current region for API requests
  setRegion(region: string) {
    this.currentRegion = region;
    this.defaultHeaders['X-Rez-Region'] = region;
  }

  // Get current region
  getRegion(): string {
    return this.currentRegion;
  }

  // Set authentication token
  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  // Get current auth token
  getAuthToken(): string | null {
    return this.authToken;
  }

  // Set refresh token callback
  setRefreshTokenCallback(callback: (() => Promise<boolean>) | null) {
    this.refreshTokenCallback = callback;
  }

  // Set logout callback (supports async callbacks)
  setLogoutCallback(callback: (() => void | Promise<void>) | null) {
    this.logoutCallback = callback;
  }

  // Set maintenance mode callback
  setMaintenanceCallback(callback: (() => void) | null) {
    this.maintenanceCallback = callback;
  }

  // Set app update callback
  setAppUpdateCallback(callback: ((minVersion: string) => void) | null) {
    this.appUpdateCallback = callback;
  }

  // Set current app version
  setCurrentAppVersion(version: string) {
    this.currentAppVersion = version;
    // Keep the X-App-Version default header in sync so overrides (e.g. from
    // expo-updates runtime version) are applied to every outgoing request.
    this.defaultHeaders['X-App-Version'] = version;
  }

  // Set slow request warning callback (fires at 4s before actual timeout)
  setSlowRequestCallback(callback: ((endpoint: string) => void) | null) {
    this.slowRequestCallback = callback;
  }

  // Compare semantic versions (returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2)
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  }

  // Handle token refresh (C-C02 FIX: made public so OffersHttpClient can use it)
  async handleTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshTokenCallback) {
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshTokenCallback();

    try {
      const success = await this.refreshPromise;
      return success;
    } catch (error) {
      return false;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  // Make HTTP request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = ENV_API_CONFIG.timeout,
      signal: externalSignal,
    } = options;

    const url = `${this.baseURL}${endpoint}`;

    // Get current region dynamically (in case it changed since constructor)
    const currentRegion = getRegionFn ? getRegionFn() : this.currentRegion;
    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      'X-Rez-Region': currentRegion,
      ...headers
    };

    // CA-AUT-009 FIX: Generate and include X-CSRF-Token header on auth endpoints
    // CSRF protection prevents cross-site request forgery attacks on sensitive operations.
    // On web (browser), tokens should be submitted as headers (not body) to prevent
    // leakage in logs or error pages.
    if (endpoint.includes('/auth') && typeof window !== 'undefined') {
      // On web, attempt to read CSRF token from meta tag or cookie
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      if (csrfMeta && csrfMeta.getAttribute('content')) {
        requestHeaders['X-CSRF-Token'] = csrfMeta.getAttribute('content')!;
      }
    }

    // Inject device fingerprint header for security tracking
    const fingerprint = await getDeviceFingerprintHeader();
    if (fingerprint) {
      requestHeaders['X-Device-Fingerprint'] = fingerprint;
      requestHeaders['X-Device-OS'] = `${Platform.OS} ${Platform.Version || ''}`.trim();
    }

    // Declared outside try so catch block can clear the timer
    let slowWarningId: ReturnType<typeof setTimeout> | null = null;
    // OG-D005/OG-D006 FIX: Declare registryId outside try so the catch block
    // can unregister the controller even when the fetch throws or is aborted.
    let registryId: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Merge external abort signal with internal timeout signal
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort();
        } else {
          externalSignal.addEventListener('abort', () => controller.abort());
        }
      }

      // OG-D005/OG-D006 FIX: Register the controller so the AppState
      // background listener can abort this fetch if the app is backgrounded
      // or killed while the request is in flight.
      registryId = requestRegistry.register(controller, `${method} ${endpoint}`);

      // Show "taking longer than usual" warning at 4s
      if (this.slowRequestCallback && timeout >= 5000) {
        slowWarningId = setTimeout(() => {
          this.slowRequestCallback?.(endpoint);
        }, 4000);
      }

      const config: RequestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal,
        // Phase 6: On web (browser), send httpOnly cookies cross-origin so the backend
        // can authenticate via the rez_access_token cookie set on login.
        // On native, this has no effect — native fetch ignores the credentials option.
        credentials: Platform.OS === 'web' ? 'include' : 'same-origin',
      };

      // Add body for non-GET requests
      if (body && method !== 'GET') {
        if (body instanceof FormData) {
          // Remove Content-Type for FormData (let browser set it)
          delete requestHeaders['Content-Type'];
          config.body = body;
        } else {
          config.body = JSON.stringify(body);
        }
      }

      // CA-SEC-005 FIX: Certificate pinning should be implemented here for production
      // On native (React Native), use react-native-cert-pinning or similar to intercept
      // network requests and validate the server's certificate against pinned certs.
      // This prevents MITM attacks via rogue CA certs on rooted/compromised devices.
      // TODO: Implement certificate pinning for auth and payment endpoints in production:
      //   1. Install react-native-cert-pinning or Expo secure transport
      //   2. Pin the API server's certificate SHA256 hash
      //   3. Validate cert on every request to /auth and /wallet endpoints
      const response = await globalConcurrencyLimiter.execute(() => fetch(url, config));
      clearTimeout(timeoutId);
      if (slowWarningId) clearTimeout(slowWarningId);
      // OG-D006 FIX: Unregister now that the fetch has resolved.
      requestRegistry.unregister(registryId);

      // Guard against calling .json() on responses that have no JSON body:
      //   • 204 No Content has an empty body — .json() would throw a SyntaxError.
      //   • HTML error pages (e.g. nginx 502/504) have Content-Type: text/html —
      //     .json() would throw and mask the real HTTP status with a parse error.
      const contentType = response.headers?.get('content-type') || '';
      let responseData: any;
      if (response.status === 204 || !contentType.includes('application/json')) {
        responseData = { success: response.ok, data: null };
      } else {
        responseData = await response.json();
      }

      if (!response.ok) {

        // Handle 503 Service Unavailable - Maintenance mode
        if (response.status === 503 && this.maintenanceCallback) {
          this.maintenanceCallback();
          return {
            success: false,
            error: 'Server is under maintenance. Please try again later.'
          };
        }

        // Handle 426 Upgrade Required - App version outdated
        if (response.status === 426 && this.appUpdateCallback) {
          const minVersion = responseData.minVersion || responseData.minimum_version || '1.0.0';
          this.appUpdateCallback(minVersion);
          return {
            success: false,
            error: 'Please update your app to continue.'
          };
        }

        // Check for version header in any response
        const serverMinVersion = response.headers.get('X-Min-App-Version');
        if (serverMinVersion && this.appUpdateCallback) {
          // Compare versions
          const needsUpdate = this.compareVersions(this.currentAppVersion, serverMinVersion) < 0;
          if (needsUpdate) {
            this.appUpdateCallback(serverMinVersion);
          }
        }

        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && this.authToken) {
          // If we're already logging out, skip all 401 handling
          if (this.isLoggingOut) {
            return {
              success: false,
              error: 'Session expired',
            };
          }

          // CA-AUT-017 FIX: On web (browser), attempt cookie refresh
          // The web platform uses httpOnly cookies for auth instead of Bearer tokens.
          // When a 401 occurs on web with the 'cookie-session' sentinel token, try to
          // refresh the cookie session by calling getProfile() again (which auto-sends cookies).
          if (Platform.OS === 'web' && this.authToken === 'cookie-session') {
            if (this.refreshTokenCallback && !this.isLoggingOut) {
              const refreshSuccess = await this.handleTokenRefresh();
              if (refreshSuccess) {
                // Retry after refresh succeeded
                return this.makeRequest<T>(endpoint, options);
              }
            }
          }

          // Attempt refresh for any 401 — do not gate on error message keywords.
          // Generic 401 responses like "Authentication required" or "Unauthorized"
          // would have been missed by keyword checks. Infinite loops are prevented
          // by the isRefreshing/refreshPromise deduplication inside handleTokenRefresh,
          // and by isLoggingOut which blocks re-entry after a failed refresh.
          if (this.refreshTokenCallback && !this.isLoggingOut) {
            const refreshSuccess = await this.handleTokenRefresh();
            if (refreshSuccess) {
              // Retry the request after successful token refresh.
              // All methods (including POST/PUT/PATCH/DELETE) are safe to retry
              // because the idempotency key system prevents duplicate operations.
              return this.makeRequest<T>(endpoint, options);
            }
            // Token refresh failed. The refreshTokenCallback (tryRefreshToken in
            // AuthContext) returns false for both network errors AND auth rejections,
            // but only dispatches AUTH_FAILURE and sets shouldRedirectToSignIn for
            // genuine auth failures. We rely on that callback to handle logout state.
          } else if (!this.refreshTokenCallback) {
            // No refresh callback registered — fall back to direct logout handling.
            // Token refresh failed. Only force logout if the refresh endpoint itself
            // returned an auth rejection (401/403 from the refresh endpoint, handled
            // inside the refreshTokenCallback). Network errors during refresh should NOT
            // log the user out — they're transient and the token may still be valid.
            // The logoutCallback here is a last-resort for when no refreshTokenCallback
            // is registered at all.
            if (this.logoutCallback && !this.isLoggingOut) {
              this.isLoggingOut = true;
              try {
                await this.logoutCallback();
              } catch (logoutError) {
                // Still clear local token as fallback
                this.setAuthToken(null);
              } finally {
                this.isLoggingOut = false;
              }
            } else if (!this.logoutCallback) {
              // No callbacks at all — at minimum clear the in-memory token
              this.setAuthToken(null);
            }
          }
        }

        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP ${response.status}: ${response.statusText}`,
          errors: responseData.errors
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
        message: responseData.message,
        meta: responseData.meta // Preserve meta field for pagination info
      };

    } catch (error) {
      if (slowWarningId) clearTimeout(slowWarningId);
      // OG-D006 FIX: Ensure the registry entry is cleaned up on error/abort.
      if (registryId !== null) {
        requestRegistry.unregister(registryId);
      }

      // Report API errors to Sentry with tier tags for filtering
      try {
        const subComputed = useSubscriptionStore.getState().computed;
        const priveEligibility = usePriveStore.getState().eligibility;

        Sentry?.withScope?.((scope: SentryScope) => {
          scope.setTag('endpoint', endpoint);
          scope.setTag('method', method);
          scope.setTag('user_tier', subComputed?.isVIP ? 'vip' : subComputed?.isPremium ? 'premium' : 'free');
          scope.setTag('prive_tier', priveEligibility?.tier ?? 'none');
          scope.setTag('error_type', error instanceof Error && error.name === 'AbortError' ? 'timeout'
            : error instanceof Error && isConnectionError(error) ? 'network' : 'api');
          Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
        });
      } catch {
        // Sentry/store unavailable — don't block error handling
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - Backend server may be slow or unresponsive'
          };
        }

        // Provide better error messages for connection issues
        if (isConnectionError(error)) {
          const connectionError = parseConnectionError(error);
          return {
            success: false,
            error: `${connectionError.message}. ${connectionError.suggestions[0] || ''}`
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred'
      };
    }
  }

  // GET request (with automatic deduplication)
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    // Fixed: Add headers option so callers can pass explicit auth headers - Phase 0
    options?: { deduplicate?: boolean; timeout?: number; headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<ApiResponse<T>> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, String(params[key]));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const requestOptions: RequestOptions = { method: 'GET' };
    if (options?.timeout) {
      requestOptions.timeout = options.timeout;
    }
    if (options?.headers) {
      requestOptions.headers = options.headers;
    }
    if (options?.signal) {
      requestOptions.signal = options.signal;
    }

    // Deduplicate GET requests by default (can be disabled per-request)
    const shouldDeduplicate = options?.deduplicate !== false;

    if (shouldDeduplicate) {
      // Include region in request key so region changes trigger new requests
      const currentRegion = getRegionFn ? getRegionFn() : this.currentRegion;
      const requestKey = createRequestKey(`${this.baseURL}${url}:region=${currentRegion}`, params);

      return globalDeduplicator.dedupe(
        requestKey,
        () => this.makeRequest<T>(url, requestOptions)
      );
    }

    return this.makeRequest<T>(url, requestOptions);
  }

  // POST request (optional deduplication, optional timeout, optional extra headers)
  // CONS-015: Pass timeout from API_TIMEOUTS for payment/upload/slow endpoints
  // OG-001: Pass headers: { 'Idempotency-Key': key } for mutating financial endpoints
  async post<T>(
    endpoint: string,
    data?: Record<string, unknown> | unknown[] | FormData,
    options?: { deduplicate?: boolean; timeout?: number; headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<ApiResponse<T>> {
    // POST requests are NOT deduplicated by default (usually mutating)
    const shouldDeduplicate = options?.deduplicate === true;
    const requestOpts: RequestOptions = { method: 'POST', body: data };
    if (options?.timeout) requestOpts.timeout = options.timeout;
    if (options?.headers) requestOpts.headers = options.headers;

    if (shouldDeduplicate) {
      const requestKey = createRequestKey(`POST:${this.baseURL}${endpoint}`, data);
      return globalDeduplicator.dedupe(requestKey, () => this.makeRequest<T>(endpoint, requestOpts));
    }

    return this.makeRequest<T>(endpoint, requestOpts);
  }

  // PUT request (optional deduplication, optional timeout)
  async put<T>(
    endpoint: string,
    data?: Record<string, unknown> | unknown[] | FormData,
    options?: { deduplicate?: boolean; timeout?: number }
  ): Promise<ApiResponse<T>> {
    // PUT requests are NOT deduplicated by default (usually mutating)
    const shouldDeduplicate = options?.deduplicate === true;
    const requestOpts: RequestOptions = { method: 'PUT', body: data };
    if (options?.timeout) requestOpts.timeout = options.timeout;

    if (shouldDeduplicate) {
      const requestKey = createRequestKey(`PUT:${this.baseURL}${endpoint}`, data);
      return globalDeduplicator.dedupe(requestKey, () => this.makeRequest<T>(endpoint, requestOpts));
    }

    return this.makeRequest<T>(endpoint, requestOpts);
  }

  // PATCH request (optional deduplication, optional timeout)
  async patch<T>(
    endpoint: string,
    data?: Record<string, unknown> | unknown[] | FormData,
    options?: { deduplicate?: boolean; timeout?: number }
  ): Promise<ApiResponse<T>> {
    // PATCH requests are NOT deduplicated by default (usually mutating)
    const shouldDeduplicate = options?.deduplicate === true;
    const requestOpts: RequestOptions = { method: 'PATCH', body: data };
    if (options?.timeout) requestOpts.timeout = options.timeout;

    if (shouldDeduplicate) {
      const requestKey = createRequestKey(`PATCH:${this.baseURL}${endpoint}`, data);
      return globalDeduplicator.dedupe(requestKey, () => this.makeRequest<T>(endpoint, requestOpts));
    }

    return this.makeRequest<T>(endpoint, requestOpts);
  }

  // DELETE request (optional deduplication, optional timeout)
  async delete<T>(
    endpoint: string,
    data?: Record<string, unknown> | unknown[] | FormData,
    options?: { deduplicate?: boolean; timeout?: number }
  ): Promise<ApiResponse<T>> {
    // DELETE requests are NOT deduplicated by default (usually mutating)
    const shouldDeduplicate = options?.deduplicate === true;
    const requestOpts: RequestOptions = { method: 'DELETE', body: data };
    if (options?.timeout) requestOpts.timeout = options.timeout;

    if (shouldDeduplicate) {
      const requestKey = createRequestKey(`DELETE:${this.baseURL}${endpoint}`, data);
      return globalDeduplicator.dedupe(requestKey, () => this.makeRequest<T>(endpoint, requestOpts));
    }

    return this.makeRequest<T>(endpoint, requestOpts);
  }

  // Upload file (30s timeout for large files)
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      timeout: API_TIMEOUTS.UPLOAD,
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      const data = await response.json();

      return {
        success: response.ok,
        data,
        error: response.ok ? undefined : data.error
      };
    } catch (error) {
      return {
        success: false,
        error: 'Cannot connect to server'
      };
    }
  }

  // Set base URL (useful for testing or different environments)
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  // Get base URL
  getBaseURL(): string {
    return this.baseURL;
  }

  // Get deduplication statistics
  getDeduplicationStats() {
    return globalDeduplicator.getStats();
  }

  // Print deduplication statistics
  printDeduplicationStats() {
    globalDeduplicator.printStats();
  }

  // Cancel all in-flight requests
  cancelAllRequests() {
    globalDeduplicator.cancelAll();
  }
}

// CONS-015: Timeout constants for per-request-type configuration.
// Import API_TIMEOUTS in service files and pass to post/put/patch/delete
// to override the 8s default for endpoints that are known to be slower.
export const API_TIMEOUTS = {
  DEFAULT: 8000,          // Standard read (list, detail)
  UPLOAD: 30000,          // File/image upload — large body
  LONG_RUNNING: 15000,    // Reports, exports, heavy aggregations
  PAYMENT: 20000,         // Payment processing — give gateway time to respond
  BILL_FETCH: 12000,      // Fetch bill from BBPS/utility provider — external call
  AUTH: 60000,            // Login / token refresh — 60s to handle Render free-tier cold starts
} as const;

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export type { ApiResponse, RequestOptions };
