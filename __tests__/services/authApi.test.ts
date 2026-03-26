import * as authApi from '@/services/authApi';

jest.mock('@/services/authApi', () => ({
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
}));

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send OTP', async () => {
    (authApi.sendOtp as jest.Mock).mockResolvedValue({ success: true, expiresIn: 300 });

    const result = await authApi.sendOtp('+9611234567');
    expect(result.success).toBe(true);
    expect(result.expiresIn).toBe(300);
    expect(authApi.sendOtp).toHaveBeenCalledWith('+9611234567');
  });

  it('should verify OTP and return tokens', async () => {
    (authApi.verifyOtp as jest.Mock).mockResolvedValue({
      accessToken: 'access-abc',
      refreshToken: 'refresh-xyz',
      user: { id: 'u1', phone: '+9611234567' },
    });

    const result = await authApi.verifyOtp('+9611234567', '123456');
    expect(result.accessToken).toBe('access-abc');
    expect(result.refreshToken).toBeDefined();
    expect(result.user.id).toBe('u1');
  });

  it('should refresh access token', async () => {
    (authApi.refreshToken as jest.Mock).mockResolvedValue({ accessToken: 'new-access-token' });

    const result = await authApi.refreshToken('old-refresh-token');
    expect(result.accessToken).toBe('new-access-token');
    expect(authApi.refreshToken).toHaveBeenCalledWith('old-refresh-token');
  });
});
