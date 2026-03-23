import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { tryApi } from '@/services/tryApi';
import type { TrialCard } from '@/services/tryApi';

const CARD_WIDTH = Dimensions.get('window').width - spacing.lg * 2;

interface LocationCoords {
  lat: number;
  lng: number;
}

export default function TryFeedScreen() {
  const router = useRouter();
  const [trials, setTrials] = useState<TrialCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Request location permission and get current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationPermission(false);
          setError('Location permission denied');
          setLoading(false);
          return;
        }

        setLocationPermission(true);
        const currentLocation = await Location.getCurrentPositionAsync({});
        const coords = {
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        };
        setLocation(coords);

        // Fetch trials
        await fetchTrials(coords);

        // Fetch coin balance
        try {
          const coinsData = await tryApi.getCoins();
          setCoinBalance(coinsData.totalBalance);
        } catch {
          // Continue even if coins fetch fails
        }
      } catch (err) {
        setError('Failed to get location');
        setLoading(false);
      }
    })();
  }, []);

  const fetchTrials = useCallback(async (coords?: LocationCoords) => {
    try {
      const targetCoords = coords || location;
      if (!targetCoords) return;

      const data = await tryApi.getFeed(targetCoords.lat, targetCoords.lng);
      setTrials(data);
      setError(null);
    } catch (err) {
      setError('Failed to load trials');
    } finally {
      setLoading(false);
    }
  }, [location]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrials();
    setRefreshing(false);
  };

  const handleTrialPress = (trialId: string) => {
    router.push(`/try/${trialId}`);
  };

  const handleCoinPress = () => {
    router.push('/try/coins');
  };

  const renderTrialCard = ({ item }: { item: TrialCard }) => (
    <Pressable
      style={styles.card}
      onPress={() => handleTrialPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} trial`}
    >
      {/* Trial Image */}
      <Image
        source={{ uri: item.image }}
        style={styles.cardImage}
        accessibilityIgnoresInvertColors
      />

      {/* Overlay badges */}
      <View style={styles.cardBadgesContainer}>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {item.categoryEmoji || '🏪'} {item.category}
            </Text>
          </View>
        )}
        <View style={styles.slotsRemainBadge}>
          <Text style={styles.slotsText}>{item.slotsRemaining} slots left</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Title and Merchant */}
        <View style={styles.cardHeader}>
          <View style={styles.titleSection}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.merchantName}>{item.merchant.name}</Text>
          </View>
          {item.rating && item.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          {/* Coin Price Badge */}
          <View style={styles.coinPriceBadge}>
            <Text style={styles.coinPriceText}>{item.coinPrice} 🪙</Text>
          </View>

          {/* Original Price (crossed out) */}
          <View style={styles.priceInfo}>
            <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
            <Text style={styles.commitmentFee}>+ ₹{item.commitmentFee} commitment</Text>
          </View>
        </View>

        {/* Distance and Duration */}
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.metaText}>{item.distance} {item.distanceUnit}</Text>
          </View>
          {item.validDuration && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText}>{item.validDuration}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color={colors.border.default} />
      <Text style={styles.emptyTitle}>No trials near you yet</Text>
      <Text style={styles.emptySubtitle}>Check back soon for exclusive offers in your area</Text>
      <Pressable
        style={styles.refreshCTAButton}
        onPress={handleRefresh}
      >
        <Ionicons name="refresh" size={18} color={'#fff'} />
        <Text style={styles.refreshCTAText}>Refresh Feed</Text>
      </Pressable>
    </View>
  );

  if (!locationPermission && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.errorTitle}>Location Required</Text>
          <Text style={styles.errorSubtitle}>We need your location to show nearby trials</Text>
          <Pressable
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>ReZ TRY</Text>
        <Pressable
          style={styles.coinButton}
          onPress={handleCoinPress}
          accessibilityLabel={`Trial coins balance: ${coinBalance}`}
        >
          <Text style={styles.coinButtonText}>🪙 {coinBalance}</Text>
        </Pressable>
      </View>

      {/* Feed */}
      <FlatList
        data={trials}
        renderItem={renderTrialCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={loading ? null : <EmptyState />}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        ListHeaderComponent={
          <>
            {/* Navigation Chips */}
            <View style={styles.navigationChips}>
              <Pressable
                style={styles.navChip}
                onPress={() => router.push('/try/leaderboard')}
              >
                <Text style={styles.navChipText}>🏆 Leaderboard</Text>
              </Pressable>
              <Pressable
                style={styles.navChip}
                onPress={() => router.push('/try/missions')}
              >
                <Text style={styles.navChipText}>📋 Missions</Text>
              </Pressable>
              <Pressable
                style={styles.navChip}
                onPress={() => router.push('/try/surprise')}
              >
                <Text style={styles.navChipText}>🎁 Surprise</Text>
              </Pressable>
              <Pressable
                style={styles.navChip}
                onPress={() => router.push('/try/bundles')}
              >
                <Text style={styles.navChipText}>🎫 Passes</Text>
              </Pressable>
            </View>

            {/* Campaign Banner */}
            {trials.length > 0 && (
              <View style={styles.campaignBanner}>
                <View style={styles.campaignContent}>
                  <Text style={styles.campaignEmoji}>🔥</Text>
                  <View style={styles.campaignTextSection}>
                    <Text style={styles.campaignTitle}>Active Campaign</Text>
                    <Text style={styles.campaignDesc}>Join the category push</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.campaignButton}
                  onPress={() => router.push('/try/campaigns')}
                >
                  <Text style={styles.campaignButtonText}>Join</Text>
                </Pressable>
              </View>
            )}
          </>
        }
      />

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
          <Text style={styles.loadingText}>Loading trials...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  coinButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.md,
  },
  coinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  navigationChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  navChip: {
    backgroundColor: colors.brand.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    flex: 1,
    alignItems: 'center',
  },
  navChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  campaignBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningScale[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warningScale[200],
  },
  campaignContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  campaignEmoji: {
    fontSize: 24,
  },
  campaignTextSection: {
    flex: 1,
    gap: spacing.xs,
  },
  campaignTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  campaignDesc: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  campaignButton: {
    backgroundColor: colors.warningScale[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  campaignButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background.secondary,
  },
  cardBadgesContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  slotsRemainBadge: {
    backgroundColor: colors.successScale[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  slotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningScale[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  pricingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinPriceBadge: {
    backgroundColor: colors.brand.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  coinPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  priceInfo: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 2,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  commitmentFee: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  metaInfo: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.purple,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  refreshCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  errorBanner: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.errorScale[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorScale[200],
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
});
