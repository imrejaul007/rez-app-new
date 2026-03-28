import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHomeTab } from '@/contexts/HomeTabContext';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_GAP = 10;

// Brand Colors — premium dark palette
const COLORS = {
  primary: '#FFC857',       // gold
  primaryDark: '#c89a00',   // deep gold
  primaryLight: '#F0D98A',  // light gold shimmer
  white: colors.background.primary,
  textDark: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.55)',
  border: 'rgba(255,200,87,0.22)',
  cardBg: '#1a3a52',        // deep navy charcoal
  cardBgAlt: '#16334d',     // slightly lighter variant
};

const EarnNuqtaCoinsSection: React.FC = () => {
  const router = useRouter();
  const homeTab = useHomeTab();
  const setActiveTab = homeTab?.setActiveTab;
  const scrollToTop = homeTab?.scrollToTop;

  const handleViewAll = () => {
    router.push('/(tabs)/earn');
  };

  const handleOnlineShoppingPress = () => {
    setActiveTab?.('cash');
    // Scroll to top after switching tab
    if (scrollToTop) {
      setTimeout(() => {
        scrollToTop();
      }, 100);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <LinearGradient
              colors={['#FFC857', '#c89a00']}
              style={styles.headerIconGradient}
            >
              <Ionicons name="wallet" size={18} color="#1a3a52" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Earn {BRAND.COIN_NAME}</Text>
            <Text style={styles.headerSubtitle}>Multiple ways to earn rewards</Text>
          </View>
        </View>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
        </Pressable>
      </View>

      {/* Bento Box Grid */}
      <View style={styles.bentoGrid}>
        {/* Top Row */}
        <View style={styles.topRow}>
          {/* Large Card: Online Shopping */}
          <Pressable
            style={styles.largeCard}
            onPress={handleOnlineShoppingPress}
          >
            <LinearGradient
              colors={['#16334d', '#1a3a52']}
              style={styles.largeCardGradient}
            >
              {/* Gold shimmer overlay */}
              <LinearGradient
                colors={['rgba(255,200,87,0.08)', 'rgba(255,200,87,0.02)']}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Decorative circles */}
              <View style={styles.decorCircle1} />
              <View style={styles.decorCircle2} />

              {/* Header with badge */}
              <View style={styles.largeCardHeader}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.largeEmoji}>🛒</Text>
                </View>
                <View style={styles.popularBadge}>
                  <Ionicons name="star" size={10} color="#FFC857" />
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              </View>

              {/* Content */}
              <View style={styles.largeCardFooter}>
                <Text style={styles.largeCardTitle}>Online Shopping</Text>
                <Text style={styles.largeCardDesc}>2500+ brands available</Text>
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>Up to 25% cashback</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* Pay in Store Card */}
            <Pressable
              style={styles.payCard}
              onPress={() => router.push('/pay-in-store' as any)}
            >
              <LinearGradient
                colors={['#16334d', '#1a3a52']}
                style={styles.payCardGradient}
              >
                <View style={styles.payCardContent}>
                  <View style={styles.payIconBox}>
                    <Ionicons name="card-outline" size={20} color="#FFC857" />
                  </View>
                  <View style={styles.payTextContent}>
                    <Text style={styles.payCardTitle}>Pay in Store</Text>
                    <Text style={styles.payCardDesc}>Scan & earn instantly</Text>
                  </View>
                </View>
                <View style={styles.payArrow}>
                  <Ionicons name="chevron-forward" size={16} color="#FFC857" />
                </View>
              </LinearGradient>
            </Pressable>

            {/* Small Cards Row */}
            <View style={styles.smallCardsRow}>
              {/* Play Games */}
              <Pressable
                style={styles.smallCard}
                onPress={() => router.push('/playandearn' as any)}
              >
                <LinearGradient
                  colors={['#1e3f5e', '#1a3a52']}
                  style={styles.smallCardGradient}
                >
                  <Text style={styles.smallEmoji}>🎮</Text>
                  <Text style={styles.smallCardText}>Play</Text>
                </LinearGradient>
              </Pressable>

              {/* Refer */}
              <Pressable
                style={styles.smallCard}
                onPress={() => router.push('/referral' as any)}
              >
                <LinearGradient
                  colors={['#1e3f5e', '#1a3a52']}
                  style={styles.smallCardGradient}
                >
                  <Text style={styles.smallEmoji}>👥</Text>
                  <Text style={styles.smallCardText}>Refer</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Bottom Row */}
        <View style={styles.bottomRow}>
          {/* Social Impact */}
          <Pressable
            style={styles.socialCard}
            onPress={() => router.push('/social-impact' as any)}
          >
            <LinearGradient
              colors={['#16334d', '#1a3a52']}
              style={styles.socialCardGradient}
            >
              <View style={styles.socialIconBox}>
                <Text style={styles.socialEmoji}>🤝</Text>
              </View>
              <View style={styles.socialTextContent}>
                <Text style={styles.socialTitle}>Social Impact</Text>
                <Text style={styles.socialDesc}>CSR events</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Surveys */}
          <Pressable
            style={styles.miniCard}
            onPress={() => router.push('/surveys' as any)}
          >
            <LinearGradient
              colors={['#1e3f5e', '#1a3a52']}
              style={styles.miniCardGradient}
            >
              <Text style={styles.miniEmoji}>📋</Text>
              <Text style={styles.miniCardText}>Surveys</Text>
            </LinearGradient>
          </Pressable>

          {/* Reviews */}
          <Pressable
            style={styles.miniCard}
            onPress={() => router.push('/my-reviews' as any)}
          >
            <LinearGradient
              colors={['#1e3f5e', '#1a3a52']}
              style={styles.miniCardGradient}
            >
              <Text style={styles.miniEmoji}>⭐</Text>
              <Text style={styles.miniCardText}>Reviews</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },

  // Header - matching PlayAndEarnSection style
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  headerIconContainer: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '400',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,200,87,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.25)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFC857',
  },

  // Bento Grid
  bentoGrid: {
    gap: CARD_GAP,
  },
  topRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    height: 170,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    height: 70,
  },

  // Large Card - Online Shopping
  largeCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.22)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  largeCardGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,200,87,0.07)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 10,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,200,87,0.04)',
  },
  largeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emojiContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,200,87,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.22)',
  },
  largeEmoji: {
    fontSize: 22,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,200,87,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.3)',
  },
  popularText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFC857',
  },
  largeCardFooter: {
    gap: 3,
  },
  largeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  largeCardDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cashbackBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,200,87,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.3)',
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFC857',
  },

  // Right Column
  rightColumn: {
    flex: 1,
    gap: CARD_GAP,
  },

  // Pay in Store Card
  payCard: {
    height: 66,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  payCardGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  payCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  payIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,200,87,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.25)',
  },
  payTextContent: {
    flex: 1,
  },
  payCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  payCardDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  payArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,200,87,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Small Cards Row (Play & Refer)
  smallCardsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  smallCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  smallCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  smallEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  smallCardText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },

  // Social Impact Card
  socialCard: {
    flex: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  socialCardGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  socialIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,200,87,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.22)',
  },
  socialEmoji: {
    fontSize: 18,
  },
  socialTextContent: {
    flex: 1,
  },
  socialTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  socialDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Mini Cards (Surveys & Reviews)
  miniCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,200,87,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  miniCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  miniEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  miniCardText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
});

export default React.memo(EarnNuqtaCoinsSection);
