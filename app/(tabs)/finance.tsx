import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import financeApi, { CreditScore, PartnerOffer } from '@/services/financeApi';
import { useToast } from '@/hooks/useToast';
import { colors, borderRadius, spacing } from '@/constants/theme';

export default function FinanceScreen() {
  const { showSuccess } = useToast();
  const [score, setScore] = useState<CreditScore | null>(null);
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [scoreRes, offersRes] = await Promise.allSettled([financeApi.getScore(), financeApi.getOffers()]);
      if (scoreRes.status === 'fulfilled' && scoreRes.value?.data) setScore(scoreRes.value.data as CreditScore);
      if (offersRes.status === 'fulfilled') setOffers((offersRes.value?.data as any)?.offers ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleScoreCheck() {
    try {
      const res = await financeApi.checkScoreAndEarnCoins();
      const data = res.data as any;
      if (data?.coinsAwarded > 0) {
        showSuccess(`+${data.coinsAwarded} coins earned!`);
      }
      load();
    } catch {
      // silently ignore — score check is non-critical
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.purple} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      {/* ReZ Score Card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Your ReZ Score</Text>
        <Text style={styles.scoreValue}>{score?.rezScore ?? '—'}</Text>
        <Text style={styles.scoreSubLabel}>{score ? getScoreBand(score.rezScore) : 'Loading...'}</Text>
        <TouchableOpacity style={styles.scoreBtn} onPress={handleScoreCheck}>
          <Text style={styles.scoreBtnText}>Check Score · Earn Coins</Text>
        </TouchableOpacity>
      </View>

      {/* Eligibility Pills */}
      {score && (
        <View style={styles.eligibilityRow}>
          <EligibilityPill label="Loan" value={`₹${(score.eligibility.maxLoanAmount / 1000).toFixed(0)}K`} />
          <EligibilityPill label="Card Limit" value={`₹${(score.eligibility.maxCreditCardLimit / 1000).toFixed(0)}K`} />
          <EligibilityPill
            label="Pay Later"
            value={score.eligibility.bnplEnabled ? `₹${score.eligibility.bnplLimit}` : 'NA'}
          />
        </View>
      )}

      {/* Improvement Tips */}
      {score?.tips && score.tips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Improve</Text>
          {score.tips.map((tip, i) => (
            <View key={i} style={styles.tip}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Pre-approved Offers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Offers</Text>
        {offers.length === 0 ? (
          <Text style={styles.emptyText}>No offers yet. Keep using ReZ to unlock.</Text>
        ) : (
          offers.map((offer) => <OfferCard key={offer._id} offer={offer} />)
        )}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function EligibilityPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function OfferCard({ offer }: { offer: PartnerOffer }) {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <Text style={styles.offerName}>{offer.displayName}</Text>
        {offer.isPreApproved && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Pre-approved</Text>
          </View>
        )}
      </View>
      {offer.maxAmount && <Text style={styles.offerDetail}>Up to ₹{offer.maxAmount.toLocaleString('en-IN')}</Text>}
      {offer.interestRate && <Text style={styles.offerDetail}>{offer.interestRate}% APR</Text>}
      {offer.coinsOnApproval > 0 && <Text style={styles.offerCoins}>+{offer.coinsOnApproval} coins on approval</Text>}
    </View>
  );
}

function getScoreBand(score: number): string {
  if (score >= 750) return 'Excellent';
  if (score >= 650) return 'Good';
  if (score >= 550) return 'Fair';
  if (score >= 450) return 'Poor';
  return 'Very Poor';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.coolGray },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scoreCard: {
    margin: spacing.base,
    padding: spacing['2xl'],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.brand.purple,
    alignItems: 'center',
  },
  scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  scoreValue: { color: colors.text.white, fontSize: 64, fontWeight: 'bold', marginVertical: 4 },
  scoreSubLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: spacing.base },
  scoreBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  scoreBtnText: { color: colors.text.white, fontWeight: '600' },
  eligibilityRow: { flexDirection: 'row', marginHorizontal: spacing.base, marginBottom: spacing.sm, gap: spacing.sm },
  pill: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    shadowColor: colors.midnightNavy,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pillValue: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  pillLabel: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  section: {
    margin: spacing.base,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm, color: colors.text.primary },
  tip: { flexDirection: 'row', marginBottom: spacing.sm },
  tipDot: { color: colors.brand.purple, marginRight: spacing.sm, fontSize: 16 },
  tipText: { flex: 1, color: colors.slateGray, fontSize: 14, lineHeight: 20 },
  emptyText: { color: colors.neutral[500], fontSize: 14 },
  offerCard: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  offerName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text.primary },
  badge: { backgroundColor: colors.tint.blue, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: colors.brand.sky, fontSize: 11, fontWeight: '600' },
  offerDetail: { color: colors.midGray, fontSize: 13, marginTop: 2 },
  offerCoins: { color: colors.primary[500], fontSize: 13, fontWeight: '600', marginTop: 4 },
});
