/**
 * Ads API Service
 * Handles ad serving, impression tracking, and click tracking
 */

import apiClient from './apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

export interface AdUnit {
  _id: string;
  title: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaUrl?: string;
  imageUrl: string;
  placement: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
}

class AdsService {
  /**
   * Fetch an ad for a given placement.
   * Returns null if no ad is available or on any error.
   */
  async fetchAd(placement: string): Promise<AdUnit | null> {
    try {
      devLog.log(`[ADS API] Fetching ad for placement: ${placement}`);

      const response = await apiClient.get<AdUnit>('/ads/serve', { placement });

      if (response.success && response.data) {
        devLog.log(`[ADS API] Got ad: ${response.data._id}`);
        return response.data;
      }

      return null;
    } catch (error: any) {
      devLog.warn('[ADS API] fetchAd failed:', error?.message);
      return null;
    }
  }

  /**
   * Track an ad impression. Fire-and-forget — never throws.
   */
  async trackImpression(adId: string): Promise<void> {
    try {
      devLog.log(`[ADS API] Tracking impression for ad: ${adId}`);
      await apiClient.post('/ads/impression', { adId });
    } catch (error: any) {
      devLog.warn('[ADS API] trackImpression failed (non-critical):', error?.message);
    }
  }

  /**
   * Track an ad click. Fire-and-forget — never throws.
   */
  async trackClick(adId: string): Promise<void> {
    try {
      devLog.log(`[ADS API] Tracking click for ad: ${adId}`);
      await apiClient.post('/ads/click', { adId });
    } catch (error: any) {
      devLog.warn('[ADS API] trackClick failed (non-critical):', error?.message);
    }
  }
}

const adsService = new AdsService();

export { adsService as adsApi };

export default adsService;
