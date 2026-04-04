// Side-effect imports — must come first
import '@/utils/setup/warningSuppression';
import 'react-native-reanimated';

// Sentry must initialize before any rendering
import { initSentry, Sentry } from '@/config/sentry';
initSentry();

// CONS-010: Validate required environment variables at startup
// Fail loudly in production; warn in development so missing configs are caught early
(() => {
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
    // Never throw on missing env — crashes the app before anything renders
    console.error(`[Config] WARNING: ${msg}`);
  }
  if (missingRecommended.length > 0 && __DEV__) {
    console.warn(
      `[Config] Recommended env vars not set: ${missingRecommended.map(([k, v]) => `${k} (${v})`).join(', ')}`,
    );
  }
})();

import { useFonts } from 'expo-font';
import * as Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Linking, StyleSheet, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { platformAlertConfirm } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useAppServices } from '@/hooks/useAppServices';
import AppProviders from '@/utils/setup/AppProviders';
import logger, { installProductionConsoleGuard } from '@/utils/logger';
import { colors } from '@/constants/theme';
import { getActiveDraft } from '@/stores/checkoutDraftStore';
import apiClient from '@/services/apiClient';

const FONT_TIMEOUT_MS = 5000;

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function RootLayout() {
  const router = useRouter();
  const [loaded, fontError] = useFonts({
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const [fontTimedOut, setFontTimedOut] = useState(false);
  const onboardingCheckedRef = useRef(false);

  useEffect(() => {
    // LOW-9: installProductionConsoleGuard() is now called at module load time
    // in utils/logger.ts so it runs before any module-level logs. The call here
    // is removed to avoid double-installation.
    checkAppStatus();
    checkOnboarding();
  }, []);

  // ── Sprint 12: Deep Link Handling ──────────────────────────────────────────

  /**
   * Extracts query params from a deep link URL.
   * Supports both rezapp://path?key=val and https://rez.money/path?key=val
   */
  const parseDeepLink = (url: string): { path: string; params: Record<string, string> } => {
    try {
      // Normalise rezapp:// scheme to https:// for URL parsing
      const normalised = url.replace(/^rezapp:\/\//, 'https://rezapp.internal/');
      const parsed = new URL(normalised);
      const params: Record<string, string> = {};
      parsed.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      // Reconstruct path without leading slash for scheme URLs
      const path = parsed.pathname.replace(/^\//, '');
      return { path, params };
    } catch {
      return { path: '', params: {} };
    }
  };

  const handleDeepLink = async (url: string) => {
    if (!url) return;
    const { path, params } = parseDeepLink(url);

    // 1. Referral code links: rezapp://invite?code=ABC123 or https://rez.money/invite?code=ABC123
    if (path === 'invite' && params.code) {
      try {
        await AsyncStorage.setItem('rez_pending_referral', params.code);
        logger.debug('[DeepLink] Stored pending referral code', { code: params.code }, 'DeepLink');
        // Attempt to auto-apply if user is already authenticated
        const token = await AsyncStorage.getItem('rez_auth_token');
        if (token) {
          try {
            await apiClient.post('/api/referral/apply', { code: params.code });
            await AsyncStorage.removeItem('rez_pending_referral');
            // Show success toast — lazy import the toast utility to avoid circular deps
            import('@/contexts/ToastContext')
              .then(({ showGlobalToast }) => {
                if (typeof showGlobalToast === 'function') {
                  showGlobalToast('Referral code applied! You earned 100 bonus coins');
                }
              })
              .catch(() => {});
          } catch {
            // Will be retried on next login
          }
        }
      } catch {
        // Non-blocking
      }
      return;
    }

    // 2. Store check-in deep links: rezapp://checkin?storeId=XYZ
    if (path === 'checkin' && params.storeId) {
      try {
        router.push(`/qr-checkin?storeId=${encodeURIComponent(params.storeId)}` as any);
      } catch {
        // If router isn't ready, navigate to tab root
      }
      return;
    }

    // 3. Generic route deep links (notification-tapped links, etc.)
    if (path && path !== '') {
      try {
        router.push(`/${path}` as any);
      } catch {
        // Ignore navigation errors if route doesn't exist
      }
    }
  };

  // Handle deep links that open the app from cold start
  useEffect(() => {
    let mounted = true;

    // Get the initial URL that launched the app
    Linking.getInitialURL()
      .then((url) => {
        if (mounted && url) {
          handleDeepLink(url);
        }
      })
      .catch(() => {});

    // Subscribe to new deep links while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      if (mounted) {
        handleDeepLink(event.url);
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle notification-response deep links from expo-notifications
  useEffect(() => {
    let mounted = true;

    // Lazy import expo-notifications to avoid issues on web/environments without it
    import('expo-notifications')
      .then((Notifications) => {
        if (!mounted) return;

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<string, any>;
          if (data?.route && typeof data.route === 'string') {
            try {
              router.push(data.route as any);
            } catch {
              // Ignore if route is invalid
            }
          } else if (data?.url && typeof data.url === 'string') {
            handleDeepLink(data.url);
          }
        });

        return () => subscription.remove();
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkOnboarding = async () => {
    // Only run this redirect once per app session to prevent double-redirect.
    if (onboardingCheckedRef.current) return;
    onboardingCheckedRef.current = true;
    try {
      const done = await AsyncStorage.getItem('rez_onboarding_done');
      if (!done) {
        router.replace('/onboarding');
      }
    } catch {
      // If AsyncStorage fails, do not block the app — proceed normally.
    }
  };

  const checkAppStatus = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.rezapp.com';
      const resp = await fetch(`${apiUrl}/config/app-status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      let json: any;
      try {
        json = await resp.json();
      } catch {
        logger.debug('[AppStatus] Response was not valid JSON', undefined, 'AppStatus');
        return;
      }
      const data = json?.data;

      if (data?.maintenanceMode) {
        router.replace('/maintenance');
        return;
      }

      // Check version (requires expo-constants)
      const currentVersion = (Constants as any).expoConfig?.version || '1.0.0';
      if (data?.forceUpdate && compareVersions(currentVersion, data.minVersion) < 0) {
        router.replace('/update-required');
      }
    } catch {
      clearTimeout(timeoutId);
      // Non-blocking — app continues if config endpoint fails
      logger.debug('[AppStatus] Failed to fetch app status', undefined, 'AppStatus');
    }
  };

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

  // Track whether an OTA update has been downloaded and is ready to apply
  const updateReadyRef = useRef(false);

  useEffect(() => {
    if (__DEV__) return;

    // Download the update silently in the background
    Updates.checkForUpdateAsync()
      .then(async ({ isAvailable }) => {
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
          updateReadyRef.current = true;
          // Notify the user non-intrusively; they can dismiss and the app
          // will reload automatically the next time it resumes from background.
          platformAlertConfirm(
            'Update Available',
            'A new version has been downloaded and will be applied the next time you open the app.',
            () => Updates.reloadAsync(),
            'Restart Now',
            'Later',
          );
        }
      })
      .catch(() => {});

    // Reload when the app returns to the foreground after going to background,
    // but only if an update was already downloaded. Skip if a payment is in
    // progress to avoid interrupting the Razorpay / wallet flow mid-transaction.
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && updateReadyRef.current) {
        const activeDraft = getActiveDraft();
        const paymentInProgress = activeDraft?.paymentMethod != null;
        if (paymentInProgress) {
          // Leave updateReadyRef.current = true so we retry on the next foreground
          logger.debug('[OTA] Skipping reload — payment in progress', undefined, 'OTA');
          return;
        }
        updateReadyRef.current = false;
        Updates.reloadAsync();
      }
    });

    return () => subscription.remove();
  }, []);

  // Dark mode is disabled — always use light background colour for the loading screen.
  useColorScheme(); // keep hook call to avoid Rules-of-Hooks violations
  const fontsReady = loaded || fontError != null || fontTimedOut;

  const { handleQueueSyncError, handleQueueSyncComplete, handleErrorBoundaryError } = useAppServices(fontsReady);

  if (!fontsReady) {
    // Use cream/off-white background to match the home screen and avoid a dark navy flash
    return <View style={{ flex: 1, backgroundColor: '#F5F5F0' }} />;
  }

  return (
    <ErrorBoundary>
      <View style={styles.rootContainer}>
        <AppProviders
          onErrorBoundaryError={handleErrorBoundaryError}
          onQueueSyncComplete={handleQueueSyncComplete}
          onQueueSyncError={handleQueueSyncError}
        />
        {/* Animated offline/reconnect banner — uses OfflineBanner (absolute-positioned overlay) */}
        <OfflineBanner />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});

export default Sentry.wrap(RootLayout);
