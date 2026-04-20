/**
 * Wallet store selectors — 48 imports.
 */

import { useWalletStore } from '../walletStore';

/** Only re-renders when balance changes */
export const useRezBalance = () => useWalletStore((s) => s.rezBalance);

/** Only re-renders when total balance changes */
export const useTotalBalance = () => useWalletStore((s) => s.totalBalance);

/** Only re-renders when available balance changes */
export const useAvailableBalance = () => useWalletStore((s) => s.availableBalance);

/** Only re-renders when branded coins change */
export const useBrandedCoins = () => useWalletStore((s) => s.brandedCoins);

/** Only re-renders when wallet loading state changes */
export const useWalletLoading = () => useWalletStore((s) => s.isLoading);

/** Never re-renders — stable function reference */
export const useRefreshWallet = () => useWalletStore((s) => s.refreshWallet);

/** Full wallet data (use sparingly — re-renders on any wallet change) */
export const useWalletData = () => useWalletStore((s) => s.walletData);

/** Only re-renders when savings insights change */
export const useSavingsInsights = () => useWalletStore((s) => s.savingsInsights);

/** Raw backend data — use sparingly */
export const useRawWalletData = () => useWalletStore((s) => s.rawBackendData);

/** Only re-renders when refreshing state changes */
export const useWalletRefreshing = () => useWalletStore((s) => s.isRefreshing);

/** Stable function — optimistic balance adjustment for instant UI feedback */
export const useAdjustBalance = () => useWalletStore((s) => s.adjustBalance);

/** Stable function — roll back the last optimistic adjustBalance if API call fails */
export const useRollbackAdjustment = () => useWalletStore((s) => s.rollbackAdjustment);
