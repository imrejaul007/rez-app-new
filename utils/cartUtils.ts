import { CartItem as CartItemType, LockedProduct, LOCK_CONFIG } from '@/types/cart';

/**
 * Calculate total number of items in the cart
 * CA-CMC-018 FIX: Deprecated calculateTotal() which used to return 0.
 * All price calculations now happen server-side via cart API.
 */
export const getItemCount = (items: CartItemType[]): number => {
  if (!Array.isArray(items)) {
    return 0;
  }
  return items.reduce((total, item) => {
    const qty = typeof item.quantity === 'number' ? Math.max(0, item.quantity) : 0;
    return total + qty;
  }, 0);
};

/**
 * Calculate total number of locked items
 */
export const getLockedItemCount = (lockedItems: LockedProduct[]): number => {
  if (!Array.isArray(lockedItems)) {
    return 0;
  }
  return lockedItems.length;
};

/**
 * CA-CMC-040 FIX: Update locked product timers with proper date validation
 * Recalculates remaining time for each locked item and updates status.
 * Validates expiresAt is a valid Date before calling getTime().
 */
export const updateLockedProductTimers = (lockedProducts: LockedProduct[]): LockedProduct[] => {
  if (!Array.isArray(lockedProducts)) {
    return [];
  }

  const now = Date.now();

  return lockedProducts.map((item) => {
    // CA-CMC-040 FIX: Check expiresAt is a valid Date instance before calling getTime()
    if (!item.expiresAt || !(item.expiresAt instanceof Date)) {
      console.warn(`Invalid expiresAt for locked item ${item._id}:`, item.expiresAt);
      return { ...item, remainingTime: 0, status: 'expired' };
    }

    const expiresAtTime = item.expiresAt.getTime();

    // Check for invalid date
    if (isNaN(expiresAtTime)) {
      console.warn(`Invalid expiresAt timestamp for locked item ${item._id}`);
      return { ...item, remainingTime: 0, status: 'expired' };
    }

    const remainingTime = Math.max(0, expiresAtTime - now);

    // Determine status based on remaining time
    let status: 'active' | 'expiring' | 'expired' = 'active';
    if (remainingTime <= 0) {
      status = 'expired';
    } else if (remainingTime <= LOCK_CONFIG.EXPIRING_THRESHOLD) {
      status = 'expiring';
    }

    return {
      ...item,
      remainingTime,
      status,
    };
  });
};

/**
 * CA-CMC-018 FIX: Deprecated stub that was returning 0.
 * All price calculations now happen server-side. This function
 * is kept for backward compatibility but should not be used.
 * @deprecated Use cart API response totals instead
 */
export const calculateTotal = (): number => {
  console.warn('calculateTotal() is deprecated. Use cart API response totals instead.');
  return 0;
};

/**
 * CA-CMC-018 FIX: Deprecated stub that was returning 0.
 * Locked product prices are fetched from the API response.
 * @deprecated Use cart API response totals instead
 */
export const calculateLockedTotal = (): number => {
  console.warn('calculateLockedTotal() is deprecated. Use cart API response totals instead.');
  return 0;
};
