import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReferralHandler from './referralHandler';

interface DeepLinkData {
  type: 'referral' | 'product' | 'store' | 'offer' | 'unknown';
  data: any;
}

// Allowlist validators — prevent path traversal and injection via crafted deep links
const MONGO_ID_RE = /^[a-f0-9]{24}$/i;
const REFERRAL_CODE_RE = /^[A-Z0-9]{4,20}$/;

function sanitizeMongoId(value: string | undefined): string | null {
  if (!value) return null;
  const clean = value.split('?')[0].split('#')[0].trim();
  return MONGO_ID_RE.test(clean) ? clean : null;
}

function sanitizeReferralCode(value: string | undefined): string | null {
  if (!value) return null;
  const clean = value.split('?')[0].split('#')[0].trim().toUpperCase();
  return REFERRAL_CODE_RE.test(clean) ? clean : null;
}

export class DeepLinkHandler {
  /**
   * Parse deep link URL
   * Supports both /ref/ and /invite/ patterns for referral links
   */
  parseDeepLink(url: string): DeepLinkData {
    try {
      const parsed = Linking.parse(url);
      const { hostname, path, queryParams } = parsed;

      // Handle referral links: /invite/ABC123 or /ref/ABC123
      if (hostname === 'invite' || hostname === 'ref' ||
          path?.includes('/invite/') || path?.includes('/ref/')) {
        const raw = path?.split(/\/(?:invite|ref)\//)[1] || hostname || undefined;
        const code = sanitizeReferralCode(raw);
        if (!code) return { type: 'unknown', data: { url } };
        return {
          type: 'referral',
          data: { code, source: queryParams?.source || 'direct' }
        };
      }

      // Handle product links: rezapp://product/123
      if (hostname === 'product' || path?.includes('/product/')) {
        const raw = path?.split('/product/')[1] || hostname || undefined;
        const productId = sanitizeMongoId(raw);
        if (!productId) return { type: 'unknown', data: { url } };
        return { type: 'product', data: { productId } };
      }

      // Handle store links: rezapp://store/456
      if (hostname === 'store' || path?.includes('/store/')) {
        const raw = path?.split('/store/')[1] || hostname || undefined;
        const storeId = sanitizeMongoId(raw);
        if (!storeId) return { type: 'unknown', data: { url } };
        return { type: 'store', data: { storeId } };
      }

      // Handle offer links: rezapp://offer/789
      if (hostname === 'offer' || path?.includes('/offer/')) {
        const raw = path?.split('/offer/')[1] || hostname || undefined;
        const offerId = sanitizeMongoId(raw);
        if (!offerId) return { type: 'unknown', data: { url } };
        return { type: 'offer', data: { offerId } };
      }

      return {
        type: 'unknown',
        data: { url }
      };
    } catch (error) {
      return {
        type: 'unknown',
        data: { url }
      };
    }
  }

  /**
   * Handle referral deep link — delegates to canonical ReferralHandler
   */
  async handleReferralLink(code: string, source: string = 'direct'): Promise<void> {
    await ReferralHandler.storeReferralCode(code, source);
  }

  /**
   * Get pending referral code — delegates to canonical ReferralHandler
   */
  async getPendingReferralCode(): Promise<{
    code: string;
    source: string;
    timestamp: number;
  } | null> {
    const data = await ReferralHandler.getStoredReferralCode();
    if (data) {
      return {
        code: data.code,
        source: data.source,
        timestamp: new Date(data.timestamp).getTime(),
      };
    }
    return null;
  }

  /**
   * Clear pending referral code — delegates to canonical ReferralHandler
   */
  async clearPendingReferralCode(): Promise<void> {
    await ReferralHandler.clearReferralCode();
  }

  /**
   * Generate deep link URL
   */
  generateDeepLink(type: 'referral' | 'product' | 'store' | 'offer', id: string): string {
    const baseUrl = 'https://rez.app';

    switch (type) {
      case 'referral':
        return `${baseUrl}/invite/${id}`;
      case 'product':
        return `${baseUrl}/product/${id}`;
      case 'store':
        return `${baseUrl}/store/${id}`;
      case 'offer':
        return `${baseUrl}/offer/${id}`;
      default:
        return baseUrl;
    }
  }

  /**
   * Track deep link attribution
   */
  async trackAttribution(type: string, data: any): Promise<void> {
    try {
      // Store attribution data
      const attribution = {
        type,
        data,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(
        '@rez_attribution',
        JSON.stringify(attribution)
      );
      // TODO: Send to analytics

    } catch (_error) {
      // silently handle
    }
  }
}

/**
 * React hook for handling deep links
 */
export function useDeepLinkHandler() {
  const [deepLink, setDeepLink] = useState<DeepLinkData | null>(null);
  const router = useRouter();
  const handler = new DeepLinkHandler();

  useEffect(() => {
    // Handle initial URL (app opened from link)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = handler.parseDeepLink(initialUrl);
        setDeepLink(parsed);
        handleDeepLink(parsed);
      }
    };

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = handler.parseDeepLink(url);
      setDeepLink(parsed);
      handleDeepLink(parsed);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (linkData: DeepLinkData) => {
    switch (linkData.type) {
      case 'referral':
        await handler.handleReferralLink(
          linkData.data.code,
          linkData.data.source
        );
        await handler.trackAttribution('referral', linkData.data);

        // Navigate to registration or apply code
        // Check if user is logged in
        // If not, navigate to registration
        // If yes, prompt to apply code (if not already used)
        break;

      case 'product':
        await handler.trackAttribution('product', linkData.data);
        router.push(`/product-page?id=${linkData.data.productId}`);
        break;

      case 'store':
        await handler.trackAttribution('store', linkData.data);
        // REGRESSION FIX (2026-03-23): '/Store' does not exist as an Expo Router file-based route.
        // The actual file is app/MainStorePage.tsx which resolves to route '/MainStorePage'.
        // Using '/Store' caused a silent navigation failure — users tapping store deep links
        // were dropped to the not-found screen instead of the store page.
        router.push(`/MainStorePage?id=${linkData.data.storeId}`);
        break;

      case 'offer':
        await handler.trackAttribution('offer', linkData.data);
        router.push(`/offers?id=${linkData.data.offerId}`);
        break;

      default:

    }
  };

  return {
    deepLink,
    handler
  };
}

export default new DeepLinkHandler();
