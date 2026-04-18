/**
 * Theme store selectors.
 */

import { useThemeStore } from '../themeStore';

/** Only re-renders when dark mode toggles */
export const useIsDark = () => {
  const mode = useThemeStore((s) => s.themeMode);
  // Can't call useColorScheme here (not a hook context), so just return stored mode
  return mode === 'dark';
};
