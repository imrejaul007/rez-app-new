// Canonical CoinType: values must match @rez/shared-types/enums CoinType enum
// enum values: PROMO='promo', BRANDED='branded', PRIVE='prive', CASHBACK='cashback', REFERRAL='referral', REZ='rez'
import { ImageSourcePropType } from 'react-native';
import { BRAND } from '@/constants/brand';

/**
 * CoinType values aligned with canonical enum in @rez/shared-types/enums.
 * Enum members: CoinType.PROMO='promo', CoinType.BRANDED='branded', etc.
 * Using string literal type for ergonomic consumption; enum can be imported
 * from @rez/shared-types where strict enum typing is needed.
 */
export type CoinType = 'promo' | 'branded' | 'prive' | 'cashback' | 'referral' | 'rez';

// Branded Coin Details (merchant-specific)
export interface BrandedCoinDetails {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
}

// Promo Coin Details (limited-time)
export interface PromoCoinDetails {
  campaignId?: string;
  campaignName?: string;
  maxRedemptionPercentage: number; // Max 20% per bill
  expiryDate: Date;
  expiryCountdown?: string;
}

// Core Wallet Types
export interface CoinBalance {
  id: string;
  type: CoinType;
  name: string;
  amount: number;
  currency: string;
  formattedAmount: string;
  description: string;
  iconPath: ImageSourcePropType;
  backgroundColor: string;
  color: string; // Primary color (#ffcd57 for Rez, merchant color for Branded, #FFC857 for Promo)
  isActive: boolean;
  expiryDate?: Date;
  expiryCountdown?: string; // For promo coins
  restrictions?: string[];
  earnedDate?: Date;
  lastUsed?: Date;
  // Branded coin specific
  brandedDetails?: BrandedCoinDetails;
  // Promo coin specific
  promoDetails?: PromoCoinDetails;
}

// Branded Coin (for merchant-specific coins array)
export interface BrandedCoin {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
  amount: number;
  formattedAmount: string;
}

// Savings Insights
export interface SavingsInsights {
  totalSaved: number;
  thisMonth: number;
  avgPerVisit: number;
}

// Smart Alert
export interface SmartAlert {
  id: string;
  type: 'expiring' | 'low_balance' | 'offer' | 'promo';
  message: string;
  amount?: number;
  expiryDate?: Date;
  actionLabel?: string;
  actionRoute?: string;
}

export interface WalletTransaction {
  id: string;
  // Canonical source: @rez/shared/src/types/wallet.ts (CoinTransaction.type)
  // Matches backend CoinTransaction.type lowercase values exactly.
  type: 'earned' | 'spent' | 'expired' | 'bonus' | 'refunded' | 'branded_award';
  coinType: CoinType;
  amount: number;
  currency: string;
  formattedAmount: string;
  description: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
  merchantName?: string;
  merchantLogo?: string;
  orderId?: string;
  balanceAfter: number;
}

export interface WalletData {
  userId: string;
  totalBalance: number; // Total value of all coins
  availableBalance: number; // Available for spending
  cashbackBalance: number; // Cashback balance
  pendingRewards: number; // Pending rewards
  currency: string;
  formattedTotalBalance: string;
  coins: CoinBalance[]; // ReZ and Promo coins
  brandedCoins: BrandedCoin[]; // Merchant-specific coins
  brandedCoinsTotal: number; // Sum of all branded coin amounts
  savingsInsights: SavingsInsights; // Savings tracking
  smartAlerts?: SmartAlert[]; // Smart wallet alerts
  recentTransactions: WalletTransaction[];
  lastUpdated: Date;
  isActive: boolean;
  isFrozen?: boolean;
  frozenReason?: string;
}

// Component Props Types
export interface WalletBalanceCardProps {
  coin: CoinBalance;
  onPress?: (coin: CoinBalance) => void;
  isLoading?: boolean;
  showChevron?: boolean;
  testID?: string;
}

