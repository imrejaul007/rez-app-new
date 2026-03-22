/**
 * BalanceDisplay — Total wallet balance card with hide/reveal toggle,
 * animated count-up, breakdown row (Rez Coins | Cashback | Pending),
 * and "Add Money" / "Send" quick action buttons.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { CoinChip } from './CoinChip';
import { WalletData, CoinType } from '@/types/wallet';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

const BALANCE_HIDDEN_KEY = '@wallet_balance_hidden';

interface BalanceDisplayProps {
  walletData: WalletData;
  onCoinPress?: (type: CoinType) => void;
  currencySymbol?: string;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = React.memo(
  ({ walletData, onCoinPress, currencySymbol = '₹' }) => {
    const [isHidden, setIsHidden] = useState(false);
    const isMounted = useIsMounted();
    const router = useRouter();
    const countAnim = useSharedValue(0);

    // Load persisted hide state
    useEffect(() => {
      AsyncStorage.getItem(BALANCE_HIDDEN_KEY)
        .then((val) => {
          if (!isMounted()) return;
          if (val === 'true') setIsHidden(true);
        })
        .catch(() => {});
    }, []);

    // totalBalance is the canonical value — already in RC units (not divided by rate)
    const totalBalance = typeof walletData.totalBalance === 'number' ? walletData.totalBalance : 0;
    const cashbackBalance = typeof walletData.cashbackBalance === 'number' ? walletData.cashbackBalance : 0;
    const pendingRewards = typeof walletData.pendingRewards === 'number' ? walletData.pendingRewards : 0;

    // Count-up animation whenever balance changes
    useEffect(() => {
      if (!isHidden) {
        countAnim.value = 0;
        countAnim.value = withTiming(1, {
          duration: 700,
          easing: Easing.out(Easing.cubic),
        });
      }
    }, [isHidden, totalBalance]);

    const [animatedBalance, setAnimatedBalance] = useState(0);

    useAnimatedReaction(
      () => countAnim.value,
      (val) => {
        const interpolated = val * totalBalance;
        runOnJS(setAnimatedBalance)(Math.round(interpolated));
      },
      [totalBalance, isHidden]
    );

    const toggleHidden = useCallback(async () => {
      const newVal = !isHidden;
      setIsHidden(newVal);
      if (!isMounted()) return;
      await AsyncStorage.setItem(BALANCE_HIDDEN_KEY, String(newVal));
    }, [isHidden, isMounted]);

    // Coin chips
    const nuqtaCoin = walletData.coins?.find((c) => c.type === 'rez' || c.type === 'nuqta');
    const promoCoin = walletData.coins?.find((c) => c.type === 'promo');
    const brandedTotal = typeof walletData.brandedCoinsTotal === 'number' ? walletData.brandedCoinsTotal : 0;

    const displayBalance = isHidden
      ? `${BRAND.CURRENCY_CODE} ••••`
      : `${BRAND.CURRENCY_CODE} ${animatedBalance.toLocaleString('en-IN')}`;

    const breakdownRez = isHidden ? '••' : String(nuqtaCoin?.amount ?? 0);
    const breakdownCashback = isHidden ? '••' : `₹${cashbackBalance}`;
    const breakdownPending = isHidden ? '••' : `₹${pendingRewards}`;

    return (
      <View style={styles.outerContainer}>
        <LinearGradient
          colors={['#1a3a52', '#0d2035', '#0d1f2d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Radial glow overlay — top-right depth effect */}
          <View style={styles.glowOverlay} pointerEvents="none" />
          <View style={styles.glowOverlayBottomLeft} pointerEvents="none" />

          {/* Wallet icon + subtitle */}
          <View style={styles.topRow}>
            <View style={styles.walletIconWrap}>
              <Ionicons name="wallet" size={18} color="#D4AF37" />
            </View>
            <Text style={styles.availableLabel}>Available Balance</Text>
            <Pressable
              onPress={toggleHidden}
              style={styles.eyeButton}
              accessibilityLabel={isHidden ? 'Show balance' : 'Hide balance'}
              accessibilityRole="button"
            >
              <Ionicons
                name={isHidden ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="rgba(255,255,255,0.6)"
              />
            </Pressable>
          </View>

          {/* Balance row */}
          <View style={styles.balanceRow}>
            <Text
              style={styles.balanceText}
              accessibilityLabel={`Wallet balance: ${displayBalance}`}
            >
              {displayBalance}
            </Text>
          </View>

          {/* 3 stat pills */}
          <View style={styles.statPillsRow}>
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: '#4ADE80' }]} />
              <Text style={styles.statPillLabel}>Rez Coins</Text>
              <Text style={styles.statPillValue}>{breakdownRez}</Text>
            </View>
            <View style={styles.statPillDivider} />
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: '#FBBF24' }]} />
              <Text style={styles.statPillLabel}>Cashback</Text>
              <Text style={styles.statPillValue}>{breakdownCashback}</Text>
            </View>
            <View style={styles.statPillDivider} />
            <View style={styles.statPill}>
              <View style={[styles.statDot, { backgroundColor: '#60A5FA' }]} />
              <Text style={styles.statPillLabel}>Pending</Text>
              <Text style={styles.statPillValue}>{breakdownPending}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/payment' as any)}
              accessibilityLabel="Add money to wallet"
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={16} color="#1a3a52" />
              <Text style={styles.actionBtnTextPrimary}>Add Money</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtnSecondary, pressed && { opacity: 0.75 }]}
              onPress={() => router.push('/wallet/transfer' as any)}
              accessibilityLabel="Send coins"
              accessibilityRole="button"
            >
              <Ionicons name="paper-plane-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnTextSecondary}>Send Money</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Coin Chips Row — rendered below the hero card */}
        <View style={styles.chipRow}>
          <CoinChip
            type="rez"
            amount={isHidden ? 0 : (nuqtaCoin?.amount || 0)}
            onPress={() => onCoinPress?.('rez')}
            compact
          />
          <CoinChip
            type="promo"
            amount={isHidden ? 0 : (promoCoin?.amount || 0)}
            onPress={() => onCoinPress?.('promo')}
            compact
          />
          {brandedTotal > 0 && (
            <CoinChip
              type="branded"
              amount={isHidden ? 0 : brandedTotal}
              onPress={() => onCoinPress?.('branded')}
              compact
            />
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    minHeight: 220,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  // Depth glow overlays
  glowOverlay: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  glowOverlayBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212,175,55,0.07)',
  },
  // Top row: icon + label + eye
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  walletIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(212,175,55,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableLabel: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  eyeButton: {
    padding: 4,
  },
  // Balance
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1,
    includeFontPadding: false,
    textShadowColor: 'rgba(212,175,55,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  // Stat pills row
  statPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statPillLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  statPillValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  statPillDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 50,
    backgroundColor: '#D4AF37',
    gap: 6,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnTextPrimary: {
    color: '#1a3a52',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    gap: 6,
  },
  actionBtnTextSecondary: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Chip row below card
  chipRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 2,
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

export default BalanceDisplay;
