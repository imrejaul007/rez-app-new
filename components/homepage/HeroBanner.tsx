import React, { memo, useCallback, useEffect, useState } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import platformApi from '@/services/platformApi';
import { colors, typography, iconSize } from '@/constants/theme';

const HORIZONTAL_PADDING = 2;

interface HeroBannerProps {
  totalSaved?: number;
  onScanPayPress?: () => void;
  onViewWalletPress?: () => void;
}

interface PlatformStats {
  rating: number;
  storeCount: number;
  nearbyText: string;
}

function HeroBanner({ totalSaved = 0, onScanPayPress, onViewWalletPress }: HeroBannerProps) {
  const router = useRouter();
  const isNewUser = totalSaved === 0;

  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformApi.getPlatformStats().then((result) => {
      if (!cancelled && result) {
        setStats({
          rating: result.averageRating,
          storeCount: result.totalStores,
          nearbyText: 'Near you',
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleScanPayPress = useCallback(() => {
    if (onScanPayPress) {
      onScanPayPress();
    } else {
      router.push('/pay-in-store/' as any);
    }
  }, [onScanPayPress, router]);

  const handleViewWalletPress = useCallback(() => {
    if (onViewWalletPress) {
      onViewWalletPress();
    } else {
      router.push('/wallet-screen' as any);
    }
  }, [onViewWalletPress, router]);

  const formatSavings = (amount: number): string => {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  const formatStoreCount = (count: number): string => {
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K+`;
    }
    return `${count}+`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.nileBlue, colors.brand.nileBlueLight, '#2d5c7e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {/* Header Row - Icon + Title */}
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Ionicons
              name={isNewUser ? "wallet-outline" : "gift-outline"}
              size={iconSize.md}
              color={colors.lightMustard}
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle} numberOfLines={2}>
              {isNewUser
                ? 'Save money on everything you buy'
                : `You've saved ${formatSavings(totalSaved)} ${BRAND.CURRENCY_CODE} with ${BRAND.APP_NAME}`}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
              {isNewUser ? `Online & in-store with ${BRAND.APP_NAME}` : "That's smarter spending"}
            </Text>
          </View>
        </View>

        {/* Subline */}
        <Text style={styles.subline}>
          One wallet. All rewards. Zero effort.
        </Text>

        {/* CTA Cards Row */}
        <View style={styles.ctaContainer}>
          <Pressable
            style={[styles.ctaCard, styles.ctaCardPrimary]}
            onPress={handleScanPayPress}

          >
            <Ionicons name="qr-code-outline" size={iconSize.md} color={colors.nileBlue} />
            <Text style={[styles.ctaText, styles.ctaTextPrimary]}>Scan & Pay</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.nileBlue} />
          </Pressable>

          <Pressable
            style={styles.ctaCard}
            onPress={handleViewWalletPress}

          >
            <Ionicons name="wallet-outline" size={iconSize.md} color={colors.background.primary} />
            <Text style={styles.ctaText}>View Wallet</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </View>

        {/* Social Proof Section — reserve height even when loading to prevent CLS */}
        <View style={[styles.socialProofContainer, !stats && styles.socialProofPlaceholder]}>
        {stats && (
          <View style={{ width: '100%' }}>
            {/* Rating */}
            {stats.rating > 0 && (
              <>
                <View style={styles.proofItem}>
                  <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                  <Text style={styles.proofText}>{stats.rating} rated</Text>
                </View>
                <View style={styles.proofDivider} />
              </>
            )}

            {/* Store Count */}
            <View style={styles.proofItem}>
              <Ionicons name="storefront-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.proofText}>{formatStoreCount(stats.storeCount)} stores</Text>
            </View>

            {/* Divider */}
            <View style={styles.proofDivider} />

            {/* Near You */}
            <View style={styles.proofItem}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.proofText}>{stats.nearbyText}</Text>
            </View>
          </View>
        )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
  },
  gradientContainer: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: colors.nileBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  mainTitle: {
    ...typography.h4,
    color: colors.background.primary,
    lineHeight: 24,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  subline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 12,
    marginLeft: 44,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  ctaCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    gap: 6,
  },
  ctaCardPrimary: {
    backgroundColor: colors.background.primary,
  },
  ctaText: {
    flex: 1,
    ...typography.button,
    color: colors.background.primary,
  },
  ctaTextPrimary: {
    color: colors.nileBlue,
  },
  // Social Proof Styles
  socialProofContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  socialProofPlaceholder: {
    minHeight: 32,
  },
  proofItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proofText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  proofDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
});

export default memo(HeroBanner);
