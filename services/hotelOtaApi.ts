/**
 * Hotel OTA API Service
 * Connects REZ consumer app to the Hotel OTA platform.
 *
 * Base URL: EXPO_PUBLIC_HOTEL_OTA_URL (e.g. https://hotel-ota-api.onrender.com)
 * Auth: Hotel OTA JWT (obtained via REZ SSO → /v1/auth/rez-sso)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const OTA_BASE = process.env.EXPO_PUBLIC_HOTEL_OTA_URL ?? (__DEV__ ? 'http://localhost:3008' : (() => { throw new Error('[HotelOTA] EXPO_PUBLIC_HOTEL_OTA_URL is not configured'); })());
// These keys hold OTA JWTs. Use SecureStore on native (Android Keystore / iOS Keychain)
// and fall back to AsyncStorage on web where SecureStore is unavailable.
const OTA_TOKEN_KEY = 'ota_access_token';
const OTA_REFRESH_KEY = 'ota_refresh_token';

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(`@${key}`);
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(`@${key}`, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(`@${key}`);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OtaHotel {
  id: string;
  name: string;
  description: string;
  city: string;
  country: string;
  starRating: number;
  images: string[];
  amenities: string[];
  baseRatePaise: number;
  discountPct: number;
  coinEarnPct: number;       // hotel brand coin earn %
  brandCoinEnabled: boolean;
  brandCoinName?: string;
  brandCoinSymbol?: string;
  rating: number;
  reviewCount: number;
  checkInTime: string;
  checkOutTime: string;
}

export interface OtaRoomType {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  maxOccupancy: number;
  baseRatePaise: number;
  images: string[];
  amenities: string[];
}

export interface OtaAvailability {
  roomTypeId: string;
  date: string;
  availableRooms: number;
  ratePaise: number;
  isBlocked: boolean;
}

export interface OtaCheckBurnResult {
  ota_coin_applicable_paise: number;
  rez_coin_applicable_paise: number;
  hotel_brand_coin_applicable_paise: number;
  total_discount_paise: number;
  pg_amount_paise: number;
  ota_cap_applied?: boolean;
  ota_cap_reason?: string;
}

export interface OtaBooking {
  id: string;
  bookingRef: string;
  hotelId: string;
  hotelName: string;
  roomTypeName: string;
  checkinDate: string;
  checkoutDate: string;
  numRooms: number;
  numGuests: number;
  totalValuePaise: number;
  pgAmountPaise: number;
  otaCoinBurnedPaise: number;
  rezCoinBurnedPaise: number;
  hotelBrandCoinBurnedPaise: number;
  status: 'hold' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface OtaWalletHotelBrandCoin {
  hotelId: string;
  hotelName: string;
  brandCoinName: string;
  brandCoinSymbol: string;
  balancePaise: number;
  lifetimeEarnedPaise: number;
  lifetimeBurnedPaise: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export async function getOtaToken(): Promise<string | null> {
  return secureGet(OTA_TOKEN_KEY);
}

export async function saveOtaTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    secureSet(OTA_TOKEN_KEY, accessToken),
    secureSet(OTA_REFRESH_KEY, refreshToken),
  ]);
}

export async function clearOtaTokens(): Promise<void> {
  await Promise.all([
    secureDelete(OTA_TOKEN_KEY),
    secureDelete(OTA_REFRESH_KEY),
  ]);
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function otaFetch<T>(
  method: string,
  path: string,
  body?: object,
  authRequired = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (authRequired) {
    const token = await getOtaToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(`${OTA_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      throw new Error(`[HotelOTA] Request timed out after 10s — ${method} ${path}`);
    }
    throw err;
  }

  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(err.message || `OTA API error ${res.status}`);
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * SSO: exchange a REZ access token for an OTA JWT.
 * Call this once after the user logs in to REZ app.
 */
export async function rezSsoLogin(rezAccessToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: { id: string; phone: string; full_name: string; tier: string; ota_coin_balance_paise: number; rez_coin_balance_paise: number; is_new_user: boolean };
}> {
  const data = await otaFetch<any>('POST', '/v1/auth/rez-sso', { rez_access_token: rezAccessToken }, false);
  await saveOtaTokens(data.access_token, data.refresh_token);
  return data;
}

// ─── Hotel search / browse ────────────────────────────────────────────────────

export async function searchHotels(params: {
  city?: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  page?: number;
  limit?: number;
}): Promise<{ hotels: OtaHotel[]; total: number; pages: number }> {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await otaFetch<any>('GET', `/v1/hotels?${q}`, undefined, false);
  return res.data ?? res;
}

export async function getHotelById(hotelId: string): Promise<OtaHotel> {
  const res = await otaFetch<any>('GET', `/v1/hotels/${hotelId}`, undefined, false);
  return res.data ?? res;
}

export async function getHotelRoomTypes(hotelId: string): Promise<OtaRoomType[]> {
  const res = await otaFetch<any>('GET', `/v1/hotels/${hotelId}/room-types`, undefined, false);
  return res.data ?? res;
}

