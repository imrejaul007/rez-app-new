/**
 * HeroBanner — Bold, time-aware hero section.
 *
 * Design: full-width Nile Blue gradient, large typography, mustard CTA.
 * Inspired by Zomato/Dineout-style hero panels — clean, premium, zero clutter.
 */

import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { spacing } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Brand tokens ────────────────────────────────────────────────────────────
const NILE_BLUE        = '#1a3a52';
const NILE_BLUE_MID    = '#1e4463';
const NILE_BLUE_LIGHT  = '#2a5a7c';
const MUSTARD          = '#FFC857';
const MUSTARD_DARK     = '#E6A800';
const WHITE            = '#FFFFFF';
const WHITE_70         = 'rgba(255,255,255,0.70)';
const WHITE_15         = 'rgba(255,255,255,0.15)';
const WHITE_08         = 'rgba(255,255,255,0.08)';

// ── Time-of-day content ─────────────────────────────────────────────────────
interface TimeSlot {
  greeting: string;
  headline: string;
  subline: string;
}

function getTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) {
    return {
      greeting: 'Good Morning! ☀️',
      headline: 'Start Your Day\nWith Savings',
      subline: 'Best breakfast & coffee deals nearby',
    };
  }
  if (hour >= 11 && hour < 14) {
    return {
      greeting: 'Lunch Time! 🍽️',
      headline: 'Nearby Deals\nWaiting For You',
      subline: 'Up to 40% cashback on lunch orders',
    };
  }
  if (hour >= 14 && hour < 20) {
    return {
      greeting: 'Evening Treats! 🌆',
      headline: 'Explore Cashback\nOffers Near You',
      subline: 'Cafes, shopping & wellness deals',
    };
  }
  return {
    greeting: 'Late Night Cravings? 🌙',
    headline: 'Order Now,\nSave More',
    subline: 'Midnight deals from top restaurants',
  };
}

// ── Props ────────────────────────────────────────────────────────────────────
interface HeroBannerProps {
  totalSaved?: number;
  onScanPayPress?: () => void;
  onViewWalletPress?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
function HeroBanner({ onScanPayPress, onViewWalletPress }: HeroBannerProps) {
  const router = useRouter();
  const slot = useMemo(() => getTimeSlot(), []);

  const handleExploreDeals = () => {
    router.push('/offers' as any);
  };

  const handleScanPay = () => {
    if (onScanPayPress) {
      onScanPayPress();
    } else {
      router.push('/pay-in-store/' as any);
    }
  };

  return (
    <LinearGradient
      colors={[NILE_BLUE, NILE_BLUE_MID, NILE_BLUE_LIGHT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Decorative circles — depth effect */}
      <View style={styles.decorCircleLarge} />
      <View style={styles.decorCircleSmall} />

      {/* Greeting pill */}
      <View style={styles.greetingPill}>
        <Text style={styles.greetingText}>{slot.greeting}</Text>
      </View>

      {/* Headline */}
      <Text style={styles.headline}>{slot.headline}</Text>

      {/* Subline */}
      <Text style={styles.subline}>{slot.subline}</Text>

      {/* CTA Row */}
      <View style={styles.ctaRow}>
        {/* Primary CTA — Mustard */}
        <Pressable
          style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPrimaryPressed]}
          onPress={handleExploreDeals}
          accessibilityRole="button"
          accessibilityLabel="Explore deals"
          accessibilityHint="Tap to browse all available cashback deals"
        >
          <Text style={styles.ctaPrimaryText}>Explore Deals →</Text>
        </Pressable>

        {/* Secondary CTA — Scan & Pay */}
        <Pressable
          style={({ pressed }) => [styles.ctaSecondary, pressed && { opacity: 0.75 }]}
          onPress={handleScanPay}
          accessibilityRole="button"
          accessibilityLabel="Scan and pay"
          accessibilityHint="Tap to open QR scanner and pay at a store"
        >
          <Text style={styles.ctaSecondaryText}>Scan & Pay</Text>
        </Pressable>
      </View>

      {/* Bottom trust strip */}
      <View style={styles.trustStrip}>
        <View style={styles.trustDot} />
        <Text style={styles.trustText}>2,400+ stores · Instant cashback · Zero fees</Text>
      </View>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gradient: {
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    overflow: 'hidden',
    // Shadow
    shadowColor: NILE_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },

  // Decorative background circles
  decorCircleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: WHITE_08,
    right: -40,
    top: -50,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: WHITE_08,
    right: 60,
    top: 40,
  },

  // Greeting pill
  greetingPill: {
    alignSelf: 'flex-start',
    backgroundColor: WHITE_15,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHITE,
    letterSpacing: 0.2,
  },

  // Main headline
  headline: {
    fontSize: 30,
    fontWeight: '900',
    color: WHITE,
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 8,
  },

  // Subline
  subline: {
    fontSize: 13,
    fontWeight: '500',
    color: WHITE_70,
    lineHeight: 19,
    marginBottom: 20,
  },

  // CTA Row
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  // Primary mustard CTA
  ctaPrimary: {
    flex: 1,
    backgroundColor: MUSTARD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryPressed: {
    backgroundColor: MUSTARD_DARK,
  },
  ctaPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: NILE_BLUE,
    letterSpacing: 0.2,
  },

  // Secondary ghost CTA
  ctaSecondary: {
    flex: 1,
    backgroundColor: WHITE_15,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ctaSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
    letterSpacing: 0.1,
  },

  // Bottom trust strip
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500',
    color: WHITE_70,
    letterSpacing: 0.1,
  },
});

export default memo(HeroBanner);
