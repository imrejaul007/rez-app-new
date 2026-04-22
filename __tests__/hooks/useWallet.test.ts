/**
 * Unit Tests for useWallet hook
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWallet } from '@/hooks/useWallet';

jest.mock('@/services/walletApi', () => ({
  __esModule: true,
  default: {
    getBalance: jest.fn(() => Promise.resolve({ success: true, data: { balance: { total: 1000, available: 900, pending: 100 } } })),
    getCoinRules: jest.fn(() => Promise.resolve({ success: true, data: {} })),
  },
}));

describe('useWallet', () => {
  it('should load wallet balance', async () => {
    const { result } = renderHook(() => useWallet({}));

    await waitFor(() => {
      expect(result.current.walletState.isLoading).toBe(false);
    });

    expect(result.current.walletState.data?.totalBalance).toBe(1000);
  });

  it('should handle errors', async () => {
    const walletApi = require('@/services/walletApi').default;
    walletApi.getBalance.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useWallet({}));

    await waitFor(() => {
      expect(result.current.walletState.error).toBeDefined();
    });
  });
});
