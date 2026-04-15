import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import financeApi, { CreditScore, PartnerOffer } from '@/services/financeApi';
import { useToast } from '@/hooks/useToast';

export default function FinanceScreen() {
  const { showSuccess } = useToast();
  const [score, setScore] = useState<CreditScore | null>(null);
  const [offers, setOffers] = useState<PartnerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [scoreRes, offersRes] = await Promise.allSettled([financeApi.getScore(), financeApi.getOffers()]);
      if (scoreRes.status === 'fulfilled') setScore(scoreRes.value.data as CreditScore);
      if (offersRes.status === 'fulfilled') setOffers((offersRes.value.data as any).offers ?? []);
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
        <ActivityIndicator size="large" color="#6C3EE8" />
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scoreCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#6C3EE8',
    alignItems: 'center',
  },
  scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  scoreValue: { color: '#FFF', fontSize: 64, fontWeight: 'bold', marginVertical: 4 },
  scoreSubLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: 16 },
  scoreBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scoreBtnText: { color: '#FFF', fontWeight: '600' },
  eligibilityRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  pill: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pillValue: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  pillLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  section: { margin: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1A1A1A' },
  tip: { flexDirection: 'row', marginBottom: 8 },
  tipDot: { color: '#6C3EE8', marginRight: 8, fontSize: 16 },
  tipText: { flex: 1, color: '#444', fontSize: 14, lineHeight: 20 },
  emptyText: { color: '#999', fontSize: 14 },
  offerCard: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  offerName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  badge: { backgroundColor: '#E8F4FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#0066CC', fontSize: 11, fontWeight: '600' },
  offerDetail: { color: '#666', fontSize: 13, marginTop: 2 },
  offerCoins: { color: '#F0A500', fontSize: 13, fontWeight: '600', marginTop: 4 },
});
