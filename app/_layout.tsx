// Side-effect imports — must come first
import './setup/warningSuppression';
import 'react-native-reanimated';

// Sentry must initialize before any rendering
import { initSentry, Sentry } from '@/config/sentry';
initSentry();

// CONS-010: Validate required environment variables at startup
// Fail loudly in production; warn in development so missing configs are caught early
;(() => {
  const REQUIRED_CONFIGS: Record<string, string> = {
    EXPO_PUBLIC_API_BASE_URL: 'Backend API URL',
    EXPO_PUBLIC_RAZORPAY_KEY_ID: 'Razorpay payment key',
  };
  const RECOMMENDED_CONFIGS: Record<string, string> = {
    EXPO_PUBLIC_SENTRY_DSN: 'Sentry crash reporting',
    EXPO_PUBLIC_ENVIRONMENT: 'Environment name (production/staging/development)',
  };
  const missing = Object.entries(REQUIRED_CONFIGS).filter(([key]) => !process.env[key]);
  const missingRecommended = Object.entries(RECOMMENDED_CONFIGS).filter(([key]) => !process.env[key]);
  if (missing.length > 0) {
    const msg = `Missing required env vars: ${missing.map(([k, v]) => `${k} (${v})`).join(', ')}`;
    if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production') {
      throw new Error(`[Config] FATAL: ${msg}`);
    } else {
      console.error(`[Config] WARNING: ${msg}`);
    }
  }
  if (missingRecommended.length > 0 && __DEV__) {
    console.warn(`[Config] Recommended env vars not set: ${missingRecommended.map(([k, v]) => `${k} (${v})`).join(', ')}`);
  }
})();

import { useFonts } from 'expo-font';
import React, { useEffect, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useAppServices } from '@/hooks/useAppServices';
import AppProviders from './setup/AppProviders';
import logger, { installProductionConsoleGuard } from '@/utils/logger';
import { colors } from '@/constants/theme';

const FONT_TIMEOUT_MS = 5000;

function RootLayout() {
  const [loaded, fontError] = useFonts({
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const [fontTimedOut, setFontTimedOut] = useState(false);

  useEffect(() => {
    installProductionConsoleGuard();
  }, []);

  useEffect(() => {
    if (fontError) {
      logger.warn('Font loading failed, proceeding with system fonts', { message: fontError.message }, 'Fonts');
    }
  }, [fontError]);

  useEffect(() => {
    if (loaded || fontError) return;
    const timer = setTimeout(() => {
      logger.warn('Font loading timed out after 5s, proceeding with system fonts', undefined, 'Fonts');
      setFontTimedOut(true);
    }, FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded, fontError]);

  const systemScheme = useColorScheme();
  const fontsReady = loaded || fontError != null || fontTimedOut;

  const {
    handleQueueSyncError,
    handleQueueSyncComplete,
    handleErrorBoundaryError,
  } = useAppServices(fontsReady);

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: systemScheme === 'dark' ? '#121212' : colors.nileBlue }} />;
  }

  return (
    <AppProviders
      onErrorBoundaryError={handleErrorBoundaryError}
      onQueueSyncComplete={handleQueueSyncComplete}
      onQueueSyncError={handleQueueSyncError}
    />
  );
}

export default Sentry.wrap(RootLayout);
