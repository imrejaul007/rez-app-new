/**
 * Unit Tests for useVideoManager hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useVideoManager } from '@/hooks/useVideoManager';

describe('useVideoManager', () => {
  it('should manage video playback state', () => {
    const { result } = renderHook(() => useVideoManager('test-video-id'));

    expect(result.current.isLoaded).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it('should start and stop playback', async () => {
    const { result } = renderHook(() => useVideoManager('test-video-id'));

    await act(async () => {
      await result.current.startPlayback();
    });

    expect(result.current.isPlaying).toBe(true);

    await act(async () => {
      await result.current.stopPlayback();
    });

    expect(result.current.isPlaying).toBe(false);
  });
});
