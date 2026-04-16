/**
 * Karma Service API
 * Handles all Karma feature API calls.
 * Routes through the Rez API Gateway: /karma/* endpoints.
 */

import apiClient, { ApiResponse } from './apiClient';
import type {
  KarmaLevel,
  EarnRecordStatus,
  CoinType,
  CoinTransactionType,
  KarmaVerificationStatus,
} from '@/types/rez-shared-types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Consumer karma profile — extends the canonical IKarmaProfile with client-only fields.
 * Consumer apps should import IKarmaProfile from @/types/rez-shared-types and extend here.
 * G-CR-X1 FIX: level uses KarmaLevel from shared-types instead of inline union.
 */
export interface KarmaProfile {
  userId: string;
  lifetimeKarma: number;
  activeKarma: number;
  level: KarmaLevel;
  conversionRate: number;
  eventsCompleted: number;
  totalHours: number;
  trustScore: number;
  badges: KarmaBadge[];
  /** Client-only: next level threshold (not in canonical IKarmaProfile) */
  nextLevelAt: number;
  /** Client-only: decay warning message (not in canonical IKarmaProfile) */
  decayWarning: string | null;
}

export interface KarmaBadge {
  id: string;
  name: string;
  icon?: string;
  earnedAt: string;
}

export interface LevelInfo {
  level: KarmaLevel;
  activeKarma: number;
  threshold: number;
  nextLevelAt: number;
  conversionRate: number;
  progressPercent: number;
}

export interface KarmaEvent {
  _id: string;
  name: string;
  description: string;
  category: 'environment' | 'food' | 'health' | 'education' | 'community';
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  image?: string;
  date: string;
  time?: { start: string; end: string };
  location: {
    address: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  };
  organizer: {
    name: string;
    logo?: string;
    ngoId?: string;
  };
  baseKarmaPerHour: number;
  maxKarmaPerEvent: number;
  expectedDurationHours: number;
  impactUnit?: string;
  impactMultiplier?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  capacity?: { goal: number; enrolled: number };
  maxVolunteers: number;
  confirmedVolunteers: number;
  verificationMode: 'qr' | 'gps' | 'manual';
  gpsRadius?: number;
  isJoined?: boolean;
  qrCodes?: { checkIn: string; checkOut: string };
}

export interface EventFilters {
  category?: string;
  city?: string;
  status?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface Booking {
  _id: string;
  eventId: string;
  bookingReference: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  qrCheckedIn: boolean;
  qrCheckedInAt?: string;
  qrCheckedOut: boolean;
  qrCheckedOutAt?: string;
  gpsCheckIn?: GPSCoords;
  gpsCheckOut?: GPSCoords;
  ngoApproved: boolean;
  confidenceScore: number;
  verificationStatus: KarmaVerificationStatus;
  karmaEarned: number;
  earnedAt?: string;
  createdAt: string;
}

export interface GPSCoords {
  lat: number;
  lng: number;
}

export interface CheckInResult {
  success: boolean;
  booking: Booking;
  confidenceScore: number;
  message: string;
  karmaEarned?: number;
}

export interface CheckOutResult {
  success: boolean;
  booking: Booking;
  confidenceScore: number;
  message: string;
  karmaEarned?: number;
  pendingApproval?: boolean;
}

/**
 * Consumer earn record — mirrors the canonical IEarnRecord structure.
 * G-CR-X7 FIX: status uses EarnRecordStatus from shared-types instead of inline union.
 */
export interface EarnRecord {
  _id: string;
  eventId: string;
  eventName?: string;
  karmaEarned: number;
  activeLevelAtApproval: KarmaLevel;
  conversionRateSnapshot: number;
  status: EarnRecordStatus;
  verificationSignals: {
    qr_in: boolean;
    qr_out: boolean;
    /** Backend stores gps_match as Number (0-1) for precision. */
    gps_match: number;
    ngo_approved: boolean;
    photo_proof: boolean;
  };
  confidenceScore: number;
  createdAt: string;
  approvedAt?: string;
  convertedAt?: string;
  rezCoinsEarned?: number;
}

export interface HistoryResult {
  records: EarnRecord[];
  total: number;
  page: number;
  pages: number;
}

export interface WalletBalance {
  karmaPoints: number;
  rezCoins: number;
  brandedCoins?: Record<string, number>;
}

/**
 * Consumer transaction — aligns with CoinTransactionType from shared-types.
 * G-CR-X11 FIX: type uses CoinTransactionType from shared-types.
 * 'converted' is not in the canonical CoinTransactionType — use REFUNDED for reversals.
 * Using string type for flexibility during the migration.
 */
export interface Transaction {
  _id: string;
  type: CoinTransactionType | 'converted';
  coinType: CoinType | 'karma_points';
  amount: number;
  description: string;
  eventId?: string;
  batchId?: string;
  createdAt: string;
}

export interface TransactionResult {
  transactions: Transaction[];
  total: number;
  page: number;
  pages: number;
}

// =============================================================================
// API SERVICE
// =============================================================================

class KarmaService {
  /**
   * Get user's karma profile
   */
  async getKarmaProfile(userId: string): Promise<ApiResponse<KarmaProfile>> {
    return apiClient.get<KarmaProfile>(`/karma/user/${userId}`);
  }

