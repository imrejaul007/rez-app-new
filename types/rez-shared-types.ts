/**
 * Inlined types from @imrejaul007/rez-shared.
 *
 * These were previously imported from the shared package via a local file path
 * ("file:../rez-shared") which breaks Vercel/Render builds. The types are
 * inlined here so this app has zero local-path dependencies.
 *
 * Keep in sync with rez-shared/src/types/api.ts and rez-shared/src/types/wallet.ts.
 */

// ── Pagination ──────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
  /** Flat pagination (admin-style) — some endpoints return this at the top level */
  pagination?: Pagination;
}

// ── Paginated Response ──────────────────────────────────────────────────────

/**
 * Paginated response with nested data.items[] (merchant-style).
 * Some endpoints return this shape; others return flat ApiResponse with pagination.
 */
export interface PaginatedResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: {
    items: T[];
    pagination: Pagination;
  };
}

// ── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
  statusCode?: number;
  timestamp?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract items array from either response format */
export function getItems<T>(response: PaginatedResponse<T> | ApiResponse<T[]>): T[] {
  if ('data' in response && response.data) {
    if (typeof response.data === 'object' && 'items' in (response.data as any)) {
      return (response.data as any).items;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
  }
  return [];
}

/** Extract pagination from either response format */
export function getPagination(
  response: PaginatedResponse<any> | ApiResponse<any>,
): Pagination | null {
  if (
    'data' in response &&
    response.data &&
    typeof response.data === 'object' &&
    'pagination' in (response.data as any)
  ) {
    return (response.data as any).pagination;
  }
  if ('pagination' in response && response.pagination) {
    return response.pagination;
  }
  return null;
}

// ── Coin Types (from rez-shared/src/constants/coins.ts) ─────────────────────

export const COIN_TYPES = {
  PRIMARY: 'rez' as const,
  PRIVE: 'prive' as const,
  BRANDED: 'branded' as const,
  PROMO: 'promo' as const,
  CATEGORY: 'category' as const,
} as const;

export type CoinType = typeof COIN_TYPES[keyof typeof COIN_TYPES];

// ── Wallet Balance (from rez-shared/src/types/wallet.ts) ────────────────────

export interface WalletBalance {
  rez: number;
  prive: number;
  promo: number;
  branded: number;
  category: number;
  total: number;
  /** @deprecated Use `rez` instead */
  nuqta?: number;
}

export interface CoinTransaction {
  _id: string;
  coinType: CoinType;
  amount: number;
  type: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
  description: string;
  createdAt: string;
}

// ── Status Normalization (from rez-shared/src/statusCompat.ts) ──────────────

const ORDER_STATUS_MAP: Record<string, string> = {
  in_transit: 'out_for_delivery',
  refund_initiated: 'partially_refunded',
  shipping: 'dispatched',
  packed: 'preparing',
  accepted: 'confirmed',
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
  success: 'paid',
  captured: 'paid',
  pending_capture: 'authorized',
  completed: 'paid',
  initiated: 'awaiting_payment',
};

export function normalizeOrderStatus(status: string): string {
  return ORDER_STATUS_MAP[status] ?? status;
}

export function normalizePaymentStatus(status: string): string {
  return PAYMENT_STATUS_MAP[status] ?? status;
}
