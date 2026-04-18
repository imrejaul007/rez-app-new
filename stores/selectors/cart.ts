/**
 * Cart store selectors — 37 imports.
 */

import { useCartStore } from '../cartStore';

/** Only re-renders when item count changes */
export const useCartItemCount = () => useCartStore((s) => s.state.items?.length ?? 0);

/** Only re-renders when cart items change */
export const useCartItems = () => useCartStore((s) => s.state.items);

/** Only re-renders when cart total changes */
export const useCartTotal = () => useCartStore((s) => s.state.totalPrice ?? 0);

/** Only re-renders when cart loading changes */
export const useCartLoading = () => useCartStore((s) => s.state.isLoading);

/** Never re-renders — stable action references */
export const useCartActions = () => useCartStore((s) => s.actions);

/** Full cart state (use sparingly) */
export const useCartState = () => useCartStore((s) => s.state);

/** Stable function — never re-renders */
export const useRefreshCart = () => useCartStore((s) => s.refreshCart);
