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
    const breakdownCashback = isHidden ? '••' : String(cashbackBalance);
    const breakdownPending = isHidden ? '••' : String(pendingRewards);

    return (
      <View style={styles.container}>
        {/* Balance row */}
        <View style={styles.balanceRow}>
          <Text style={styles.balanceText} accessibilityLabel={`Wallet balance: ${displayBalance}`}>
            {displayBalance}
          </Text>
          <Pressable
            onPress={toggleHidden}
            style={styles.eyeButton}
            accessibilityLabel={isHidden ? 'Show balance' : 'Hide balance'}
            accessibilityRole="button"
          >
            <Ionicons
              name={isHidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.text.tertiary}
            />
          </Pressable>
        </View>

        <ThemedText style={styles.subtitle}>Total Wallet Balance</ThemedText>

        {/* Breakdown row: Rez Coins | Cashback | Pending */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: '#B45309' }]} />
            <ThemedText style={styles.breakdownLabel}>Rez Coins</ThemedText>
            <ThemedText style={[styles.breakdownValue, { color: '#B45309' }]}>
              {breakdownRez}
            </ThemedText>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: '#059669' }]} />
            <ThemedText style={styles.breakdownLabel}>Cashback</ThemedText>
            <ThemedText style={[styles.breakdownValue, { color: '#059669' }]}>
              {breakdownCashback}
            </ThemedText>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: '#6366F1' }]} />
            <ThemedText style={styles.breakdownLabel}>Pending</ThemedText>
            <ThemedText style={[styles.breakdownValue, { color: '#6366F1' }]}>
              {breakdownPending}
            </ThemedText>
          </View>
        </View>

        {/* Coin Chips Row */}
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

        {/* Quick Action Buttons: Add Money + Send */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => router.push('/payment' as any)}
            accessibilityLabel="Add money to wallet"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnTextPrimary}>Add Money</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push('/wallet/transfer' as any)}
            accessibilityLabel="Send coins"
            accessibilityRole="button"
          >
            <Ionicons name="paper-plane-outline" size={16} color={colors.nileBlue} />
            <Text style={styles.actionBtnTextSecondary}>Send</Text>
          </Pressable>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    alignSelf: 'center',
    marginVertical: 10,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: '94%',
    ...Shadows.medium,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceText: {
    color: colors.primary[500],
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  eyeButton: {
    padding: 4,
  },
  subtitle: {
    color: Colors.text.tertiary,
    fontWeight: '500',
    fontSize: 12,
    marginTop: 2,
  },
  // Breakdown row
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 0,
    width: '100%',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 1,
  },
  breakdownLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.primary[200],
  },
  // Chip row
  chipRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  // Action buttons
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: colors.nileBlue,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.nileBlue,
  },
  actionBtnTextPrimary: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnTextSecondary: {
    color: colors.nileBlue,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default BalanceDisplay;
