// ReZ TRY API Service
// Handles all trial/experience discovery and booking endpoints

// FR-001 FIX: apiClient is a default export from './apiClient'. The named export
// { apiClient } does not exist, so all apiClient.request() calls below would throw
// "apiClient is undefined" at runtime. Additionally, ApiClient has no .request()
// method — the correct helpers are .get() / .post(). Both issues are fixed here.
import apiClient from './apiClient';

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
   * FR-001 FIX: replaced apiClient.request() (non-existent method) with apiClient.get()
   */
  async getFeed(lat: number, lng: number): Promise<TrialCard[]> {
    const response = await apiClient.get<TrialFeedResponse>('/try/feed', { lat, lng });
    // The backend wraps the array in response.data.data; apiClient.get already
    // unwraps one level (responseData.data), so response.data is the array.
    const payload = response.data as any;
    return (Array.isArray(payload) ? payload : payload?.data) || [];
  }

  /**
   * Get detailed information about a specific trial
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getTrialDetails(trialId: string): Promise<TrialCard | null> {
    const response = await apiClient.get<{ data: TrialCard }>(`/try/${trialId}`);
    const payload = response.data as any;
    return (payload?.data ?? payload) || null;
  }

  /**
   * Get detailed information about a booking
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getBookingDetails(bookingId: string): Promise<any> {
    const response = await apiClient.get<{ data: any }>(`/try/bookings/${bookingId}`);
    const payload = response.data as any;
    return (payload?.data ?? payload) || null;
  }

  /**
   * Book a trial with commitment fee payment
   * FR-001 FIX: replaced apiClient.request() with apiClient.post()
   */
  async bookTrial(request: BookingRequest): Promise<BookingResponse> {
    const response = await apiClient.post<BookingResponse>('/try/book', request);
    return response as unknown as BookingResponse;
  }

  /**
   * Get user's trial history
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getHistory(): Promise<HistoryItem[]> {
    const response = await apiClient.get<{ data: HistoryItem[] }>('/try/history');
    const payload = response.data as any;
    return (Array.isArray(payload) ? payload : payload?.data) || [];
  }

  /**
   * Get trial coin wallet balance and buckets
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getCoins(): Promise<CoinsData> {
    const response = await apiClient.get<{ data: CoinsData }>('/try/coins');
    const payload = response.data as any;
    return (payload?.data ?? payload) || { totalBalance: 0, buckets: [], recentTransactions: [] };
  }

  /**
   * Purchase trial coins pack
   * FR-001 FIX: replaced apiClient.request() with apiClient.post()
   */
  async purchaseCoins(packIndex: number, paymentId: string): Promise<{ success: boolean; coinsAdded: number }> {
    const response = await apiClient.post<{ success: boolean; coinsAdded: number }>('/try/coins/purchase', { packIndex, paymentId });
    return response as unknown as { success: boolean; coinsAdded: number };
  }

  /**
   * Get explorer score and tier
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getScore(): Promise<ScoreData> {
    const response = await apiClient.get<{ data: ScoreData }>('/try/score');
    const payload = response.data as any;
    return (payload?.data ?? payload) || {
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
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getMissions(): Promise<Mission[]> {
    const response = await apiClient.get<{ data: Mission[] }>('/try/missions');
    const payload = response.data as any;
    return (Array.isArray(payload) ? payload : payload?.data) || [];
  }

  /**
   * Get user's category badges
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getBadges(): Promise<BadgesData> {
    const response = await apiClient.get<{ data: BadgesData }>('/try/badges');
    const payload = response.data as any;
    return (payload?.data ?? payload) || { earned: [], undiscovered: [] };
  }

  /**
   * Get leaderboard for a city and period
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getLeaderboard(city: string, period: 'weekly' | 'monthly' | 'alltime'): Promise<LeaderboardData> {
    const response = await apiClient.get<{ data: LeaderboardData }>('/try/leaderboard', { city, period });
    const payload = response.data as any;
    return (payload?.data ?? payload) || { entries: [], userRank: 0, userScore: 0 };
  }

  /**
   * Get this week's surprise trial (category only, merchant hidden)
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getSurpriseTrial(): Promise<SurpriseData> {
    const response = await apiClient.get<{ data: SurpriseData }>('/try/surprise');
    const payload = response.data as any;
    return (payload?.data ?? payload) || { category: 'Mystery', distance: 'Unknown', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
  }

  /**
   * Reveal the surprise trial merchant
   * FR-001 FIX: replaced apiClient.request() with apiClient.post()
   */
  async revealSurpriseTrial(): Promise<SurpriseData> {
    const response = await apiClient.post<{ data: SurpriseData }>('/try/surprise/reveal', {});
    const payload = response.data as any;
    return (payload?.data ?? payload) || { category: 'Mystery', distance: 'Unknown', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
  }

  /**
   * Get trial bundles and passes
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getBundles(category?: string): Promise<Bundle[]> {
    const response = await apiClient.get<{ data: Bundle[] }>('/try/bundles', category ? { category } : undefined);
    const payload = response.data as any;
    return (Array.isArray(payload) ? payload : payload?.data) || [];
  }

  /**
   * Purchase a bundle
   * FR-001 FIX: replaced apiClient.request() with apiClient.post()
   */
  async purchaseBundle(bundleId: string, paymentId: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/try/bundles/purchase', { bundleId, paymentId });
    return response as unknown as { success: boolean; message?: string };
  }

  /**
   * Get user's active bundles
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getMyBundles(): Promise<ActiveBundle[]> {
    const response = await apiClient.get<{ data: ActiveBundle[] }>('/try/bundles/mine');
    const payload = response.data as any;
    return (Array.isArray(payload) ? payload : payload?.data) || [];
  }

  /**
   * Get active discovery campaigns
   * FR-001 FIX: replaced apiClient.request() with apiClient.get()
   */
  async getCampaigns(city: string): Promise<Campaign[]> {
    const response = await apiClient.get<{ data: Campaign[] }>('/try/campaigns', { city });
    const payload = response.data as any;
    return (Array.isArray(payload) ? payload : payload?.data) || [];
  }

  /**
   * Join a campaign
   * FR-001 FIX: replaced apiClient.request() with apiClient.post()
   */
  async joinCampaign(campaignId: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<{ success: boolean; message?: string }>(`/try/campaigns/${campaignId}/join`, {});
    return response as unknown as { success: boolean; message?: string };
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
