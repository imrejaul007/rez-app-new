/**
 * /near-u/budget
 *
 * Budget-friendly deals — stores and offers under ₹199.
 * Primarily for the student persona but open to everyone.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/constants/theme';

const BUDGET_FILTERS = [
  { id: 'under49', label: 'Under ₹49', emoji: '🤑', maxPrice: 49 },
  { id: 'under99', label: 'Under ₹99', emoji: '💰', maxPrice: 99 },
  { id: 'under149', label: 'Under ₹149', emoji: '🏷️', maxPrice: 149 },
  { id: 'under199', label: 'Under ₹199', emoji: '🛍️', maxPrice: 199 },
];

const BUDGET_CATEGORIES = [
  { id: 'street-food', emoji: '🌮', label: 'Street Food', color: '#FFF7ED' },
  { id: 'cafe', emoji: '☕', label: 'Cafes', color: '#FFFBEB' },
  { id: 'grocery', emoji: '🥬', label: 'Grocery', color: '#F0FDF4' },
  { id: 'snacks', emoji: '🍟', label: 'Snacks', color: '#FEF9C3' },
  { id: 'bakery', emoji: '🥐', label: 'Bakery', color: '#FFF1F2' },
  { id: 'juice', emoji: '🥤', label: 'Juice Bar', color: '#F0FDF4' },
];

export default function BudgetScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text?.primary || '#111'} />
        </Pressable>
        <Text style={styles.headerTitle}>Budget Deals</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <LinearGradient colors={['#F59E0B', '#FDE68A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroInner}>
            <View>
              <Text style={styles.heroTitle}>🏷️ Great deals await</Text>
              <Text style={styles.heroSub}>Discover amazing offers under ₹199 near you</Text>
            </View>
            <Text style={styles.heroEmoji}>💸</Text>
          </View>
        </LinearGradient>

        {/* Price filter pills */}
        <Text style={styles.sectionTitle}>Filter by price</Text>
        <View style={styles.pillRow}>
          {BUDGET_FILTERS.map((f) => (
            <Pressable
              key={f.id}
              style={styles.pill}
              onPress={() =>
                router.push({
                  pathname: '/StoreListPage',
                  params: { maxPrice: f.maxPrice, sort: 'price_low' },
                } as any)
              }
            >
              <Text style={styles.pillEmoji}>{f.emoji}</Text>
              <Text style={styles.pillLabel}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Category grid */}
        <Text style={styles.sectionTitle}>Browse categories</Text>
        <View style={styles.grid}>
          {BUDGET_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: cat.color }]}
              onPress={() =>
                router.push({
                  pathname: '/StoreListPage',
                  params: { category: cat.id, maxPrice: 199, sort: 'price_low' },
                } as any)
              }
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* All budget deals CTA */}
        <Pressable
          style={styles.allDealsBtn}
          onPress={() =>
            router.push({
              pathname: '/StoreListPage',
              params: { maxPrice: 199, sort: 'price_low' },
            } as any)
          }
        >
          <Text style={styles.allDealsBtnText}>See all deals under ₹199</Text>
          <Ionicons name="arrow-forward" size={16} color="#F59E0B" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background || '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { width: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text?.primary || '#111' },
  headerRight: { width: 32 },
  content: { paddingBottom: 40 },

  hero: { margin: spacing.lg, borderRadius: borderRadius.xl, padding: 20, overflow: 'hidden' },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#78350F', marginBottom: 4 },
  heroSub: { fontSize: 12, color: '#92400E', maxWidth: '80%', lineHeight: 18 },
  heroEmoji: { fontSize: 44, opacity: 0.85 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text?.primary || '#111',
    marginHorizontal: spacing.lg,
    marginTop: 20,
    marginBottom: 12,
  },
  pillRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pillEmoji: { fontSize: 14 },
  pillLabel: { fontSize: 13, fontWeight: '600', color: '#78350F' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: 10 },
  categoryCard: {
    width: '30%',
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  catEmoji: { fontSize: 28, marginBottom: 6 },
  catLabel: { fontSize: 12, fontWeight: '700', color: '#111', textAlign: 'center' },

  allDealsBtn: {
    marginHorizontal: spacing.lg,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  allDealsBtnText: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
});