  /**
   * Get karma level info
   * FIX: Backend route is /api/karma/user/:userId/level, not /karma/level/:userId
   */
  async getKarmaLevel(userId: string): Promise<ApiResponse<LevelInfo>> {
    return apiClient.get<LevelInfo>(`/karma/user/${userId}/level`);
  }

  /**
   * Get nearby karma-enabled events
   */
  async getNearbyEvents(filters?: EventFilters): Promise<ApiResponse<KarmaEvent[]>> {
    return apiClient.get<KarmaEvent[]>('/karma/events', filters as Record<string, string>);
  }

  /**
   * Get single event detail
   */
  async getEventDetail(eventId: string): Promise<ApiResponse<KarmaEvent>> {
    return apiClient.get<KarmaEvent>(`/karma/event/${eventId}`);
  }

  /**
   * Join an event
   */
  async joinEvent(eventId: string): Promise<ApiResponse<Booking>> {
    return apiClient.post<Booking>('/karma/event/join', { eventId });
  }

  /**
   * Cancel event booking
   */
  async leaveEvent(eventId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/karma/event/${eventId}/leave`);
  }

  /**
   * Check in to an event (QR or GPS)
   */
  async checkIn(
    eventId: string,
    mode: 'qr' | 'gps',
    qrCode?: string,
    gpsCoords?: GPSCoords,
  ): Promise<ApiResponse<CheckInResult>> {
    const payload: Record<string, unknown> = { eventId, mode };
    if (mode === 'qr' && qrCode) payload.qrCode = qrCode;
    if (mode === 'gps' && gpsCoords) payload.gpsCoords = gpsCoords;
    return apiClient.post<CheckInResult>('/karma/verify/checkin', payload);
  }

  /**
   * Check out from an event (QR or GPS)
   */
  async checkOut(
    eventId: string,
    mode: 'qr' | 'gps',
    qrCode?: string,
    gpsCoords?: GPSCoords,
  ): Promise<ApiResponse<CheckOutResult>> {
    const payload: Record<string, unknown> = { eventId, mode };
    if (mode === 'qr' && qrCode) payload.qrCode = qrCode;
    if (mode === 'gps' && gpsCoords) payload.gpsCoords = gpsCoords;
    return apiClient.post<CheckOutResult>('/karma/verify/checkout', payload);
  }

  /**
   * Get karma earn history
   * FIX: Backend route is /api/karma/user/:userId/history, not /karma/history/:userId
   */
  async getKarmaHistory(userId: string, page = 1): Promise<ApiResponse<HistoryResult>> {
    return apiClient.get<HistoryResult>(`/karma/user/${userId}/history`, { page });
  }

  /**
   * Get wallet balance for karma points / rez coins.
   * coinType 'karma_points' returns karmaPoints only; 'rez_coins' returns REZ balance only; 'all' returns both.
   */
  async getWalletBalance(coinType: 'karma_points' | 'rez_coins' | 'all' = 'all'): Promise<ApiResponse<WalletBalance>> {
    return apiClient.get<WalletBalance>('/karma/wallet/balance', { coinType });
  }

  /**
   * Get transaction history for karma/coins.
   * coinType 'karma_points' returns non-converted karma earn records;
   * 'rez_coins' returns converted records (REZ coins credited to wallet);
   * 'all' returns all records.
   */
  async getTransactions(
    coinType: 'karma_points' | 'rez_coins' | 'all' = 'all',
    page = 1,
  ): Promise<ApiResponse<TransactionResult>> {
    return apiClient.get<TransactionResult>('/karma/wallet/transactions', { coinType, page });
  }

  /**
   * Get user's joined events
   * G-CR-X9 FIX: Removed invalid 'upcoming' and 'past' status values.
   * Valid statuses are: 'published', 'ongoing', 'completed', 'cancelled', 'draft'.
   */
  async getMyEvents(status?: 'published' | 'ongoing' | 'completed' | 'cancelled'): Promise<ApiResponse<KarmaEvent[]>> {
    return apiClient.get<KarmaEvent[]>('/karma/my-events', status ? { status } : undefined);
  }

  /**
   * Get active booking for an event
   */
  async getMyBooking(eventId: string): Promise<ApiResponse<Booking | null>> {
    return apiClient.get<Booking | null>(`/karma/booking/${eventId}`);
  }
}

const karmaService = new KarmaService();
export default karmaService;
