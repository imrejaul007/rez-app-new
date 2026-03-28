/**
 * TryBeforeYouBuyCard — Nile Blue card promoting the risk-free trial feature.
 *
 * Shows:
 *   • Eyebrow + title with "2 new today" badge
 *   • Subtitle
 *   • "Explore →" CTA pill
 *   • 4 trial category icons: Cafés, Grooming, Fitness, Beauty
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

const MUSTARD = colors.lightMustard;  // #ffcd57
const NAVY    = colors.nileBlue;       // #1a3a52

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrialCounts {
  cafes?:    number;
  grooming?: number;
  fitness?:  number;
  beauty?:   number;
}

interface TryBeforeYouBuyCardProps {
  trialCounts?:      TrialCounts;
  onExplore?:        () => void;
  onCategoryPress?:  (category: keyof TrialCounts) => void;
}

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: {
  key:   keyof TrialCounts;
  label: string;
  emoji: string;
}[] = [
  { key: 'cafes',    label: 'Cafés',    emoji: '☕' },
  { key: 'grooming', label: 'Grooming', emoji: '✂️' },
  { key: 'fitness',  label: 'Fitness',  emoji: '🏋️' },
  { key: 'beauty',   label: 'Beauty',   emoji: '💅' },
];

// ─── Category tile ────────────────────────────────────────────────────────────
interface CategoryTileProps {
  emoji:    string;
  label:    string;
  count:    number;
  onPress?: () => void;
}

const CategoryTile: React.FC<CategoryTileProps> = ({ emoji, label, count, onPress }) => (
  <Pressable
    style={({ pressed }) => [tile.wrapper, pressed && { opacity: 0.78 }]}
    onPress={onPress}
    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
  >
    <View style={tile.iconBox}>
      <Text style={tile.emoji}>{emoji}</Text>
    </View>
    <Text style={tile.label}>{label}</Text>
    <Text style={tile.sub}>{count} trial{count !== 1 ? 's' : ''}</Text>
  </Pressable>
);

const tile = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  sub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
const TryBeforeYouBuyCard: React.FC<TryBeforeYouBuyCardProps> = ({
  trialCounts    = { cafes: 8, grooming: 5, fitness: 4, beauty: 6 },
  onExplore,
  onCategoryPress,
}) => {
  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {/* Eyebrow */}
          <Text style={styles.eyebrow}>TRY BEFORE YOU BUY</Text>

          {/* Title + badge */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>Risk-free trials</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>2 new today</Text>
            </View>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Experience first. Pay only if you love it.
          </Text>
        </View>

        {/* Explore CTA */}
        <Pressable
          style={({ pressed }) => [styles.explorePill, pressed && { opacity: 0.82 }]}
          onPress={onExplore}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.exploreText}>Explore →</Text>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Category row */}
      <View style={styles.categoriesRow}>
        {CATEGORIES.map(cat => (
          <CategoryTile
            key={cat.key}
            emoji={cat.emoji}
            label={cat.label}
            count={trialCounts[cat.key] ?? 0}
            onPress={() => onCategoryPress?.(cat.key)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: NAVY,
    borderRadius: 0,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: `rgba(255,205,87,0.7)`,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: 'rgba(255,205,87,0.18)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,205,87,0.35)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: MUSTARD,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 16,
  },
  // Explore CTA
  explorePill: {
    backgroundColor: 'rgba(255,205,87,0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,205,87,0.3)',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUSTARD,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },
  // Categories
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});

export default React.memo(TryBeforeYouBuyCard);
