/**
 * Lazy-Loaded Services
 *
 * Heavy services that can be dynamically imported
 * Reduces initial bundle size for services not needed at startup
 */

// ============================================================================
// Video Services (High Impact)
// ============================================================================

export const lazyVideoUploadService = () =>
  import('@/services/videoUploadService').then((module: any) => module.default || module);

export const lazyVideoPreloadService = () =>
  import('@/services/videoPreloadService').then((module: any) => module.default || module);

export const lazyRealVideosApi = () =>
  import('@/services/realVideosApi').then((module: any) => module.default || module);

// ============================================================================
// Payment Services (High Impact)
// ============================================================================

export const lazyRazorpayService = () =>
  import('@/services/razorpayService').then((module: any) => module.default || module);

export const lazyRazorpayApi = () =>
  import('@/services/razorpayApi').then((module: any) => module.default || module);

export const lazyPaymentOrchestratorService = () =>
  import('@/services/paymentOrchestratorService').then((module: any) => module.default || module);

export const lazyPaymentService = () =>
  import('@/services/paymentService').then((module: any) => module.default || module);

export const lazyPaymentVerificationService = () =>
  import('@/services/paymentVerificationService').then((module: any) => module.default || module);

// ============================================================================
// Upload Services (High Impact)
// ============================================================================

export const lazyBillUploadService = () =>
  import('@/services/billUploadService').then((module: any) => module.default || module);

export const lazyBillUploadQueueService = () =>
  import('@/services/billUploadQueueService').then((module: any) => module.default || module);

export const lazyProjectUploadService = () =>
  import('@/services/projectUploadService').then((module: any) => module.default || module);

export const lazyImageUploadService = () =>
  import('@/services/imageUploadService').then((module: any) => module.default || module);

export const lazyFileUploadService = () =>
  import('@/services/fileUploadService').then((module: any) => module.default || module);

// ============================================================================
// Real-Time Services (Medium Impact)
// ============================================================================

export const lazyRealTimeService = () =>
  import('@/services/realTimeService').then((module: any) => module.default || module);

export const lazyGlobalNotificationService = () =>
  import('@/services/globalNotificationService').then((module: any) => module.default || module);

export const lazyEarningsNotificationService = () =>
  import('@/services/earningsNotificationService').then((module: any) => module.default || module);

// ============================================================================
// Gamification Services (Medium Impact)
// ============================================================================

export const lazyGamificationApi = () =>
  import('@/services/gamificationApi').then((module: any) => module.default || module);

export const lazyGamificationCacheService = () =>
  import('@/services/gamificationCacheService').then((module: any) => module.default || module);

export const lazyGamificationPerformanceMonitor = () =>
  import('@/services/gamificationPerformanceMonitor').then((module: any) => module.default || module);

export const lazyGamificationTriggerService = () =>
  import('@/services/gamificationTriggerService').then((module: any) => module.default || module);

// ============================================================================
// Social & Activity Services (Medium Impact)
// ============================================================================

export const lazyFollowApi = () =>
  import('@/services/followApi').then((module: any) => module.default || module);

export const lazyActivityFeedApi = () =>
  import('@/services/activityFeedApi').then((module: any) => module.default || module);

export const lazySocialMediaApi = () =>
  import('@/services/socialMediaApi').then((module: any) => module.default || module);

export const lazyUGCApi = () =>
  import('@/services/ugcApi').then((module: any) => module.default || module);

// ============================================================================
// Subscription Services (Medium Impact)
// ============================================================================

export const lazySubscriptionApi = () =>
  import('@/services/subscriptionApi').then((module: any) => module.default || module);

// ============================================================================
// Analytics & Monitoring Services (Medium Impact)
// ============================================================================

export const lazyAnalyticsService = () =>
  import('@/services/analyticsService').then((module: any) => module.default || module);

export const lazyBillUploadAnalytics = () =>
  import('@/services/billUploadAnalytics').then(module => module.billUploadAnalytics);

export const lazyTelemetryService = () =>
  import('@/services/telemetryService').then((module: any) => module.default || module);

export const lazyWalletPerformanceMonitor = () =>
  import('@/services/walletPerformanceMonitor').then((module: any) => module.default || module);

// ============================================================================
// Search Services (Medium Impact)
// ============================================================================

export const lazySearchService = () =>
  import('@/services/searchService').then((module: any) => module.default || module);

export const lazySearchApi = () =>
  import('@/services/searchApi').then((module: any) => module.default || module);

export const lazySearchCacheService = () =>
  import('@/services/searchCacheService').then((module: any) => module.default || module);

export const lazySearchAnalyticsService = () =>
  import('@/services/searchAnalyticsService').then((module: any) => module.default || module);

export const lazySearchHistoryService = () =>
  import('@/services/searchHistoryService').then((module: any) => module.default || module);

export const lazyStoreSearchService = () =>
  import('@/services/storeSearchService').then((module: any) => module.default || module);

// ============================================================================
// Verification & Security Services (Medium Impact)
// ============================================================================

export const lazyBillVerificationService = () =>
  import('@/services/billVerificationService').then((module: any) => module.default || module);

export const lazyFraudDetectionService = () =>
  import('@/services/fraudDetectionService').then((module: any) => module.default || module);

export const lazySecurityService = () =>
  import('@/services/securityService').then((module: any) => module.default || module);

export const lazyInstagramVerificationService = () =>
  import('@/services/instagramVerificationService').then((module: any) => module.default || module);

// ============================================================================
// Image Processing Services (Medium Impact)
// ============================================================================

export const lazyImageHashService = () =>
  import('@/services/imageHashService').then((module: any) => module.default || module);

export const lazyImageQualityService = () =>
  import('@/services/imageQualityService').then((module: any) => module.default || module);

