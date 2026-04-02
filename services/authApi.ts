// Authentication API Service
// Handles user authentication, registration, and profile management
// Enhanced with comprehensive error handling, validation, token management, and logging

import apiClient, { ApiResponse, API_TIMEOUTS } from './apiClient';
import { withRetry, createErrorResponse, logApiRequest, logApiResponse } from '@/utils/apiUtils';
import {
  User as UnifiedUser,
  validateUser,
  isUserVerified
} from '@/types/unified';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Keep the old User interface for backwards compatibility during migration
export interface User {
  id: string;
  /** MongoDB ObjectId — may be present alongside `id` on backend responses */
  _id?: string;
  phoneNumber: string;
  email?: string;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    location?: {
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: [number, number];
    };
  };
  preferences: {
    language?: string;
    currency?: string;
    notifications?: {
      push?: boolean;
      email?: boolean;
      sms?: boolean;
    };
    categories?: string[];
    theme?: 'light' | 'dark';
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
  };
  wallet: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    pendingAmount: number;
  };
  role: 'user' | 'admin' | 'merchant';
  isVerified: boolean;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

// Export unified User type for new code
export { UnifiedUser };

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface OtpRequest {
  phoneNumber: string;
  email?: string;
  referralCode?: string;
}

export interface OtpVerification {
  phoneNumber: string;
  otp: string;
}

export interface ProfileUpdate {
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    website?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    location?: {
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: [number, number];
    };
  };
  preferences?: {
    language?: string;
    theme?: 'light' | 'dark';
    notifications?: {
      push?: boolean;
      email?: boolean;
      sms?: boolean;
    };
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
  };
}

/**
 * Validates phone number format
 * Supports international format: +XXXXXXXXXXX (E.164)
 * Including UAE (+971), India (+91), etc.
 */
function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  // Remove spaces and dashes
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

  // Canonical E.164 format — requires + prefix, 7–15 digits (matches backend validator)
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates OTP format (6 digits)
 */
function isValidOtp(otp: string): boolean {
  if (!otp || typeof otp !== 'string') {
    return false;
  }

  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
}

// validateUser is imported from @/types/unified (line 10)

