/**
 * HeroCard — Home page hero card with two states.
 *
 * First-time state (totalSaved === 0 or undefined): dark green gradient,
 * mystery reward box, welcome messaging, claim CTA.
 *
 * Returning user state (totalSaved > 0): dark navy, savings summary,
 * scan & pay / view wallet CTAs, coin expiry row.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

// ─── Brand constants ────────────────────────────────────────────────────────
const MUSTARD = colors.lightMustard;   // #ffcd57
const NAVY    = colors.nileBlue;        // #1a3a52
const PEACH   = colors.lightPeach;      // #ffd7b5

// ─── Props ───────────────────────────────────────────────────────────────────
interface HeroCardProps {
  totalSaved?: number;
  savingsThisMonth?: number;
  unlockAmount?: number;
  missedAmount?: number;
  expiringCoins?: number;
  onScanPay?: () => void;
  onViewWallet?: () => void;
  onClaimPress?: () => void;
  onUseCoinPress?: () => void;
}

// ─── Mystery box (CSS-drawn) ─────────────────────────────────────────────────
const MysteryBox: React.FC = () => (
  <View style={mystery.box}>
    {/* Corner dots */}
    <View style={[mystery.cornerDot, { top: 6, left: 6 }]} />
    <View style={[mystery.cornerDot, { top: 6, right: 6 }]} />
    <View style={[mystery.cornerDot, { bottom: 6, left: 6 }]} />
    <View style={[mystery.cornerDot, { bottom: 6, right: 6 }]} />
    {/* Centre question mark */}
    <Text style={mystery.qmark}>?</Text>
    {/* Sparkle dots */}
    <View style={[mystery.sparkle, { top: -4, right: 2 }]} />
    <View style={[mystery.sparkle, { top: 8, right: -5 }]} />
    <View style={[mystery.sparkle, { bottom: 2, left: -4 }]} />
  </View>
);

const mystery = StyleSheet.create({
  box: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#0d2b0d',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(34,197,94,0.5)',
  },
  sparkle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(34,197,94,0.6)',
  },
  qmark: {
    fontSize: 24,
    fontWeight: '800',
    color: 'rgba(34,197,94,0.9)',
  },
});

// ─── First-time state ─────────────────────────────────────────────────────────
const FirstTimeState: React.FC<{ onClaimPress?: () => void }> = ({ onClaimPress }) => (
  <View style={first.wrapper}>
    {/* Radial glow overlay (View simulates radial gradient centre glow) */}
    <View style={first.radialGlow} pointerEvents="none" />

    {/* Top row */}
    <View style={first.topRow}>
      <View style={first.textBlock}>
        <Text style={first.eyebrow}>WELCOME TO REZ</Text>
        <Text style={first.title}>Your first reward{'\n'}is waiting</Text>
        <Text style={first.subtitle}>Save money at 2,400+ stores near you</Text>
        <Pressable
          style={({ pressed }) => [first.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={onClaimPress}
        >
          <Text style={first.ctaText}>Claim your reward ›</Text>
        </Pressable>
      </View>
      <View style={first.boxWrapper}>
        <MysteryBox />
      </View>
    </View>

    {/* Bottom strip */}
    <View style={first.bottomStrip}>
      <Text style={first.stripText}>24 stores with offers within 1 km</Text>
      <View style={first.activityDots}>
        {[1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              first.activityDot,
              { opacity: i === 1 ? 1 : i === 2 ? 0.6 : 0.35 },
            ]}
          />
        ))}
      </View>
    </View>
  </View>
);

const first = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0d2b0d',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  radialGlow: {
    position: 'absolute',
    top: -40,
    left: '25%' as any,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  textBlock: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(34,197,94,0.7)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 16,
    marginBottom: 14,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: MUSTARD,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    color: NAVY,
  },
  boxWrapper: {
    paddingTop: 4,
  },
  // Bottom strip
  bottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34,197,94,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  stripText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  activityDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(34,197,94,0.8)',
  },
});

// ─── Returning user state ─────────────────────────────────────────────────────
interface ReturningProps {
  savingsThisMonth?: number;
  unlockAmount?: number;
  missedAmount?: number;
  expiringCoins?: number;
  onScanPay?: () => void;
  onViewWallet?: () => void;
  onUseCoinPress?: () => void;
}

const ReturningState: React.FC<ReturningProps> = ({
  savingsThisMonth = 0,
  unlockAmount = 580,
  missedAmount = 80,
  expiringCoins = 240,
  onScanPay,
  onViewWallet,
  onUseCoinPress,
}) => {
  const formatted = `₹${savingsThisMonth.toLocaleString('en-IN')}`;

  return (
    <View style={ret.wrapper}>
      {/* Savings block */}
      <View style={ret.topSection}>
        <Text style={ret.label}>SAVED THIS MONTH</Text>
        <Text style={ret.amount}>{formatted}</Text>

        {/* Next unlock box */}
        <View style={ret.unlockBox}>
          <Text style={ret.unlockText}>
            ₹{unlockAmount.toLocaleString('en-IN')} away from VIP tier
          </Text>
        </View>

        {/* Missed savings row */}
        <View style={ret.missedRow}>
          <View style={ret.missedPill}>
            <Text style={ret.missedText}>₹{missedAmount} missed yesterday</Text>
          </View>
        </View>
      </View>

      {/* CTA row */}
      <View style={ret.ctaRow}>
        <Pressable
          style={({ pressed }) => [ret.scanBtn, pressed && { opacity: 0.85 }]}
          onPress={onScanPay}
        >
          <Text style={ret.scanText}>Scan & Pay</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [ret.walletBtn, pressed && { opacity: 0.85 }]}
          onPress={onViewWallet}
        >
          <Text style={ret.walletText}>View Wallet</Text>
        </Pressable>
      </View>

      {/* Coin expiry row */}
      <Pressable
        style={({ pressed }) => [ret.expiryRow, pressed && { opacity: 0.85 }]}
        onPress={onUseCoinPress}
      >
        <Text style={ret.expiryText}>
          {expiringCoins} coins expiring in 12h — use them now ›
        </Text>
      </Pressable>
    </View>
  );
};

const ret = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0a1e2e',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  topSection: {
    padding: 16,
    paddingBottom: 12,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: MUSTARD,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  amount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  // Next unlock box
  unlockBox: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: MUSTARD,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  unlockText: {
    fontSize: 11,
    fontWeight: '600',
    color: MUSTARD,
  },
  // Missed savings
  missedRow: {
    flexDirection: 'row',
  },
  missedPill: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  missedText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  // CTAs
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scanBtn: {
    flex: 1,
    backgroundColor: MUSTARD,
    borderRadius: borderRadius.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scanText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  walletBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  walletText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Coin expiry
  expiryRow: {
    backgroundColor: PEACH,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
    color: NAVY,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
const HeroCard: React.FC<HeroCardProps> = ({
  totalSaved,
  savingsThisMonth,
  unlockAmount,
  missedAmount,
  expiringCoins,
  onScanPay,
  onViewWallet,
  onClaimPress,
  onUseCoinPress,
}) => {
  const isFirstTime = !totalSaved || totalSaved === 0;

  return (
    <View style={styles.shadow}>
      {isFirstTime ? (
        <FirstTimeState onClaimPress={onClaimPress} />
      ) : (
        <ReturningState
          savingsThisMonth={savingsThisMonth}
          unlockAmount={unlockAmount}
          missedAmount={missedAmount}
          expiringCoins={expiringCoins}
          onScanPay={onScanPay}
          onViewWallet={onViewWallet}
          onUseCoinPress={onUseCoinPress}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
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
});

export default React.memo(HeroCard);
