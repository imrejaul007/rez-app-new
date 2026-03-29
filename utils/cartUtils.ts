/**
 * Cart utility functions — production-safe helpers for locked product calculations.
 *
 * BUG-076 FIX: These utilities were previously exported from utils/mockCartData.ts
 * alongside test fixtures, making it misleading (mock = dev/test only).
 * Moved here so cart.tsx imports from a clearly production-appropriate module.
 * mockCartData.ts re-exports these for backward compatibility with existing tests.
 */

import { CartItem, LockedProduct, LOCK_CONFIG, getLockStatus } from '@/types/cart';

/** Calculate the total price of cart items. */
export const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price, 0);
};

/** Return the count of cart items. */
export const getItemCount = (items: CartItem[]): number => {
  return items.length;
};

/** Calculate the total value of items with pending locks. */
export const calculateLockedTotal = (items: LockedProduct[]): number => {
  return items.reduce((total, item) => {
    // For paid locks, subtract the lock fee since it's already paid
    const lockFee = item.isPaidLock && item.lockFee ? item.lockFee : 0;
    return total + (item.price - lockFee);
  }, 0);
};

/** Return the count of currently locked items. */
export const getLockedItemCount = (items: LockedProduct[]): number => {
  return items.length;
};

/**
 * Recalculate remaining times for all locked products and remove expired ones.
 * Call this on every timer tick to keep the UI in sync.
 */
export const updateLockedProductTimers = (items: LockedProduct[]): LockedProduct[] => {
  const now = new Date();
  return items
    .map((item) => {
      const remainingTime = Math.max(0, item.expiresAt.getTime() - now.getTime());
      return {
        ...item,
        remainingTime,
        status: getLockStatus(remainingTime),
      };
    })
    .filter((item) => item.remainingTime > 0); // Remove expired items
};

/** Format a remaining-time value (ms) as "M:SS". */
export const formatRemainingTime = (remainingTime: number): string => {
  if (remainingTime <= 0) return 'Expired';
  const minutes = Math.floor(remainingTime / (60 * 1000));
  const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `0:${seconds.toString().padStart(2, '0')}`;
};

/** Create a LockedProduct from a CartItem. */
export const createLockedProductFromCartItem = (
  item: CartItem,
  productId?: string,
): LockedProduct => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_CONFIG.DEFAULT_DURATION);
  return {
    id: `locked_${item.id}_${Date.now()}`,
    productId: productId || item.id,
    name: item.name,
    price: item.price,
    image: item.image,
    cashback: item.cashback,
    category: item.category,
    lockedAt: now,
    expiresAt,
    remainingTime: LOCK_CONFIG.DEFAULT_DURATION,
    lockDuration: LOCK_CONFIG.DEFAULT_DURATION,
    status: 'active',
  };
};
