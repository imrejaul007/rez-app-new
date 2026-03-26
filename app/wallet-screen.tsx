import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RechargeWalletCard from '../components/RechargeWalletCard';
import ReferAndEarnCard from '@/components/ReferAndEarnCard';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Share,
  AppState,
  AppStateStatus,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CoinBalance, WalletScreenProps, COIN_TYPES, CoinType } from '@/types/wallet';
import {
  useGetCurrency,
  useGetCurrencySymbol,
  useAuthUser,
  useIsAuthenticated,
  useAuthLoading,
  useWalletData,
  useWalletLoading,
  useWalletRefreshing,
  useRefreshWallet,
} from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useProfile } from '@/contexts/ProfileContext';
import { useReferral } from '@/hooks/useReferral';
import { useWalletAnalytics } from '@/hooks/useWalletAnalytics';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
import { TransactionListSkeleton } from '@/components/skeletons';
import EarningsBreakdown from '@/components/wallet/EarningsBreakdown';
import { BalanceDisplay } from '@/components/wallet/BalanceDisplay';
import { StickyQuickActions } from '@/components/wallet/StickyQuickActions';
import { CoinDetailCard } from '@/components/wallet/CoinDetailCard';
import { InsightSection } from '@/components/wallet/InsightSection';
import { TransactionCTA } from '@/components/wallet/TransactionCTA';
import { MoreForYouSection } from '@/components/wallet/MoreForYouSection';
import CoinEducationOverlay from '@/components/wallet/CoinEducationOverlay';
import SavingsHero from '@/components/wallet/SavingsHero';
import CoinProportionBar from '@/components/wallet/CoinProportionBar';
import { platformAlert } from '@/utils/platformAlert';
import { ThemedText } from '@/components/ThemedText';
import { BRAND } from '@/constants/brand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Typography, Gradients } from '@/constants/DesignSystem';
import walletApi from '@/services/walletApi';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Phase 1.3: Simplified wallet view for new/casual users
import SimplifiedWalletView from '@/components/wallet/SimplifiedWalletView';
import CoinExpiryBanner from '@/components/wallet/CoinExpiryBanner';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { useHomeTabStore } from '@/stores/homeTabStore';
import { getCoinExpiryWarning } from '@/utils/retentionHooks';

