import { create } from 'zustand';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors,
  darkColors,
  gradients,
  darkGradients,
  shadows,
  darkShadows,
  glass,
  darkGlass,
} from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = '@nuqta_theme_mode';

interface ThemeStoreState {
  themeMode: ThemeMode;
  _loaded: boolean;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  _initialize: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  // Dark mode is disabled until all screens fully support it.
  // Force 'light' at store level; stored preferences are ignored for now.
  themeMode: 'light',
  _loaded: false,

  _initialize: () => {
    if (get()._loaded) return;
    // Always resolve to light mode regardless of stored preference
    set({ themeMode: 'light', _loaded: true });
  },

  setThemeMode: (mode: ThemeMode) => {
    set({ themeMode: mode });
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  },

  toggleTheme: () => {
    const { themeMode, setThemeMode } = get();
    setThemeMode(themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'dark' : 'dark');
  },
}));

// Initialize on import (load stored theme preference)
useThemeStore.getState()._initialize();

/**
 * Resolves whether dark mode is active, combining store themeMode + system color scheme.
 * Must be called inside a React component (uses useColorScheme hook).
 */
export function useResolvedTheme() {
  const { themeMode, _loaded, setThemeMode, toggleTheme } = useThemeStore();
  // Intentionally unused — dark mode is disabled until all screens support it.
  // Keep the hook call so the component stays reactive to system changes without errors.
  useColorScheme();

  // Dark mode is disabled: always resolve to light regardless of themeMode or system setting.
  const isDark = false;

  return {
    themeMode,
    isDark,
    colors,
    gradients,
    shadows,
    glass,
    setThemeMode,
    toggleTheme,
    _loaded,
  };
}
