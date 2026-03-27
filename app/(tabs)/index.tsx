import React, { Suspense, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  RefreshControl,
  Platform,
  InteractionManager,
  AppState,
  AppStateStatus,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  useGetCurrencySymbol,
  useGetCurrency,
  useGetLocale,
  useAuthUser,
  useAuthActions,
  useIsAuthenticated,
  useCartItemCount,
  useCartActions,
  useRefreshCart,
  useRezBalance,
  useWalletData,
  useWalletLoading,
  useRefreshWallet,
  useSavingsInsights,
  useActiveTab,
  useSetActiveTab,
  usePriveEligibility,
  useIsPriveEligible,
  useActiveHomeTab,
  useSetActiveHomeTab,
  useRegisterScrollToTop,
} from '@/stores';
import { useProfile, useProfileMenu } from '@/contexts/ProfileContext';
import { useUserIdentityStore } from '@/stores/userIdentityStore';

// Phase 1: Habit Engine components
import StreakFireIcon from '@/components/gamification/StreakFireIcon';
import RezScoreCard from '@/components/gamification/RezScoreCard';
import NearbyOffersCarousel from '@/components/discovery/NearbyOffersCarousel';

import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
import { colors, spacing, borderRadius, shadows, typography } from '@/constants/theme';
import StickySearchHeader from '@/components/homepage/StickySearchHeader';
import HeroBanner from '@/components/homepage/HeroBanner';
import type { TabId } from '@/components/homepage/HomeTabSection';
import { useHomepage, useHomepageNavigation } from '@/hooks/useHomepage';
import { useLoyaltySection } from '@/hooks/useLoyaltySection';
import { PersonalizedHeroBanner } from '@/components/home/PersonalizedHeroBanner';
import * as insightsApi from '@/services/insightsApi';
import HeroCard from '@/components/homepage/HeroCard';
import CoinExpiryBanner from '@/components/wallet/CoinExpiryBanner';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    factory().catch(() => new Promise<{ default: T }>((resolve) => setTimeout(() => resolve(factory()), 1500))),
  );
}

// Lazy-loaded tab containers (code-split — prefetched in background after mount)
const MallSectionContainer = lazyWithRetry(() => import('@/components/mall/MallSectionContainer'));
const MallHeaderWrapper = lazyWithRetry(() => import('@/components/mall/MallHeaderWrapper'));
const CashStoreHeaderWrapper = lazyWithRetry(() => import('@/components/cash-store/CashStoreHeaderWrapper'));
const CashStoreSectionContainer = lazyWithRetry(() => import('@/components/cash-store/CashStoreSectionContainer'));
const PriveHeaderWrapper = lazyWithRetry(() => import('@/components/prive/PriveHeaderWrapper'));
const PriveSectionContainer = lazyWithRetry(() =>
  import('@/components/prive/PriveSectionContainer').then((m) => ({ default: m.PriveSectionContainer })),
);
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
// Profile now from Zustand store (imported above)
import { profileMenuSections } from '@/data/profileData';
import LocationDisplay from '@/components/location/LocationDisplay';
// LocationPickerModal lazy-loaded below (modal — only needed on tap)
import { useCurrentLocation, useLocationPermission } from '@/hooks/useLocation';
import { AddressSearchResult } from '@/types/location.types';
// Cart & Auth now from Zustand selectors (imported above)
import { HomepageCacheWarmer } from '@/services/homepageApi';
// Wallet now from Zustand selectors (imported above)
import StoriesRow from '@/components/whats-new/StoriesRow';
// HomeTab now from Zustand selectors (imported above)
import CachedImage, { prefetchImages } from '@/components/ui/CachedImage';
import HomepageSkeleton from '@/components/homepage/HomepageSkeleton';
import { BRAND } from '@/constants/brand';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import {
  isUserFirstDay,
  getStreakDisplay,
  getDaysSinceJoined,
  trackSessionStart,
  trackSessionEnd,
} from '@/utils/retentionHooks';
import sessionTrackingService from '@/services/sessionTrackingService';

// ProfileMenuModal eagerly loaded — React.lazy + Suspense(null) causes modal to not appear on Android
import ProfileMenuModal from '@/components/profile/ProfileMenuModal';
import { useIsMounted } from '@/hooks/useIsMounted';

// Lazy-loaded components (below-the-fold / modals / secondary content)
const HomeTabSection = lazyWithRetry(() => import('@/components/homepage/HomeTabSection'));
const NearUTabContent = lazyWithRetry(() => import('@/components/homepage/NearUTabContent'));
const RecommendedStoresSection = lazyWithRetry(() => import('@/components/homepage/RecommendedStoresSection'));
const LocationPickerModal = lazyWithRetry(() => import('@/components/location/LocationPickerModal'));
const QuickAccessFAB = lazyWithRetry(() => import('@/components/navigation/QuickAccessFAB'));
const PushNotificationInitializer = lazyWithRetry(() => import('@/components/common/PushNotificationInitializer'));

// ── Module-level constants ──
const IS_IOS = Platform.OS === 'ios';
const IS_WEB = Platform.OS === 'web';
const SCROLL_EVENT_THROTTLE = Platform.OS === 'android' ? 32 : 16;

// ── Module-level state: survives component remounts caused by DeferredProviders ──
let _lastFocusRefreshTime = 0; // Throttle focus refreshes across remounts
let _statsLoadedGlobal = false; // Prevent redundant stats loads across remounts

