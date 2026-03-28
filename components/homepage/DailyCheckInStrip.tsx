/**
 * DailyCheckInStrip — Compact banner that lets a user claim their daily
 * check-in reward (10 RC).
 *
 * Two states:
 *   • unclaimed — mustard CTA pill, calls POST /api/gamification/daily-checkin
 *   • claimed   — gray "✓ Claimed" pill, no further action
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import gamificationApi from '@/services/gamificationApi';

const MUSTARD = colors.lightMustard;  // #ffcd57
const NAVY    = colors.nileBlue;       // #1a3a52

// ─── Props ────────────────────────────────────────────────────────────────────
interface DailyCheckInStripProps {
  isClaimed: boolean;
  onClaim?: () => void | Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────
const DailyCheckInStrip: React.FC<DailyCheckInStripProps> = ({
  isClaimed: initialClaimed,
  onClaim,
}) => {
  const [claimed, setClaimed]   = useState(initialClaimed);
  const [loading, setLoading]   = useState(false);

  const handleClaim = useCallback(async () => {
    if (claimed || loading) return;

    setLoading(true);
    try {
      await gamificationApi.performCheckIn();
      setClaimed(true);
      await onClaim?.();
    } catch {
      // Silently swallow; real implementation should handle errors gracefully
    } finally {
      setLoading(false);
    }
  }, [claimed, loading, onClaim]);

  return (
    <View style={styles.strip}>
      {/* Text block */}
      <View style={styles.textBlock}>
        <Text style={styles.title}>Check in today → earn ₹10 cashback</Text>
        <Text style={styles.subtitle}>Free cashback · visit a store to redeem · resets midnight</Text>
      </View>

      {/* CTA pill */}
      {claimed ? (
        <View style={styles.claimedPill}>
          <Text style={styles.claimedText}>✓ Claimed</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.claimPill, pressed && { opacity: 0.82 }]}
          onPress={handleClaim}
          disabled={loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={NAVY} />
          ) : (
            <Text style={styles.claimText}>Claim ›</Text>
          )}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: MUSTARD,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  textBlock: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '400',
  },
  // Unclaimed CTA (44pt minimum touch target)
  claimPill: {
    backgroundColor: MUSTARD,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  // Claimed state (44pt minimum touch target)
  claimedPill: {
    backgroundColor: colors.neutral[200],
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 76,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
  },
});

export default React.memo(DailyCheckInStrip);
