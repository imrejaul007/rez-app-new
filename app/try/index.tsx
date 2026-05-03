/**
 * ReZ TRY — Home Screen (Trial Store) — Simplified UX
 *
 * Layout (top → bottom):
 *   Sticky Header (64px) — title + live coin pill + buy button
 *   Surprise Card (120px) — gamification / curiosity loop (always visible)
 *   Category Chips (56px) — horizontal scroll, filters feed instantly
 *   Try Near You Grid — 2-column, primary supply zone
 *   Trending Trials Carousel — horizontal scroll, social proof
 *   Campaign Card — conditional (shown only if active campaign exists)
 *   Bundles Upsell — conditional (shown only if coins < 200 AND no active bundle)
 *   Leaderboard Teaser — conditional (shown only if user in top 20%)
 *   Floating Explorer Score widget — bottom-right
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
  useAnimatedStyle,
  FadeIn,
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { tryApi } from '@/services/tryApi';
import type { TrialCard, Campaign } from '@/services/tryApi';
import {
  MOCK_TRIALS,
  MOCK_COINS,
  MOCK_SCORE,
  MOCK_CAMPAIGNS,
  MOCK_MY_BUNDLES,
  MOCK_SURPRISE,
} from '@/utils/mocks/tryMockData';

// New Simplified UX Components
import {
  ProfileDrawer,
  CoinBalancePill,
} from './components';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_W = (SCREEN_W - spacing.lg * 2 - GRID_GAP) / 2;
const TRENDING_CARD_W = 260;

// ─── Category Chips ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'beauty', label: 'Beauty', emoji: '💅' },
  { key: 'food', label: 'Food', emoji: '☕' },
  { key: 'fitness', label: 'Fitness', emoji: '💪' },
  { key: 'home', label: 'Home', emoji: '🏠' },
  { key: 'healthcare', label: 'Health', emoji: '🏥' },
  { key: 'products', label: 'Products', emoji: '📦' },
];

interface LocationCoords {
  lat: number;
  lng: number;
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard({ half = false }: { half?: boolean }) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[half ? styles.gridCardWrap : styles.trendingCardWrap, anim]}>
      <View
        style={[
          half ? { height: 210 } : { height: 180, width: TRENDING_CARD_W },
          { backgroundColor: colors.background.secondary, borderRadius: borderRadius.lg },
        ]}
      />
    </Animated.View>
  );
}

// ─── 2-column grid card ──────────────────────────────────────────────────────
function GridTrialCard({ item, onPress }: { item: TrialCard; onPress: () => void }) {
  const isLimited = item.slotsRemaining <= 3;
  const isNew = !item.rating || item.rating === 0;
  const isTrending = item.ratingCount && item.ratingCount > 50;

  return (
    <Pressable style={styles.gridCard} onPress={onPress}>
      <Image source={{ uri: item.image }} style={styles.gridImage} />

      {/* Status badge — top-left */}
      {(isNew || isTrending || isLimited) && (
        <View
          style={[
            styles.statusBadge,
            isLimited ? styles.badgeLimited : isTrending ? styles.badgeTrending : styles.badgeNew,
          ]}
        >
          <Text style={styles.statusBadgeText}>{isLimited ? '🔥 LIMITED' : isTrending ? '⭐ TRENDING' : '🆕 NEW'}</Text>
        </View>
      )}

      {/* Slots badge — top-right */}
      <View style={[styles.slotsBadge, isLimited ? styles.slotsBadgeRed : null]}>
        <Text style={styles.slotsBadgeText}>{item.slotsRemaining} left</Text>
      </View>

      <View style={styles.gridCardBody}>
        <Text style={styles.gridCardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gridMerchant} numberOfLines={1}>
          {item.merchant.name}
        </Text>

        <View style={styles.gridDistRow}>
          <Ionicons name="location-outline" size={11} color={colors.text.tertiary} />
          <Text style={styles.gridDistText}>
            {item.distance} {item.distanceUnit}
          </Text>
          {item.rating && item.rating > 0 && (
            <>
              <Text style={styles.gridDot}>·</Text>
              <Ionicons name="star" size={11} color="#FFD700" />
              <Text style={styles.gridDistText}>{item.rating.toFixed(1)}</Text>
            </>
          )}
        </View>

        {/* Strike price */}
        <Text style={styles.strikePrice}>₹{item.originalPrice}</Text>

        {/* Coin + commitment row */}
        <View style={styles.gridPriceRow}>
          <View style={styles.coinPill}>
            <Text style={styles.coinPillText}>🪙 {item.coinPrice}</Text>
          </View>
          <Text style={styles.commitText}>+ ₹{item.commitmentFee}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Trending carousel card ────────────────────────────────────────────────────
