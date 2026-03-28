/**
 * HeroCard — Home page hero card with two states.
 *
 * First-time state (totalSaved === 0 or undefined): nile-blue background,
 * stacked layout, store-count pill, welcome reward CTA, social proof column,
 * bottom strip with scan & pay prompt.
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
const LINEN   = '#faf1e0';              // #faf1e0

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

// ─── First-time state ─────────────────────────────────────────────────────────
const FirstTimeState: React.FC<{ onClaimPress?: () => void }> = ({ onClaimPress }) => (
  <View style={first.wrapper}>
    {/* Decorative radial glow — mustard top */}
    <View style={first.glowTop} pointerEvents="none" />
    {/* Decorative radial glow — mustard right */}
    <View style={first.glowRight} pointerEvents="none" />

    {/* Main content padding */}
    <View style={first.inner}>
      {/* ── Top row: eyebrow + store-count pill ── */}
      <View style={first.headerRow}>
        <Text style={first.eyebrow}>WELCOME TO REZ</Text>
        <View style={first.storePill}>
          <View style={first.pulseDot} />
          <Text style={first.storePillText}>24 stores near you</Text>
        </View>
      </View>

      {/* ── Title ── */}
      <Text style={first.title}>
        {'Save money on\n'}
        <Text style={first.titleAccent}>everything</Text>
        {' you buy'}
      </Text>

      {/* ── Subtitle ── */}
      <Text style={first.subtitle}>
        Cashback, coins & free trials at 2,400+ stores. Zero effort.
      </Text>

      {/* ── CTA row ── */}
      <View style={first.ctaRow}>
        {/* Claim button */}
        <Pressable
          style={({ pressed }) => [first.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={onClaimPress}
        >
          <Text style={first.ctaText}>🎁  Claim your welcome reward</Text>
        </Pressable>

        {/* Social proof */}
        <View style={first.socialProof}>
          <Text style={first.proofAmount}>₹0</Text>
          <Text style={first.proofLabel}>saved so far</Text>
        </View>
      </View>
    </View>

    {/* ── Bottom strip ── */}
    <View style={first.bottomStrip}>
      <Text style={first.stripText}>
        <Text style={first.stripBold}>Scan & Pay</Text>
        {' at any nearby store to start earning'}
      </Text>
      <View style={first.activityDots}>
        {[0, 1, 2, 3, 4].map(i => (
          <View
            key={i}
            style={[
              first.activityDot,
              { backgroundColor: i < 3 ? 'rgba(255,205,87,.7)' : 'rgba(255,205,87,.2)' },
            ]}
          />
        ))}
      </View>
    </View>
  </View>
);

const first = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0a1e2e',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  // Decorative glows
  glowTop: {
    position: 'absolute',
    top: -60,
    left: '10%' as any,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,205,87,.08)',
  },
  glowRight: {
    position: 'absolute',
    top: 0,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,205,87,.05)',
  },
  // Inner padded area
  inner: {
    padding: 20,
    paddingBottom: 16,
  },
  // Header row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,205,87,.6)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  // Store count pill
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LINEN,
    borderWidth: 1,
    borderColor: 'rgba(255,205,87,.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: MUSTARD,
  },
  storePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: MUSTARD,
  },
  // Title
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
    lineHeight: 32,
    marginBottom: 8,
  },
  titleAccent: {
    color: MUSTARD,
  },
  // Subtitle
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,.45)',
    lineHeight: 18,
    marginBottom: 16,
  },
  // CTA row
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaBtn: {
    flex: 1,
    backgroundColor: MUSTARD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a3a52',
  },
  // Social proof
  socialProof: {
    alignItems: 'center',
  },
  proofAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: MUSTARD,
    lineHeight: 22,
  },
  proofLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,.35)',
    textAlign: 'center',
  },
  // Bottom strip
  bottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,205,87,.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  stripText: {
    fontSize: 10,
    color: 'rgba(255,255,255,.4)',
    flex: 1,
    flexWrap: 'wrap',
  },
  stripBold: {
    fontWeight: '700',
    color: 'rgba(255,205,87,.8)',
  },
  activityDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginLeft: 8,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    marginHorizontal: 0,
    marginBottom: spacing.md,
    borderRadius: 0,
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