export interface WalletScreenProps {
  userId?: string;
  onNavigateBack?: () => void;
  onCoinPress?: (coin: CoinBalance) => void;
  onTransactionPress?: (transaction: WalletTransaction) => void;
}

// State Management Types
export interface WalletState {
  data: WalletData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: WalletError | null;
  lastFetched: Date | null;
}

export interface WalletError {
  code: 'NETWORK_ERROR' | 'SERVER_ERROR' | 'PARSING_ERROR' | 'UNAUTHORIZED' | 'TIMEOUT' | 'REAUTH_REQUIRED' | 'FEATURE_DISABLED' | 'VELOCITY_LIMIT' | 'WALLET_FROZEN';
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
}

// API Types
export interface WalletApiResponse {
  success: boolean;
  data: WalletData;
  message?: string;
  error?: string;
}

export interface RefreshWalletRequest {
  userId: string;
  forceRefresh?: boolean;
}

// Utility Types — canonical source: @rez/shared/src/types/wallet.ts
export type TransactionType = 'earned' | 'spent' | 'expired' | 'bonus' | 'refunded' | 'branded_award';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type WalletErrorCode = 'NETWORK_ERROR' | 'SERVER_ERROR' | 'PARSING_ERROR' | 'UNAUTHORIZED' | 'TIMEOUT' | 'REAUTH_REQUIRED' | 'FEATURE_DISABLED' | 'VELOCITY_LIMIT' | 'WALLET_FROZEN' | 'INSUFFICIENT_BALANCE' | 'UNKNOWN';

// Coin Usage Order — canonical: Promo > Branded > Prive > Cashback > Referral > Rez (automatic)
export const COIN_USAGE_ORDER: CoinType[] = ['promo', 'branded', 'prive', 'cashback', 'referral', 'rez'];

// Constants - Updated for new wallet design
export const COIN_TYPES: Record<CoinType, { name: string; color: string; amountColor: string; backgroundColor: string; icon: string; description: string }> = {
  rez: {
    name: BRAND.COIN_NAME,  // Display name for backend 'rez' type
    color: '#ffcd57', // Mustard (icon/badge use only)
    amountColor: '#B45309', // Dark amber for text (WCAG AA compliant)
    backgroundColor: '#FFF9E6',
    icon: 'rez-coin.png',
    description: `Universal rewards usable anywhere on ${BRAND.APP_NAME}`
  },
  branded: {
    name: 'Branded Coins',
    color: '#6366F1', // Default, actual color from merchant
    amountColor: '#4F46E5', // Deep indigo for text
    backgroundColor: '#EEF2FF',
    icon: 'branded-coin.png',
    description: 'Earned from specific stores. Use at the same store.'
  },
  promo: {
    name: 'Promo Coins',
    color: '#F59E0B', // Amber (icon/badge use only)
    amountColor: '#D97706', // Dark amber for text (WCAG AA compliant)
    backgroundColor: '#FEF3C7',
    icon: 'promo-coin.png',
    description: 'Special coins from campaigns & events'
  },
  prive: {
    name: 'Privé Coins',
    color: '#B8860B', // Dark gold
    amountColor: '#7A5C00', // Deep gold for text (WCAG AA compliant)
    backgroundColor: '#FDF6E3',
    icon: 'prive-coin.png',
    description: 'Premium member exclusive rewards'
  },
  cashback: {
    name: 'Cashback Coins',
    color: '#10B981', // Emerald
    amountColor: '#059669', // Deep emerald for text (WCAG AA compliant)
    backgroundColor: '#ECFDF5',
    icon: 'cashback-coin.png',
    description: 'Cashback rewards from purchases'
  },
  referral: {
    name: 'Referral Coins',
    color: '#8B5CF6', // Purple
    amountColor: '#6D28D9', // Deep purple for text (WCAG AA compliant)
    backgroundColor: '#F5F3FF',
    icon: 'referral-coin.png',
    description: 'Rewards from successful referrals'
  }
};

export const DEFAULT_CURRENCY = BRAND.CURRENCY_CODE;
export const DEFAULT_LOCALE = 'en-IN';