function TrendingCard({ item, onPress }: { item: TrialCard; onPress: () => void }) {
  return (
    <Pressable style={styles.trendingCard} onPress={onPress}>
      <Image source={{ uri: item.image }} style={styles.trendingImage} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.trendingGradient} />
      <View style={styles.trendingContent}>
        <View style={styles.trendingSocialRow}>
          <Text style={styles.trendingSocialText}>🔥 {item.ratingCount || 0}+ booked</Text>
          {item.rating && item.rating > 0 && (
            <View style={styles.trendingRating}>
              <Ionicons name="star" size={11} color="#FFD700" />
              <Text style={styles.trendingRatingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.trendingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.trendingMerchant}>
          {item.merchant.name} · {item.distance} {item.distanceUnit}
        </Text>
        <View style={styles.trendingPriceRow}>
          <View style={styles.coinPillDark}>
            <Text style={styles.coinPillDarkText}>🪙 {item.coinPrice}</Text>
          </View>
          <Text style={styles.trendingOriginal}>₹{item.originalPrice}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  emoji,
  onSeeAll,
  accent,
}: {
  title: string;
  emoji: string;
  onSeeAll?: () => void;
  accent?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, accent ? styles.sectionTitleAccent : null]}>
        {emoji} {title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all →</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function TryHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();

  // Data state
  const [allTrials, setAllTrials] = useState<TrialCard[]>([]);
  const [filteredTrials, setFilteredTrials] = useState<TrialCard[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [explorerScore, setExplorerScore] = useState({ score: 0, tier: 'Curious', streak: 0, percentile: 100 });
  const [activeCat, setActiveCat] = useState(() => params.category || 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [location, setLocation] = useState<LocationCoords | null>(null);

  // ─── Conditional visibility states ──────────────────────────────────────────
  const [showBundlesUpsell, setShowBundlesUpsell] = useState(false);
  const [showLeaderboardTeaser, setShowLeaderboardTeaser] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [surpriseHint, setSurpriseHint] = useState('Beauty ✨');

  // ─── Profile Drawer state ──────────────────────────────────────────────────
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Floating widget pulse
  const floatScale = useSharedValue(1);
  useEffect(() => {
    floatScale.value = withRepeat(withTiming(1.08, { duration: 1200 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const floatAnim = useAnimatedStyle(() => ({ transform: [{ scale: floatScale.value }] }));

  // ── Determine conditional visibility based on user data ─────────────────────
  const evaluateConditionalStates = useCallback(
    (coins: number, percentile: number, hasActiveBundle: boolean, campaigns: Campaign[]) => {
      // Bundles upsell: show only if coins < 200 AND no active bundle
      setShowBundlesUpsell(coins < 200 && !hasActiveBundle);

      // Leaderboard teaser: show only if user in top 20% (percentile <= 20)
      setShowLeaderboardTeaser(percentile <= 20);

      // Campaign: show first active campaign if any
      const firstActiveCampaign = campaigns.find((c) => !c.isCompleted && new Date(c.endsAt) > new Date());
      setActiveCampaign(firstActiveCampaign || null);
    },
    [],
  );

  // ── Initialise location + data ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Use mock data when location is denied
          await loadWithMockData();
          setLoading(false);
          return;
        }
        setLocationPermission(true);
        const pos = await Location.getCurrentPositionAsync({});
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        await loadAll(coords);
      } catch {
        await loadWithMockData();
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWithMockData = async () => {
    // Apply mock data for all states
    setAllTrials(MOCK_TRIALS);
    setFilteredTrials(activeCat && activeCat !== 'all'
      ? MOCK_TRIALS.filter((t) => t.category.toLowerCase().includes(activeCat))
      : MOCK_TRIALS
    );
    setCoinBalance(MOCK_COINS.totalBalance);
    setExplorerScore({
      score: MOCK_SCORE.score,
      tier: MOCK_SCORE.tier,
      streak: MOCK_SCORE.stats.currentStreak,
      percentile: MOCK_SCORE.leaderboardPercentile || 100,
    });
    evaluateConditionalStates(
      MOCK_COINS.totalBalance,
      MOCK_SCORE.leaderboardPercentile || 100,
      MOCK_MY_BUNDLES.length > 0,
      MOCK_CAMPAIGNS,
    );
    // Set surprise hint from mock
    setSurpriseHint(`${MOCK_SURPRISE.category} ${MOCK_SURPRISE.categoryEmoji || '✨'}`);
  };

  const loadAll = useCallback(
    async (coords?: LocationCoords) => {
      const target = coords || location;
      if (!target) return;
      try {
        const [feed, coinsData, scoreData, myBundlesData, campaignsData] = await Promise.allSettled([
          tryApi.getFeed(target.lat, target.lng),
          tryApi.getCoins(),
          tryApi.getScore(),
          tryApi.getMyBundles(),
          tryApi.getCampaigns(target.lat.toString()), // city param
        ]);

        if (feed.status === 'fulfilled') {
          setAllTrials(feed.value);
          setFilteredTrials(
            activeCat && activeCat !== 'all'
              ? feed.value.filter((t) => t.category.toLowerCase().includes(activeCat))
              : feed.value,
          );
        }

        if (coinsData.status === 'fulfilled') {
          setCoinBalance(coinsData.value.totalBalance);
        }

        if (scoreData.status === 'fulfilled') {
          const percentile = scoreData.value.leaderboardPercentile ?? 100;
          setExplorerScore({
            score: scoreData.value.score,
            tier: scoreData.value.tier,
            streak: scoreData.value.stats?.currentStreak ?? 0,
            percentile,
          });
        }

        if (scoreData.status === 'fulfilled' && coinsData.status === 'fulfilled') {
          const hasActiveBundle = myBundlesData.status === 'fulfilled' && (myBundlesData.value?.length ?? 0) > 0;
          const campaigns = campaignsData.status === 'fulfilled' ? campaignsData.value ?? [] : [];
          const percentile = scoreData.value?.leaderboardPercentile ?? 100;

          evaluateConditionalStates(coinsData.value.totalBalance, percentile, hasActiveBundle, campaigns);
        }
      } finally {
        setLoading(false);
      }
    },
    [location, activeCat, evaluateConditionalStates],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // ── Category filter ─────────────────────────────────────────────────────────
  const handleCatSelect = (key: string) => {
    setActiveCat(key);
    if (key === 'all') {
      setFilteredTrials(allTrials);
      return;
    }
    setFilteredTrials(allTrials.filter((t) => t.category.toLowerCase().includes(key)));
  };

  // ── Derived sections ───────────────────────────────────────────────────────
  const nearYouTrials = filteredTrials.slice(0, 20);
  const trendingTrials = [...allTrials]
    .filter((t) => t.ratingCount && t.ratingCount > 0)
    .sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0))
    .slice(0, 8);

  const go = (trialId: string) => router.push(`/try/${trialId}`);

  // ── Location permission wall ────────────────────────────────────────────────
  if (!locationPermission && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permWall}>
          <Text style={styles.permEmoji}>📍</Text>
          <Text style={styles.permTitle}>Location Required</Text>
          <Text style={styles.permSub}>We need your location to show trials near you</Text>
          <Pressable style={styles.permBtn} onPress={() => router.back()}>
            <Text style={styles.permBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => setDrawerVisible(true)} hitSlop={8}>
          <Ionicons name="menu" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>ReZ Try</Text>
        <CoinBalancePill balance={coinBalance} onPress={() => setDrawerVisible(true)} />
      </View>

      {/* ── Main scroll ───────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.purple} />
        }
      >
        {/* ── Surprise Trial Card (always visible) ─────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)}>
          <Pressable style={styles.surpriseCard} onPress={() => router.push('/try/surprise')}>
            <LinearGradient
              colors={['#1e1b4b', '#312e81']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.surpriseGradient}
            >
              <View style={styles.surpriseLeft}>
                <View style={styles.surpriseBadge}>
                  <Text style={styles.surpriseBadgeText}>⭐ THIS WEEK</Text>
                </View>
                <Text style={styles.surpriseTitle}>Surprise Trial</Text>
                <Text style={styles.surpriseSub}>Category hint: {surpriseHint}</Text>
              </View>
              <View style={styles.surpriseRight}>
                <View style={styles.revealBtn}>
                  <Text style={styles.revealBtnText}>Reveal 🎁</Text>
                </View>
                <Text style={styles.surpriseCost}>60 🪙 + ₹19</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── Category Chips ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={[styles.chip, activeCat === cat.key ? styles.chipActive : null]}
                onPress={() => handleCatSelect(cat.key)}
              >
                <Text style={[styles.chipText, activeCat === cat.key ? styles.chipTextActive : null]}>
                  {cat.emoji} {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Try Near You — 2-column grid ───────────────────────────────── */}
        <View>
          <SectionHeader emoji="📍" title="Try Near You" onSeeAll={() => router.push('/try/near-you')} />
          {loading ? (
            <View style={styles.gridRow}>
              <SkeletonCard half />
              <SkeletonCard half />
              <SkeletonCard half />
              <SkeletonCard half />
            </View>
          ) : nearYouTrials.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No trials near you right now</Text>
              <Text style={styles.emptySectionSub}>Try expanding your radius or check back later</Text>
            </View>
          ) : (
            <View style={styles.gridRow}>
              {nearYouTrials.map((item, i) => (
                <Animated.View key={item.id} entering={FadeIn.delay(i * 40).duration(300)} style={styles.gridCardWrap}>
                  <GridTrialCard item={item} onPress={() => go(item.id)} />
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {/* ── Trending Trials — horizontal carousel ──────────────────────── */}
        {(trendingTrials.length > 0 || loading) && (
          <View>
            <SectionHeader emoji="🔥" title="Trending Trials" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
              {loading
                ? [1, 2, 3].map((k) => <SkeletonCard key={k} />)
                : trendingTrials.map((item, i) => (
                    <Animated.View key={item.id} entering={SlideInRight.delay(i * 50).duration(300)}>
                      <TrendingCard item={item} onPress={() => go(item.id)} />
                    </Animated.View>
                  ))}
            </ScrollView>
          </View>
        )}

        {/* ── Campaign Card (conditional) ────────────────────────────────── */}
        {activeCampaign && (
          <Animated.View entering={FadeInDown.delay(160).duration(350)}>
            <Pressable style={styles.campaignCard} onPress={() => router.push('/try/campaigns')}>
              <Image
                source={{ uri: activeCampaign.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800' }}
                style={styles.campaignImage}
              />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.campaignGradient} />
              <View style={styles.campaignContent}>
                <View style={styles.campaignBadge}>
                  <Text style={styles.campaignBadgeText}>ACTIVE CAMPAIGN</Text>
                </View>
                <Text style={styles.campaignTitle}>{activeCampaign.title}</Text>
                <Text style={styles.campaignGoal}>{activeCampaign.goal}</Text>
                <View style={styles.campaignReward}>
                  <Text style={styles.campaignRewardText}>🎁 {activeCampaign.reward}</Text>
                </View>
                {activeCampaign.progress && (
                  <View style={styles.campaignProgressRow}>
                    <View style={styles.campaignProgressBar}>
                      <View
                        style={[
                          styles.campaignProgressFill,
                          { width: `${(activeCampaign.progress.completed / activeCampaign.progress.target) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.campaignProgressText}>
                      {activeCampaign.progress.completed}/{activeCampaign.progress.target}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Trial Bundles Upsell (conditional) ─────────────────────────── */}
        {showBundlesUpsell && (
          <Animated.View entering={FadeInDown.delay(180).duration(350)}>
            <Pressable style={styles.bundleCard} onPress={() => router.push('/try/bundles')}>
              <LinearGradient
                colors={['#065f46', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bundleGradient}
              >
                <View style={styles.bundleLeft}>
                  <Text style={styles.bundleTag}>BEST VALUE</Text>
                  <Text style={styles.bundleTitle}>Wellness Week Pack</Text>
                  <View style={styles.bundleItems}>
                    <Text style={styles.bundleItem}>✓ 3 trials included</Text>
                    <Text style={styles.bundleItem}>✓ 100 bonus coins</Text>
                    <Text style={styles.bundleItem}>✓ Valid 7 days</Text>
                  </View>
                </View>
                <View style={styles.bundleRight}>
                  <Text style={styles.bundlePrice}>₹199</Text>
                  <Text style={styles.bundlePriceSub}>save 40%</Text>
                  <View style={styles.bundleCTA}>
                    <Text style={styles.bundleCTAText}>Buy Pack</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Leaderboard Teaser (conditional — top 20% only) ─────────────── */}
        {showLeaderboardTeaser && (
          <Animated.View entering={FadeInDown.delay(200).duration(350)}>
            <Pressable style={styles.leaderboardCard} onPress={() => router.push('/try/leaderboard')}>
              <LinearGradient
                colors={['#78350f', '#92400e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.leaderboardGradient}
              >
                <View style={styles.leaderboardLeft}>
                  <Text style={styles.leaderboardTag}>🏆 TOP 20%</Text>
                  <Text style={styles.leaderboardTitle}>You're ranked!</Text>
                  <Text style={styles.leaderboardSub}>
                    Your score: {explorerScore.score} pts
                  </Text>
                </View>
                <View style={styles.leaderboardRight}>
                  <Ionicons name="trophy" size={40} color="#FFD700" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Quick nav chips row ────────────────────────────────────────── */}
        <View style={styles.quickNavRow}>
          {[
            { label: '📋 Missions', route: '/try/missions' },
            { label: '📅 My Bookings', route: '/try/history' },
            { label: '🎯 Campaigns', route: '/try/campaigns' },
          ].map((item) => (
            <Pressable
              key={item.route}
              style={styles.quickNavChip}
              onPress={() => router.push(item.route as any as string)}
            >
              <Text style={styles.quickNavText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Floating Explorer Score Widget ────────────────────────────────── */}
      <Animated.View style={[styles.floatWidget, floatAnim]}>
        <Pressable style={styles.floatInner} onPress={() => router.push('/try/score')}>
          <Text style={styles.floatTier}>{explorerScore.tier[0]}</Text>
          <View>
            <Text style={styles.floatLabel}>{explorerScore.tier}</Text>
            {explorerScore.streak > 0 && <Text style={styles.floatStreak}>🔥 {explorerScore.streak}d</Text>}
          </View>
        </Pressable>
      </Animated.View>

      {/* ── Profile Drawer ─────────────────────────────────────────────────── */}
      <ProfileDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        coins={coinBalance}
        score={explorerScore.score}
        tier={explorerScore.tier}
        activeMission={null}
        badges={[]}
        leaderboardPercentile={explorerScore.percentile}
        city={location ? 'Your Area' : undefined}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },

  // Header
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
    zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.3 },
  coinHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.purple,
    paddingLeft: spacing.md,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinHeaderText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  buyBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.xl },

  // Category chips
  chipsRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
  },
  chipActive: { backgroundColor: colors.brand.purple, borderColor: colors.brand.purple },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: '#fff' },

  // Surprise card
  surpriseCard: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  surpriseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  surpriseLeft: { flex: 1, gap: spacing.xs },
  surpriseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  surpriseBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFD700', letterSpacing: 0.5 },
  surpriseTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  surpriseSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  surpriseRight: { alignItems: 'center', gap: spacing.sm },
  revealBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  revealBtnText: { fontSize: 13, fontWeight: '800', color: '#1e1b4b' },
  surpriseCost: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  sectionTitleAccent: { color: colors.error },
  seeAll: { fontSize: 13, fontWeight: '600', color: colors.brand.purple },

  // Grid
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridCardWrap: { width: CARD_W },
  gridCard: {
    width: CARD_W,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  gridImage: { width: CARD_W, height: 130, backgroundColor: colors.background.secondary },
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeNew: { backgroundColor: '#065f46' },
  badgeTrending: { backgroundColor: '#92400e' },
  badgeLimited: { backgroundColor: colors.error },
  statusBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  slotsBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.successScale[500],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slotsBadgeRed: { backgroundColor: colors.error },
  slotsBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  gridCardBody: { padding: spacing.sm, gap: 4 },
  gridCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text.primary, lineHeight: 18 },
  gridMerchant: { fontSize: 11, color: colors.text.secondary, fontWeight: '500' },
  gridDistRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  gridDistText: { fontSize: 10, color: colors.text.tertiary },
  gridDot: { fontSize: 10, color: colors.text.tertiary },
  strikePrice: { fontSize: 11, color: colors.text.tertiary, textDecorationLine: 'line-through' },
  gridPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  coinPill: {
    backgroundColor: colors.brand.purple,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coinPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  commitText: { fontSize: 11, color: colors.text.secondary, fontWeight: '500' },

  // Trending card
  trendingCardWrap: { marginRight: spacing.md },
  trendingCard: {
    width: TRENDING_CARD_W,
    height: 200,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  trendingImage: { width: '100%', height: '100%', backgroundColor: colors.background.secondary },
  trendingGradient: { ...StyleSheet.absoluteFillObject },
  trendingContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: 4,
  },
  trendingSocialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendingSocialText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  trendingRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendingRatingText: { fontSize: 11, color: '#FFD700', fontWeight: '600' },
  trendingTitle: { fontSize: 14, fontWeight: '700', color: '#fff', lineHeight: 19 },
  trendingMerchant: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  trendingPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  coinPillDark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coinPillDarkText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  trendingOriginal: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through' },
  carouselRow: { paddingRight: spacing.lg },

  // Campaign card
  campaignCard: {
    height: 160,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  campaignImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  campaignGradient: { ...StyleSheet.absoluteFillObject },
  campaignContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    gap: spacing.xs,
  },
  campaignBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.purple,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  campaignBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  campaignTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  campaignGoal: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  campaignReward: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  campaignRewardText: { fontSize: 12, fontWeight: '700', color: '#FFD700' },
  campaignProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  campaignProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  campaignProgressFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
  campaignProgressText: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // Bundle card
  bundleCard: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  bundleGradient: { flexDirection: 'row', padding: spacing.base },
  bundleLeft: { flex: 1, gap: spacing.sm },
  bundleTag: { fontSize: 10, fontWeight: '800', color: '#6ee7b7', letterSpacing: 1 },
  bundleTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  bundleItems: { gap: 3 },
  bundleItem: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  bundleRight: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingLeft: spacing.base },
  bundlePrice: { fontSize: 24, fontWeight: '800', color: '#fff' },
  bundlePriceSub: { fontSize: 11, color: '#6ee7b7', fontWeight: '600' },
  bundleCTA: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  bundleCTAText: { fontSize: 13, fontWeight: '800', color: '#065f46' },

  // Leaderboard teaser card
  leaderboardCard: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  leaderboardGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base },
  leaderboardLeft: { flex: 1, gap: spacing.xs },
  leaderboardTag: { fontSize: 10, fontWeight: '800', color: '#FFD700', letterSpacing: 1 },
  leaderboardTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  leaderboardSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  leaderboardRight: { paddingLeft: spacing.base },

  // Quick nav
  quickNavRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickNavChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  quickNavText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },

  // Float widget
  floatWidget: {
    position: 'absolute',
    bottom: 90,
    right: spacing.lg,
  },
  floatInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  floatTier: { fontSize: 18, fontWeight: '800', color: '#FFD700' },
  floatLabel: { fontSize: 11, fontWeight: '700', color: '#fff' },
  floatStreak: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },

  // Permission wall
  permWall: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  permEmoji: { fontSize: 48 },
  permTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  permSub: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  permBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand.purple,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Empty section
  emptySection: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptySectionText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  emptySectionSub: { fontSize: 12, color: colors.text.tertiary, textAlign: 'center' },
});
