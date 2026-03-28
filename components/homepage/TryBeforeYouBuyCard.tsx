/**
 * TryBeforeYouBuyCard — Clean white card promoting the risk-free trial feature.
 *
 * Design: white card, navy text, mustard CTA only.
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

const MUSTARD = '#FFC857';
const NAVY    = '#1a3a52';
const BORDER  = '#E2E8F0';
const BODY    = '#475569';
const MUTED   = '#94A3B8';
const LIGHT   = '#F8F9FA';

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
    style={({ pressed }) => [tile.wrapper, pressed && { opacity: 0.75 }]}
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'center',
  },
  sub: {
    fontSize: 10,
    color: MUTED,
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
          <Text style={styles.eyebrow}>Try Before You Buy</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Risk-free trials</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>2 new today</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Experience first. Pay only if you love it.
          </Text>
        </View>

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
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
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
    color: MUTED,
    letterSpacing: 0.5,
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
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: MUSTARD,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  subtitle: {
    fontSize: 12,
    color: BODY,
    lineHeight: 17,
  },
  explorePill: {
    backgroundColor: MUSTARD,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});

export default React.memo(TryBeforeYouBuyCard);
