/**
 * /near-u/express
 *
 * Express delivery hub — 30-minute delivery from nearby stores.
 * Primarily surfaced in the corporate persona quick-links.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/constants/theme';

const EXPRESS_CATEGORIES = [
  { id: 'lunch', emoji: '🍱', label: 'Lunch', sublabel: '15–25 min', color: '#F0F9FF' },
  { id: 'coffee', emoji: '☕', label: 'Coffee', sublabel: '10–15 min', color: '#FFFBEB' },
  { id: 'snacks', emoji: '🥐', label: 'Snacks', sublabel: '10–20 min', color: '#FFF7ED' },
  { id: 'medicine', emoji: '💊', label: 'Pharmacy', sublabel: '20–30 min', color: '#F0FDF4' },
  { id: 'grocery', emoji: '🛒', label: 'Grocery', sublabel: '25–35 min', color: '#F5F3FF' },
  { id: 'dessert', emoji: '🍰', label: 'Desserts', sublabel: '15–25 min', color: '#FFF1F2' },
];

export default function ExpressScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe as any} edges={['top']}>
      <View style={styles.header as any}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn as any}>
          <Ionicons name="chevron-back" size={24} color={colors.text?.primary || '#111'} />
        </Pressable>
        <Text style={styles.headerTitle as any}>Express ⚡</Text>
        <View style={styles.headerRight as any} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content as any}>
        {/* Hero */}
        <LinearGradient
          colors={['#0EA5E9', '#38BDF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero as any}
        >
          <View style={styles.blobDecor as any} />
          <View style={styles.heroInner as any}>
            <View style={styles.heroText as any}>
              <Text style={styles.heroTitle as any}>⚡ 30-Minute Delivery</Text>
              <Text style={styles.heroSub as any}>
                Get anything you need delivered fast — lunch, coffee, meds & more
              </Text>
            </View>
            <Text style={styles.heroEmoji as any}>🏃</Text>
          </View>
          <View style={styles.heroBadge as any}>
            <Ionicons name="time" size={12} color="#fff" />
            <Text style={styles.heroBadgeText as any}>Live ETA shown at checkout</Text>
          </View>
        </LinearGradient>

        {/* How it works */}
        <View style={styles.howItWorks as any}>
          {[
            { icon: 'search', step: '1', text: 'Pick a category' },
            { icon: 'cart', step: '2', text: 'Add to cart' },
            { icon: 'bicycle', step: '3', text: 'Delivered in 30 min' },
          ].map((item, i) => (
            <View key={i} style={styles.howStep as any}>
              <View style={styles.howIconWrap as any}>
                <Ionicons name={item.icon as any} size={18} color="#0EA5E9" />
              </View>
              <Text style={styles.howText as any}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Category grid */}
        <Text style={styles.sectionTitle as any}>What do you need?</Text>
        <View style={styles.grid as any}>
          {EXPRESS_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.categoryCard as any, { backgroundColor: cat.color }]}
              onPress={() =>
                router.push({
                  pathname: '/StoreListPage',
                  params: { category: cat.id, deliveryType: 'express', sort: 'delivery_time' },
                } as any)
              }
            >
              <Text style={styles.catEmoji as any}>{cat.emoji}</Text>
              <Text style={styles.catLabel as any}>{cat.label}</Text>
              <Text style={styles.catSublabel as any}>{cat.sublabel}</Text>
            </Pressable>
          ))}
        </View>

        {/* All express stores */}
        <Pressable
          style={styles.allBtn as any}
          onPress={() =>
            router.push({
              pathname: '/StoreListPage',
              params: { deliveryType: 'express', sort: 'delivery_time' },
            } as any)
          }
        >
          <Ionicons name="flash" size={18} color="#fff" />
          <Text style={styles.allBtnText as any}>Browse all express stores</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary || '#fff' },
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
  blobDecor: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroText: { flex: 1, paddingRight: 12 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  heroEmoji: { fontSize: 44 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  heroBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  howItWorks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: spacing.lg,
    marginTop: 20,
    backgroundColor: '#F0F9FF',
    borderRadius: borderRadius.xl,
    padding: 16,
  },
  howStep: { alignItems: 'center', gap: 6, flex: 1 },
  howIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  howText: { fontSize: 11, fontWeight: '600', color: '#0369A1', textAlign: 'center' },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text?.primary || '#111',
    marginHorizontal: spacing.lg,
    marginTop: 24,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: 10 },
  categoryCard: {
    width: '47%',
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  catEmoji: { fontSize: 28, marginBottom: 6 },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  catSublabel: { fontSize: 11, color: '#6B7280' },

  allBtn: {
    marginHorizontal: spacing.lg,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: '#0EA5E9',
  },
  allBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
