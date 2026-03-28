import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
// CategoryCashbackGrid removed per Section 6 handoff (category chips row removed)
import { colors, spacing } from '@/constants/theme';

// Updated to 4 tabs
export type TabId = 'near-u' | 'mall' | 'cash' | 'prive';

// Tab configuration with icons and descriptions
const TAB_CONFIG: Record<TabId, {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}> = {
  'near-u': {
    iconName: 'location-outline',
    label: 'Near U',
    description: 'Local discovery + payments',
  },
  'mall': {
    iconName: 'storefront-outline',
    label: 'Mall',
    description: 'Curated brands, fast delivery',
  },
  'cash': {
    iconName: 'wallet-outline',
    label: 'Cash',
    description: 'Affiliate cashback & coupons',
  },
  'prive': {
    iconName: 'diamond-outline',
    label: 'Privé',
    // Section 6: exact tagline from handoff
    description: 'Exclusive luxury & privileges',
  },
};

// Comprehensive theme configuration for each tab
const TAB_THEMES: Record<TabId, {
  heroGradient: string[];
  tabActiveColor: string;
  tabActiveTextColor: string;
  tabInactiveTextColor: string;
  categoryIconColor: string;
  containerBg: string;
}> = {
  'near-u': {
    heroGradient: ['#F9F6F1', '#F3EDE3', '#EDE5D8'],
    tabActiveColor: colors.nileBlue,
    tabActiveTextColor: colors.background.primary,
    tabInactiveTextColor: colors.nileBlue,
    categoryIconColor: colors.lightMustard,
    containerBg: '#EDE5D8',
  },
  'mall': {
    heroGradient: [colors.lavenderMist, '#e0edf7', colors.lavenderMist],
    tabActiveColor: colors.brand.sky,
    tabActiveTextColor: colors.background.primary,
    tabInactiveTextColor: colors.brand.sky,
    categoryIconColor: colors.brand.sky,
    containerBg: colors.lavenderMist,
  },
  'cash': {
    heroGradient: ['#FFF5EE', '#FFE5D0', colors.lightPeach], // Soft Peach gradient
    tabActiveColor: colors.lightPeach, // Light Peach
    tabActiveTextColor: colors.nileBlue, // Nile Blue for contrast
    tabInactiveTextColor: colors.brand.caramel, // Peach Dark
    categoryIconColor: colors.brand.caramel, // Peach Dark
    containerBg: colors.lightPeach, // Match hero gradient bottom for seamless transition
  },
  'prive': {
    heroGradient: [colors.neutral[800], colors.neutral[700], colors.neutral[600]],
    tabActiveColor: colors.brand.goldAccent,
    tabActiveTextColor: colors.brand.goldAccent,
    tabInactiveTextColor: colors.brand.goldAccent,
    categoryIconColor: colors.brand.goldAccent,
    containerBg: colors.neutral[900],
  },
};

// Tab position interface for curve calculations
interface TabLayout {
  x: number;
  width: number;
}

interface HomeTabSectionProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  onSearchPress: () => void;
  coinBalance?: number;
  onCoinPress?: () => void;
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  isPriveEligible?: boolean;
  onPriveLockedPress?: () => void;
}

// Tab order for layout calculations
const TAB_ORDER: TabId[] = ['near-u', 'mall', 'cash', 'prive'];

