/**
 * RezScoreCard
 *
 * Phase 2.3 — REZ Score
 * Compact card version of the REZ Score for embedding in home/profile.
 * Shows: score number, tier badge, trend arrow.
 * Tap → navigate to full RezScoreScreen.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export type ScoreTier =
  | 'Beginner'
  | 'Smart Saver'
  | 'Super Saver'
  | 'Elite Saver'
  | 'Legend';

export type ScoreTrend = 'up' | 'down' | 'stable';

export interface RezScoreCardProps {
  score: number;         // 0-999
  tier: ScoreTier;
  trend: ScoreTrend;
  percentile: number;    // e.g. 72 (means top 72%)
  onPress: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getTierColor(tier: ScoreTier): { bg: string; text: string; accent: string } {
  switch (tier) {
    case 'Beginner':     return { bg: colors.tint.slate, text: colors.gray[600], accent: colors.gray[400] };
    case 'Smart Saver':  return { bg: colors.tint.blue, text: colors.brand.sky, accent: colors.brand.sky };
    case 'Super Saver':  return { bg: colors.tint.amber, text: colors.brand.amberDark, accent: colors.lightMustard };
    case 'Elite Saver':  return { bg: colors.tint.orange, text: colors.brand.orangeDark, accent: colors.brand.orange };
    case 'Legend':       return { bg: '#F0E6FF', text: '#7C3AED', accent: '#A855F7' };
  }
}

function getTrendConfig(trend: ScoreTrend): { icon: string; color: string; label: string } {
  switch (trend) {
    case 'up':     return { icon: 'trending-up',   color: colors.success, label: 'Rising' };
    case 'down':   return { icon: 'trending-down', color: colors.error,   label: 'Falling' };
    case 'stable': return { icon: 'remove',        color: colors.gray[400], label: 'Stable' };
  }
}

// Circular gauge using View arcs (pure RN, no SVG)
function ScoreGauge({ score, accentColor }: { score: number; accentColor: string }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const progress = score / 999;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 1200,
      delay: 100,
      useNativeDriver: false,
    }).start();
  }, [progress, fillAnim]);

  return (
    <View style={gaugeStyles.wrapper}>
      {/* Background ring */}
      <View style={[gaugeStyles.ring, { borderColor: colors.gray[200] }]} />
      {/* Filled arc simulation via colored border-top trick */}
      <Animated.View
        style={[
          gaugeStyles.ring,
          gaugeStyles.fillRing,
          {
            borderTopColor: accentColor,
            borderRightColor: fillAnim.interpolate({
              inputRange: [0, 0.25, 0.5, 1],
              outputRange: ['transparent', accentColor, accentColor, accentColor],
            }) as any,
            borderBottomColor: fillAnim.interpolate({
              inputRange: [0, 0.5, 0.75, 1],
              outputRange: ['transparent', 'transparent', accentColor, accentColor],
            }) as any,
            borderLeftColor: fillAnim.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: ['transparent', 'transparent', accentColor],
            }) as any,
          },
        ]}
      />
      {/* Score number */}
      <View style={gaugeStyles.center}>
        <ThemedText style={[gaugeStyles.scoreText, { color: accentColor }]}>
          {score}
        </ThemedText>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  wrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: 'transparent',
  },
  fillRing: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});

// ============================================================================
// COMPONENT
// ============================================================================

const RezScoreCard: React.FC<RezScoreCardProps> = ({
  score,
  tier,
  trend,
  percentile,
  onPress,
}) => {
  const tierConfig = getTierColor(tier);
  const trendConfig = getTrendConfig(trend);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`REZ Score ${score}, ${tier} tier. Tap for full details.`}
    >
      {/* Left: gauge */}
      <ScoreGauge score={score} accentColor={tierConfig.accent} />

      {/* Center: info */}
      <View style={styles.info}>
        <View style={[styles.tierBadge, { backgroundColor: tierConfig.bg }]}>
          <ThemedText style={[styles.tierText, { color: tierConfig.text }]}>
            {tier}
          </ThemedText>
        </View>
        <ThemedText style={styles.percentileText}>
          Higher than {percentile}% of users nearby
        </ThemedText>
      </View>

      {/* Right: trend + chevron */}
      <View style={styles.rightCol}>
        <View style={styles.trendRow}>
          <Ionicons name={trendConfig.icon as any} size={16} color={trendConfig.color} />
          <ThemedText style={[styles.trendLabel, { color: trendConfig.color }]}>
            {trendConfig.label}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.gray[400]} style={styles.chevron} />
      </View>
    </Pressable>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  containerPressed: {
    opacity: 0.9,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  percentileText: {
    fontSize: 12,
    color: colors.gray[500],
    lineHeight: 16,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    opacity: 0.6,
  },
});

export default React.memo(RezScoreCard);
