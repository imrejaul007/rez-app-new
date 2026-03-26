/**
 * NearbyOffersCarousel
 *
 * Phase 1.6 — "Check REZ Before Paying" Flow
 * Horizontal scroll carousel of nearby offers.
 * Each card: merchant thumbnail, name, distance, savings amount, offer description.
 * "See all nearby" link at end.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface NearbyOffer {
  id: string;
  merchantName: string;
  thumbnail?: string;
  distance: string;      // e.g. "120m", "0.8 km"
  savings: number;       // in Rs.
  description: string;   // e.g. "10% cashback up to Rs.50"
}

export interface NearbyOffersCarouselProps {
  offers: NearbyOffer[];
  onOfferPress: (offer: NearbyOffer) => void;
  onSeeAllPress: () => void;
  title?: string;
}

// ============================================================================
// OFFER CARD
// ============================================================================

interface OfferCardProps {
  offer: NearbyOffer;
  onPress: () => void;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, onPress }) => {
  const initials = offer.merchantName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Save Rs.${offer.savings} at ${offer.merchantName}, ${offer.distance} away`}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailWrapper}>
        {offer.thumbnail ? (
          <Image
            source={{ uri: offer.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailFallback}>
            <ThemedText style={styles.initials}>{initials}</ThemedText>
          </View>
        )}

        {/* Distance badge */}
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate" size={9} color={colors.text.inverse} />
          <ThemedText style={styles.distanceText}>{offer.distance}</ThemedText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <ThemedText style={styles.merchantName} numberOfLines={1}>
          {offer.merchantName}
        </ThemedText>
        <ThemedText style={styles.offerDesc} numberOfLines={2}>
          {offer.description}
        </ThemedText>

        {/* Savings chip */}
        <View style={styles.savingsChip}>
          <ThemedText style={styles.savingsText}>
            Save Rs.{offer.savings.toLocaleString('en-IN')}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
};

// ============================================================================
// SEE ALL CARD
// ============================================================================

const SeeAllCard: React.FC<{ onPress: () => void; count: number }> = ({ onPress, count }) => (
  <Pressable
    style={({ pressed }) => [styles.seeAllCard, pressed && styles.cardPressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`See all ${count} nearby offers`}
  >
    <View style={styles.seeAllCircle}>
      <Ionicons name="arrow-forward" size={22} color={colors.lightMustard} />
    </View>
    <ThemedText style={styles.seeAllText}>See all{'\n'}nearby</ThemedText>
  </Pressable>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NearbyOffersCarousel: React.FC<NearbyOffersCarouselProps> = ({
  offers,
  onOfferPress,
  onSeeAllPress,
  title = 'Save near you',
}) => {
  if (!offers.length) return null;

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="location" size={16} color={colors.lightMustard} />
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <Pressable onPress={onSeeAllPress} hitSlop={8}>
          <ThemedText style={styles.seeAllLink}>See all</ThemedText>
        </Pressable>
      </View>

      {/* Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={160 + 12}
        snapToAlignment="start"
      >
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            onPress={() => onOfferPress(offer)}
          />
        ))}
        <SeeAllCard onPress={onSeeAllPress} count={offers.length} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 160,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  thumbnailWrapper: {
    width: '100%',
    height: 96,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 10,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  cardContent: {
    padding: 10,
    gap: 6,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  offerDesc: {
    fontSize: 11,
    color: colors.gray[500],
    lineHeight: 15,
  },
  savingsChip: {
    backgroundColor: colors.tint.greenLight,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  // See All card
  seeAllCard: {
    width: 100,
    backgroundColor: colors.background.dark,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  seeAllCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,205,87,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.lightPeach,
    textAlign: 'center',
    lineHeight: 17,
  },
});

export default React.memo(NearbyOffersCarousel);