export async function getHotelAvailability(
  hotelId: string,
  checkin: string,
  checkout: string,
): Promise<OtaAvailability[]> {
  const res = await otaFetch<any>(
    'GET',
    `/v1/hotels/${hotelId}/availability?checkin=${checkin}&checkout=${checkout}`,
    undefined,
    false,
  );
  return res.data ?? res;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export async function checkBurnCoins(params: {
  hotelId: string;
  roomTypeId: string;
  checkin: string;
  checkout: string;
  numRooms: number;
  numGuests: number;
  bookingValuePaise: number;  // total booking value = roomRatePaise × nights × numRooms
  otaCoinRequestedPaise?: number;
  rezCoinRequestedPaise?: number;
  hotelBrandCoinRequestedPaise?: number;
}): Promise<OtaCheckBurnResult> {
  // CA-TRV-061: Validate bookingValuePaise is positive
  if (params.bookingValuePaise <= 0) {
    throw new Error('Booking value must be greater than 0');
  }

  const res = await otaFetch<any>('POST', '/v1/wallet/check-burn', {
    hotel_id: params.hotelId,
    room_type_id: params.roomTypeId,
    checkin_date: params.checkin,
    checkout_date: params.checkout,
    num_rooms: params.numRooms,
    num_guests: params.numGuests,
    booking_value_paise: params.bookingValuePaise,
    ota_coin_requested_paise: params.otaCoinRequestedPaise ?? 0,
    rez_coin_requested_paise: params.rezCoinRequestedPaise ?? 0,
    hotel_brand_coin_requested_paise: params.hotelBrandCoinRequestedPaise ?? 0,
  });
  return res.data ?? res;
}

export async function holdBooking(params: {
  hotelId: string;
  roomTypeId: string;
  checkin: string;
  checkout: string;
  numRooms: number;
  numGuests: number;
  guestName: string;
  guestPhone: string;
  specialRequests?: string;
  otaCoinBurnPaise?: number;
  rezCoinBurnPaise?: number;
  hotelBrandCoinBurnPaise?: number;
}): Promise<{
  holdId: string;
  bookingRef: string;
  holdExpiresAt: string;
  totalPaise: number;
  pgAmountPaise: number;
  razorpayOrderId?: string;
  otaCoinAppliedPaise: number;
  rezCoinAppliedPaise: number;
  hotelBrandCoinAppliedPaise: number;
}> {
  const res = await otaFetch<any>('POST', '/v1/bookings/hold', {
    hotel_id: params.hotelId,
    room_type_id: params.roomTypeId,
    checkin_date: params.checkin,
    checkout_date: params.checkout,
    num_rooms: params.numRooms,
    num_guests: params.numGuests,
    guest_name: params.guestName,
    guest_phone: params.guestPhone,
    special_requests: params.specialRequests,
    channel_source: 'rez_app',
    ota_coin_burn_paise: params.otaCoinBurnPaise ?? 0,
    rez_coin_burn_paise: params.rezCoinBurnPaise ?? 0,
    hotel_brand_coin_burn_paise: params.hotelBrandCoinBurnPaise ?? 0,
  });
  const d = res.data ?? res;

  // CA-TRV-059: Validate holdExpiresAt is a valid ISO string
  if (d.expires_at && typeof d.expires_at === 'string') {
    const expiresTime = new Date(d.expires_at).getTime();
    if (isNaN(expiresTime)) {
      throw new Error(`Invalid holdExpiresAt timestamp: ${d.expires_at}`);
    }
  }

  return {
    holdId: d.hold_id,
    bookingRef: d.booking_ref,
    holdExpiresAt: d.expires_at,
    totalPaise: d.total_value_paise,
    pgAmountPaise: d.pg_amount_paise,
    razorpayOrderId: d.razorpay_order_id,
    // CA-TRV-060: Validate coin amounts are non-negative
    otaCoinAppliedPaise: Math.max(0, d.ota_coin_applied_paise ?? 0),
    rezCoinAppliedPaise: Math.max(0, d.rez_coin_applied_paise ?? 0),
    hotelBrandCoinAppliedPaise: Math.max(0, d.hotel_brand_coin_applied_paise ?? 0),
  };
}

export async function confirmBooking(params: {
  holdId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  razorpayOrderId?: string;
}): Promise<{
  bookingId: string;
  bookingRef: string;
  status: string;
  hotelName: string;
  checkinDate: string;
  checkoutDate: string;
  otaCoinEarnedPaise: number;
  rezCoinEarnedPaise: number;
  hotelBrandCoinEarnedPaise: number;
  otaCoinNewBalancePaise: number;
}> {
  const res = await otaFetch<any>('POST', '/v1/bookings/confirm', {
    hold_id: params.holdId,
    razorpay_payment_id: params.razorpayPaymentId,
    razorpay_order_id: params.razorpayOrderId,
    razorpay_signature: params.razorpaySignature,
  });
  const d = res.data ?? res;
  return {
    bookingId: d.booking_id,
    bookingRef: d.booking_ref,
    status: d.status,
    hotelName: d.hotel_name,
    checkinDate: d.checkin_date,
    checkoutDate: d.checkout_date,
    otaCoinEarnedPaise: d.ota_coin_earned_paise ?? 0,
    rezCoinEarnedPaise: d.rez_coin_earned_paise ?? 0,
    hotelBrandCoinEarnedPaise: d.hotel_brand_coin_earned_paise ?? 0,
    otaCoinNewBalancePaise: d.ota_coin_new_balance_paise ?? 0,
  };
}

export async function getHotelBookingById(bookingId: string): Promise<OtaBooking & {
  specialRequests?: string;
  razorpayOrderId?: string;
  hotelAddress?: string;
  checkInTime?: string;
  checkOutTime?: string;
  otaCoinBurnedPaise: number;
  rezCoinBurnedPaise: number;
  hotelBrandCoinBurnedPaise: number;
}> {
  const res = await otaFetch<any>('GET', `/v1/bookings/${bookingId}`);
  return res.data ?? res;
}

export async function getMyBookings(page = 1, limit = 10): Promise<{ bookings: OtaBooking[]; total: number }> {
  // CA-TRV-069: Validate page numbers are positive
  const validPage = Math.max(1, Math.floor(page || 1));
  const validLimit = Math.max(1, Math.floor(limit || 10));
  const res = await otaFetch<any>('GET', `/v1/bookings?page=${validPage}&limit=${validLimit}`);
  return res.data ?? res;
}

export async function cancelBooking(bookingId: string, reason: string): Promise<void> {
  await otaFetch<any>('POST', `/v1/bookings/${bookingId}/cancel`, { reason });
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface OtaCoinTransaction {
  id: string;
  coinType: 'ota' | 'rez' | 'hotel_brand';
  direction: 'earn' | 'burn';
  amountPaise: number;
  description: string;
  hotelId?: string;
  hotelName?: string;
  createdAt: string;
}

export async function getHotelCoinTransactions(params?: {
  coinType?: string;
  hotelId?: string;
  page?: number;
  perPage?: number;
}): Promise<{ transactions: OtaCoinTransaction[]; total: number; hasMore: boolean }> {
  const q = new URLSearchParams();
  if (params?.coinType) q.set('coin_type', params.coinType);
  if (params?.hotelId) q.set('hotel_id', params.hotelId);
  if (params?.page) q.set('page', String(params.page));
  if (params?.perPage) q.set('per_page', String(params.perPage ?? 20));
  const res = await otaFetch<any>('GET', `/v1/wallet/transactions?${q.toString()}`);
  const data = res.data ?? res;
  // CA-TRV-068: Validate coin transaction types
  const validCoinTypes = ['ota', 'rez', 'hotel_brand'];
  const transactions: OtaCoinTransaction[] = (data.transactions ?? data).map((t: any) => {
    const coinType = t.coin_type ?? t.coinType;
    if (coinType && !validCoinTypes.includes(coinType)) {
      console.warn(`[CA-TRV-068] Invalid coin type: ${coinType}, using default 'ota'`);
    }
    return {
      id: t.id,
      coinType: (validCoinTypes.includes(coinType) ? coinType : 'ota') as 'ota' | 'rez' | 'hotel_brand',
      direction: t.direction,
      amountPaise: t.amount_paise ?? t.amountPaise,
      description: t.description ?? '',
      hotelId: t.hotel_id ?? t.hotelId,
      hotelName: t.hotel_name ?? t.hotelName,
      createdAt: t.created_at ?? t.createdAt,
    };
  });
  return { transactions, total: data.total ?? transactions.length, hasMore: data.has_more ?? false };
}

export async function getOtaWallet(): Promise<{
  ota_coin_balance_paise: number;
  rez_coin_balance_paise: number;
  hotel_brand_coins: OtaWalletHotelBrandCoin[];
}> {
  const res = await otaFetch<any>('GET', '/v1/wallet');
  return res.data ?? res;
}

export async function submitHotelReview(params: {
  hotelId: string;
  bookingRef?: string;
  overallRating: number;
  cleanlinessRating?: number;
  serviceRating?: number;
  locationRating?: number;
  valueRating?: number;
  title?: string;
  body: string;
}): Promise<void> {
  // CA-TRV-070: Validate rating is in range 1-5
  const validateRating = (rating: number) => {
    const r = Number(rating);
    if (isNaN(r) || r < 1 || r > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    return r;
  };

  await otaFetch<any>('POST', '/v1/reviews', {
    hotel_id: params.hotelId,
    booking_ref: params.bookingRef,
    overall_rating: validateRating(params.overallRating),
    cleanliness_rating: validateRating(params.cleanlinessRating ?? params.overallRating),
    service_rating: validateRating(params.serviceRating ?? params.overallRating),
    location_rating: validateRating(params.locationRating ?? params.overallRating),
    value_rating: validateRating(params.valueRating ?? params.overallRating),
    title: params.title?.trim() || undefined,
    body: params.body.trim(),
  });
}
