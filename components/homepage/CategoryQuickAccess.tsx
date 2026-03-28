/**
 * CategoryQuickAccess — Horizontal scrollable category chip strip.
 *
 * Design: white cards, subtle shadow, Nile Blue text + emoji icons.
 * Placed above the main feed as the first section for instant navigation.
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const NILE_BLUE = '#1a3a52';
const MUSTARD   = '#FFC857';
const BORDER    = '#E8EDF2';
const BG        = '#FFFFFF';

// ── Category data ─────────────────────────────────────────────────────────────
interface Category {
  id: string;
  emoji: string;
  label: string;
  route: string;
}

const CATEGORIES: Category[] = [
  { id: 'food',        emoji: '🍕',  label: 'Food & Dining',      route: '/categories/food-dining' },
  { id: 'cafes',       emoji: '☕',  label: 'Cafes',              route: '/categories/cafes' },
  { id: 'shopping',    emoji: '🛍️',  label: 'Shopping',           route: '/categories/shopping' },
  { id: 'health',      emoji: '💊',  label: 'Health',             route: '/categories/health-wellness' },
  { id: 'entertain',   emoji: '🎬',  label: 'Entertainment',      route: '/categories/entertainment' },
  { id: 'beauty',      emoji: '💇',  label: 'Beauty & Salon',     route: '/categories/beauty-salon' },
  { id: 'fitness',     emoji: '🏋️',  label: 'Fitness',            route: '/categories/fitness' },
  { id: 'education',   emoji: '📚',  label: 'Education',          route: '/categories/education' },
];

// ── Single chip ───────────────────────────────────────────────────────────────
interface ChipProps {
  category: Category;
  onPress: (id: string, route: string) => void;
}

const CategoryChip: React.FC<ChipProps> = memo(({ category, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(category.id, category.route);
  }, [category.id, category.route, onPress]);

  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${category.label}`}
      accessibilityHint={`Tap to explore ${category.label} deals`}
    >
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{category.emoji}</Text>
      </View>
      <Text style={styles.label} numberOfLines={1}>{category.label}</Text>
    </Pressable>
  );
});

// ── Main Component ────────────────────────────────────────────────────────────
const CategoryQuickAccess: React.FC = () => {
  const router = useRouter();

  const handleCategoryPress = useCallback((id: string, route: string) => {
    try {
      router.push(route as any);
    } catch {
      // Route may not exist yet — fail silently
      router.push('/categories' as any);
    }
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <Pressable
          onPress={() => router.push('/categories' as any)}
          accessibilityRole="button"
          accessibilityLabel="See all categories"
          hitSlop={8}
        >
          <Text style={styles.seeAll}>See all →</Text>
        </Pressable>
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={false}
        bounces={true}
        decelerationRate="fast"
      >
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.id}
            category={cat}
            onPress={handleCategoryPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NILE_BLUE,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: MUSTARD,
  },

  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },

  chip: {
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 72,
    maxWidth: 88,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  chipPressed: {
    opacity: 0.80,
    transform: [{ scale: 0.96 }],
  },

  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: NILE_BLUE,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});

export default memo(CategoryQuickAccess);
