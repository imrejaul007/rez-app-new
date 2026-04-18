/**
 * Region store selectors — 426 imports (most used).
 */

import { useRegionStore } from '../regionStore';

/** Only re-renders when region ID changes */
export const useCurrentRegionId = () => useRegionStore((s) => s.currentRegion);

/** Only re-renders when currency changes */
export const useCurrency = () => useRegionStore((s) => s.currency);

/** Stable function — never re-renders */
export const useGetCurrencySymbol = () => useRegionStore((s) => s.getCurrencySymbol);

/** Stable function — never re-renders */
export const useFormatPrice = () => useRegionStore((s) => s.formatPrice);

/** Stable function — never re-renders */
export const useGetLocale = () => useRegionStore((s) => s.getLocale);

/** Stable function — never re-renders */
export const useGetCurrency = () => useRegionStore((s) => s.getCurrency);

/** Stable function — never re-renders */
export const useSetRegion = () => useRegionStore((s) => s.setRegion);

/** Only re-renders when region state changes */
export const useRegionState = () => useRegionStore((s) => s.state);
