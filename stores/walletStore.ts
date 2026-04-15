import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalletData } from '@/types/wallet';

// ---------------------------------------------------------------------------
// State types (mirrors WalletContext)
// ---------------------------------------------------------------------------
interface WalletStoreData {
  walletData: WalletData | null;
  rezBalance: number;
  totalBalance: number;
  availableBalance: number;
  brandedCoins: any[];
  savingsInsights: { totalSaved: number; thisMonth: number; avgPerVisit: number };
  refreshWallet: () => Promise<void>;
  rawBackendData: any | null;
  isLoading: boolean;
  isRefreshing: boolean;
}

interface WalletStoreState extends WalletStoreData {
  _setFromProvider: (data: WalletStoreData) => void;
  /** Optimistic balance adjustment — adds delta to rez/total/available balances */
  adjustBalance: (delta: number) => void;
  /** Reset wallet store to defaults - called on logout (CA-AUT-024) */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const defaults: WalletStoreData = {
  walletData: null,
  rezBalance: 0,
  totalBalance: 0,
  availableBalance: 0,
  brandedCoins: [],
  savingsInsights: { totalSaved: 0, thisMonth: 0, avgPerVisit: 0 },
  refreshWallet: async () => {},
  rawBackendData: null,
  isLoading: false,
  isRefreshing: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useWalletStore = create<WalletStoreState>(
  persist(
    (set) => ({
      ...defaults,

      // Called by WalletProvider on every render to keep store in sync
      _setFromProvider: (data: WalletStoreData) => {
        set(data);
      },

      // Optimistic balance adjustment for instant UI feedback after earning coins.
      // Server truth is restored by the next refreshWallet() call.
      adjustBalance: (delta: number) => {
        set((state) => {
          if (!state.walletData) return state;
          const updatedCoins = state.walletData.coins.map((c) =>
            c.type === 'rez' ? { ...c, amount: c.amount + delta } : c
          );
          return {
            rezBalance: state.rezBalance + delta,
            totalBalance: state.totalBalance + delta,
            availableBalance: state.availableBalance + delta,
            walletData: {
              ...state.walletData,
              totalBalance: state.walletData.totalBalance + delta,
              availableBalance: state.walletData.availableBalance + delta,
              coins: updatedCoins,
            },
          };
        });
      },

      // Fixed CA-AUT-024: Reset wallet store on logout to prevent cache poisoning
      reset: () => {
        set(defaults);
      },
    }),
    {
      name: 'rez-wallet-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist user data, not loading states or functions
        walletData: state.walletData,
        rezBalance: state.rezBalance,
        totalBalance: state.totalBalance,
        availableBalance: state.availableBalance,
        brandedCoins: state.brandedCoins,
        savingsInsights: state.savingsInsights,
        rawBackendData: state.rawBackendData,
      }),
    }
  )
);
