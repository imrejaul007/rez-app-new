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
  Text,
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
    case 'Smart Saver':  return { bg: colors.tint.blue, text: colors.brand.sky, accent: colors.brand.sky };
    case 'Super Saver':  return { bg: colors.tint.amber, text: colors.brand.amberDark, accent: colors.lightMustard };
    case 'Elite Saver':  return { bg: colors.tint.orange, text: colors.brand.orangeDark, accent: colors.brand.orange };
    case 'Legend':       return { bg: '#F0E6FF', text: '#7C3AED', accent: '#A855F7' };
    case 'Beginner':
    default:             return { bg: colors.tint.slate, text: colors.gray[600], accent: colors.gray[400] };
  }
}

function getTrendConfig(trend: ScoreTrend): { icon: string; color: string; label: string } {
  switch (trend) {
    case 'up':     return { icon: 'trending-up',   color: colors.success, label: 'Rising' };
    case 'down':   return { icon: 'trending-down', color: colors.error,   label: 'Falling' };
    case 'stable':
    default:       return { icon: 'remove',        color: colors.gray[400], label: 'Stable' };
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
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ring: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 4,
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
    fontSize: 18,
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
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[styles.tierText, { color: tierConfig.text }]}
          >
            {tier.toUpperCase()}
          </Text>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.percentileText}>
          Higher than {percentile}% nearby
        </Text>
      </View>

      {/* Right: trend + chevron */}
      <View style={styles.rightCol}>
        <View style={styles.trendRow}>
          <Ionicons name={trendConfig.icon as any} size={14} color={trendConfig.color} />
          <Text numberOfLines={1} style={[styles.trendLabel, { color: trendConfig.color }]}>
            — {trendConfig.label}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.gray[400]} style={styles.chevron} />
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
    borderRadius: 12,
    padding: 10,
    gap: 10,
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  containerPressed: {
    opacity: 0.9,
  },
  info: {
    flex: 1,
    gap: 4,
    minWidth: 0, // allows flex children to shrink below their content size
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    maxWidth: '100%',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  percentileText: {
    fontSize: 11,
    color: colors.gray[500],
    lineHeight: 15,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
    minWidth: 64,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