// ============================================================================
// Group Buying Services (Low Impact)
// ============================================================================

export const lazyGroupBuyingApi = () =>
  import('@/services/groupBuyingApi').then((module: any) => module.default || module);

// ============================================================================
// Loyalty Services (Low Impact)
// ============================================================================

export const lazyLoyaltyApi = () =>
  import('@/services/loyaltyApi').then((module: any) => module.default || module);

export const lazyLoyaltyRedemptionApi = () =>
  import('@/services/loyaltyRedemptionApi').then((module: any) => module.default || module);

// ============================================================================
// Referral Services (Low Impact)
// ============================================================================

export const lazyReferralApi = () =>
  import('@/services/referralApi').then((module: any) => module.default || module);

export const lazyReferralTierApi = () =>
  import('@/services/referralTierApi').then((module: any) => module.default || module);

// ============================================================================
// Event Services (Low Impact)
// ============================================================================

export const lazyEventsApi = () =>
  import('@/services/eventsApi').then((module: any) => module.default || module);

export const lazyEventAnalytics = () =>
  import('@/services/eventAnalytics').then((module: any) => module.default || module);

// ============================================================================
// Support Services (Low Impact)
// ============================================================================

export const lazySupportApi = () =>
  import('@/services/supportApi').then((module: any) => module.default || module);

export const lazySupportChatApi = () =>
  import('@/services/supportChatApi').then((module: any) => module.default || module);

// ============================================================================
// Store Messaging Services (Low Impact)
// ============================================================================

export const lazyStoreMessagingApi = () =>
  import('@/services/storeMessagingApi').then((module: any) => module.default || module);

// ============================================================================
// Voucher Services (Low Impact)
// ============================================================================

export const lazyRealVouchersApi = () =>
  import('@/services/realVouchersApi').then((module: any) => module.default || module);

export const lazyStoreVouchersApi = () =>
  import('@/services/storeVouchersApi').then((module: any) => module.default || module);

// ============================================================================
// Projects Services (Low Impact)
// ============================================================================

export const lazyRealProjectsApi = () =>
  import('@/services/realProjectsApi').then((module: any) => module.default || module);

export const lazyProjectsApi = () =>
  import('@/services/projectsApi').then((module: any) => module.default || module);

export const lazyEarningProjectsApi = () =>
  import('@/services/earningProjectsApi').then((module: any) => module.default || module);

// ============================================================================
// Cache Services (Low Impact)
// ============================================================================

export const lazyCacheService = () =>
  import('@/services/cacheService').then((module: any) => module.default || module);

export const lazyProductCacheService = () =>
  import('@/services/productCacheService').then((module: any) => module.default || module);

// ============================================================================
// Calculation Services (Low Impact)
// ============================================================================

export const lazyEarningsCalculationService = () =>
  import('@/services/earningsCalculationService').then((module: any) => module.default || module);

// ============================================================================
// Coin Sync Service (Low Impact)
// ============================================================================

export const lazyCoinSyncService = () =>
  import('@/services/coinSyncService').then((module: any) => module.default || module);

// ============================================================================
// Share Services (Low Impact)
// ============================================================================

export const lazyShareService = () =>
  import('@/services/shareService').then((module: any) => module.default || module);

export const lazyShareContentGenerator = () =>
  import('@/services/shareContentGenerator').then((module: any) => module.default || module);

export const lazyWishlistSharingApi = () =>
  import('@/services/wishlistSharingApi').then((module: any) => module.default || module);

// ============================================================================
// Helper: Lazy Load Service with Retry
// ============================================================================

export async function lazyLoadService<T>(
  importFn: () => Promise<T>,
  serviceName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const service = await importFn();
      return service;
    } catch (error: any) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        // Exponential backoff
        const delay = 1000 * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to load service: ${serviceName}`);
}

// ============================================================================
// Helper: Preload Critical Services
// ============================================================================

export async function preloadCriticalServices(): Promise<void> {
  const criticalServices: Promise<any>[] = [
    // Add critical services that should be preloaded
    // These are services likely to be used soon after app start
  ];

  try {
    await Promise.all(criticalServices);
  } catch (error: any) {
    // silently handle
  }
}

// ============================================================================
// Helper: Preload Services by Category
// ============================================================================

export async function preloadServicesByCategory(
  category: 'payment' | 'video' | 'upload' | 'social' | 'gamification'
): Promise<void> {
  const serviceMap: Record<string, (() => Promise<any>)[]> = {
    payment: [
      lazyRazorpayService,
      lazyPaymentService,
    ],
    video: [
      lazyVideoUploadService,
      lazyVideoPreloadService,
      lazyRealVideosApi,
    ],
    upload: [
      lazyBillUploadService,
      lazyProjectUploadService,
      lazyImageUploadService,
    ],
    social: [
      lazyFollowApi,
      lazyActivityFeedApi,
      lazySocialMediaApi,
      lazyUGCApi,
    ],
    gamification: [
      lazyGamificationApi,
      lazyGamificationCacheService,
      lazyGamificationTriggerService,
    ],
  };

  const services = serviceMap[category] || [];

  try {
    await Promise.all(services.map(fn => fn()));
  } catch (error: any) {
    // silently handle
  }
}

export default {
  // Video
  lazyVideoUploadService,
  lazyVideoPreloadService,
  lazyRealVideosApi,

  // Payment
  lazyRazorpayService,
  lazyRazorpayApi,
  lazyPaymentOrchestratorService,
  lazyPaymentService,

  // Upload
  lazyBillUploadService,
  lazyProjectUploadService,
  lazyImageUploadService,

  // Real-time
  lazyRealTimeService,

  // Gamification
  lazyGamificationApi,

  // Helpers
  lazyLoadService,
  preloadCriticalServices,
  preloadServicesByCategory,
};
