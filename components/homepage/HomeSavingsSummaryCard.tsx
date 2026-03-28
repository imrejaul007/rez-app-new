/**
 * HomeSavingsSummaryCard — Home page savings anchor card.
 *
 * Displayed at the top of the Near-U feed to anchor the user on savings.
 * LinearGradient linen-to-lavender, prominent month savings, unlock CTA.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import { useUserIdentityStore, IdentitySegment } from '@/stores/userIdentityStore';

const SEGMENT_SAVINGS_LABEL: Partial<Record<IdentitySegment, string>> = {
  verified_student: 'Student savings this month',
  verified_employee: 'Work perks saved this month',
  verified_healthcare: 'Health benefits this month',
  verified_defence: 'Defence savings this month',
  verified_teacher: 'Teacher benefits this month',
  verified_senior: 'Senior savings this month',
  verified_government: 'Govt benefits this month',
  verified_differentlyAbled: 'Your savings this month',
};

const SEGMENT_EMPTY_SUBTITLE: Partial<Record<IdentitySegment, string>> = {
  verified_student: 'Earn cashback at campus stores and student-friendly shops.',
  verified_employee: 'Save on meals, wellness & commute through work perks.',
  verified_healthcare: 'Save on pharmacy, wellness & medical essentials.',
  verified_defence: 'Unlock exclusive savings for service members.',
  verified_teacher: 'Earn cashback on books, stationery & educational tools.',
  verified_senior: 'Special savings on health, grocery & daily essentials.',
};

interface HomeSavingsSummaryCardProps {
  totalSaved: number;
  thisMonthSaved: number;
  nearbyStoreCount?: number;
  unlockAmount?: number;
  currencySymbol: string;
  onPress: () => void;
}

const HomeSavingsSummaryCard: React.FC<HomeSavingsSummaryCardProps> = ({
  totalSaved,
  thisMonthSaved,
  nearbyStoreCount,
  unlockAmount,
  currencySymbol,
  onPress,
}) => {
  const { segment } = useUserIdentityStore();
  const savingsLabel = SEGMENT_SAVINGS_LABEL[segment] ?? 'You saved this month';
  const isEmptyState = thisMonthSaved === 0 && totalSaved === 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <View style={styles.wrapper}>
        <LinearGradient
          colors={['#0F1923', '#1A3040']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {isEmptyState ? (
            /* Empty / first-time state */
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="wallet-outline" size={28} color="#D4AF37" />
              </View>
              <Text style={styles.emptyTitle}>Start saving today!</Text>
              <Text style={styles.emptySubtitle}>
                {SEGMENT_EMPTY_SUBTITLE[segment] ?? 'Shop at nearby stores and earn cashback on every purchase.'}
              </Text>
            </View>
          ) : (
            /* Savings state */
            <>
              <Text style={styles.label}>{savingsLabel}</Text>
              <Text style={styles.amount}>
                {currencySymbol}{thisMonthSaved.toLocaleString()}
              </Text>

              {unlockAmount != null && unlockAmount > 0 && (
                <View style={styles.unlockRow}>
                  <Text style={styles.unlockText}>
                    Unlock {currencySymbol}{unlockAmount.toLocaleString()} more
                    {nearbyStoreCount ? ` at ${nearbyStoreCount} nearby stores` : ''} →
                  </Text>
                </View>
              )}
            </>
          )}
        </LinearGradient>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
      } as any,
    }),
  },
  gradient: {
    padding: 16,
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.92,
  },

  // Savings state
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 6,
  },
  unlockRow: {
    marginTop: 2,
  },
  unlockText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212,175,55,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default React.memo(HomeSavingsSummaryCard);
