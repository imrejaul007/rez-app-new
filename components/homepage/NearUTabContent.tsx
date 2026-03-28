/**
 * Near-U Tab Content
 *
 * Rebuilt to match the 24-section order from the developer handoff (Section 10).
 * Only Near-U / persona-specific sections are here; category verticals and
 * discovery sections have moved to the categories page.
 *
 * Section order:
 *  1.  TimeAwareContextPill   (Near U only)
 *  2.  DailyCheckInStrip      (Near U only)
 *  3.  CampusLeaderboardTeaser (Student only)
 *  4.  VisitStreakCard         (Near U only)
 *  5.  TryBeforeYouBuyCard    (Near U only)
 *  6.  NearbyOffersCarousel   (Near U only) — with urgency tags
 *  7.  CampusHotDealsStrip    (Student only)
 *  8.  StudentBudgetFoodGrid  (Student only)
 *  9.  StudentEntertainmentSection (Student only)
 *  10. StudentUtilityDealsSection  (Student only)
 *  11. StudentMicroPrepaidPacks    (Student only)
 *  12. EmployeeLunchDealsSection   (Employee only, 11-14h)
 *  13. EmployeeAfterWorkSection    (Employee only, 17h+)
 *  14. EmployeeWellnessBookingSection (Employee only)
 *  15. EmployeeValuePacksSection   (Employee only)
 *  16. StoriesRow / What's New     → moved to index.tsx (was duplicating)
 *  17. PersonalizedHeroBanner      → moved to index.tsx (was duplicating)
 *  18. StreakFireIcon + RezScoreCard → moved to index.tsx (was duplicating)
 *  19. HomeSavingsSummaryCard      (Always) — wired with unlockAmount
 *  20. QuickReorderSection         (featureLevel >= 3)
 *  21. BonusZoneHighlight + FlashDealCountdown (Always)
 *  22. TrendingNearYou             (Always)
 *  23. EarnRezCoinsSection + PlayAndEarnSectionV2 (Always)
 *  24. GlobeBanner                 (Always)
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

import LazySection from '@/components/homepage/LazySection';
import HomeSavingsSummaryCard from '@/components/homepage/HomeSavingsSummaryCard';
import EarnRezCoinsSection from '@/components/homepage/EarnRezCoinsSection';
import BonusZoneHighlight from '@/components/homepage/BonusZoneHighlight';
import GlobeBanner from '@/components/homepage/GlobeBanner';
import PlayAndEarnSectionV2 from '@/components/homepage/PlayAndEarnSectionV2';
import QuickReorderSection from '@/components/homepage/QuickReorderSection';

import TrendingNearYou from '@/components/homepage/TrendingNearYou';

// Student-specific sections
import CampusHotDealsStrip from '@/components/homepage/sections/CampusHotDealsStrip';
import StudentBudgetFoodGrid from '@/components/homepage/sections/StudentBudgetFoodGrid';
import StudentEntertainmentSection from '@/components/homepage/sections/StudentEntertainmentSection';
import StudentUtilityDealsSection from '@/components/homepage/sections/StudentUtilityDealsSection';
import StudentMicroPrepaidPacks from '@/components/homepage/sections/StudentMicroPrepaidPacks';

// Employee-specific sections
import EmployeeLunchDealsSection from '@/components/homepage/sections/EmployeeLunchDealsSection';
import EmployeeAfterWorkSection from '@/components/homepage/sections/EmployeeAfterWorkSection';
import EmployeeWellnessBookingSection from '@/components/homepage/sections/EmployeeWellnessBookingSection';
import EmployeeValuePacksSection from '@/components/homepage/sections/EmployeeValuePacksSection';

// New components created by Agent 1 — will be at these paths once generated
import TimeAwareContextPill from '@/components/homepage/TimeAwareContextPill';
import DailyCheckInStrip from '@/components/homepage/DailyCheckInStrip';
import CampusLeaderboardTeaser from '@/components/homepage/CampusLeaderboardTeaser';
import VisitStreakCard from '@/components/homepage/VisitStreakCard';
import TryBeforeYouBuyCard from '@/components/homepage/TryBeforeYouBuyCard';
import NearbyOffersCarousel from '@/components/discovery/NearbyOffersCarousel';
// StoriesRow, PersonalizedHeroBanner, RezScoreCard removed — rendered by index.tsx to avoid duplicates

import { useHomePersona } from '@/hooks/useHomePersona';
import { useWalletStore } from '@/stores/walletStore';

// ─── Placeholder data ─────────────────────────────────────────────────────────

const PLACEHOLDER_OFFERS = [
  { id: '1', merchantName: 'Starbucks', distance: '120m', savings: 80, description: '15% cashback on every order', urgencyLabel: 'Open', closingSoon: false },
  { id: '2', merchantName: 'Naturals', distance: '0.3km', savings: 0, description: 'Free haircut trial today', urgencyLabel: '3 slots left', slotsLeft: 3 },
  { id: '3', merchantName: 'PVR', distance: '0.4km', savings: 50, description: 'Buy 2 get 1 — lunch show', urgencyLabel: 'Closes 3 PM', closingSoon: true },
  { id: '4', merchantName: 'Cult.fit', distance: '1.2km', savings: 0, description: 'Free trial class, 5 PM batch', urgencyLabel: '1 slot', slotsLeft: 1 },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface NearUTabContentProps {
  state: any;
  actions: any;
  handleItemPress: (sectionId: string, item: any) => void;
  handleAddToCart: (item: any) => void;
  voucherCount: number;
  userPoints: number;
  newOffersCount: number;
  recentlyViewedItems: any[];
  isLoadingRecentlyViewed: boolean;
  loyaltyHub: any;
  featuredLockProduct: any;
  trendingService: any;
  isLoyaltySectionLoading: boolean;
  scrollY: SharedValue<number>;
  totalSaved?: number;
  thisMonthSaved?: number;
  currencySymbol?: string;
  featureLevel?: number;
  hasCompletedFirstOrder?: boolean;
  isAreaServiceable?: boolean;
  areaName?: string;
  onSwitchToMall?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const NearUTabContent: React.FC<NearUTabContentProps> = ({
  state,
  actions,
  handleItemPress,
  handleAddToCart,
  voucherCount,
  userPoints,
  newOffersCount,
  recentlyViewedItems,
  isLoadingRecentlyViewed,
  loyaltyHub,
  featuredLockProduct,
  trendingService,
  isLoyaltySectionLoading,
  scrollY,
  totalSaved,
  thisMonthSaved,
  currencySymbol,
  featureLevel = 1,
  hasCompletedFirstOrder = false,
  isAreaServiceable = true,
  areaName,
  onSwitchToMall,
}) => {
  const router = useRouter();
  const persona = useHomePersona();

  // Derive persona flags from the hook
  const isStudent = persona.id === 'student';
  const isEmployee = persona.id === 'corporate';
  const isGeneral = persona.id === 'general';

  // Time-aware flags for employee sections
  const _now = new Date();
  const _currentHour = _now.getHours();
  const _currentDay = _now.getDay(); // 0 = Sunday, 6 = Saturday
  const _isWeekend = _currentDay === 0 || _currentDay === 6;
  const _isLunchWindow = _currentHour >= 11 && _currentHour < 14;
  const _isAfterWorkWindow = _isWeekend || _currentHour >= 17;

  // Wallet data for HomeSavingsSummaryCard unlockAmount
  const walletData = useWalletStore();
  const unlockAmount = (walletData as any)?.unlockAmount ?? (walletData as any)?.lockedBalance ?? undefined;

  // Area not-serviceable dismissible banner
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [renderError, setRenderError] = useState<Error | null>(null);

  // Safety-net: if something inside the tab throws during render, show a
  // graceful fallback instead of crashing the whole screen.
  if (renderError) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>
          Near-U content couldn't load. Please refresh.
        </Text>
      </View>
    );
  }

  try {
  return (
    <>
      {/* Coming-soon banner — shown when user is outside serviceable area */}
      {!isAreaServiceable && !bannerDismissed && (
        <View style={{
          backgroundColor: '#FFF8E1',
          borderRadius: 0,
          padding: 14,
          marginHorizontal: 0,
          marginTop: 0,
          marginBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderBottomWidth: 1,
          borderColor: '#FFD54F',
        }}>
          <Ionicons name="location-outline" size={22} color="#5D4037" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#5D4037' }}>
              Near U is coming soon{areaName ? ` in ${areaName}` : ' in your area'}
            </Text>
            <Text style={{ fontSize: 12, color: '#795548', marginTop: 3 }}>
              Meanwhile, shop from top brands across India on REZ Mall.
            </Text>
          </View>
          {onSwitchToMall && (
            <Pressable
              onPress={onSwitchToMall}
              style={{
                backgroundColor: colors.nileBlue,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
              accessibilityRole="button"
              accessibilityLabel="Switch to REZ Mall"
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Mall</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setBannerDismissed(true)}
            style={{ padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss banner"
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color="#94a3b8" />
          </Pressable>
        </View>
      )}

      {/* ── Section 1: TimeAwareContextPill (Near U only) ──────────────────── */}
      <LazySection sectionId="time-aware-context-pill" scrollY={scrollY} height={56}
        renderSection={() => {
          try { return <TimeAwareContextPill persona={isStudent ? 'student' : isEmployee ? 'employee' : 'general'} />; }
          catch { return null; }
        }} />

      {/* ── Section 2: DailyCheckInStrip (Near U only) ─────────────────────── */}
      <LazySection sectionId="daily-check-in-strip" scrollY={scrollY} height={80}
        renderSection={() => {
          try { return <DailyCheckInStrip isClaimed={false} />; }
          catch { return null; }
        }} />

      {/* ── Section 3: CampusLeaderboardTeaser (Student only) ──────────────── */}
      {isStudent && (
        <LazySection sectionId="campus-leaderboard-teaser" scrollY={scrollY} height={160}
          renderSection={() => <CampusLeaderboardTeaser />} />
      )}

      {/* ── Section 4: VisitStreakCard (Near U only) ────────────────────────── */}
      <LazySection sectionId="visit-streak-card" scrollY={scrollY} height={120}
        renderSection={() => {
          try { return <VisitStreakCard />; }
          catch { return null; }
        }} />

      {/* ── Section 5: TryBeforeYouBuyCard (Near U only) ───────────────────── */}
      <LazySection sectionId="try-before-you-buy" scrollY={scrollY} height={180}
        renderSection={() => {
          try { return <TryBeforeYouBuyCard />; }
          catch { return null; }
        }} />

      {/* ── Section 6: NearbyOffersCarousel (Near U only) — with urgency tags ─ */}
      <LazySection sectionId="nearby-offers-carousel" scrollY={scrollY} height={240}
        renderSection={() => (
          <NearbyOffersCarousel
            offers={PLACEHOLDER_OFFERS}
            onOfferPress={() => {}}
            onSeeAllPress={() => router.push('/near-u/map' as any)}
            showUrgencyTags
          />
        )} />

      {/* ── Section 7-11: Student persona sections ─────────────────────────── */}
      {isStudent && (
        <>
          {/* Section 7: CampusHotDealsStrip */}
          <LazySection sectionId="campus-hot-deals" scrollY={scrollY} height={240}
            renderSection={() => <CampusHotDealsStrip />} />

          {/* Section 8: StudentBudgetFoodGrid */}
          <LazySection sectionId="student-budget-food" scrollY={scrollY} height={380}
            renderSection={() => <StudentBudgetFoodGrid />} />

          {/* Section 9: StudentEntertainmentSection */}
          <LazySection sectionId="student-entertainment" scrollY={scrollY} height={280}
            renderSection={() => <StudentEntertainmentSection />} />

          {/* Section 10: StudentUtilityDealsSection */}
          <LazySection sectionId="student-utility-deals" scrollY={scrollY} height={320}
            renderSection={() => <StudentUtilityDealsSection />} />

          {/* Section 11: StudentMicroPrepaidPacks */}
          <LazySection sectionId="student-micro-packs" scrollY={scrollY} height={220}
            renderSection={() => <StudentMicroPrepaidPacks />} />
        </>
      )}

      {/* ── Section 12-15: Employee persona sections ───────────────────────── */}
      {isEmployee && (
        <>
          {/* Section 12: EmployeeLunchDealsSection (11-14h) */}
          {_isLunchWindow && (
            <LazySection sectionId="employee-lunch-deals" scrollY={scrollY} height={340}
              renderSection={() => <EmployeeLunchDealsSection />} />
          )}

          {/* Section 13: EmployeeAfterWorkSection (17h+) */}
          {_isAfterWorkWindow && !_isLunchWindow && (
            <LazySection sectionId="employee-after-work" scrollY={scrollY} height={360}
              renderSection={() => <EmployeeAfterWorkSection />} />
          )}

          {/* Outside both windows — show lunch section as preview */}
          {!_isLunchWindow && !_isAfterWorkWindow && (
            <LazySection sectionId="employee-lunch-preview" scrollY={scrollY} height={340}
              renderSection={() => <EmployeeLunchDealsSection />} />
          )}

          {/* Section 14: EmployeeWellnessBookingSection */}
          <LazySection sectionId="employee-wellness-booking" scrollY={scrollY} height={380}
            renderSection={() => <EmployeeWellnessBookingSection />} />

          {/* Section 15: EmployeeValuePacksSection */}
          <LazySection sectionId="employee-value-packs" scrollY={scrollY} height={480}
            renderSection={() => <EmployeeValuePacksSection />} />
        </>
      )}

      {/* ── Section 19: HomeSavingsSummaryCard (Always) ─────────────────────── */}
      {/* NOTE: StoriesRow (16), PersonalizedHeroBanner (17), RezScoreCard (18)
          are rendered by index.tsx above the content area to avoid duplication */}
      <HomeSavingsSummaryCard
        totalSaved={totalSaved ?? 0}
        thisMonthSaved={thisMonthSaved ?? 0}
        currencySymbol={currencySymbol ?? '\u20B9'}
        unlockAmount={unlockAmount}
        onPress={() => router.push('/wallet-screen')}
      />

      {/* ── Section 20: QuickReorderSection (featureLevel >= 3) ────────────── */}
      {(featureLevel >= 3 || hasCompletedFirstOrder) && (
        <QuickReorderSection />
      )}

      {/* ── Section 21: BonusZoneHighlight (Always) ───── */}
      <LazySection sectionId="bonus-zone" scrollY={scrollY} height={260}
        renderSection={() => <BonusZoneHighlight />} />

      {/* ── Section 22: TrendingNearYou (Always) ────────────────────────────── */}
      <LazySection sectionId="trending-near-you" scrollY={scrollY} height={300}
        renderSection={() => <TrendingNearYou />} />

      {/* ── Section 23: EarnRezCoinsSection + PlayAndEarnSectionV2 (Always) ── */}
      <EarnRezCoinsSection />
      {featureLevel >= 5 && (
        <LazySection sectionId="play-and-earn" scrollY={scrollY} height={250}
          renderSection={() => <PlayAndEarnSectionV2 />} />
      )}

      {/* ── Section 24: GlobeBanner (Always) ────────────────────────────────── */}
      <LazySection sectionId="globe-banner" scrollY={scrollY} height={200}
        renderSection={() => <GlobeBanner />} />
    </>
  );
  } catch (e) {
    // Schedule state update outside the render cycle to avoid React warnings
    setTimeout(() => setRenderError(e instanceof Error ? e : new Error(String(e))), 0);
    return null;
  }
};

export default React.memo(NearUTabContent);