/** Minimal shape we expect the backend auth response to carry */
interface RawAuthResponsePayload {
  user?: { id?: string; _id?: string; [key: string]: unknown };
  tokens?: { accessToken?: string; refreshToken?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/**
 * Validates auth response structure
 */
function validateAuthResponse(response: RawAuthResponsePayload): boolean {
  if (!response || typeof response !== 'object') {
    devLog.warn('[AUTH API] Invalid auth response: not an object');
    return false;
  }

  if (!response.user || (!response.user.id && !response.user._id)) {
    devLog.warn('[AUTH API] Auth response missing valid user');
    return false;
  }

  if (!response.tokens || typeof response.tokens !== 'object') {
    devLog.warn('[AUTH API] Auth response missing tokens');
    return false;
  }

  if (!response.tokens.accessToken || !response.tokens.refreshToken) {
    devLog.warn('[AUTH API] Auth response missing required tokens');
    return false;
  }

  return true;
}

class AuthService {
  /**
   * Send OTP for registration or login
   */
  async sendOtp(data: OtpRequest): Promise<ApiResponse<{ message: string; expiresIn: number }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.phoneNumber) {
        return {
          success: false,
          error: 'Phone number is required',
          message: 'Please enter your phone number',
        };
      }

      if (!isValidPhoneNumber(data.phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format',
          message: 'Please enter a valid 10-digit phone number',
        };
      }

      // Validate email if provided
      if (data.email && !isValidEmail(data.email)) {
        return {
          success: false,
          error: 'Invalid email format',
          message: 'Please enter a valid email address',
        };
      }

      // Log request (sanitize phone number)
      logApiRequest('POST', '/user/auth/send-otp', {
        phoneNumber: data.phoneNumber.slice(-4).padStart(10, '*'),
        email: data.email
      });

      const response = await withRetry(
        () => apiClient.post<{ message: string; expiresIn: number }>('/user/auth/send-otp', data as any, { timeout: API_TIMEOUTS.AUTH }),
        { maxRetries: 0 } // HIGH-5: Do NOT retry OTP send — retrying triggers duplicate SMS charges
      );

      logApiResponse('POST', '/user/auth/send-otp', { success: response.success }, Date.now() - startTime);

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error sending OTP:', error);
      return createErrorResponse(error, 'Failed to send OTP. Please try again.') as any;
    }
  }

  /**
   * Verify OTP and authenticate/register user
   */
  async verifyOtp(data: OtpVerification): Promise<ApiResponse<AuthResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.phoneNumber) {
        return {
          success: false,
          error: 'Phone number is required',
          message: 'Please enter your phone number',
        };
      }

      if (!isValidPhoneNumber(data.phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format',
          message: 'Please enter a valid phone number',
        };
      }

      if (!data.otp) {
        return {
          success: false,
          error: 'OTP is required',
          message: 'Please enter the OTP sent to your phone',
        };
      }

      if (!isValidOtp(data.otp)) {
        return {
          success: false,
          error: 'Invalid OTP format',
          message: 'Please enter a valid 6-digit OTP',
        };
      }

      // Log request (sanitize sensitive data)
      logApiRequest('POST', '/user/auth/verify-otp', {
        phoneNumber: data.phoneNumber.slice(-4).padStart(10, '*'),
        otp: '******'
      });

      const response = await withRetry(
        () => apiClient.post<AuthResponse>('/user/auth/verify-otp', data as any, { timeout: API_TIMEOUTS.AUTH }),
        { maxRetries: 0 } // HIGH-4: Do NOT retry OTP verification — a wrong OTP should fail immediately without consuming extra attempts
      );

      logApiResponse('POST', '/user/auth/verify-otp', { success: response.success }, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateAuthResponse(response.data as any)) {
          devLog.error('[AUTH API] Invalid auth response structure');
          return {
            success: false,
            error: 'Invalid authentication response',
            message: 'Authentication failed. Please try again.',
          };
        }

        // Store tokens securely
        if (response.data.tokens?.accessToken) {
          this.setAuthToken(response.data.tokens.accessToken);
        }
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error verifying OTP:', error);
      return createErrorResponse(error, 'Failed to verify OTP. Please check the code and try again.') as any;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ tokens: { accessToken: string; refreshToken: string; expiresIn: number } }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!refreshToken) {
        return {
          success: false,
          error: 'Refresh token is required',
          message: 'Authentication token missing',
        };
      }

      logApiRequest('POST', '/user/auth/refresh-token', { token: '***' });

      const response = await withRetry(
        () => apiClient.post<{ tokens: { accessToken: string; refreshToken: string; expiresIn: number } }>(
          '/user/auth/refresh-token',
          { refreshToken }
        ),
        { maxRetries: 1 } // Don't retry token refresh
      );

      logApiResponse('POST', '/user/auth/refresh-token', { success: response.success }, Date.now() - startTime);

      // Validate response
      if (response.success && response.data?.tokens) {
        const tokens = response.data.tokens;

        if (!tokens.accessToken || !tokens.refreshToken) {
          devLog.error('[AUTH API] Invalid token refresh response');
          return {
            success: false,
            error: 'Invalid token response',
            message: 'Failed to refresh authentication',
          };
        }

        // Update stored token
        this.setAuthToken(tokens.accessToken);
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error refreshing token:', error);
      return createErrorResponse(error, 'Session expired. Please log in again.') as any;
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      logApiRequest('POST', '/user/auth/logout');

      const response = await withRetry(
        () => apiClient.post<{ message: string }>('/user/auth/logout'),
        { maxRetries: 0 } // MED-9: Do NOT retry logout — retrying a logout after a network error may succeed and double-invalidate, or worse confuse state
      );

      logApiResponse('POST', '/user/auth/logout', response, Date.now() - startTime);

      // Clear stored token regardless of API response
      this.setAuthToken(null);

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error during logout:', error);

      // Clear token even if logout API fails
      this.setAuthToken(null);

      return createErrorResponse(error, 'Logged out successfully') as any;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    const startTime = Date.now();

    try {
      logApiRequest('GET', '/user/auth/me');

      const response = await withRetry(
        () => apiClient.get<User>('/user/auth/me'),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/user/auth/me', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!response.data.id && !response.data._id) {
          devLog.error('[AUTH API] Invalid user data in profile response');
          return {
            success: false,
            error: 'Invalid profile data',
            message: 'Failed to load profile',
          };
        }
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error fetching profile:', error);

      // Handle 401 Unauthorized - token expired
      if (error?.status === 401) {
        this.setAuthToken(null);
        return createErrorResponse(error, 'Session expired. Please log in again.') as any;
      }

      return createErrorResponse(error, 'Failed to load profile. Please try again.') as any;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdate): Promise<ApiResponse<User>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data || (Object.keys(data).length === 0)) {
        return {
          success: false,
          error: 'No profile data provided',
          message: 'Please provide profile information to update',
        };
      }

      // Validate email if provided
      if ((data.profile as any)?.email && !isValidEmail(String((data.profile as any).email))) {
        return {
          success: false,
          error: 'Invalid email format',
          message: 'Please enter a valid email address',
        };
      }

      // REGRESSION FIX (2026-03-23): Backend mounts authRoutes at /user/auth (see src/config/routes.ts
      // line 352: app.use('/api/user/auth', authRoutes)), and the profile endpoint is declared as
      // router.put('/profile', ...) inside authRoutes.ts. Full resolved path is therefore
      // /api/user/auth/profile. The old path /user/profile was incorrect and returned 404 in production.
      logApiRequest('PUT', '/user/auth/profile', { fields: Object.keys(data) });

      const response = await withRetry(
        () => apiClient.put<User>('/user/auth/profile', data as any),
        { maxRetries: 2 }
      );

      logApiResponse('PUT', '/user/auth/profile', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!response.data.id && !response.data._id) {
          devLog.error('[AUTH API] Invalid user data in update response');
          return {
            success: false,
            error: 'Invalid profile data',
            message: 'Failed to update profile',
          };
        }
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error updating profile:', error);
      return createErrorResponse(error, 'Failed to update profile. Please try again.') as any;
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(data: ProfileUpdate): Promise<ApiResponse<User>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data || Object.keys(data).length === 0) {
        return {
          success: false,
          error: 'Profile data is required',
          message: 'Please complete your profile information',
        };
      }

      logApiRequest('POST', '/user/auth/complete-onboarding', { fields: Object.keys(data) });

      const response = await withRetry(
        () => apiClient.post<User>('/user/auth/complete-onboarding', data as any),
        { maxRetries: 2 }
      );

      logApiResponse('POST', '/user/auth/complete-onboarding', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!response.data.id && !response.data._id) {
          devLog.error('[AUTH API] Invalid user data in onboarding response');
          return {
            success: false,
            error: 'Invalid profile data',
            message: 'Failed to complete onboarding',
          };
        }
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error completing onboarding:', error);
      return createErrorResponse(error, 'Failed to complete onboarding. Please try again.') as any;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      logApiRequest('DELETE', '/user/auth/account');

      const response = await withRetry(
        () => apiClient.delete<{ message: string }>('/user/auth/account'),
        { maxRetries: 1 }
      );

      logApiResponse('DELETE', '/user/auth/account', response, Date.now() - startTime);

      // Clear token after account deletion
      if (response.success) {
        this.setAuthToken(null);
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error deleting account:', error);
      return createErrorResponse(error, 'Failed to delete account. Please try again or contact support.') as any;
    }
  }

  /**
   * Get user statistics (aggregated data from all modules)
   */
  async getUserStatistics(): Promise<ApiResponse<{
    user: {
      joinedDate: string;
      isVerified: boolean;
      totalReferrals: number;
      referralEarnings: number;
    };
    wallet: {
      balance: number;
      totalEarned: number;
      totalSpent: number;
      pendingAmount: number;
    };
    orders: {
      total: number;
      completed: number;
      cancelled: number;
      totalSpent: number;
    };
    videos: {
      totalCreated: number;
      totalViews: number;
      totalLikes: number;
      totalShares: number;
    };
    projects: {
      totalParticipated: number;
      approved: number;
      rejected: number;
      totalEarned: number;
    };
    offers: {
      totalRedeemed: number;
    };
    vouchers: {
      total: number;
      used: number;
      active: number;
    };
    summary: {
      totalActivity: number;
      totalEarnings: number;
      totalSpendings: number;
    };
  }>> {
    const startTime = Date.now();

    try {
      logApiRequest('GET', '/user/auth/statistics');

      const response = await withRetry(
        () => apiClient.get<any>('/user/auth/statistics'),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/user/auth/statistics', response, Date.now() - startTime);

      return response as any;
    } catch (error: any) {
      devLog.error('[AUTH API] Error fetching user statistics:', error);
      return createErrorResponse(error, 'Failed to load statistics. Please try again.') as any;
    }
  }

  /**
   * Set authentication token in API client
   */
  setAuthToken(token: string | null): void {
    try {
      apiClient.setAuthToken(token);

    } catch (error) {
      devLog.error('[AUTH API] Error setting auth token:', error);
    }
  }

  /**
   * Get current authentication token from API client
   */
  getAuthToken(): string | null {
    try {
      return apiClient.getAuthToken();
    } catch (error) {
      devLog.error('[AUTH API] Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAuthToken();
    // LOW-10: Exclude the 'cookie-session' sentinel — it is not a real Bearer token
    // and must not be treated as proof of authentication.
    return token !== null && token.length > 0 && token !== 'cookie-session';
  }

  /**
   * Validate and refresh token if needed
   * Call this before making authenticated requests
   *
   * TODO (MED-3): This method is NOT implemented. It always returns false.
   * Token refresh is handled automatically by AuthContext.tryRefreshToken()
   * via the apiClient 401 interceptor. Do NOT call this method expecting it
   * to actually validate or refresh the token — it will silently lie to callers.
   *
   * @deprecated Use AuthContext.tryRefreshToken() (via apiClient 401 callback) instead.
   */
  async ensureValidToken(): Promise<boolean> {
    // Removed: this method was a no-op stub that always returned false,
    // silently breaking any caller that depended on it. Token refresh is
    // handled automatically by the apiClient 401 interceptor via AuthContext.
    // Call sites should be updated to remove this call entirely.
    throw new Error(
      '[AuthService] ensureValidToken() is removed. Token refresh is automatic via apiClient. Remove this call.',
    );
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
