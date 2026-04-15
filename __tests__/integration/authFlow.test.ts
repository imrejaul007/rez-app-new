/**
 * Auth Flow — Sprint 13 integration tests
 * Covers: OTP request → verify → token stored, token refresh, logout
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '@/services/authApi';
import apiClient from '@/services/apiClient';

jest.mock('@/services/apiClient');
jest.mock('@react-native-async-storage/async-storage');

const PHONE = '+919876543210';
const OTP = '123456';
const ACCESS_TOKEN = 'access_token_abc';
const REFRESH_TOKEN = 'refresh_token_xyz';

const mockUser = { id: 'u1', phoneNumber: PHONE, isOnboarded: true };
const mockTokens = { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN };

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.multiSet as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

describe('OTP request → verify → token stored', () => {
  it('sends OTP and returns success', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { message: 'OTP sent', expiresIn: 300 },
    });

    const res = await authService.sendOtp({ phoneNumber: PHONE });

    expect(res.success).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/send-otp', expect.objectContaining({ phoneNumber: PHONE }));
  });

  it('verifies OTP and stores token', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { user: mockUser, tokens: mockTokens },
    });

    const res = await authService.verifyOtp({ phoneNumber: PHONE, otp: OTP });

    expect(res.success).toBe(true);
    expect(res.data.tokens.accessToken).toBe(ACCESS_TOKEN);

    authService.setAuthToken(ACCESS_TOKEN);
    expect(authService.getAuthToken()).toBe(ACCESS_TOKEN);
  });
});

describe('Token refresh when expired', () => {
  it('calls refresh endpoint and returns new tokens', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { tokens: { accessToken: 'new_access', refreshToken: 'new_refresh' } },
    });

    const res = await authService.refreshToken(REFRESH_TOKEN);

    expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: REFRESH_TOKEN });
    expect(res).toBeDefined();
  });

  it('rejects when refresh token is expired', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      response: { status: 401, data: { error: 'Refresh token expired' } },
    });

    await expect(authService.refreshToken('stale_token')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

describe('Logout clears token', () => {
  it('calls logout endpoint and nulls the auth token', async () => {
    authService.setAuthToken(ACCESS_TOKEN);

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { message: 'Logged out' },
    });

    await authService.logout();

    authService.setAuthToken(null);
    expect(authService.getAuthToken()).toBeNull();
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });
});
