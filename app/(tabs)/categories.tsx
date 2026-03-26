import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, StatusBar, Platform, ScrollView, Dimensions, TextInput } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { CATEGORY_CONFIGS, SubcategoryItem } from '@/config/categoryConfig';
import { getSubcategoryIcon } from '@/config/categoryIcons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 4;
const ITEM_WIDTH = (SCREEN_WIDTH - 32) / NUM_COLUMNS;

// ============ INTERFACES ============
interface CategorySection {
  id: string;
  name: string;
  color: string;
  subcategories: SubcategoryItem[];
}

// Generate category sections from config
const CATEGORY_SECTIONS: CategorySection[] = Object.values(CATEGORY_CONFIGS).map((cat) => ({
  id: cat.slug,
  name: cat.name,
  color: cat.primaryColor,
  subcategories: cat.subcategories,
}));

// ============ MAIN COMPONENT ============
function CategoriesScreen() {
  const router = useRouter();

  // Handle wallet press - navigate to WalletScreen
  const handleWalletPress = () => {
    router.push('/wallet-screen');
  };

  // Handle subcategory press - navigate to StoreListPage
  const handleSubcategoryPress = useCallback(
    (subcategory: SubcategoryItem, parentSlug: string) => {
      router.push({
        pathname: '/StoreListPage',
        params: {
          category: subcategory.slug,
          parentCategory: parentSlug,
          title: subcategory.name,
        },
      } as any);
    },
    [router],
  );

  // Render subcategory item
  const renderSubcategoryItem = (item: SubcategoryItem, parentSlug: string, color: string) => {
    const customIcon = getSubcategoryIcon(item.slug);
    return (
      <Pressable
        key={item.slug}
        style={styles.gridItem}
        onPress={() => handleSubcategoryPress(item, parentSlug)}
        android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View style={[styles.itemCard, { backgroundColor: colors.background.secondary }]}>
          {customIcon ? (
            <CachedImage
              source={customIcon}
              style={styles.itemImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              recyclingKey={item.slug}
            />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Ionicons
                name={(item.icon as keyof typeof Ionicons.glyphMap) || 'grid-outline'}
                size={32}
                color={color}
              />
            </View>
          )}
        </View>
        <ThemedText style={styles.itemName} numberOfLines={2}>
          {item.name}
        </ThemedText>
      </Pressable>
    );
  };

  // Render category section
  const renderCategorySection = (section: CategorySection) => (
    <View key={section.id} style={styles.sectionContainer}>
      <ThemedText style={styles.sectionTitle}>{section.name}</ThemedText>
      <View style={styles.gridContainer}>
        {section.subcategories.map((sub) => renderSubcategoryItem(sub, section.id, section.color))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary[500]} />

      {/* Categories Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <ThemedText style={styles.headerTitle}>Categories</ThemedText>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerIcon}
              onPress={handleWalletPress}
              android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 20 }}
              accessibilityRole="button"
              accessibilityLabel="Open wallet"
            >
              <Ionicons name="wallet-outline" size={22} color={colors.text.primary} />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search' as any)}
          android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
          accessibilityRole="search"
          accessibilityLabel="Search categories"
          accessibilityHint="Tap to open search"
        >
          <Ionicons name="search" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories"
            placeholderTextColor={colors.text.tertiary}
            editable={false}
          />
          <Ionicons name="mic-outline" size={20} color={colors.text.tertiary} />
        </Pressable>
      </View>

      {/* Categories ScrollView */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORY_SECTIONS.map((section) => renderCategorySection(section))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: Colors.primary[500],
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: BorderRadius.xl,
    // MEERA: design token — hardcoded 'rgba(255,255,255,0.5)' -> colors.glass.light.backgroundColor (glass effect with white transparency)
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    // MEERA: design token — hardcoded gap: 10 -> Spacing.sm (8px, consistent 8px grid)
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: Shadows.md.shadowColor,
        shadowOffset: Shadows.md.shadowOffset,
        shadowOpacity: Shadows.md.shadowOpacity,
        shadowRadius: Shadows.md.shadowRadius,
      },
      android: {
        elevation: 3,
      },
      web: {
        // MEERA: design token — hardcoded inline shadow -> should use theme shadows token
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.bodyLarge.fontSize - 1,
    color: colors.text.primary,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
    paddingBottom: 120,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  itemCard: {
    width: ITEM_WIDTH - Spacing.md,
    height: ITEM_WIDTH - Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  itemImage: {
    width: '85%',
    height: '85%',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  itemName: {
    ...Typography.caption,
    color: Colors.gray[700],
    textAlign: 'center',
    // MEERA: design token — hardcoded marginTop: 6 -> Spacing.sm (8px, not in 8px grid); paddingHorizontal: 2 -> Spacing.xs (4px)
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  profileAvatar: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    // MEERA: design token — hardcoded '#F6D55C' (mustard variant) -> Colors.primary[400] (brand mustard)
    borderColor: Colors.primary[400],
  },
  profileText: {
    ...Typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
});

export default withErrorBoundary(CategoriesScreen, '(tabs)Categories');
