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

interface Mission {
  id: string;
  title: string;
  description: string;
  category?: string;
  categoryEmoji?: string;
  target: number;
  completed: number;
  reward: {
    rezCoins: number;
    trialCoins: number;
  };
  endsAt: string;
  isCompleted: boolean;
  isExpired: boolean;
}

interface CategoryBadge {
  category: string;
  categoryEmoji?: string;
  level: 'Newcomer' | 'Regular' | 'Expert' | 'Master';
  trialCount: number;
  nextLevelThreshold: number;
}

interface BadgesData {
  earned: CategoryBadge[];
  undiscovered: Array<{ category: string; categoryEmoji?: string }>;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  trialCount: number;
  isCurrentUser?: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  userRank: number;
  userScore: number;
}

interface SurpriseData {
  category: string;
  categoryEmoji?: string;
  distance: string;
  expiresAt: string;
  merchant?: {
    id: string;
    name: string;
    image?: string;
  };
  trial?: {
    id: string;
    title: string;
    image?: string;
    coinPrice: number;
    originalPrice: number;
  };
  isBooked?: boolean;
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  trialCount: number;
  trialCoinsIncluded: number;
  rezCoinsBonus: number;
  validDays: number;
  category?: string;
  isFeatured?: boolean;
}

interface ActiveBundle {
  id: string;
  name: string;
  slotsTotal: number;
  slotsUsed: number;
  expiresAt: string;
}

interface Campaign {
  id: string;
  title: string;
  description?: string;
  type: 'MISSION_SPRINT' | 'FESTIVAL' | 'CATEGORY_PUSH';
  goal: string;
  reward: string;
  endsAt: string;
  image?: string;
  isJoined: boolean;
  isCompleted: boolean;
  progress?: {
    completed: number;
    target: number;
  };
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

  /**
   * Get active weekly missions
   */
  async getMissions(): Promise<Mission[]> {
    const response = await apiClient.request<{ success: boolean; data: Mission[] }>('/try/missions', {
      method: 'GET',
    });
    return response.data?.data || [];
  }

  /**
   * Get user's category badges
   */
  async getBadges(): Promise<BadgesData> {
    const response = await apiClient.request<{ success: boolean; data: BadgesData }>('/try/badges', {
      method: 'GET',
    });
    return response.data?.data || { earned: [], undiscovered: [] };
  }

  /**
   * Get leaderboard for a city and period
   */
  async getLeaderboard(city: string, period: 'weekly' | 'monthly' | 'alltime'): Promise<LeaderboardData> {
    const response = await apiClient.request<{ success: boolean; data: LeaderboardData }>('/try/leaderboard', {
      method: 'GET',
    }, {
      params: { city, period },
    });
    return response.data?.data || { entries: [], userRank: 0, userScore: 0 };
  }

  /**
   * Get this week's surprise trial (category only, merchant hidden)
   */
  async getSurpriseTrial(): Promise<SurpriseData> {
    const response = await apiClient.request<{ success: boolean; data: SurpriseData }>('/try/surprise', {
      method: 'GET',
    });
    return response.data?.data || { category: 'Mystery', distance: 'Unknown', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
  }

  /**
   * Reveal the surprise trial merchant
   */
  async revealSurpriseTrial(): Promise<SurpriseData> {
    const response = await apiClient.request<{ success: boolean; data: SurpriseData }>('/try/surprise/reveal', {
      method: 'POST',
      body: {},
    });
    return response.data?.data || { category: 'Mystery', distance: 'Unknown', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
  }

  /**
   * Get trial bundles and passes
   */
  async getBundles(category?: string): Promise<Bundle[]> {
    const response = await apiClient.request<{ success: boolean; data: Bundle[] }>('/try/bundles', {
      method: 'GET',
    }, {
      params: category ? { category } : undefined,
    });
    return response.data?.data || [];
  }

  /**
   * Purchase a bundle
   */
  async purchaseBundle(bundleId: string, paymentId: string): Promise<{ success: boolean; message?: string }> {
    return apiClient.request<{ success: boolean; message?: string }>('/try/bundles/purchase', {
      method: 'POST',
      body: { bundleId, paymentId },
    });
  }

  /**
   * Get user's active bundles
   */
  async getMyBundles(): Promise<ActiveBundle[]> {
    const response = await apiClient.request<{ success: boolean; data: ActiveBundle[] }>('/try/bundles/mine', {
      method: 'GET',
    });
    return response.data?.data || [];
  }

  /**
   * Get active discovery campaigns
   */
  async getCampaigns(city: string): Promise<Campaign[]> {
    const response = await apiClient.request<{ success: boolean; data: Campaign[] }>('/try/campaigns', {
      method: 'GET',
    }, {
      params: { city },
    });
    return response.data?.data || [];
  }

  /**
   * Join a campaign
   */
  async joinCampaign(campaignId: string): Promise<{ success: boolean; message?: string }> {
    return apiClient.request<{ success: boolean; message?: string }>(`/try/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: {},
    });
  }
}

export const tryApi = new TryApi();
export default tryApi;

// Export types
export type {
  TrialCard,
  HistoryItem,
  CoinsData,
  ScoreData,
  BookingRequest,
  BookingResponse,
  Mission,
  CategoryBadge,
  BadgesData,
  LeaderboardEntry,
  LeaderboardData,
  SurpriseData,
  Bundle,
  ActiveBundle,
  Campaign,
};
