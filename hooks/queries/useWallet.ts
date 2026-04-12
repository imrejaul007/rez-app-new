import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import walletApi from '@/services/walletApi';

// TODO: This duplicates WalletContext. Refactor to read from useWalletContext() instead of
// making independent API calls. WalletContext (contexts/WalletContext.tsx) is the single
// source of truth for wallet balance across the app — consumers of this hook should migrate
// to useWalletContext() to avoid redundant /wallet/balance fetches. Track: sprint cleanup.

export function useWalletBalance() {
  return useQuery({
    queryKey: queryKeys.wallet.balance(),
    queryFn: () => walletApi.getBalance(),
    staleTime: 30_000,
  });
}

export function useWalletTransactions(filters?: { page?: number; limit?: number; type?: string; source?: string }) {
  return useQuery({
    queryKey: queryKeys.wallet.transactions(filters),
    queryFn: () => walletApi.getTransactions(filters as any),
  });
}

export function useWalletTransactionById(id: string) {
  return useQuery({
    queryKey: queryKeys.wallet.transactionDetail(id),
    queryFn: () => walletApi.getTransactionById(id),
    enabled: !!id,
  });
}

export function useWalletSummary(period?: string) {
  return useQuery({
    queryKey: queryKeys.wallet.summary(period),
    queryFn: () => walletApi.getSummary(period as any),
  });
}

export function useExpiringCoins() {
  return useQuery({
    queryKey: queryKeys.wallet.expiring(),
    queryFn: () => walletApi.getExpiringCoins(),
  });
}
