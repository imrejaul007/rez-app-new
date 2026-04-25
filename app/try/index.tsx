/**
 * ReZ TRY — Home Screen (Trial Store)
 *
 * Layout (top → bottom):
 *   Sticky Header (64px) — title + live coin pill + buy button
 *   Mission / Streak Card (110px) — primary retention block
 *   Category Chips (56px) — horizontal scroll, filters feed instantly
 *   Surprise Trial Card (120px) — gamification / curiosity loop
 *   Try Near You Grid — 2-column, primary supply zone
 *   Trending Trials Carousel — horizontal scroll, social proof
 *   Limited Slots Section — urgency / conversion engine
 *   Trial Bundles Section — ARPU driver
 *   New Merchants Section — supply growth
 *   Floating Explorer Score widget — bottom-right
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  useAnimatedStyle,
  interpolate,
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
import type { TrialCard } from '@/services/tryApi';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_W = (SCREEN_W - spacing.lg * 2 - GRID_GAP) / 2;
const TRENDING_CARD_W = 260;

// ─── Category Chips ───────────────────────────────────────────────────────────
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

// ─── 2-column grid card ───────────────────────────────────────────────────────
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

// ─── Limited slot row card ─────────────────────────────────────────────────────
function LimitedSlotCard({ item, onPress }: { item: TrialCard; onPress: () => void }) {
  return (
    <Pressable style={styles.limitedCard} onPress={onPress}>
      <Image source={{ uri: item.image }} style={styles.limitedImage} />
      <View style={styles.limitedBody}>
        <Text style={styles.limitedTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.limitedMerchant}>{item.merchant.name}</Text>
        <View style={styles.limitedBottomRow}>
          <View style={styles.urgencyPill}>
            <Ionicons name="flame" size={11} color="#fff" />
            <Text style={styles.urgencyText}>Only {item.slotsRemaining} slots</Text>
          </View>
          <View style={styles.coinPill}>
            <Text style={styles.coinPillText}>🪙 {item.coinPrice}</Text>
          </View>
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
  const [missionProgress, setMissionProgress] = useState({
    label: 'Try 2 cafés this week',
    current: 1,
    total: 2,
    reward: 50,
  });
  const [explorerScore, setExplorerScore] = useState({ score: 0, tier: 'Curious', streak: 0 });
  // Pre-select category if navigated from a category chip (e.g. from TryBeforeYouBuyCard)
  const [activeCat, setActiveCat] = useState(() => params.category || 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [location, setLocation] = useState<LocationCoords | null>(null);

  // Floating widget pulse
  const floatScale = useSharedValue(1);
  useEffect(() => {
    floatScale.value = withRepeat(withTiming(1.08, { duration: 1200 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const floatAnim = useAnimatedStyle(() => ({ transform: [{ scale: floatScale.value }] }));

  // ── Initialise location + data ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }
        setLocationPermission(true);
        const pos = await Location.getCurrentPositionAsync({});
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        await loadAll(coords);
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = useCallback(
    async (coords?: LocationCoords) => {
      const target = coords || location;
      if (!target) return;
      try {
        const [feed, coinsData, scoreData] = await Promise.allSettled([
          tryApi.getFeed(target.lat, target.lng),
          tryApi.getCoins(),
          tryApi.getScore(),
        ]);
        if (feed.status === 'fulfilled') {
          setAllTrials(feed.value);
          // Apply the active category filter (may have been set via URL param)
          setFilteredTrials(
            activeCat && activeCat !== 'all'
              ? feed.value.filter((t) => t.category.toLowerCase().includes(activeCat))
              : feed.value,
          );
        }
        if (coinsData.status === 'fulfilled') setCoinBalance(coinsData.value.totalBalance);
        if (scoreData.status === 'fulfilled') {
          setExplorerScore({
            score: scoreData.value.score,
            tier: (scoreData.value as any).currentTier ?? scoreData.value.tier,
            streak: (scoreData.value as any).dayStreak ?? scoreData.value.stats?.currentStreak,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [location, activeCat],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // ── Category filter ────────────────────────────────────────────────────────
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
  const limitedTrials = allTrials.filter((t) => t.slotsRemaining <= 4).slice(0, 5);
  const newMerchants = allTrials.filter((t) => !t.rating || t.rating === 0).slice(0, 6);

  const go = (trialId: string) => router.push(`/try/${trialId}`);

  // ── Location permission wall ────────────────────────────────────────────────
  if (!locationPermission && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permWall}>
          <Text style={styles.permEmoji}>📍</Text>
          <Text style={styles.permTitle}>Location Required</Text>
          <Text style={styles.permSub}>We need your location to show trials near you</Text>
          <TouchableOpacity style={styles.permBtn} onPress={() => router.back()}>
            <Text style={styles.permBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>🔥 ReZ TRY</Text>
        </View>
        <Pressable style={styles.coinHeaderPill} onPress={() => router.push('/try/coins')}>
          <Text style={styles.coinHeaderText}>🪙 {coinBalance}</Text>
          <View style={styles.buyBtn}>
            <Ionicons name="add" size={14} color="#fff" />
          </View>
        </Pressable>
      </View>

      {/* ── Main scroll ───────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.purple} />
        }
      >
        {/* ── Mission / Streak Card ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(350)}>
          <Pressable style={styles.missionCard} onPress={() => router.push('/try/missions')}>
            <LinearGradient
              colors={[colors.brand.purple, '#5b21b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.missionGradient}
            >
              <View style={styles.missionTop}>
                <View>
                  <Text style={styles.missionLabel}>📋 Weekly Mission</Text>
                  <Text style={styles.missionGoal}>{missionProgress.label}</Text>
                </View>
                <View style={styles.missionReward}>
                  <Text style={styles.missionRewardText}>+{missionProgress.reward}</Text>
                  <Text style={styles.missionRewardSub}>coins</Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, (missionProgress.current / missionProgress.total) * 100)}%` as any,
                    },
                  ]}
                />
              </View>
              <Text style={styles.missionMeta}>
                {missionProgress.current}/{missionProgress.total} completed · Streak 🔥 {explorerScore.streak} days
              </Text>
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

        {/* ── Surprise Trial Card ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(140).duration(350)}>
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
                <Text style={styles.surpriseSub}>Category hint: Beauty ✨</Text>
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

        {/* ── Try Near You — 2-column grid ───────────────────────────────── */}
        <View>
          <SectionHeader emoji="📍" title="Try Near You" onSeeAll={() => router.push('/near-u')} />
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

        {/* ── Limited Slots — urgency engine ─────────────────────────────── */}
        {(limitedTrials.length > 0 || loading) && (
          <View>
            <SectionHeader emoji="⏳" title="Ending Soon" accent />
            {loading
              ? [1, 2].map((k) => (
                  <View
                    key={k}
                    style={[
                      styles.limitedCard,
                      { backgroundColor: colors.background.secondary, height: 80, marginBottom: 10 },
                    ]}
                  />
                ))
              : limitedTrials.map((item, i) => (
                  <Animated.View key={item.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                    <LimitedSlotCard item={item} onPress={() => go(item.id)} />
                  </Animated.View>
                ))}
          </View>
        )}

        {/* ── Trial Bundles / Passes ─────────────────────────────────────── */}
        <View>
          <SectionHeader emoji="🎫" title="Trial Bundles" onSeeAll={() => router.push('/try/bundles')} />
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
        </View>

        {/* ── New Merchants ──────────────────────────────────────────────── */}
        {(newMerchants.length > 0 || loading) && (
          <View>
            <SectionHeader emoji="🆕" title="New on ReZ" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselRow}>
              {loading
                ? [1, 2, 3].map((k) => <SkeletonCard key={k} />)
                : newMerchants.map((item, i) => (
                    <Animated.View key={item.id} entering={SlideInRight.delay(i * 50).duration(300)}>
                      <TrendingCard item={item} onPress={() => go(item.id)} />
                    </Animated.View>
                  ))}
            </ScrollView>
          </View>
        )}

        {/* ── Quick Nav chips row ────────────────────────────────────────── */}
        <View style={styles.quickNavRow}>
          {[
            { label: '🏆 Leaderboard', route: '/try/leaderboard' },
            { label: '📋 Missions', route: '/try/missions' },
            { label: '🏅 Badges', route: '/try/badges' },
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

  // Mission card
  missionCard: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  missionGradient: { padding: spacing.base, gap: spacing.sm },
  missionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  missionLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  missionGoal: { fontSize: 15, fontWeight: '700', color: '#fff', maxWidth: '80%' },
  missionReward: { alignItems: 'center' },
  missionRewardText: { fontSize: 20, fontWeight: '800', color: '#FFD700' },
  missionRewardSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: '#FFD700', borderRadius: 3 },
  missionMeta: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

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

  // Limited slots
  limitedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[50],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.errorScale[100],
  },
  limitedImage: { width: 80, height: 80 },
  limitedBody: { flex: 1, padding: spacing.md, gap: 4 },
  limitedTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  limitedMerchant: { fontSize: 12, color: colors.text.secondary },
  limitedBottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyText: { fontSize: 10, fontWeight: '700', color: '#fff' },

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
