/**
 * Unit Tests for useLocation hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useLocationPermission } from '@/hooks/useLocation';

jest.mock('@/contexts/LocationContext', () => ({
  useLocation: jest.fn(() => ({
    state: { status: 'granted' },
    requestLocationPermission: jest.fn(() => Promise.resolve(true)),
  })),
}));

describe('useLocationPermission', () => {
  it('should get location permission status', async () => {
    const { result } = renderHook(() => useLocationPermission());

    await waitFor(() => {
      expect(result.current.permissionStatus).toBeDefined();
    });
  });
});