const WalletScreen: React.FC<WalletScreenProps> = ({ onNavigateBack, onCoinPress }) => {
  const isMounted = useIsMounted();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currentUserId = user?.id || '';
  const router = useRouter();
  const { goBack } = useSafeNavigation();
  const getCurrency = useGetCurrency();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [coinEducationVisible, setCoinEducationVisible] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const walletData = useWalletData();
  const walletLoading = useWalletLoading();
  const walletRefreshing = useWalletRefreshing();
  const refreshWallet = useRefreshWallet();

  const { segment, statedIdentity } = useUserIdentityStore();
  const { activeTab } = useHomeTabStore();
  const { completionStatus, isLoading: profileLoading, error: profileError } = useProfile();

  const {
    referralData,
    isLoading: referralLoading,
    error: referralError,
  } = useReferral({
    autoFetch: true,
    refreshInterval: 15 * 60 * 1000,
  });

  const { trackWalletViewed, trackTopupInitiated, trackTransactionViewed } = useWalletAnalytics();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // SS-005 FIX: Refresh wallet when app returns to foreground (e.g. after payment in browser)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active' && isAuthenticated) {
        refreshWallet().catch(() => {});
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [isAuthenticated, refreshWallet]);

  // Sync balance hidden state from AsyncStorage (same key as BalanceDisplay)
  useEffect(() => {
    AsyncStorage.getItem('@wallet_balance_hidden')
      .then((val) => {
        if (val === 'true') setIsBalanceHidden(true);
      })
      .catch(() => {});
  }, []);

  // Compute coin balances for CoinProportionBar
  const rezBalance = useMemo(() => {
    // ETHAN: crash guard — walletData?.coins could be undefined; filter safely
    const rezCoin = walletData?.coins?.find((c) => c?.type === 'rez' || c?.type === 'nuqta');
    return rezCoin?.amount ?? 0;
  }, [walletData?.coins]);

  const promoBalance = useMemo(() => {
    // ETHAN: crash guard — walletData?.coins could be undefined or contain null items
    const promoCoin = walletData?.coins?.find((c) => c?.type === 'promo');
    return promoCoin?.amount ?? 0;
  }, [walletData?.coins]);

  const totalBrandedCoins = walletData?.brandedCoinsTotal ?? 0;
  const totalBalance = walletData?.totalBalance ?? 0;

  // Determine wallet header based on active tab
  const walletHeaderTitle = useMemo(() => {
    switch (activeTab) {
      case 'near-u':
        return 'Your REZ Wallet';
      case 'mall':
        return 'Mall Wallet';
      case 'prive':
        return 'Privé Balance';
      case 'cash':
        return 'Your REZ Wallet';
      default:
        return 'Wallet';
    }
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    trackWalletViewed();
    // Auto-show coin education on first wallet visit
    AsyncStorage.getItem('wallet_education_seen')
      .then((seen) => {
        if (cancelled) return;
        if (!seen) {
          setCoinEducationVisible(true);
          AsyncStorage.setItem('wallet_education_seen', '1').catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trackWalletViewed]);

  // Expiring coins warning
  const [expiringAmount, setExpiringAmount] = useState(0);
  const [expiringLabel, setExpiringLabel] = useState('');
  const [expiringByType, setExpiringByType] = useState<
    Array<{ type: string; amount: number; expiresAt: string; daysLeft: number }>
  >([]);
  const [minDaysLeft, setMinDaysLeft] = useState<number>(30); // Track minimum days to determine urgency

  // Refresh wallet balance and expiring coins in parallel on screen focus.
  // Promise.all ensures both complete together — prevents the UI from showing
  // stale balance while expiry data has already updated (race condition fix).
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || authLoading) return;
      let cancelled = false;
      Promise.all([refreshWallet(), walletApi.getExpiringCoins()])
        .then(([, expiryRes]) => {
          if (cancelled || !expiryRes.success || !expiryRes.data) return;
          const expiringCoins = expiryRes.data?.expiringCoins ?? {};
          const totalExpiring = typeof expiryRes.data?.totalExpiring === 'number' ? expiryRes.data.totalExpiring : 0;
          if (totalExpiring <= 0) {
            setExpiringAmount(0);
            setExpiringLabel('');
            setExpiringByType([]);
            return;
          }
          setExpiringAmount(totalExpiring);
          // Determine urgency label from the most imminent bucket
          const thisWeekAmt = expiringCoins?.this_week?.totalAmount ?? 0;
          const thisMonthAmt = expiringCoins?.this_month?.totalAmount ?? 0;
          if (thisWeekAmt > 0) {
            setExpiringLabel(`${thisWeekAmt} ${BRAND.CURRENCY_CODE} expiring this week`);
          } else if (thisMonthAmt > 0) {
            setExpiringLabel(`${thisMonthAmt} ${BRAND.CURRENCY_CODE} expiring this month`);
          } else {
            setExpiringLabel(`${totalExpiring} ${BRAND.CURRENCY_CODE} expiring soon`);
          }
          // Build per-type breakdown across all periods
          const typeMap = new Map<string, { amount: number; expiresAt: string; daysLeft: number }>();
          for (const period of ['this_week', 'this_month', 'next_month'] as const) {
            const bucket = expiringCoins?.[period];
            if (!bucket) continue;
            const coinsList = Array.isArray(bucket.coins) ? bucket.coins : [];
            for (const coin of coinsList) {
              if (!coin) continue;
              const coinType: string = (coin as any).type || (coin as any).source || 'rez';
              const coinAmount: number = typeof (coin as any).amount === 'number' ? (coin as any).amount : 0;
              const coinExpiresAt: string = (coin as any).expiresAt || '';
              const coinDaysLeft: number = typeof (coin as any).daysLeft === 'number' ? (coin as any).daysLeft : 0;
              const existing = typeMap.get(coinType);
              if (existing) {
                existing.amount += coinAmount;
                if (coinDaysLeft < existing.daysLeft) {
                  existing.daysLeft = coinDaysLeft;
                  existing.expiresAt = coinExpiresAt;
                }
              } else {
                typeMap.set(coinType, { amount: coinAmount, expiresAt: coinExpiresAt, daysLeft: coinDaysLeft });
              }
            }
          }
          const expiringList = Array.from(typeMap.entries()).map(([type, data]) => ({ type, ...data }));
          setExpiringByType(expiringList);
          // Calculate minimum days left for urgency styling
          if (expiringList.length > 0) {
            const minDays = Math.min(...expiringList.map((item) => item.daysLeft));
            setMinDaysLeft(minDays);
          }
        })
        .catch(() => {
          /* silent — expiry info is supplementary */
        });
      return () => {
        cancelled = true;
      };
    }, [refreshWallet, isAuthenticated, authLoading]),
  );

  const handleRefresh = useCallback(async () => {
    try {
      await refreshWallet();
    } catch (error) {
      platformAlert('Refresh Failed', error instanceof Error ? error.message : 'Unable to refresh wallet data');
    }
  }, [refreshWallet]);

  const handleBackPress = useCallback(() => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      goBack('/' as any);
    }
  }, [onNavigateBack, goBack]);

  const handleCoinPress = useCallback(
    (coin: CoinBalance) => {
      if (onCoinPress) {
        onCoinPress(coin);
      } else {
        router.push({
          pathname: '/wallet/coin-detail/[coinType]',
          params: { coinType: coin.type },
        } as any);
      }
    },
    [onCoinPress, router],
  );

  const handleCoinTypePress = useCallback(
    (type: CoinType) => {
      router.push({
        pathname: '/wallet/coin-detail/[coinType]',
        params: { coinType: type },
      } as any);
    },
    [router],
  );

  const handleRetry = useCallback(() => {
    refreshWallet();
  }, [refreshWallet]);

  // Topup state management
  const [topupLoading, setTopupLoading] = useState(false);

  const handleAmountSelect = useCallback((amount: number | 'other') => {
    // No-op: amount selection handled by RechargeWalletCard internally
  }, []);

  const handleTopupSubmit = useCallback(
    (amount: number) => {
      trackTopupInitiated(amount);
      router.push({
        pathname: '/payment',
        params: {
          amount: amount.toString(),
          currency: BRAND.CURRENCY_CODE,
          fiatCurrency: getCurrency(),
          timestamp: Date.now().toString(),
        },
      });
    },
    [trackTopupInitiated, router, getCurrency],
  );

  // Segment-specific shortcut for verified users — shown at top of More For You
  const segmentShortcut = useMemo(() => {
    const map: Record<string, { id: string; icon: string; title: string; subtitle: string; route: string }> = {
      verified_student: {
        id: 'student-deals',
        icon: 'school-outline',
        title: 'Student Deals',
        subtitle: 'Exclusive campus offers',
        route: '/offers/student',
      },
      verified_employee: {
        id: 'corporate-deals',
        icon: 'briefcase-outline',
        title: 'Work Perks',
        subtitle: 'Corporate benefits & deals',
        route: '/offers/corporate',
      },
      verified_healthcare: {
        id: 'health-deals',
        icon: 'medkit-outline',
        title: 'Healthcare Offers',
        subtitle: 'Pharmacy & wellness deals',
        route: '/offers/zones/healthcare',
      },
      verified_defence: {
        id: 'defence-deals',
        icon: 'shield-outline',
        title: 'Defence Perks',
        subtitle: 'Service member deals',
        route: '/offers/zones/defence',
      },
      verified_teacher: {
        id: 'teacher-deals',
        icon: 'book-outline',
        title: 'Teacher Benefits',
        subtitle: 'Education & stationery offers',
        route: '/offers/zones/teacher',
      },
    };
    const entry = map[segment];
    if (!entry) return null;
    return {
      id: entry.id,
      icon: entry.icon as any,
      title: entry.title,
      subtitle: entry.subtitle,
      onPress: () => router.push(entry.route as any),
      badge: 'VERIFIED',
    };
  }, [segment, router]);

  // "More for You" options — Ring Sizer + Saved Address moved here from main scroll
  const moreForYouOptions = useMemo(
    () => [
      ...(segmentShortcut ? [segmentShortcut] : []),
      {
        id: 'profile',
        icon: 'person-outline' as const,
        title: 'Complete Profile',
        subtitle: `${completionStatus?.completionPercentage || 0}% complete`,
        onPress: () => router.push('/profile/edit'),
      },
      {
        id: 'scratch-card',
        icon: 'ticket-outline' as const,
        title: 'Scratch Card',
        subtitle: 'Win coins & discounts',
        onPress: () => router.push('/scratch-card'),
        badge: 'NEW',
      },
      {
        id: 'refer',
        icon: 'people-outline' as const,
        title: 'Refer & Earn',
        subtitle: 'Invite friends, earn coins',
        onPress: () => router.push('/referral'),
      },
      {
        id: 'orders',
        icon: 'receipt-outline' as const,
        title: 'Order History',
        subtitle: 'View order details',
        onPress: () => router.push('/order-history'),
      },
      {
        id: 'wishlist',
        icon: 'heart-outline' as const,
        title: 'Wishlist',
        subtitle: 'All your Favorites',
        onPress: () => router.push('/wishlist'),
      },
      {
        id: 'address',
        icon: 'location-outline' as const,
        title: 'Saved Address',
        subtitle: 'Edit, add, delete your address',
        onPress: () => router.push('/account/addresses'),
      },
      {
        id: 'ring-sizer',
        icon: 'resize-outline' as const,
        title: 'Ring Sizer',
        subtitle: 'Check your ring size',
        onPress: () => router.push('/ring-sizer'),
      },
    ],
    [completionStatus, router, segmentShortcut],
  );

  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(screenData, insets), [screenData, insets]);

  // Determine expiry banner style based on urgency
  const expiryBannerStyle = useMemo(() => {
    // Red/urgent if ≤24 hours (1 day)
    if (minDaysLeft <= 1) {
      return {
        backgroundColor: Colors.errorScale?.[50] ?? '#FEF2F2',
        borderColor: Colors.errorScale?.[200] ?? '#FECACA',
        iconColor: Colors.errorScale?.[700] ?? '#B91C1C',
      };
    }
    // Amber if >7 days
    if (minDaysLeft > 7) {
      return {
        backgroundColor: colors.tint.amber,
        borderColor: colors.warningScale?.[200] ?? '#FDE68A',
        iconColor: colors.warningScale?.[700] ?? '#B45309',
      };
    }
    // Orange/warning if 1 < daysLeft ≤ 7
    return {
      backgroundColor: colors.warningScale?.[50] ?? '#FFF9E6',
      borderColor: colors.warningScale?.[300] ?? '#FCD34D',
      iconColor: colors.warningScale?.[600] ?? '#D97706',
    };
  }, [minDaysLeft]);

  // --- Loading State ---
  if (walletLoading && !walletData) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <LinearGradient colors={Gradients.nileBlue} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={22} color={colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>{walletHeaderTitle}</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <TransactionListSkeleton />
      </View>
    );
  }

  // --- Empty/Loading State (no data yet) ---
  if (!walletData && !walletLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <LinearGradient colors={Gradients.nileBlue} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={22} color={colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>{walletHeaderTitle}</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to load wallet</Text>
          <Text style={styles.errorDetails}>Please check your connection and try again.</Text>
          <Pressable
            style={styles.retryButton}
            onPress={handleRetry}
            accessibilityLabel="Try again"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!walletData) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background.secondary,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <ThemedText style={{ marginTop: Spacing.md, color: colors.text.secondary }}>Loading wallet...</ThemedText>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Wallet">
      <Animated.View style={styles.root} entering={FadeIn.duration(300)} pointerEvents="box-none">
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />

        {/* Fixed Header */}
        <LinearGradient colors={Gradients.nileBlue} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable
              style={styles.backButton}
              onPress={handleBackPress}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={22} color={colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>{walletHeaderTitle}</Text>
            <Pressable
              style={styles.settingsButton}
              onPress={() => router.push('/settings' as any)}
              accessibilityLabel="Wallet settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={20} color={colors.text.inverse} />
            </Pressable>
          </View>

          {/* Savings Hero - inside gradient header for white-on-dark text */}
          <SavingsHero
            totalSaved={walletData?.savingsInsights?.totalSaved ?? 0}
            thisMonth={walletData?.savingsInsights?.thisMonth ?? 0}
            currencySymbol={currencySymbol}
            isHidden={isBalanceHidden}
            segment={segment}
          />
        </LinearGradient>

        {/* Scrollable Content */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={walletRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.nileBlue}
              colors={[colors.nileBlue]}
              progressBackgroundColor={colors.background.primary}
            />
          }
        >
          {/* Frozen Wallet Banner */}
          {walletData.isFrozen && (
            <View style={styles.frozenBanner}>
              <Ionicons name="lock-closed" size={18} color={Colors.errorScale[700]} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.frozenTitle}>Wallet Locked</Text>
                <Text style={styles.frozenReason}>
                  {walletData.frozenReason || 'Your wallet is temporarily locked. Contact support for help.'}
                </Text>
              </View>
            </View>
          )}

          {/* Phase 1.3: Simplified wallet view — one-number balance for casual users */}
          <SimplifiedWalletView
            balance={walletData?.totalBalance ?? walletData?.availableBalance ?? 0}
            expiringCoins={
              expiringAmount > 0
                ? {
                    count: expiringAmount,
                    daysLeft: minDaysLeft,
                  }
                : null
            }
            onDetailPress={() => setCoinEducationVisible(true)}
          />

          {/* Coin expiry banner if coins expiring soon (within 7 days) */}
          {expiringAmount > 0 && minDaysLeft <= 7 && (
            <CoinExpiryBanner
              expiringCount={expiringAmount}
              daysLeft={minDaysLeft}
              onPress={() => router.push('/near-u/map')}
            />
          )}

          {/* Balance Display with hide/reveal + coin chips */}
          <BalanceDisplay walletData={walletData} onCoinPress={handleCoinTypePress} currencySymbol={currencySymbol} />

          {/* Coin Proportion Bar */}
          <CoinProportionBar
            rezBalance={rezBalance}
            promoBalance={promoBalance}
            brandedBalance={totalBrandedCoins}
            totalBalance={totalBalance}
            currencySymbol={currencySymbol}
          />

          {/* Coin Expiry Warning Banner */}
          {expiringAmount > 0 && (
            <Pressable
              style={[
                styles.expiryBanner,
                {
                  backgroundColor: expiryBannerStyle.backgroundColor,
                  borderColor: expiryBannerStyle.borderColor,
                },
              ]}
              onPress={() => router.push('/wallet/expiry-tracker' as any)}
              accessibilityLabel={`${expiringLabel} — tap to view expiry details`}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.expiryIconWrap,
                  {
                    backgroundColor:
                      minDaysLeft <= 1
                        ? (Colors.errorScale?.[100] ?? '#FEE2E2')
                        : minDaysLeft > 7
                          ? colors.tint.amberLight
                          : (colors.warningScale?.[100] ?? '#FEF3C7'),
                  },
                ]}
              >
                <Ionicons
                  name={minDaysLeft <= 1 ? 'alert-circle' : 'timer-outline'}
                  size={20}
                  color={expiryBannerStyle.iconColor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.expiryText,
                    {
                      color:
                        minDaysLeft <= 1
                          ? (Colors.errorScale?.[700] ?? '#B91C1C')
                          : minDaysLeft > 7
                            ? (colors.brand.amberDark ?? '#92400E')
                            : (colors.warningScale?.[700] ?? '#B45309'),
                    },
                  ]}
                >
                  {expiringLabel}
                </Text>
                {expiringByType.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    {expiringByType.slice(0, 3).map((item, idx) => {
                      const typeLabel =
                        item.type === 'promo'
                          ? 'Promo'
                          : item.type === 'branded'
                            ? 'Branded'
                            : item.type === 'prive'
                              ? 'Privé'
                              : 'Rez';
                      const daysText =
                        typeof item.daysLeft === 'number'
                          ? item.daysLeft <= 0
                            ? 'expires today'
                            : `${item.daysLeft}d left`
                          : '';
                      return (
                        <Text key={idx} style={styles.expiryTypeRow}>
                          {typeLabel}: {item.amount} {BRAND.CURRENCY_CODE}
                          {daysText ? ` (${daysText})` : ''}
                        </Text>
                      );
                    })}
                  </View>
                )}
                <Text style={styles.expirySubtext}>Use them before they expire</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={expiryBannerStyle.iconColor} />
            </Pressable>
          )}

          {/* Quick Actions Bar — Add Money is the primary action */}
          {!walletData.isFrozen && (
            <>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  paddingHorizontal: 16,
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                Quick Actions
              </Text>
              <StickyQuickActions />
            </>
          )}

          {/* Section: Your Savings Breakdown */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: Spacing.md,
              marginTop: Spacing.md,
              marginBottom: Spacing.xs,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Your Savings Breakdown</Text>
            <Pressable onPress={() => setCoinEducationVisible(true)} hitSlop={8}>
              <Ionicons name="help-circle-outline" size={20} color={colors.neutral[400]} />
            </Pressable>
          </View>
          {(walletData.coins ?? []).map((coin) => (
            <CoinDetailCard key={coin.id} coin={coin} onPress={handleCoinPress} />
          ))}

          {/* Branded Coins Summary */}
          {Array.isArray(walletData.brandedCoins) && walletData.brandedCoins.length > 0 && (
            <CoinDetailCard
              coin={{
                id: 'branded-summary',
                type: 'branded',
                name: 'Branded Coins',
                amount: walletData.brandedCoinsTotal ?? 0,
                currency: BRAND.CURRENCY_CODE,
                formattedAmount: `${BRAND.CURRENCY_CODE} ${walletData.brandedCoinsTotal ?? 0}`,
                description: `From ${walletData.brandedCoins.length} ${walletData.brandedCoins.length === 1 ? 'store' : 'stores'}`,
                iconPath: BRAND.COIN_IMAGE,
                backgroundColor: COIN_TYPES.branded.backgroundColor,
                color: COIN_TYPES.branded.color,
                isActive: true,
              }}
              onPress={() => router.push('/BrandedCoinsScreen')}
            />
          )}

          {/* Wallet Insights */}
          <InsightSection walletData={walletData} currencySymbol={currencySymbol} segment={segment} />

          {/* Recharge with Discount */}
          <RechargeWalletCard
            cashbackText="Save upto 10% on wallet recharge"
            amountOptions={[120, 500, 1000, 5000, 10000]}
            onAmountSelect={handleAmountSelect}
            onSubmit={handleTopupSubmit}
            isLoading={topupLoading}
            currency={BRAND.CURRENCY_CODE}
          />

          {/* View Transactions CTA */}
          <TransactionCTA
            onPress={() => {
              trackTransactionViewed();
              router.push('/earnings-history');
            }}
          />

          {/* Partner Earnings Breakdown */}
          <EarningsBreakdown compact={true} onViewDetails={() => router.push('/explore')} />

          {/* ── Persona-Specific Wallet Cards ─────────────────────────── */}

          {/* STUDENT: Student Savings Card */}
          {(segment === 'verified_student' || statedIdentity === 'student') && (
            <View
              style={{
                marginHorizontal: 14,
                marginVertical: 8,
                borderRadius: 18,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#F97316', '#FBBF24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>🎓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Student Savings</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Your campus coins & rewards</Text>
                  </View>
                </View>

                {/* Stats row */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>
                      {currencySymbol}
                      {walletData?.savingsInsights?.thisMonth ?? 0}
                    </Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                      Saved this month
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{rezBalance + promoBalance}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>Total coins</Text>
                  </View>
                </View>

                {/* Micro Pack CTA */}
                <Pressable
                  onPress={() => router.push('/value-packs?persona=student' as any)}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    paddingVertical: 11,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name="flash" size={15} color="#EA580C" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#EA580C' }}>
                    Buy a Micro Pack — unlock more deals
                  </Text>
                </Pressable>
              </LinearGradient>
            </View>
          )}

          {/* EMPLOYEE/CORPORATE: Monthly Savings Report Card */}
          {(segment === 'verified_employee' || statedIdentity === 'corporate') && (
            <View
              style={{
                marginHorizontal: 14,
                marginVertical: 8,
                borderRadius: 18,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#1a3a52', '#2A5577']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18 }}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: 'rgba(255,205,87,0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="briefcase" size={22} color={colors.lightMustard} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Monthly Savings Report</Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                      Your corporate spending breakdown
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: colors.lightMustard,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.nileBlue }}>VERIFIED</Text>
                  </View>
                </View>

                {/* Total saved */}
                <View
                  style={{
                    backgroundColor: 'rgba(255,205,87,0.15)',
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Total saved this month</Text>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 2 }}>
                      {currencySymbol}
                      {walletData?.savingsInsights?.thisMonth ?? 0}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>All time</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.lightMustard }}>
                      {currencySymbol}
                      {walletData?.savingsInsights?.totalSaved ?? 0}
                    </Text>
                  </View>
                </View>

                {/* Category breakdown */}
                <View style={{ gap: 8, marginBottom: 14 }}>
                  {[
                    {
                      label: 'Dining',
                      emoji: '🍱',
                      value: Math.round((walletData?.savingsInsights?.thisMonth ?? 0) * 0.45),
                    },
                    {
                      label: 'Grooming',
                      emoji: '💆',
                      value: Math.round((walletData?.savingsInsights?.thisMonth ?? 0) * 0.3),
                    },
                    {
                      label: 'Fitness',
                      emoji: '💪',
                      value: Math.round((walletData?.savingsInsights?.thisMonth ?? 0) * 0.25),
                    },
                  ].map((cat) => (
                    <View key={cat.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                      <Text style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>
                        {cat.label}
                      </Text>
                      <View
                        style={{
                          height: 6,
                          flex: 2,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: cat.value > 0 ? `${Math.max(cat.value, 5)}%` : '5%',
                            height: '100%',
                            backgroundColor: colors.lightMustard,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', width: 48, textAlign: 'right' }}>
                        {currencySymbol}
                        {cat.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Value Pack CTA */}
                <Pressable
                  onPress={() => router.push('/value-packs?persona=corporate' as any)}
                  style={{
                    backgroundColor: colors.lightMustard,
                    borderRadius: 12,
                    paddingVertical: 11,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons name="briefcase-outline" size={15} color={colors.nileBlue} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.nileBlue }}>
                    Get a Smart Value Pack — save 30%+
                  </Text>
                </Pressable>
              </LinearGradient>
            </View>
          )}

          {/* Verification CTA for unverified users who stated an identity */}
          {segment === 'normal' && statedIdentity && statedIdentity !== 'general' && (
            <Pressable
              onPress={() => router.push('/onboarding/identity-select' as any)}
              style={{
                marginHorizontal: Spacing.md,
                marginVertical: Spacing.md,
                padding: Spacing.md,
                backgroundColor: colors.tint.orange,
                borderRadius: 14,
                borderLeftWidth: 3,
                borderLeftColor: colors.brand.orange,
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.md,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.background.accent,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="lock-open-outline" size={20} color={colors.brand.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 2 }}>
                  Unlock exclusive deals
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                  Verify your identity to access student, corporate & healthcare offers
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.brand.orange} />
            </Pressable>
          )}

          {/* More For You — collapsible section with profile, scratch card, refer, orders, wishlist, address, ring sizer */}
          <MoreForYouSection options={moreForYouOptions} />

          {/* Refer and Earn Card */}
          <ReferAndEarnCard
            data={{
              title: referralData?.title || 'Refer and Earn',
              subtitle: referralData?.subtitle || 'Invite your friends and get free jewellery',
              inviteButtonText: referralData?.inviteButtonText || 'Invite',
              inviteLink: referralData?.inviteLink || '',
            }}
            onInvite={() => {
              const link = referralData?.inviteLink || '';
              if (link) {
                Share.share({ message: `Join me on ${BRAND.APP_NAME} and earn rewards! ${link}`, url: link }).catch(
                  () => {},
                );
              } else {
                router.push('/referral' as any);
              }
            }}
            isLoading={referralLoading}
          />

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* Coin Education Overlay */}
      <CoinEducationOverlay visible={coinEducationVisible} onDismiss={() => setCoinEducationVisible(false)} />
    </FeatureErrorBoundary>
  );
};

const createStyles = (
  screenData: { width: number; height: number },
  insets: { top: number; bottom: number; left: number; right: number },
) => {
  const isSmallScreen = screenData.width < 375;
  const isTablet = screenData.width > 768;
  const horizontalPadding = isSmallScreen ? 10 : isTablet ? 24 : 14;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background.primary },
    headerBg: {
      paddingTop: insets.top + Spacing.md,
      paddingBottom: Spacing.base,
      paddingHorizontal: horizontalPadding,
      borderBottomLeftRadius: BorderRadius.xl,
      borderBottomRightRadius: BorderRadius.xl,
      overflow: 'hidden',
      shadowColor: colors.nileBlue,
      shadowOpacity: 0.15,
      elevation: 8,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsButton: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.text.inverse,
      fontSize: isTablet ? Typography.h2.fontSize : isSmallScreen ? Typography.h4.fontSize : Typography.h3.fontSize,
      fontWeight: '800',
      textAlign: 'center',
    },
    headerRight: { width: 36 },
    scroll: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: Typography.body.fontSize, color: colors.text.secondary },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
    errorTitle: {
      fontSize: Typography.bodyLarge.fontSize,
      fontWeight: '700',
      color: colors.text.primary,
      marginTop: Spacing.md,
    },
    errorDetails: {
      fontSize: Typography.bodySmall.fontSize,
      color: colors.text.secondary,
      marginTop: Spacing.xs + 2,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: colors.nileBlue,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.sm + 2,
    },
    retryButtonText: { color: colors.text.inverse, fontSize: Typography.bodySmall.fontSize, fontWeight: '600' },
    frozenBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.errorScale[100],
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.errorScale[200],
    },
    frozenTitle: {
      fontSize: Typography.bodySmall.fontSize,
      fontWeight: '700',
      color: Colors.errorScale[700],
    },
    frozenReason: {
      fontSize: Typography.caption.fontSize,
      color: colors.errorScale[700],
      marginTop: 1,
    },
    expiryBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amber,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginTop: Spacing.sm,
      marginHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: colors.warningScale[200],
      gap: Spacing.sm,
    },
    expiryIconWrap: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.tint.amberLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    expiryText: {
      fontSize: Typography.bodySmall.fontSize,
      fontWeight: '700',
      color: colors.brand.amberDark,
    },
    expirySubtext: {
      fontSize: Typography.caption.fontSize,
      color: colors.brand.amberDeep,
      marginTop: 3,
    },
    expiryTypeRow: {
      fontSize: 11,
      color: colors.brand.amberDark,
      marginTop: 1,
    },
  });
};

export default withErrorBoundary(WalletScreen, 'Wallet');
