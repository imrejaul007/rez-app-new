// ReZ TRY API Service
// Handles all trial/experience discovery and booking endpoints

import { apiClient } from './apiClient';

interface TrialCard {
  id: string;
  title: string;
  category: string;
  categoryEmoji?: string;
  merchant: {
    id: string;
    name: string;
    image?: string;
  };
  image: string;
  images?: string[];
  description?: string;
  coinPrice: number;
  commitmentFee: number;
  originalPrice: number;
  distance: number;
  distanceUnit: string;
  slotsRemaining: number;
  slotsTotal: number;
  rating?: number;
  ratingCount?: number;
  expiresAt?: string;
  validDuration?: string;
  rewards?: {
    coinsEarned: number;
    brandedCoinsEarned: number;
  };
}

interface TrialFeedResponse {
  success: boolean;
  data: TrialCard[];
  meta?: {
    location?: {
      lat: number;
      lng: number;
      city?: string;
    };
  };
}

interface BookingRequest {
  trialId: string;
  commitmentFeePaymentId: string;
  userGeo: {
    lat: number;
    lng: number;
  };
}

interface BookingResponse {
  success: boolean;
  data: {
    bookingId: string;
    qrToken: string;
    qrExpiresAt: string;
    validUntil: string;
    trial: {
      id: string;
      title: string;
      merchant: string;
    };
  };
  message?: string;
}

interface HistoryItem {
  bookingId: string;
  trialId: string;
  title: string;
  merchant: string;
  merchantImage?: string;
  image: string;
  coinsPaid: number;
  commitmentFeePaid: number;
  bookingDate: string;
  status: 'active' | 'completed' | 'expired';
  qrToken?: string;
  qrExpiresAt?: string;
  validUntil?: string;
  rating?: number;
  reviewText?: string;
  completedDate?: string;
  expiredDate?: string;
}

interface CoinsData {
  totalBalance: number;
  buckets: {
    amount: number;
    expiresAt: string;
    source: 'subscription' | 'pack' | 'earned';
  }[];
  recentTransactions: Array<{
    id: string;
    type: 'earn' | 'spend' | 'expire';
    amount: number;
    description: string;
    date: string;
  }>;
}

interface ScoreData {
  score: number;
  tier: 'curious' | 'explorer' | 'adventurer' | 'pioneer';
  nextTierPoints: number;
  nextTierName: string;
  stats: {
    categoriesTried: number;
    merchantsDiscovered: number;
    currentStreak: number;
    reviewsGiven: number;
  };
  recentEvents: Array<{
    id: string;
    description: string;
    points: number;
    date: string;
    emoji?: string;
  }>;
  leaderboardPercentile?: number;
  leaderboardCity?: string;
}

class TryApi {
  /**
   * Get personalized trial feed for current location
   */
  async getFeed(lat: number, lng: number): Promise<TrialCard[]> {
    const response = await apiClient.request<TrialFeedResponse>('/try/feed', {
      method: 'GET',
    }, {
      params: { lat, lng },
    });
    return response.data?.data || [];
  }

  /**
   * Book a trial with commitment fee payment
   */
  async bookTrial(request: BookingRequest): Promise<BookingResponse> {
    return apiClient.request<BookingResponse>('/try/book', {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Get user's trial history
   */
  async getHistory(): Promise<HistoryItem[]> {
    const response = await apiClient.request<{ success: boolean; data: HistoryItem[] }>('/try/history', {
      method: 'GET',
    });
    return response.data?.data || [];
  }

  /**
   * Get trial coin wallet balance and buckets
   */
  async getCoins(): Promise<CoinsData> {
    const response = await apiClient.request<{ success: boolean; data: CoinsData }>('/try/coins', {
      method: 'GET',
    });
    return response.data?.data || { totalBalance: 0, buckets: [], recentTransactions: [] };
  }

  /**
   * Purchase trial coins pack
   */
  async purchaseCoins(packIndex: number, paymentId: string): Promise<{ success: boolean; coinsAdded: number }> {
    return apiClient.request<{ success: boolean; coinsAdded: number }>('/try/coins/purchase', {
      method: 'POST',
      body: { packIndex, paymentId },
    });
  }

  /**
   * Get explorer score and tier
   */
  async getScore(): Promise<ScoreData> {
    const response = await apiClient.request<{ success: boolean; data: ScoreData }>('/try/score', {
      method: 'GET',
    });
    return response.data?.data || {
      score: 0,
      tier: 'curious',
      nextTierPoints: 100,
      nextTierName: 'explorer',
      stats: {
        categoriesTried: 0,
        merchantsDiscovered: 0,
        currentStreak: 0,
        reviewsGiven: 0,
      },
      recentEvents: [],
    };
  }
}

export const tryApi = new TryApi();
export default tryApi;

// Export types
export type { TrialCard, HistoryItem, CoinsData, ScoreData, BookingRequest, BookingResponse };
