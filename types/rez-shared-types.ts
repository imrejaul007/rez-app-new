/**
 * @fileoverview Canonical type stubs for shared types
 *
 * Canonical source: packages/shared-types/src/index.ts
 *
 * This module re-exports canonical types from the shared-types package so that
 * rez-app-consumer can import from a stable path (@/types/rez-shared-types).
 *
 * NOTE: @rez/shared-types is not yet published as an npm package. Until then,
 * types are maintained here. When the package is published, update tsconfig.json
 * to resolve @rez/shared-types to packages/shared-types and remove this file.
 */

// Re-export all canonical types
export {
  IKarmaProfile,
  IKarmaEvent,
  IConversionBatch,
  ILevelInfo,
  IKarmaStats,
  IEarnRecord,
  IBadge as IBadgeKarma,
  ILevelHistoryEntry,
  IConversionHistoryEntry,
  KarmaLevel,
  KarmaConversionRate,
  EarnRecordStatus,
  BatchStatus,
} from '../../../packages/shared-types/src/entities/karma';

export {
  IOrder,
  IOrderItem,
  IOrderTotals,
  IOrderPayment,
  IOrderDelivery,
} from '../../../packages/shared-types/src/entities/order';

export {
  OrderStatus,
  PaymentStatus,
  CoinType,
  COIN_PRIORITY,
  CoinTransactionType,
} from '../../../packages/shared-types/src/enums/index';

/**
 * Canonical order statuses (11 states).
 * Use these instead of legacy values like 'pending', 'processing', 'shipped'.
 */
export const CANONICAL_ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'cancelling',
  'cancelled',
  'returned',
  'refunded',
] as const;

/**
 * Legacy status alias map — normalizes deprecated values to canonical equivalents.
 * Used to handle responses from backends that may emit old FSM values.
 */
const LEGACY_STATUS_MAP: Partial<Record<string, CANONICAL_ORDER_STATUSES[number]>> = {
  // Legacy → Canonical
  pending: 'placed',
  processing: 'preparing',
  shipped: 'dispatched',
  // Legacy REZ Now web order alias
  completed: 'delivered',
};

/**
 * Normalizes any order status string to its canonical value.
 * Maps legacy FSM values to canonical values for consistent UI display.
 *
 * @param status - Any order status string (canonical or legacy)
 * @returns The canonical order status
 *
 * @example
 * normalizeOrderStatus('processing')  // 'preparing'
 * normalizeOrderStatus('completed')     // 'delivered'
 * normalizeOrderStatus('delivered')    // 'delivered'
 */
export function normalizeOrderStatus(
  status: string,
): CANONICAL_ORDER_STATUSES[number] {
  if (!status || typeof status !== 'string') {
    return 'placed';
  }
  const normalized = status.toLowerCase().trim();
  return LEGACY_STATUS_MAP[normalized] ?? (normalized as CANONICAL_ORDER_STATUSES[number]);
}