const HomeTabSection: React.FC<HomeTabSectionProps> = ({
  activeTab,
  onTabChange,
  onSearchPress,
  coinBalance = 0,
  onCoinPress,
  selectedCategory = 'all',
  onCategoryChange,
  isPriveEligible = false,
  onPriveLockedPress,
}) => {
  const router = useRouter();
  const theme = TAB_THEMES[activeTab];
  const isPriveMode = activeTab === 'prive';
  const [containerWidth, setContainerWidth] = useState(0);
  const [tabLayouts, setTabLayouts] = useState<Record<TabId, TabLayout>>({
    'near-u': { x: 0, width: 0 },
    'mall': { x: 0, width: 0 },
    'cash': { x: 0, width: 0 },
    'prive': { x: 0, width: 0 },
  });

  // Handle container layout measurement
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Handle individual tab layout measurement
  const handleTabLayout = useCallback((tabId: TabId, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts(prev => ({
      ...prev,
      [tabId]: { x: x + 9, width },
    }));
  }, []);

  // Handle Privé tab press - always switch to Privé tab
  // Eligibility is now handled inside PriveSectionContainer
  const handlePrivePress = useCallback(() => {
    onTabChange('prive');
  }, [onTabChange]);

  // Generate SVG path for curved background
  const generateCurvedPath = useCallback(() => {
    const activeLayout = tabLayouts[activeTab];
    if (!containerWidth || !activeLayout.width) return '';

    const curveRadius = 14;
    const tabRowBottom = 70;
    const tabTop = 6;
    const leftX = activeLayout.x + 2;
    const rightX = activeLayout.x + activeLayout.width - 2;
    const totalWidth = containerWidth;

    const path = `
      M 0 ${tabRowBottom}
      L ${Math.max(0, leftX - curveRadius)} ${tabRowBottom}
      C ${leftX - curveRadius / 2} ${tabRowBottom} ${leftX} ${tabRowBottom - curveRadius / 2} ${leftX} ${tabRowBottom - curveRadius}
      L ${leftX} ${tabTop + curveRadius}
      C ${leftX} ${tabTop + curveRadius / 2} ${leftX + curveRadius / 2} ${tabTop} ${leftX + curveRadius} ${tabTop}
      L ${rightX - curveRadius} ${tabTop}
      C ${rightX - curveRadius / 2} ${tabTop} ${rightX} ${tabTop + curveRadius / 2} ${rightX} ${tabTop + curveRadius}
      L ${rightX} ${tabRowBottom - curveRadius}
      C ${rightX} ${tabRowBottom - curveRadius / 2} ${rightX + curveRadius / 2} ${tabRowBottom} ${rightX + curveRadius} ${tabRowBottom}
      L ${totalWidth} ${tabRowBottom}
      L ${totalWidth} 350
      L 0 350
      Z
    `;
    return path;
  }, [activeTab, tabLayouts, containerWidth]);

  // Get container background based on mode
  const containerBg = isPriveMode
    ? colors.neutral[900]
    : activeTab === 'mall'
      ? colors.lavenderMist
      : activeTab === 'cash'
        ? colors.lightPeach
        : '#EDE5D8';

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]} onLayout={handleContainerLayout}>
      {/* SVG Curved Background — pointerEvents="none" is CRITICAL on Android.
          Without it the SVG bounding box (350px tall) swallows every touch in
          the content area below the tab row, making all buttons unresponsive. */}
      {containerWidth > 0 && (
        <View style={styles.svgContainer} pointerEvents="none">
          <Svg width={containerWidth} height={350} style={styles.svg} pointerEvents="none">
            <Path
              d={generateCurvedPath()}
              fill={theme.heroGradient[0]}
            />
          </Svg>
        </View>
      )}

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {/* Tab 1: Near U */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('near-u')}
          onLayout={(e) => handleTabLayout('near-u', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'near-u' ? styles.tabActiveTransparent : styles.tabInactive,
          ]}>
            {/* Section 6: icon 16x16 */}
            <Ionicons
              name={TAB_CONFIG['near-u'].iconName}
              size={16}
              color={colors.nileBlue}
              style={styles.tabIcon}
            />
            <Text
              numberOfLines={1}
              style={[styles.tabText, { color: colors.nileBlue }]}
            >{TAB_CONFIG['near-u'].label}</Text>
          </View>
        </Pressable>

        {/* Tab 2: Mall */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('mall')}
          onLayout={(e) => handleTabLayout('mall', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'mall' ? styles.tabActiveTransparent : styles.tabInactive,
          ]}>
            <Ionicons
              name={TAB_CONFIG['mall'].iconName}
              size={16}
              color={colors.brand.sky}
              style={styles.tabIcon}
            />
            <Text
              numberOfLines={1}
              style={[styles.tabText, { color: colors.brand.sky }]}
            >{TAB_CONFIG['mall'].label}</Text>
          </View>
        </Pressable>

        {/* Tab 3: Cash */}
        <Pressable
          style={styles.tabItem}
          onPress={() => onTabChange('cash')}
          onLayout={(e) => handleTabLayout('cash', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'cash' ? styles.tabActiveTransparent : styles.tabInactive,
          ]}>
            <Ionicons
              name={TAB_CONFIG['cash'].iconName}
              size={16}
              color={colors.brand.caramel}
              style={styles.tabIcon}
            />
            <Text
              numberOfLines={1}
              style={[styles.tabText, { color: colors.brand.caramel }]}
            >{TAB_CONFIG['cash'].label}</Text>
          </View>
        </Pressable>

        {/* Tab 4: Privé */}
        <Pressable
          style={styles.tabItem}
          onPress={handlePrivePress}
          onLayout={(e) => handleTabLayout('prive', e)}
        >
          <View style={[
            styles.tab,
            styles.tabPill,
            activeTab === 'prive'
              ? styles.tabActiveTransparent
              : [styles.tabInactive, !isPriveEligible && styles.tabLocked],
          ]}>
            <View style={styles.priveTabContent}>
              {!isPriveEligible && activeTab !== 'prive' && (
                <Ionicons
                  name="lock-closed-outline"
                  size={12}
                  color={colors.brand.goldAccent}
                  style={styles.lockIcon}
                />
              )}
              <Text
                numberOfLines={1}
                style={[styles.tabText, { color: colors.brand.goldAccent }]}
              >{TAB_CONFIG['prive'].label}</Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Middle section with dynamic gradient based on active tab */}
      <LinearGradient
        colors={theme.heroGradient as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.middleSection}
      >
        {/* Tab Description Section - Center */}
        <View style={styles.descriptionSection}>
          <Text style={[
            styles.descriptionText,
            {
              color: isPriveMode
                ? colors.brand.goldAccent
                : activeTab === 'mall'
                  ? colors.brand.sky
                  : activeTab === 'cash'
                    ? colors.brand.caramel // Nuqta Peach Dark
                    : colors.nileBlue
            }
          ]}>
            {TAB_CONFIG[activeTab].description}
          </Text>
        </View>

        {/* Section 6: Search row — pill search (~65% width) + TRY button. Hide for Cash tab. */}
        {activeTab !== 'cash' && (
          <View style={styles.searchRow}>
            {/* Section 6: pill shape search bar, 99px radius, ~65% width */}
            <Pressable
              style={[
                styles.searchContainerCompact,
                isPriveMode && styles.searchContainerPrive,
              ]}
              onPress={onSearchPress}
            >
              <Ionicons
                name="search"
                size={16}
                color={isPriveMode ? '#A0A0A0' : colors.neutral[400]}
                style={styles.searchIcon}
              />
              <Text style={[
                styles.searchPlaceholderCompact,
                isPriveMode && styles.searchPlaceholderPrive,
              ]}>
                {isPriveMode ? 'Search exclusive offers...' : 'Search products...'}
              </Text>
            </Pressable>

            {/* Section 6: TRY button — purple pill, color changes per tab */}
            <Pressable
              style={styles.promoBannerContainer}
              onPress={() => {
                isPriveMode
                  ? router.push('/offers' as any)
                  : router.push('/try' as any);
              }}
            >
              {isPriveMode ? (
                // Privé: #1a1a1a
                <View style={[styles.promoBannerGradientDeals, { backgroundColor: '#1a1a1a' }]}>
                  <Text style={styles.dealsIcon}>✦</Text>
                  <Text style={styles.dealsText}>TRY</Text>
                </View>
              ) : activeTab === 'mall' ? (
                // Mall: #185FA5
                <View style={[styles.promoBannerGradientDeals, { backgroundColor: '#185FA5' }]}>
                  <Text style={styles.dealsIcon}>🔥</Text>
                  <Text style={styles.dealsText}>TRY</Text>
                </View>
              ) : (
                // Near U: #6C3FD4 (purple)
                <View style={[styles.promoBannerGradientDeals, { backgroundColor: '#6C3FD4' }]}>
                  <Text style={styles.dealsIcon}>🔥</Text>
                  <Text style={styles.dealsText}>TRY</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Section 6: Category chips row REMOVED per handoff spec */}

        {/* Privé mode exclusive content teaser */}
        {isPriveMode && (
          <View style={styles.priveTeaser}>
            <Text style={styles.priveTeaserIcon}>✦</Text>
            <Text style={styles.priveTeaserText}>
              Exclusive offers for Privé members
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingBottom: 0,
    marginTop: -1,
    marginBottom: 0,
    position: 'relative',
    overflow: 'visible',
  },
  // SVG curved background
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  middleSection: {
    paddingTop: 8,
    paddingBottom: 6,
    marginBottom: -1,
    marginTop: 0,
    zIndex: 1,
    borderBottomWidth: 0,
  },
  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: 6,
    marginBottom: 4,
    zIndex: 2,
  },
  tabItem: {
    flex: 1,
  },
  // Section 6: horizontal pill — icon (16x16) + label side by side
  tab: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    flexDirection: 'row',
    gap: 5,
  },
  tabPill: {
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 40,
  },
  tabIcon: {
    // Icon size controlled by Ionicons size prop (16)
  },
  // Section 6: active tab — white card bg + shadow, 12px radius
  tabActiveTransparent: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(26,58,82,1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 1px 8px rgba(26,58,82,0.12)',
      },
    }),
  },
  // Section 6: inactive tab — no background, 35% opacity on text+icon
  tabInactive: {
    backgroundColor: 'transparent',
    opacity: 0.35,
  },
  tabLocked: {
    opacity: 0.25,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  priveTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockIcon: {
    marginLeft: 0,
  },
  // Description Section
  // Section 6: 11px centered tagline at 45% opacity
  descriptionSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 4,
    marginTop: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.nileBlue,
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.45,
  },
  descriptionTextPrive: {
    color: colors.brand.goldAccent,
  },
  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginBottom: 0,
    gap: 10,
  },
  // Section 6: pill shape (99px radius), ~65% width
  searchContainerCompact: {
    flex: 2,
    backgroundColor: colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 99,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  searchContainerPrive: {
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholderCompact: {
    fontSize: 13,
    color: colors.neutral[400],
    flex: 1,
  },
  searchPlaceholderPrive: {
    color: colors.neutral[500],
  },
  // Promotional Banner
  // Section 6: TRY button right of search
  promoBannerContainer: {
    flex: 1,
    borderRadius: 99,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  // Section 6: TRY pill button
  promoBannerGradientDeals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 99,
    gap: 5,
  },
  // Deals Button Styles (Orange Gradient)
  dealsIcon: {
    marginRight: 0,
  },
  // Section 6: TRY label — 800 weight
  dealsText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  // categoryCashbackGrid removed per Section 6 handoff
  // Privé teaser
  priveTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 6,
    gap: 6,
  },
  priveTeaserIcon: {
    fontSize: 16,
    color: colors.brand.goldAccent,
  },
  priveTeaserText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.brand.goldAccent,
    letterSpacing: 0.3,
  },
});

export default React.memo(HomeTabSection);