// Prefetch lazy chunks + API data in background after initial render
// This ensures Mall/Cash Store are ready BEFORE the user taps the tab
const prefetchTabsRef = { done: false };
function prefetchOtherTabs() {
  if (prefetchTabsRef.done) return;
  prefetchTabsRef.done = true;

  // Prefetch JS chunks (import() caches the module — next React.lazy render is instant)
  import('@/components/homepage/HomeTabSection').catch(() => {});
  import('@/components/homepage/NearUTabContent').catch(() => {});
  import('@/components/homepage/RecommendedStoresSection').catch(() => {});
  import('@/components/mall/MallSectionContainer').catch(() => {});
  import('@/components/mall/MallHeaderWrapper').catch(() => {});
  import('@/components/cash-store/CashStoreHeaderWrapper').catch(() => {});
  import('@/components/cash-store/CashStoreSectionContainer').catch(() => {});
  // Prefetch play tab chunks
  import('@/components/playPage/CategoryHeader').catch(() => {});
  import('@/components/playPage/MerchantVideoSection').catch(() => {});

  // Prefetch API data (backend caches in Redis — first call warms it)
  import('@/services/mallApi').then((m) => m.mallApi.getMallHomepageBatch().catch(() => {})).catch(() => {});
  import('@/services/cashStoreApi').then((m) => m.default.getHomepageData().catch(() => {})).catch(() => {});

  // Seed TanStack Query cache so tab switches are instant
  queryClient
    .prefetchQuery({
      queryKey: queryKeys.cashStore.homepage(),
      queryFn: () => import('@/services/cashStoreApi').then((m) => m.default.getHomepageData()),
      staleTime: 5 * 60_000,
    })
    .catch(() => {});

  queryClient
    .prefetchQuery({
      queryKey: queryKeys.categories.list(),
      queryFn: () => import('@/services/categoriesApi').then((m) => m.default.getCategories()),
      staleTime: 30 * 60_000,
    })
    .catch(() => {});

  // Prefetch top homepage product/store images into expo-image disk cache
  import('@/services/homepageDataService')
    .then((m) => {
      const service = m.default;
      if (service && typeof (service as any).getCachedSections === 'function') {
        const sections = (service as any).getCachedSections?.();
        if (sections) {
          const imageUrls: string[] = [];
          for (const section of sections) {
            const items = (section as any).items || (section as any).data || [];
            for (const item of items.slice(0, 10)) {
              const url = item.image || item.imageUrl || item.logo || item.banner?.[0];
              if (url && typeof url === 'string' && url.startsWith('http')) {
                imageUrls.push(url);
              }
              if (imageUrls.length >= 15) break;
            }
            if (imageUrls.length >= 15) break;
          }
          if (imageUrls.length > 0) {
            prefetchImages(imageUrls);
          }
        }
      }
    })
    .catch(() => {});
}

// Tab content loading fallback — static styles to avoid creating objects per render
const fallbackStyles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.base, gap: spacing.base },
  bar1: { height: 24, width: 160, backgroundColor: colors.border.default, borderRadius: borderRadius.sm },
  hero: { height: 120, backgroundColor: colors.gray[50], borderRadius: borderRadius.lg },
  bar2: { height: 24, width: 200, backgroundColor: colors.border.default, borderRadius: borderRadius.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  card: { height: 100, flex: 1, backgroundColor: colors.gray[50], borderRadius: borderRadius.md },
  footer: { height: 80, backgroundColor: colors.gray[50], borderRadius: borderRadius.md },
});
const TabContentFallback = React.memo(() => (
  <View style={fallbackStyles.container}>
    <View style={fallbackStyles.bar1} />
    <View style={fallbackStyles.hero} />
    <View style={fallbackStyles.bar2} />
    <View style={fallbackStyles.row}>
      <View style={fallbackStyles.card} />
      <View style={fallbackStyles.card} />
      <View style={fallbackStyles.card} />
    </View>
    <View style={fallbackStyles.footer} />
  </View>
));

// Fallback components for Suspense boundaries
const FABFallback = () => null;

// BadgeAvatar replaced by inline savedAvatarBox (Section 4 handoff)

function HomeScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  // Zustand selectors — each only re-renders when its specific value changes
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const getCurrency = useGetCurrency();
  const getLocale = useGetLocale();
  const { state, actions, getUserContext: getHomepageUserContext } = useHomepage();
  const { handleItemPress, handleAddToCart } = useHomepageNavigation();
  const { user: profileUser, isModalVisible, showModal, hideModal } = useProfile();
  const { handleMenuItemPress } = useProfileMenu();
  const cartItemCount = useCartItemCount();
  const cartActions = useCartActions();
  const refreshCart = useRefreshCart();
  const authUser = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authActions = useAuthActions();
  const userPoints = useRezBalance();
  const { featureLevel } = useUserIdentityStore();
  const walletData = useWalletData();
  const refreshWallet = useRefreshWallet();
  const isWalletLoading = useWalletLoading();
  const savingsInsights = useSavingsInsights();
  const totalSaved = savingsInsights?.totalSaved ?? 0;

  // Wire missing API on mount — Section 12 / HeroCard missedAmount
  const { data: missedSavings } = useQuery({
    queryKey: ['missed-savings'],
    queryFn: () => insightsApi.getMissedSavings(),
    enabled: isAuthenticated,
  });
  // Zustand selectors for home tab — granular subscriptions
  const activeTab = useActiveTab();
  const setActiveTab = useSetActiveTab();
  const priveEligibility = usePriveEligibility();
  const isPriveEligible = useIsPriveEligible();
  const activeHomeTab = useActiveHomeTab();
  const setActiveHomeTab = useSetActiveHomeTab();
  const registerScrollToTop = useRegisterScrollToTop();
  const navTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showDetailedLocation, setShowDetailedLocation] = React.useState(false);
  // On web, InteractionManager resolves synchronously — start as true to avoid an extra re-render
  const [interactionsComplete, setInteractionsComplete] = React.useState(IS_WEB);
  const [pushReady, setPushReady] = React.useState(false); // Deferred push notification init
  const [selectedCategory, setSelectedCategory] = React.useState('for-you'); // Category tab state
  // activeTab now comes directly from useHomeTab() context
  // Batched stats state — single setState for voucher + offers count to reduce re-renders
  const [statsState, setStatsState] = React.useState({ voucherCount: 0, newOffersCount: 0 });
  const voucherCount = statsState.voucherCount;
  const newOffersCount = statsState.newOffersCount;
  const [isLocationModalVisible, setIsLocationModalVisible] = React.useState(false); // Location picker modal
  // Deferred location prompt — shown to users who skipped location during onboarding
  const { permissionStatus, requestPermission: requestLocPermission } = useLocationPermission();
  const [locationBannerDismissed, setLocationBannerDismissed] = React.useState(true); // default hidden
  React.useEffect(() => {
    if (permissionStatus === 'granted' || permissionStatus === 'denied') return;
    // Check if user already dismissed the banner
    let mounted = true;
    import('@react-native-async-storage/async-storage')
      .then(({ default: AS }) =>
        AS.getItem('location_banner_dismissed').then((v) => {
          if (mounted && v !== 'true') setLocationBannerDismissed(false);
        }),
      )
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [permissionStatus]);

  // Handler for tab changes
  const handleTabChange = React.useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
    },
    [setActiveTab],
  );

  // Get current location hook for editable location
  const { currentLocation, updateLocation: updateUserLocation } = useCurrentLocation();

  // Serviceability check — show Coming Soon banner if no local stores nearby
  // NOTE: never auto-switch; let user stay on Near U and choose manually via the banner
  const [isAreaServiceable, setIsAreaServiceable] = React.useState(true);
  const [serviceabilityChecked, setServiceabilityChecked] = React.useState(false);

  // CARLOS: retention — day-1 habit prompt & streak display
  const [isFirstDay, setIsFirstDay] = React.useState(false);
  const [showDay1Challenge, setShowDay1Challenge] = React.useState(false);
  const [streakCount, setStreakCount] = React.useState(0);
  const [streakDisplay, setStreakDisplay] = React.useState({ emoji: '', text: '' });
  const sessionStartTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>('active');

  React.useEffect(() => {
    if (!currentLocation?.coordinates || serviceabilityChecked) return;

    const lat = currentLocation.coordinates.latitude;
    const lng = currentLocation.coordinates.longitude;
    let mounted = true;

    import('@/utils/serviceabilityCheck')
      .then(({ checkAreaServiceability }) => {
        checkAreaServiceability(lat, lng)
          .then((result) => {
            if (mounted) {
              setIsAreaServiceable(result.isServiceable);
              setServiceabilityChecked(true);
            }
            // No auto-switch — unserviceable areas see a banner with "Mall →" CTA instead
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [currentLocation?.coordinates?.latitude, currentLocation?.coordinates?.longitude]);

  // Get recently viewed items
  const {
    items: recentlyViewedItems,
    isLoading: isLoadingRecentlyViewed,
    refresh: refreshRecentlyViewed,
  } = useRecentlyViewed();

  // Get loyalty section data for homepage cards - only fetch when near-u tab is active
  const {
    loyaltyHub,
    featuredLockProduct,
    trendingService,
    isLoading: isLoyaltySectionLoading,
  } = useLoyaltySection({ autoFetch: activeTab === 'near-u' });

  // CARLOS: retention — check if user is on first day and should see day-1 challenge
  React.useEffect(() => {
    if (!authUser) return;
    const isDay1 = isUserFirstDay(authUser);
    setIsFirstDay(isDay1);
    if (isDay1) {
      // Show day-1 challenge card (only once per session)
      import('@react-native-async-storage/async-storage')
        .then(({ default: AS }) => {
          AS.getItem('day1_challenge_shown')
            .then((shown) => {
              if (!shown) {
                setShowDay1Challenge(true);
              }
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, [authUser]);

  // CARLOS: retention — session start/end tracking for cohort analysis
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      appStateRef.current = state;
      if (state === 'active') {
        // Session start — app comes to foreground
        sessionStartTimeRef.current = Date.now();
        const event = trackSessionStart();
        // Start session tracking service
        sessionTrackingService.startSession(authUser?.id);
        // CARLOS: retention — log to analytics (would go to analytics queue)
        console.debug('[Retention] Session started:', event);
      } else if (state === 'background' || state === 'inactive') {
        // Session end — app goes background
        if (sessionStartTimeRef.current > 0) {
          const event = trackSessionEnd(sessionStartTimeRef.current);
          // End session tracking and persist for analytics
          sessionTrackingService.endSession().catch(() => {});
          // CARLOS: retention — log to analytics (would go to analytics queue)
          console.debug('[Retention] Session ended, duration:', event.sessionDuration, 'ms');
          sessionStartTimeRef.current = 0;
        }
      }
    });

    sessionStartTimeRef.current = Date.now();
    sessionTrackingService.startSession(authUser?.id);

    return () => {
      subscription.remove();
      sessionTrackingService.endSession().catch(() => {});
    };
  }, [authUser?.id]);

  // CARLOS: retention — calculate and display user's daily visit streak
  React.useEffect(() => {
    if (!authUser) return;
    // Fetch or calculate streak from local storage or backend
    import('@react-native-async-storage/async-storage')
      .then(({ default: AS }) => {
        AS.getItem('last_active_date')
          .then((lastActive) => {
            // Simple streak: if visited yesterday or today, show streak
            // Real implementation would track full streak on backend
            const daysSinceJoined = getDaysSinceJoined(authUser);
            // For MVP, show a visual if user is in early days
            if (daysSinceJoined >= 0 && daysSinceJoined <= 30) {
              // Show a placeholder streak display for early users
              const display = getStreakDisplay(Math.max(1, daysSinceJoined + 1));
              setStreakCount(daysSinceJoined + 1);
              setStreakDisplay(display);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [authUser]);

  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);
  const locationExpandStyle = useAnimatedStyle(() => ({
    height: interpolate(animatedHeight.value, [0, 1], [0, 145]),
    opacity: animatedOpacity.value,
    overflow: 'hidden' as const,
  }));
  const scrollY = useSharedValue(0); // For sticky header (reanimated shared value)
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const statsLoadedRef = React.useRef(_statsLoadedGlobal); // Sync with module-level flag
  const lastFocusRefreshRef = React.useRef(_lastFocusRefreshTime); // Sync with module-level timestamp
  const scrollViewRef = React.useRef<any>(null); // ScrollView ref for scrollToTop

  // Register scroll to top callback
  React.useEffect(() => {
    registerScrollToTop(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [registerScrollToTop]);

  // Cleanup nav timer on unmount
  React.useEffect(() => {
    return () => clearTimeout(navTimerRef.current);
  }, []);

  // Defer heavy renders until after animations complete, then prefetch other tabs
  React.useEffect(() => {
    if (IS_WEB) {
      // Already set to true on web — just prefetch in background
      const webTimer = setTimeout(prefetchOtherTabs, 1000);
      return () => clearTimeout(webTimer);
    }
    let prefetchTimer: ReturnType<typeof setTimeout>;
    const handle = InteractionManager.runAfterInteractions(() => {
      setInteractionsComplete(true);
      // After Near U renders, prefetch Mall/Cash Store JS chunks + API data in background
      prefetchTimer = setTimeout(prefetchOtherTabs, 1000);
    });

    return () => {
      handle.cancel();
      if (prefetchTimer) clearTimeout(prefetchTimer);
    };
  }, []);

  // Defer push notification init by 3 seconds after mount
  React.useEffect(() => {
    const timer = setTimeout(() => setPushReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-complete onboarding for users who reached /(tabs) via shortcut path
  // (Android location-denied → notification-permission → tabs, skipping transactions-preview)
  // This triggers all deferred context providers to initialize
  const onboardingCompletedRef = React.useRef(false);
  React.useEffect(() => {
    let mounted = true;
    if (isAuthenticated && authUser && !authUser.isOnboarded && !onboardingCompletedRef.current) {
      onboardingCompletedRef.current = true;
      authActions
        .completeOnboarding({
          preferences: {
            notifications: { push: true, email: true, sms: true },
            currency: getCurrency(),
            language: getLocale().split('-')[0] || 'en',
          },
        })
        .catch(() => {
          // If completeOnboarding API fails, reset so it can retry on next render
          if (mounted) {
            onboardingCompletedRef.current = false;
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, authUser, authActions, getCurrency, getLocale]);

  // Load supplementary homepage data (wallet balance comes from WalletContext)
  const loadUserContext = useCallback(async () => {
    if (!isAuthenticated || !authUser) {
      setStatsState({ voucherCount: 0, newOffersCount: 0 });
      return;
    }

    // First, try to use userContext from homepage batch response (already fetched, no extra API call)
    const batchContext = getHomepageUserContext();
    if (batchContext) {
      setStatsState({
        voucherCount: batchContext.voucherCount || 0,
        newOffersCount: batchContext.offersCount || 0,
      });
      return;
    }

    // Fallback: separate API call if batch didn't include userContext (e.g., not authenticated during batch)
    const contextResult = await HomepageCacheWarmer.getUserContext()
      .then((r) => ({ status: 'fulfilled' as const, value: r }))
      .catch((e) => ({ status: 'rejected' as const, reason: e }));

    if (contextResult.status === 'fulfilled' && contextResult.value.success && contextResult.value.data) {
      if (!isMounted()) return;
      setStatsState({
        voucherCount: contextResult.value.data.voucherCount || 0,
        newOffersCount: contextResult.value.data.offersCount || 0,
      });
    }
  }, [isAuthenticated, authUser, getHomepageUserContext]);

  // Load user context once after interactions complete + authenticated
  React.useEffect(() => {
    let mounted = true;
    if (interactionsComplete && isAuthenticated && !statsLoadedRef.current) {
      statsLoadedRef.current = true;
      _statsLoadedGlobal = true; // Module-level — survives remounts
      loadUserContext();
    }
    // Reset flag on logout so next login triggers a fresh load
    if (!isAuthenticated) {
      statsLoadedRef.current = false;
      _statsLoadedGlobal = false;
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, interactionsComplete, loadUserContext]);

  // Refresh all dynamic data when screen comes into focus (throttled to prevent continuous refreshing)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Use module-level timestamp to survive remounts from DeferredProviders
      const timeSinceLastRefresh = now - _lastFocusRefreshTime;

      // Throttle focus refreshes: only refresh if more than 60 seconds since last
      // (homepage data is cached server-side for 5min, so refreshing more often is wasteful)
      if (timeSinceLastRefresh < 60000) {
        return;
      }

      lastFocusRefreshRef.current = now;
      _lastFocusRefreshTime = now; // Module-level — survives remounts

      // Refresh recently viewed items when returning to homepage
      refreshRecentlyViewed();

      // Only refresh user data if authenticated
      if (authUser && isAuthenticated) {
        // Single API call for wallet, vouchers, offers, cart, subscription
        loadUserContext();

        // Refresh cart context (for badge updates from context)
        refreshCart();
      }
    }, [authUser, isAuthenticated, refreshCart, refreshRecentlyViewed, loadUserContext]),
  );

  // Auth status check removed — AuthContext already calls checkAuthStatus on mount.
  // Calling it again here caused a redundant AUTH_LOADING→AUTH_SUCCESS cycle = flicker.

  // Debug function removed for production

  // Debug user and modal state (removed for production)

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Reset dedup timers so explicit refresh always works
    _lastFocusRefreshTime = 0;
    _statsLoadedGlobal = false;
    statsLoadedRef.current = false;
    try {
      // Refresh sections first (visual feedback) — force=true bypasses dedup
      await actions.refreshAllSections(true);

      // Refresh all user data in background (non-blocking)
      if (authUser && isAuthenticated) {
        // Single API call for all user-specific data
        loadUserContext().catch(() => {});

        // Refresh cart context
        refreshCart();

        // Refresh recently viewed
        refreshRecentlyViewed();
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [actions, authUser, isAuthenticated, loadUserContext, refreshCart, refreshRecentlyViewed]);

  const handleSearchPress = useCallback(() => {
    router.push('/search');
  }, [router]);

  const handleCoinPress = useCallback(() => {
    // CARLOS: retention — track wallet feature touch for cohort analysis
    sessionTrackingService.trackFeatureTouch('wallet');
    if (IS_IOS) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => router.push('/wallet-screen'), 50);
    } else {
      router.push('/wallet-screen');
    }
  }, [router]);

  const handlePriveLockedPress = useCallback(() => {
    router.push('/prive/eligibility');
  }, [router]);

  const handleCartPress = useCallback(() => {
    if (IS_IOS) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => router.push('/cart'), 50);
    } else {
      router.push('/cart');
    }
  }, [router]);

  const handleNotificationPress = useCallback(() => {
    router.push('/account/notification-history' as any);
  }, [router]);

  const handleProfilePress = useCallback(() => {
    if (isAuthenticated && authUser) {
      showModal();
    }
  }, [isAuthenticated, authUser, showModal]);

  // Handle location selection from the picker modal
  const handleLocationSelect = useCallback(
    async (selectedLocation: AddressSearchResult) => {
      try {
        const coordinates = {
          latitude: selectedLocation.coordinates.latitude,
          longitude: selectedLocation.coordinates.longitude,
        };
        // Pass city/state/pincode/neighbourhood from search results
        await updateUserLocation(coordinates, selectedLocation.formattedAddress, 'manual', {
          city: selectedLocation.city,
          state: selectedLocation.state,
          pincode: selectedLocation.pincode,
          neighbourhood: selectedLocation.neighbourhood,
        } as any);
        if (!isMounted()) return;
        setIsLocationModalVisible(false);
      } catch (error) {
        platformAlertSimple('Error', 'Failed to update location. Please try again.');
      }
    },
    [updateUserLocation],
  );

  // Handle location pill expansion/collapse
  const handleLocationPillPress = useCallback(() => {
    const newState = !showDetailedLocation;
    setShowDetailedLocation(newState);
    animatedHeight.value = withTiming(newState ? 1 : 0, { duration: 300 });
    animatedOpacity.value = withTiming(newState ? 1 : 0, { duration: 300 });
  }, [showDetailedLocation, animatedHeight, animatedOpacity]);

  // Handle change location button press
  const handleChangeLocationPress = useCallback(() => {
    setShowDetailedLocation(false);
    animatedHeight.value = withTiming(0, { duration: 200 });
    animatedOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => setIsLocationModalVisible(true), 220);
  }, [animatedHeight, animatedOpacity]);

  // ROHAN: Extract inline async handlers from Pressable to prevent new function references on every render
  const handleEnableLocationPress = useCallback(async () => {
    await requestLocPermission();
    if (!isMounted()) return;
    setLocationBannerDismissed(true);
  }, [requestLocPermission, isMounted]);

  // CARLOS: retention — dismiss day-1 challenge card
  const handleDismissDay1Challenge = useCallback(async () => {
    setShowDay1Challenge(false);
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    AS.setItem('day1_challenge_shown', new Date().toISOString()).catch(() => {});
  }, []);

  // CARLOS: retention — day-1 challenge action handler (booking, earn, or store)
  const handleDay1ChallengePress = useCallback(
    (action: 'booking' | 'earn' | 'store') => {
      // CARLOS: retention — track day-1 challenge engagement
      sessionTrackingService.trackFeatureTouch(`day1_challenge_${action}`);
      handleDismissDay1Challenge();
      switch (action) {
        case 'booking':
          sessionTrackingService.trackFeatureTouch('booking');
          router.push('/book' as any);
          break;
        case 'earn':
          sessionTrackingService.trackFeatureTouch('earn');
          router.push('/(tabs)/earn' as any);
          break;
        case 'store':
          sessionTrackingService.trackFeatureTouch('mall');
          setActiveTab('mall');
          break;
      }
    },
    [handleDismissDay1Challenge, router, setActiveTab],
  );

  const handleDismissLocationBanner = useCallback(async () => {
    setLocationBannerDismissed(true);
    const { default: AS } = await import('@react-native-async-storage/async-storage');
    AS.setItem('location_banner_dismissed', 'true').catch(() => {});
  }, []);

  // Memoize gradient colors to avoid new array allocation on every scroll frame
  const gradientColors = useMemo((): string[] => {
    switch (activeTab) {
      case 'prive':
        return [colors.neutral[800], colors.neutral[800], colors.neutral[900], colors.neutral[900]];
      case 'mall':
        return [colors.infoScale[200], colors.tint.blueLight, colors.tint.blue, colors.background.primary];
      case 'cash':
        return [colors.lightPeach, colors.background.peach, colors.background.accent, colors.background.primary];
      default:
        return [colors.primary[300], colors.primary[200], colors.linen, colors.background.primary];
    }
  }, [activeTab]);

  // Memoize tab-dependent styles to avoid creating new objects every render
  const tabStyles = useMemo(() => {
    const isPrive = activeTab === 'prive';
    const isMall = activeTab === 'mall';
    const isCash = activeTab === 'cash';
    return {
      locationIconBg: isPrive
        ? { backgroundColor: colors.brand.goldAccent }
        : isMall
          ? { backgroundColor: colors.brand.sky }
          : isCash
            ? { backgroundColor: colors.brand.caramel }
            : undefined,
      locationText: isPrive
        ? { color: colors.text.inverse, ...typography.body, fontWeight: '600' as const }
        : undefined,
      chevronColor: isPrive
        ? colors.brand.goldAccent
        : isMall
          ? colors.brand.sky
          : isCash
            ? colors.brand.caramel
            : colors.text.tertiary,
      coinContainerStyle: isPrive
        ? { backgroundColor: 'rgba(201, 169, 98, 0.2)', borderColor: 'rgba(201, 169, 98, 0.4)' }
        : isMall
          ? { backgroundColor: 'rgba(2, 132, 199, 0.15)', borderColor: 'rgba(2, 132, 199, 0.3)' }
          : isCash
            ? { backgroundColor: 'rgba(212, 160, 122, 0.15)', borderColor: 'rgba(212, 160, 122, 0.3)' }
            : undefined,
      coinTextColor: isPrive
        ? { color: colors.brand.goldAccent }
        : isMall
          ? { color: colors.brand.sky }
          : isCash
            ? { color: colors.brand.caramel }
            : undefined,
      iconColor: isPrive ? colors.text.inverse : isMall ? colors.brand.sky : colors.text.primary,
      whatsNewVariant: (isMall ? 'blue' : isPrive ? 'gold' : 'green') as 'blue' | 'gold' | 'green',
      savedPillBg: isPrive
        ? { backgroundColor: 'rgba(201, 169, 98, 0.25)' }
        : isMall
          ? { backgroundColor: 'rgba(2, 132, 199, 0.2)' }
          : isCash
            ? { backgroundColor: 'rgba(212, 160, 122, 0.2)' }
            : undefined,
      savedTextColor: isPrive
        ? { color: colors.brand.goldAccent }
        : isMall
          ? { color: colors.brand.sky }
          : isCash
            ? { color: colors.brand.caramel }
            : undefined,
    };
  }, [activeTab]);

  // Show full-page skeleton while initial data is loading
  // This prevents layout shift and provides instant visual feedback
  if (!interactionsComplete && state.loading) {
    return <HomepageSkeleton />;
  }

  return (
    <ReAnimated.View style={viewStyles.mainContainer} entering={FadeIn.duration(250)} pointerEvents="box-none">
      <ReAnimated.ScrollView
        ref={scrollViewRef}
        style={viewStyles.container}
        contentContainerStyle={viewStyles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        onScroll={scrollHandler}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.lightMustard}
            colors={[colors.lightMustard]}
          />
        }
      >
        {/* Header - Dynamic gradient based on active tab */}
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={viewStyles.header}
        >
          <View style={viewStyles.headerTop}>
            {/* Modern Location Pill - Tap to expand details */}
            <Pressable
              style={viewStyles.locationPill}
              onPress={handleLocationPillPress}
              accessibilityLabel="Current location"
              accessibilityHint={
                showDetailedLocation ? 'Tap to collapse location details' : 'Tap to expand location details'
              }
              accessibilityState={{ expanded: showDetailedLocation }}
            >
              {/* Section 4: 22x22 circle, rgba(255,178,60,.9) background */}
              <View style={viewStyles.locationIconWrapper}>
                <Ionicons name="location" size={12} color={colors.text.inverse} />
              </View>
              {/* Section 4: single line, truncated, maxWidth 80 */}
              <LocationDisplay
                compact={true}
                showCoordinates={false}
                showLastUpdated={false}
                showRefreshButton={false}
                style={viewStyles.locationDisplay}
                textStyle={tabStyles.locationText || textStyles.locationText}
              />
              {/* Section 4: ⌄ character at 55% opacity, replaces Ionicons chevron */}
              <Text style={[viewStyles.locationChevronChar, { color: tabStyles.chevronColor }]}>⌄</Text>
            </Pressable>

            {/* Modern Header Actions */}
            <View style={viewStyles.headerActions}>
              {/* Section 4: Streak pill — solid orange rgba(255,152,40,.82), fire emoji + bold dark number */}
              {streakCount > 0 && (
                <Pressable
                  onPress={() => router.push('/(tabs)/earn' as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`${streakCount}-day streak`}
                  accessibilityHint="Tap to see your streak and earn missions"
                  style={viewStyles.headerStreakPill}
                >
                  <Text style={viewStyles.headerStreakEmoji}>🔥</Text>
                  <Text style={viewStyles.headerStreakText}>{streakCount}</Text>
                </Pressable>
              )}

              {/* Section 4: Coin pill — white card rgba(255,255,255,.9), coin circle + navy number */}
              <Pressable
                onPress={handleCoinPress}
                accessibilityRole="button"
                accessibilityLabel={`Your balance: ${userPoints} coins`}
                accessibilityHint="Tap to view wallet details"
                style={viewStyles.headerCoinContainer}
              >
                <CachedImage
                  source={BRAND.COIN_IMAGE}
                  style={viewStyles.headerCoinImage}
                  contentFit="contain"
                  showShimmer={false}
                />
                <ReAnimated.Text
                  key={isWalletLoading ? 'loading' : 'loaded'}
                  entering={FadeIn.duration(350)}
                  style={viewStyles.headerCoinText}
                >
                  {!walletData && isWalletLoading ? '...' : userPoints}
                </ReAnimated.Text>
              </Pressable>

              {/* Section 4: Cart icon — dark navy stroke #1a3a52, no background */}
              <Pressable
                onPress={handleCartPress}
                accessibilityLabel={`Shopping cart: ${cartItemCount} items`}
                accessibilityRole="button"
                accessibilityHint="Double tap to view your shopping cart"
                style={viewStyles.headerIconButton}
              >
                <Ionicons name="cart-outline" size={24} color="#1a3a52" />
                {cartItemCount > 0 && (
                  <LinearGradient colors={[colors.error, colors.errorScale[400]]} style={viewStyles.cartBadgeModern}>
                    <Text style={viewStyles.cartBadgeTextModern}>{cartItemCount > 9 ? '9+' : cartItemCount}</Text>
                  </LinearGradient>
                )}
              </Pressable>

              {/* Notification Bell */}
              <Pressable
                onPress={handleNotificationPress}
                accessibilityLabel="Notifications"
                accessibilityRole="button"
                accessibilityHint="Tap to view your notifications"
                style={viewStyles.headerIconButton}
              >
                <Ionicons name="notifications-outline" size={22} color={tabStyles.iconColor} />
              </Pressable>

              {/* Section 4: Saved pill — white half pill + orange square avatar joined (no gap) */}
              <Pressable
                onPress={handleProfilePress}
                accessibilityLabel="User profile menu"
                accessibilityRole="button"
                accessibilityHint="Double tap to open profile menu and account settings"
                style={viewStyles.profileSavingsContainer}
              >
                {/* White half-pill on left, rounded only on left side */}
                <View style={viewStyles.savedTextPill}>
                  <Text style={viewStyles.savedText}>
                    {!walletData && isWalletLoading ? '...' : `${currencySymbol}${totalSaved} saved`}
                  </Text>
                </View>
                {/* Orange square avatar on right — flush against pill, no gap */}
                <View style={viewStyles.savedAvatarBox}>
                  <Ionicons name="person" size={13} color={colors.nileBlue} />
                </View>
              </Pressable>
            </View>
          </View>

          {/* Detailed Location Section - Animated */}
          <ReAnimated.View style={[viewStyles.detailedLocationContainer, locationExpandStyle]}>
            <View style={viewStyles.detailedLocationContent}>
              {/* Full Address Section */}
              <View style={viewStyles.addressSection}>
                <View style={viewStyles.addressHeader}>
                  <Ionicons
                    name="location"
                    size={16}
                    color={
                      activeTab === 'mall'
                        ? colors.brand.sky
                        : activeTab === 'cash'
                          ? colors.brand.caramel
                          : colors.lightMustard
                    }
                  />
                  <Text style={viewStyles.addressHeaderText}>Current Location</Text>
                </View>
                <LocationDisplay
                  compact={false}
                  showCoordinates={false}
                  showLastUpdated={false}
                  showRefreshButton={false}
                  style={viewStyles.detailedLocationDisplay}
                  textStyle={viewStyles.detailedLocationText}
                />
              </View>

              {/* Change Location Button */}
              <Pressable
                style={[
                  viewStyles.changeLocationButton,
                  activeTab === 'mall' && {
                    // MEERA: design token — hardcoded '#E0F2FE' -> colors.tint.blue (sky blue tint for mall tab)
                    backgroundColor: colors.tint.blueLight,
                    // MEERA: design token — hardcoded '#BAE6FD' -> colors.infoScale[200] (lighter sky blue border)
                    borderColor: colors.infoScale[200],
                  },
                ]}
                onPress={handleChangeLocationPress}
                accessibilityRole="button"
                accessibilityLabel="Change location"
                accessibilityHint="Tap to search and change your current location"
              >
                <View
                  style={[
                    viewStyles.changeLocationIconWrapper,
                    // MEERA: design token — hardcoded '#0EA5E9' -> colors.brand.sky (sky blue for mall tab accent)
                    activeTab === 'mall' && { backgroundColor: colors.brand.sky },
                  ]}
                >
                  <Ionicons name="search" size={12} color={colors.text.inverse} />
                </View>
                <Text style={viewStyles.changeLocationText}>Change Location</Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={
                    activeTab === 'mall'
                      ? colors.brand.sky
                      : activeTab === 'cash'
                        ? colors.brand.caramel
                        : colors.lightMustard
                  }
                />
              </Pressable>
            </View>
          </ReAnimated.View>

          {/* Section 4 / HeroCard: shown in header gradient for Near U tab.
              HeroCard (Agent 1) replaces the old HeroBanner for near-u. */}
          {activeTab === 'near-u' && (
            <HeroCard
              totalSaved={walletData?.savingsInsights?.totalSaved ?? 0}
              savingsThisMonth={walletData?.savingsInsights?.thisMonth ?? 0}
              unlockAmount={580}
              missedAmount={missedSavings?.totalMissedThisMonth ?? 0}
              expiringCoins={(walletData as any)?.promoCoinBalance ?? 0}
              onScanPay={handleSearchPress}
              onViewWallet={handleCoinPress}
              onClaimPress={() => router.push('/offers' as any)}
              onUseCoinPress={handleCoinPress}
            />
          )}

          {/* CoinExpiryBanner — shown when wallet has expiring promo coins (near-u tab only) */}
          {activeTab === 'near-u' &&
            (walletData as any)?.promoCoinBalance > 0 &&
            (walletData as any)?.promoCoinDaysLeft != null && (
              <View style={{ paddingHorizontal: spacing.base, paddingBottom: spacing.sm }}>
                <CoinExpiryBanner
                  expiringCount={(walletData as any).promoCoinBalance}
                  daysLeft={(walletData as any).promoCoinDaysLeft}
                  onPress={handleCoinPress}
                />
              </View>
            )}

          {/* Mall Hero Banner */}
          {activeTab === 'mall' && (
            <Suspense fallback={<View style={{ height: 185 }} />}>
              <MallHeaderWrapper />
            </Suspense>
          )}

          {/* Cash Store Header */}
          {activeTab === 'cash' && (
            <Suspense fallback={<View style={{ height: 60 }} />}>
              <CashStoreHeaderWrapper />
            </Suspense>
          )}

          {/* Privé Member Card */}
          {activeTab === 'prive' && (
            <Suspense fallback={<View style={{ height: 60 }} />}>
              <PriveHeaderWrapper />
            </Suspense>
          )}
        </LinearGradient>

        {/* Home Tab Section with 4 Tabs - Outside gradient */}
        <Suspense fallback={<View style={{ height: 44 }} />}>
          <HomeTabSection
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isPriveEligible={isPriveEligible}
            onPriveLockedPress={handlePriveLockedPress}
            onSearchPress={handleSearchPress}
            coinBalance={userPoints}
            onCoinPress={handleCoinPress}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </Suspense>

        {/* Deferred location permission banner */}
        {!locationBannerDismissed && permissionStatus !== 'granted' && permissionStatus !== 'denied' && (
          <View style={viewStyles.locationBanner}>
            <Ionicons name="location" size={20} color={colors.lightMustard} />
            <Text style={viewStyles.locationBannerText}>Enable location to find deals near you</Text>
            <Pressable
              style={viewStyles.locationBannerBtn}
              onPress={handleEnableLocationPress}
              accessibilityRole="button"
              accessibilityLabel="Enable location permission"
              accessibilityHint="Tap to grant location access and find deals near you"
            >
              <Text style={viewStyles.locationBannerBtnText}>Enable</Text>
            </Pressable>
            <Pressable
              onPress={handleDismissLocationBanner}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss location request"
              accessibilityHint="Tap to close this notification"
            >
              <Ionicons name="close" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        )}

        {/* Try Before You Buy Banner */}
        {activeTab !== 'prive' && activeTab !== 'mall' && (
          <Pressable
            style={viewStyles.tryBanner}
            onPress={() => router.push('/try' as any)}
            accessibilityLabel="Try before you buy"
            accessibilityRole="button"
            accessibilityHint="Tap to explore products you can try risk-free and earn coins"
          >
            <LinearGradient
              // MEERA: design token — hardcoded '#0d2035' -> colors.secondary[900] (darker nile blue for gradient)
              colors={[colors.nileBlue, colors.secondary[900]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={viewStyles.tryBannerGradient}
            >
              <View style={viewStyles.tryBannerContent}>
                <View style={viewStyles.tryBannerTextSection}>
                  <Text style={viewStyles.tryBannerTitle}>Try Before You Buy</Text>
                  <Text style={viewStyles.tryBannerSubtitle}>Experience products risk-free, earn coins</Text>
                </View>
                {/* MEERA: design token — hardcoded 'rgba(255,255,255,0.6)' -> colors.overlay.light (white with subtle opacity) */}
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.overlay.light}
                  style={viewStyles.tryBannerChevron}
                />
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Stories Row — What's New (Instagram-style) */}
        {activeTab !== 'prive' && <StoriesRow variant={tabStyles.whatsNewVariant} />}

        {/* PersonalizedHeroBanner moved to header as HeroCard (Section 4).
            Kept here for non-near-u tabs if needed by other agents. */}

        {/* CARLOS: retention — Day-1 Challenge Card (Habit Loop Trigger) */}
        {showDay1Challenge && activeTab === 'near-u' && (
          <Pressable
            style={viewStyles.day1ChallengeCard}
            onPress={() => handleDay1ChallengePress('earn')}
            accessibilityRole="button"
            accessibilityLabel="Today's challenge: earn your first coins"
            accessibilityHint="Tap to start earning coins"
          >
            <LinearGradient
              colors={[colors.lightMustard, colors.linen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={viewStyles.day1ChallengeGradient}
            >
              <View style={viewStyles.day1ChallengeContent}>
                <View style={viewStyles.day1ChallengeText}>
                  <Text style={viewStyles.day1ChallengeTitle}>🎯 Today's Challenge</Text>
                  <Text style={viewStyles.day1ChallengeSub}>Earn your first coins & start your journey</Text>
                </View>
                <Pressable
                  onPress={handleDismissDay1Challenge}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss challenge"
                >
                  <Ionicons name="close" size={20} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Phase 1: Habit Engine — Streak + Score + Nearby Offers */}
        {activeTab === 'near-u' && (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 }}
          >
            {streakCount > 0 && (
              <Pressable
                onPress={() => router.push('/smart-spending')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={`${streakCount}-day streak. Tap to view smart spending.`}
              >
                <StreakFireIcon streakDays={streakCount} size="small" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                  {streakCount}d streak
                </Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <RezScoreCard
                score={0}
                tier="Beginner"
                trend="stable"
                percentile={0}
                onPress={() => router.push('/rez-score')}
              />
            </View>
          </View>
        )}

        {/* Content */}
        <View
          style={[
            viewStyles.content,
            activeTab === 'mall' && viewStyles.mallContent,
            activeTab === 'cash' && viewStyles.cashStoreContent,
            activeTab === 'prive' && viewStyles.priveContent,
          ]}
        >
          {/* Near-U Tab Content - All sections with viewport-based lazy loading */}
          {activeTab === 'near-u' && (
            <FeatureErrorBoundary featureName="Near-U" compact={false}>
              <Suspense fallback={<TabContentFallback />}>
                <NearUTabContent
                  state={state}
                  actions={actions}
                  handleItemPress={handleItemPress}
                  handleAddToCart={handleAddToCart}
                  voucherCount={voucherCount}
                  userPoints={userPoints}
                  newOffersCount={newOffersCount}
                  recentlyViewedItems={recentlyViewedItems}
                  isLoadingRecentlyViewed={isLoadingRecentlyViewed}
                  loyaltyHub={loyaltyHub}
                  featuredLockProduct={featuredLockProduct}
                  trendingService={trendingService}
                  isLoyaltySectionLoading={isLoyaltySectionLoading}
                  scrollY={scrollY}
                  totalSaved={totalSaved}
                  thisMonthSaved={savingsInsights?.thisMonth ?? 0}
                  currencySymbol={currencySymbol}
                  featureLevel={featureLevel}
                  hasCompletedFirstOrder={featureLevel >= 3}
                  isAreaServiceable={isAreaServiceable}
                  areaName={currentLocation?.address?.neighbourhood || currentLocation?.address?.city}
                  onSwitchToMall={() => setActiveTab('mall')}
                />
              </Suspense>
            </FeatureErrorBoundary>
          )}

          {/* Mall Tab Content */}
          {activeTab === 'mall' && (
            <Suspense fallback={<TabContentFallback />}>
              <MallSectionContainer />
            </Suspense>
          )}

          {/* Cash Store Tab Content */}
          {activeTab === 'cash' && (
            <Suspense fallback={<TabContentFallback />}>
              <CashStoreSectionContainer />
            </Suspense>
          )}

          {/* Privé Tab Content */}
          {activeTab === 'prive' && (
            <Suspense fallback={<TabContentFallback />}>
              <PriveSectionContainer />
            </Suspense>
          )}
        </View>

        {/* Profile Menu Modal */}
        {(profileUser || authUser) && (
          <ProfileMenuModal
            visible={isModalVisible}
            onClose={hideModal}
            user={(profileUser || authUser) as any}
            menuSections={profileMenuSections}
            onMenuItemPress={handleMenuItemPress}
          />
        )}

        {/* Location Picker Modal — lazy-loaded (only needed on tap) */}
        <Suspense fallback={null}>
          <LocationPickerModal
            visible={isLocationModalVisible}
            onClose={() => setIsLocationModalVisible(false)}
            onLocationSelect={handleLocationSelect}
            currentLocation={currentLocation}
          />
        </Suspense>

        {/* Quick Access FAB - Lazy Loaded */}
        <Suspense fallback={<FABFallback />}>
          <QuickAccessFAB />
        </Suspense>

        {/* Push Notification Init - deferred 3s after mount */}
        {pushReady && (
          <Suspense fallback={null}>
            <PushNotificationInitializer />
          </Suspense>
        )}
      </ReAnimated.ScrollView>

      {/* Sticky Search Header with Glass Effect - Rendered after ScrollView to avoid blocking touches */}
      {/* showThreshold should be high enough so sticky header only appears after category section scrolls out of view */}
      {/* Hide for Privé tab as it has its own dark theme */}
      {activeTab !== 'prive' && (
        <StickySearchHeader
          scrollY={scrollY}
          showThreshold={580}
          onSearchPress={handleSearchPress}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      )}
    </ReAnimated.View>
  );
}

/* ---------------------------
   Styles: split into textStyles and viewStyles
   --------------------------- */

const textStyles = StyleSheet.create({
  // Section 4: single line, truncated, maxWidth enforced by locationDisplay container
  locationText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    numberOfLines: 1,
  } as any,
});

const viewStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    ...Platform.select({
      web: {
        touchAction: 'pan-y', // Only handle vertical scrolling, let children handle horizontal
        WebkitOverflowScrolling: 'touch',
      },
    }),
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120, // Ensure content is visible above bottom tab navbar
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  // Modern Location Pill Style
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    flexShrink: 1,
    flexGrow: 0,
    ...Platform.select({
      android: { maxWidth: '35%', overflow: 'hidden' as const },
      ios: { maxWidth: '40%' },
      default: {}, // Web: no constraint, flexShrink handles it
    }),
  },
  // Section 4: 22x22 circle with rgba(255,178,60,.9) background
  locationIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,178,60,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  // Section 4: ⌄ text chevron at 55% opacity
  locationChevronChar: {
    marginLeft: spacing.xs,
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.55,
    lineHeight: 16,
    flexShrink: 0,
  },
  // Modern Header Actions
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      android: { flexShrink: 0, flexGrow: 0, marginLeft: 4 },
      ios: { flexShrink: 0, marginLeft: 4 },
      default: { gap: spacing.xs }, // Web: use gap (well-supported)
    }),
  },
  // Section 4: Streak pill — solid orange card rgba(255,152,40,.82)
  headerStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,40,0.82)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
    minHeight: 30,
    gap: 2,
  },
  headerStreakEmoji: {
    fontSize: 13,
  },
  // Section 4: bold dark number on streak pill
  headerStreakText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7a2800',
  },
  // What's New Badge
  // Section 4: Coin pill — white card rgba(255,255,255,.9), coin circle + navy number
  headerCoinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
    minHeight: 30,
    ...Platform.select({
      android: { flexShrink: 0 },
      ios: { flexShrink: 0 },
      default: {},
    }),
  },
  headerCoinImage: {
    width: 18,
    height: 18,
    marginRight: 4,
  },
  // Section 4: navy number on coin pill
  headerCoinText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a3a52',
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      android: { marginLeft: 4, flexShrink: 0 },
      ios: { marginLeft: 4, flexShrink: 0 },
      default: {}, // Web: gap handles spacing
    }),
  },
  cartBadgeModern: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeTextModern: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
  // Section 4: Saved pill — white half pill + orange square avatar joined, no gap
  profileSavingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      android: { marginLeft: 4, flexShrink: 0 },
      ios: { marginLeft: 4, flexShrink: 0 },
      default: {},
    }),
  },
  // White half-pill (left side) — rounded on left only
  savedTextPill: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 7,
  },
  savedText: {
    color: colors.nileBlue,
    fontSize: 10,
    fontWeight: '600',
  },
  // Orange square avatar (right side) — flush against pill, no gap
  savedAvatarBox: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,152,40,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  // Section 4: single line location text, maxWidth 80, ellipsis
  locationDisplay: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
    maxWidth: 80,
    ...Platform.select({
      android: { flex: 0, flexGrow: 0, flexShrink: 1 },
      ios: { flex: 0, flexShrink: 1 },
      default: {},
    }),
  },
  detailedLocationContainer: {
    // MEERA: design token — hardcoded 'rgba(255, 255, 255, 0.95)' -> colors.background.primary (white, nearly opaque)
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    // MEERA: design token — hardcoded 'rgba(255, 205, 87, 0.1)' -> colors.border.accent (mustard-tinted border, light)
    borderColor: colors.border.accent,
  },
  detailedLocationContent: {
    padding: spacing.base,
  },
  addressSection: {
    marginBottom: -10,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressHeaderText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.nileBlue,
    marginLeft: spacing.xs,
  },
  changeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[50],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.successScale[200],
  },
  changeLocationIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.md,
    backgroundColor: colors.lightMustard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  changeLocationText: {
    flex: 1,
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  detailedLocationDisplay: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
  },
  detailedLocationText: {
    color: colors.text.primary,
    ...typography.body,
    lineHeight: 20,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
    backgroundColor: colors.background.primary,
  },
  mallContent: {
    padding: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  cashStoreContent: {
    padding: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  priveContent: {
    padding: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.subtle,
  },
  locationBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  locationBannerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.lightMustard,
    borderRadius: borderRadius.sm,
  },
  locationBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  // ReZ TRY Banner Styles
  tryBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  tryBannerGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  tryBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tryBannerTextSection: {
    flex: 1,
  },
  tryBannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    // MEERA: design token — hardcoded '#fff' -> colors.text.inverse (white text on dark backgrounds)
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  tryBannerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    // MEERA: design token — hardcoded 'rgba(255, 255, 255, 0.9)' -> colors.text.secondary (but inverse variant is white)
    color: colors.text.inverse,
  },
  tryBannerChevron: {
    marginLeft: spacing.md,
  },
  // CARLOS: retention — day-1 challenge card styles
  day1ChallengeCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  day1ChallengeGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  day1ChallengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  day1ChallengeText: {
    flex: 1,
  },
  day1ChallengeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  day1ChallengeSub: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  // CARLOS: retention — streak display styles
  streakCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  streakGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakEmoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.inverse,
    textAlign: 'center',
  },
});

export default withErrorBoundary(HomeScreen, 'Home');
