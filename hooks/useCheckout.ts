import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { errorReporter } from '@/utils/errorReporter';
import NetInfo from '@react-native-community/netinfo';
import {
  CheckoutPageState,
  CheckoutItem,
  PromoCode,
  PaymentMethod,
  BillSummary,
  CoinSystem,
  UseCheckoutReturn,
  CheckoutDeliveryAddress,
  FulfillmentType,
  FulfillmentOption,
  FulfillmentState,
  FulfillmentDetails,
} from '@/types/checkout.types';
import { CheckoutData } from '@/data/checkoutData';
import cartService from '@/services/cartApi';
import ordersService from '@/services/ordersApi';
import walletApi, { BackendBrandedCoin } from '@/services/walletApi';
import couponService from '@/services/couponApi';
import addressApi from '@/services/addressApi';
import storesApi from '@/services/storesApi';
import { createRazorpayPayment, razorpayApi } from '@/services/razorpayApi';
import { mapBackendCartToFrontend, mapFrontendCheckoutToBackendOrder } from '@/utils/dataMappers';
import { showToast } from '@/components/common/ToastManager';
import { useCartActions, useCartState, useGetCurrencySymbol, useWalletData, useRawWalletData, useRefreshWallet, useIsAuthenticated, useAuthLoading, useUserId } from '@/stores/selectors';
import {
  TAX_RATE,
  PLATFORM_FEE,
  REZ_COIN_MAX_USAGE_PERCENTAGE,
  PROMO_COIN_MAX_USAGE_PERCENTAGE,
  STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE,
  getCoinConversionRate,
} from '@/config/checkout.config';
import analyticsService from '@/services/analyticsService';
import analytics from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import discountsApi from '@/services/discountsApi';
import { queryKeys } from '@/lib/queryKeys';
// OG-D004 FIX: Persist checkout progress across OS background-kills.
import { useCheckoutDraftStore, getActiveDraft } from '@/stores/checkoutDraftStore';
import { logger } from '@/utils/logger';

// Helper function to group checkout items by store
interface StoreGroup {
  storeId: string;
  storeName: string;
  items: CheckoutItem[];
  subtotal: number;
}

// Backend API response shapes (not all fields typed, only those accessed in this file)
interface BackendOrderData extends Record<string, unknown> {
  coinsUsed?: {
    rezCoins?: number;
    promoCoins?: number;
    storePromoCoins?: number;
    totalCoinsValue?: number;
  };
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  transactionId?: string;
  redemptionCode?: string;
  offerRedemptionCode?: string;
  lockFeeDiscount?: number;
  cardOfferId?: string;
  cardOfferDiscount?: number;
  walletPayment?: { amount?: number };
}

interface RawWalletData {
  categoryBalances?: Record<string, { available?: number }>;
}

interface BackendOrderItem {
  id?: string;
  _id?: string;
  productId?: string;
  product?: {
    id?: string;
    _id?: string;
    name?: string;
    images?: Array<{ url?: string } | string>;
  };
  unitPrice?: number;
  totalPrice?: number;
  quantity?: number;
  name?: string;
}

interface BackendAddressResponse {
  id?: string;
  _id?: string;
  title?: string;
  type?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
  instructions?: string;
}

interface BackendCouponItem {
  _id?: string;
  couponCode?: string;
  title?: string;
  description?: string;
  discountValue?: number;
  discountType?: string;
  minOrderValue?: number;
  maxDiscountCap?: number;
  status?: string;
  validTo?: string;
  termsAndConditions?: string[];
}

interface BackendStoreData {
  name?: string;
  minimumOrder?: number;
  settings?: { minimumOrder?: number };
  estimatedDelivery?: string;
  deliveryTime?: string;
  distance?: string;
  mainCategorySlug?: string;
  serviceCapabilities?: {
    homeDelivery?: { enabled?: boolean; estimatedTime?: string };
    storePickup?: { enabled?: boolean; estimatedTime?: string };
    driveThru?: { enabled?: boolean; estimatedTime?: string };
    dineIn?: { enabled?: boolean };
  };
}

interface BackendCartItem {
  id?: string;
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;
  originalPrice?: number;
  discount?: number;
  lockedQuantity?: number;
  category?: string;
  store?: {
    id?: string;
    name?: string;
  };
}

const groupItemsByStore = (items: CheckoutItem[]): StoreGroup[] => {
  const storeMap = new Map<string, StoreGroup>();

  items.forEach(item => {
    const storeId = item.storeId || 'unknown';
    const storeName = item.storeName || 'Store';

    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        storeId,
        storeName,
        items: [],
        subtotal: 0,
      });
    }

    const group = storeMap.get(storeId)!;
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
  });

  return Array.from(storeMap.values());
};

// Helper to distribute coins proportionally across stores
const distributeCoinsProportionally = (
  totalCoins: { rezCoins: number; promoCoins: number; storePromoCoins: number },
  storeGroups: StoreGroup[],
  totalSubtotal: number
): Map<string, { rezCoins: number; promoCoins: number; storePromoCoins: number }> => {
  const distribution = new Map();

  storeGroups.forEach(group => {
    const proportion = totalSubtotal > 0 ? group.subtotal / totalSubtotal : 0;
    distribution.set(group.storeId, {
      rezCoins: Math.floor(totalCoins.rezCoins * proportion),
      promoCoins: Math.floor(totalCoins.promoCoins * proportion),
      // Store promo coins only apply to the specific store
      storePromoCoins: 0, // Will be handled separately per store
    });
  });

  return distribution;
};

/**
 * `useCheckout` — primary hook that drives the checkout flow.
 *
 * Manages the full lifecycle of a checkout session: loading cart items,
 * applying promo codes, selecting payment methods, redeeming Rez/promo coins,
 * choosing delivery addresses and fulfillment options, and placing the order
 * via Razorpay.
 *
 * @param retryOrderId - Optional Razorpay order ID to retry a failed payment.
 *   When provided, the hook skips cart creation and pre-fills the order totals
 *   from the existing order, allowing the user to re-attempt payment without
 *   creating a duplicate order.
 *
 * @returns `UseCheckoutReturn` — the full checkout state and action handlers,
 *   including `handlePlaceOrder`, `applyPromoCode`, `selectPaymentMethod`,
 *   `setCoinsToRedeem`, and navigation helpers.
 *
 * @example
 * ```tsx
 * function CheckoutScreen() {
 *   const { pageState, handlePlaceOrder, billSummary } = useCheckout();
 *   // ...
 * }
 * ```
 *
 * @remarks
 * - Coin redemption is capped by `REZ_COIN_MAX_USAGE_PERCENTAGE` and
 *   `PROMO_COIN_MAX_USAGE_PERCENTAGE` from `@/config/checkout.config`.
 * - Analytics events (`checkout_started`, `order_placed`, etc.) are fired
 *   via `analyticsService` and `AnalyticsService`.
 * - The hook synchronises with the Zustand cart store via `useCartState` /
 *   `useCartActions` selectors to avoid prop-drilling.
 */
export const useCheckout = (retryOrderId?: string): UseCheckoutReturn => {
  // OG-D004 FIX: Access draft store for persisting / restoring checkout progress.
  const saveDraft = useCheckoutDraftStore(s => s.saveDraft);
  const clearDraft = useCheckoutDraftStore(s => s.clearDraft);

  const cartActions = useCartActions();
  const cartState = useCartState();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const walletData = useWalletData();
  const walletRawData = useRawWalletData();
  const refreshSharedWallet = useRefreshWallet();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const userId = useUserId();
  const queryClient = useQueryClient();
  // Refs to access latest wallet data inside async callbacks (avoids stale closure)
  const walletDataRef = useRef(walletData);
  const walletRawDataRef = useRef(walletRawData);
  walletDataRef.current = walletData;
  walletRawDataRef.current = walletRawData;

  // OG-001 FIX: Stable idempotency keys derived from userId + cart fingerprint.
  // Using useMemo (rather than useRef with a random value) means:
  //   • Same user + same cart items → same key, even across component remounts
  //   • Cart changes (add/remove item) → new key, new order intent
  // This prevents both duplicate orders on retry AND loss of idempotency
  // protection when the checkout screen remounts mid-session.
  const cartFingerprint = useMemo(() => {
    const items = cartState?.items ?? [];
    // Sort by productId for determinism; include quantity in fingerprint
    const sorted = [...items]
      .sort((a, b) => String(a.productId || a.id || '').localeCompare(String(b.productId || b.id || '')))
      .map((i) => `${i.productId || i.id}:${i.quantity}`)
      .join(',');
    return sorted || 'empty';
  }, [cartState?.items]);

  const orderIdempotencyKeyRef = useRef('');
  const walletIdempotencyKeyRef = useRef('');

  // Regenerate keys whenever cart fingerprint or user changes
  const prevCartFingerprintRef = useRef('');
  const prevUserIdRef = useRef('');
  if (
    cartFingerprint !== prevCartFingerprintRef.current ||
    userId !== prevUserIdRef.current
  ) {
    prevCartFingerprintRef.current = cartFingerprint;
    prevUserIdRef.current = userId || '';
    // CA-CMC-019 FIX: Extended from 15-min window to 1-hour window to prevent duplicate orders
    // when app crashes immediately after payment. 15 minutes was too short — if app crashed at
    // 00:14:59 and restarted at 00:15:01, a new key was generated, allowing charge twice.
    // 1 hour window aligns with typical payment retry windows in fintech.
    const epochBucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const base = `${userId || 'anon'}-${cartFingerprint}-${epochBucket}`;
    orderIdempotencyKeyRef.current = `order-${base}`;
    walletIdempotencyKeyRef.current = `wallet-${base}`;
  }

  // OG-002 FIX: Track in-flight submission to prevent double-tap / reconnect
  // re-submission while a payment request is still in flight.
  const isSubmittingRef = useRef(false);

  // OG-004 FIX: Check network before initiating any payment so the user sees
  // a clear error instead of a stuck loading spinner when offline.
  // CA-CMC-021 FIX: Verified that all callers properly check return value before proceeding
  const assertOnline = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    const online = state.isConnected === true;
    if (!online) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'No internet connection. Please check your network and try again.',
      }));
    }
    return online;
  }, []);

  const [state, setState] = useState<CheckoutPageState>(CheckoutData.initialState);

  // Initialize checkout data with mounted guard
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    if (authLoading || !isAuthenticated) return;
    initializeCheckout().then(() => { hasInitializedRef.current = true; });
    return () => { isMountedRef.current = false; };
  }, [authLoading, isAuthenticated]);

  // OG-D007 FIX: When the app returns to the foreground after being killed
  // mid-payment, the isSubmittingRef is correctly re-initialised to false by
  // the hook re-mount, but the state.currentStep can be stuck at 'processing'
  // if we somehow kept in-memory state (e.g. React Navigation cache on iOS).
  // This listener resets the processing step on foreground so the Pay button
  // is not permanently disabled after a background kill → relaunch.
  useEffect(() => {
    const appStateRef = { current: AppState.currentState as AppStateStatus };
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === 'active') {
        // If we were processing when the app was backgrounded/killed, reset so
        // the user can retry cleanly.
        if (isMountedRef.current) {
          setState(s => {
            if (s.currentStep === 'processing') {
              isSubmittingRef.current = false;
              return { ...s, currentStep: 'checkout', loading: false };
            }
            return s;
          });
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // ── OG-D008 FIX: Payment recovery on mount ──────────────────────────
  // If the app was killed between payment capture (Razorpay or wallet debit)
  // and order creation, the draft store will contain a pending payment that
  // was never completed. On mount, detect this and attempt recovery.
  const hasAttemptedRecoveryRef = useRef(false);
  useEffect(() => {
    if (hasAttemptedRecoveryRef.current) return;
    if (authLoading || !isAuthenticated) return;

    const draft = getActiveDraft();
    if (!draft) return;

    const hasRazorpayPending = !!(draft.razorpayPaymentId && !draft.orderCreated);
    const hasWalletPending = !!(draft.walletPaymentPending && draft.walletTransactionId && !draft.orderCreated);

    if (!hasRazorpayPending && !hasWalletPending) return;

    hasAttemptedRecoveryRef.current = true;
    logger.info('[Checkout] Detected pending payment recovery:', {
      razorpay: hasRazorpayPending ? draft.razorpayPaymentId : null,
      wallet: hasWalletPending ? draft.walletTransactionId : null,
    });

    (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        if (hasRazorpayPending && draft.razorpayPaymentId && draft.razorpayOrderId) {
          // Attempt to verify the Razorpay payment with the backend.
          // If the backend already created the order during verification,
          // we get back the orderId and can navigate to success.
          const verifyResponse = await razorpayApi.verifyPayment({
            razorpayOrderId: draft.razorpayOrderId,
            razorpayPaymentId: draft.razorpayPaymentId,
            razorpaySignature: draft.razorpaySignature || '',
          });

          if (verifyResponse.success && verifyResponse.data) {
            const { orderId, transactionId } = verifyResponse.data;
            if (orderId) {
              // Payment was verified and order exists — navigate to success.
              logger.info('[Checkout] Razorpay payment recovered, orderId:', orderId);
              clearDraft();
              showToast({ message: 'Your previous payment was recovered successfully!', type: 'success' });
              router.replace(`/payment-success?orderId=${orderId}&transactionId=${transactionId || draft.razorpayPaymentId}&paymentMethod=razorpay`);
              return;
            }
          }

          // Verification didn't return an order — payment may have been
          // captured but order was never created. Show a support message
          // and clear the draft so the user isn't stuck in a loop.
          logger.warn('[Checkout] Razorpay payment found but no order was created. Payment ID:', draft.razorpayPaymentId);
          clearDraft();
          showToast({
            message: 'We found a previous payment that wasn\'t completed. If you were charged, please contact support with payment ID: ' + draft.razorpayPaymentId,
            type: 'error',
          });

        } else if (hasWalletPending && draft.walletTransactionId) {
          // Wallet was debited but order was never created.
          // We cannot create the order from the client (we lost the checkout
          // state), so inform the user and clear the draft.
          logger.warn('[Checkout] Wallet payment pending but order not created. Transaction ID:', draft.walletTransactionId);
          clearDraft();
          showToast({
            message: 'A previous wallet payment was not completed. If your balance was deducted, please contact support with transaction ID: ' + draft.walletTransactionId,
            type: 'error',
          });
        }
      } catch (err) {
        logger.error('[Checkout] Payment recovery failed:', err as Error);
        // CA-CMC-049 FIX: If backend is down during recovery, we still need to handle it gracefully.
        // TODO (SERVER-SIDE): Implement server-side order reconciliation endpoint that:
        // 1. Accepts razorpayPaymentId or walletTransactionId
        // 2. Checks if an order was already created for this payment
        // 3. Returns orderId if order exists, allowing client to redirect to success
        // This prevents users from retrying payment when order was already created but recovery failed.
        clearDraft();
      } finally {
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    })();
  }, [authLoading, isAuthenticated]);

  // Refresh wallet data when user returns to checkout (e.g., after failed payment or back from address screen)
  useFocusEffect(
    useCallback(() => {
      // Skip on initial mount — initializeCheckout already handles it
      if (!hasInitializedRef.current) return;
      // Refresh wallet in background so coin balances are fresh
      refreshSharedWallet().catch(() => {});
    }, [refreshSharedWallet])
  );

  // Apply card offer from cart context if one was pre-selected
  // CA-CMC-023 FIX: Only apply offer once per checkout session, not on every loading state change
  // Use a ref to track if offer has been applied to prevent re-application on coin toggle
  const cardOfferAppliedRef = useRef(false);
  useEffect(() => {
    // Only apply if:
    // 1. Checkout is initialized (not loading)
    // 2. There's a new card offer from cart
    // 3. We haven't already applied an offer in this session
    if (!state.loading && cartState.appliedCardOffer && !state.appliedCardOffer && !cardOfferAppliedRef.current) {
      cardOfferAppliedRef.current = true;
      // Apply the card offer from cart
      const offer = cartState.appliedCardOffer;
      setState(prev => {
        const orderTotal = prev.billSummary?.totalPayable || 0;
        let discountAmount = 0;

        if (offer.type === 'percentage') {
          discountAmount = Math.round((orderTotal * offer.value) / 100);
          if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
            discountAmount = offer.maxDiscountAmount;
          }
        } else {
          discountAmount = offer.value || 0;
        }

        const newBillSummary = {
          ...prev.billSummary,
          cardOfferDiscount: discountAmount,
          totalPayable: Math.max(0, prev.billSummary.totalPayable - discountAmount),
        };

        logger.info('💳 [Checkout] Applied card offer from cart:', { offer, discountAmount });

        return {
          ...prev,
          appliedCardOffer: offer,
          billSummary: newBillSummary,
        };
      });
    }
  }, [cartState.appliedCardOffer, state.appliedCardOffer]);

  const initializeCheckout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {

      // If retryOrderId is provided, load from the failed order instead of cart
      if (retryOrderId) {
        try {
          const orderResponse = await ordersService.getOrderById(retryOrderId);
          if (orderResponse.success && orderResponse.data) {
            const order = orderResponse.data;

            // Map order items to checkout items
            const checkoutItems: CheckoutItem[] = (order.items || []).map((item: BackendOrderItem) => {
              // CA-CMC-044 FIX: Guard against division by zero if quantity is 0 or missing.
              // Use Math.max to ensure denominator is at least 1.
              const safeQuantity = Math.max(item.quantity || 1, 1);
              return {
                id: item.id || item._id || item.productId || 'unknown-item',
                productId: item.productId || item.product?.id || item.product?._id,
                name: item.product?.name || item.name || 'Product',
                image: typeof item.product?.images?.[0] === 'string'
                  ? item.product.images[0]
                  : (item.product?.images?.[0] as { url?: string } | undefined)?.url || '',
                price: item.unitPrice || (item.totalPrice ?? 0) / safeQuantity,
                originalPrice: item.unitPrice || (item.totalPrice ?? 0) / safeQuantity,
                quantity: safeQuantity,
                discount: 0,
                category: '',
                storeId: typeof order.store === 'object' ? (order.store?._id || order.store?.id || '') : (order.store || ''),
                storeName: typeof order.store === 'object' ? (order.store?.name || 'Store') : 'Store',
              };
            });

            // Set delivery address from order
            const orderAddr = order.delivery?.address;
            let selectedAddress: CheckoutDeliveryAddress | undefined;
            if (orderAddr) {
              selectedAddress = {
                id: 'order-address',
                name: orderAddr.name || orderAddr.addressType || 'Address',
                phone: orderAddr.phone || '',
                addressLine1: orderAddr.addressLine1,
                addressLine2: orderAddr.addressLine2,
                city: orderAddr.city,
                state: orderAddr.state,
                pincode: orderAddr.pincode,
                country: orderAddr.country || 'India',
                type: orderAddr.addressType ? (orderAddr.addressType.toUpperCase() as 'HOME' | 'OFFICE' | 'OTHER') : undefined,
                isDefault: false,
              };
            }

            // Calculate bill summary from order totals
            const totals = order.totals || order.summary;
            const itemTotal = totals?.subtotal || checkoutItems.reduce((t, i) => t + i.price * i.quantity, 0);
            const taxes = totals?.tax || Math.round(itemTotal * TAX_RATE);
            const deliveryFee = totals?.delivery || (totals as { shipping?: number }).shipping || 0;

            const billSummary: BillSummary = {
              itemTotal,
              deliveryFee,
              platformFee: 0,
              taxes,
              promoDiscount: totals?.discount || 0,
              lockFeeDiscount: totals?.lockFeeDiscount || 0,
              coinDiscount: 0,
              cardOfferDiscount: 0,
              roundOff: 0,
              totalBeforeCoinDiscount: Math.max(0, itemTotal + deliveryFee + taxes - (totals?.discount || 0)),
              totalPayable: totals?.total || Math.max(0, itemTotal + deliveryFee + taxes - (totals?.discount || 0)),
              cashbackEarned: totals?.cashback || 0,
              savings: totals?.discount || 0,
            };

            const storeId = checkoutItems[0]?.storeId || '';
            const mockData = await CheckoutData.api.initializeCheckout();

            if (!isMountedRef.current) return;
            setState(prev => ({
              ...prev,
              items: checkoutItems,
              store: { id: storeId, name: checkoutItems[0]?.storeName || 'Store', distance: '', deliveryFee, minimumOrder: 0, estimatedDelivery: '30-45 min' },
              billSummary,
              selectedAddress,
              availablePaymentMethods: mockData.paymentMethods,
              recentPaymentMethods: mockData.paymentMethods.filter((m: PaymentMethod) => m.isRecent),
              loading: false,
            }));
            return;
          }
        } catch (orderError) {
          logger.warn('⚠️ [Checkout] Failed to load retry order, falling back to cart:', orderError);
        }
      }

      // Try to load from cart API first
      try {
        const cartResponse = await cartService.getCart();

        if (cartResponse.success && cartResponse.data) {

          const mappedCart = mapBackendCartToFrontend(cartResponse.data);

          // Convert cart items to checkout items format
          // CA-CMC-045 FIX: Client-side prices are from cache and could be tampered.
          // TODO (SERVER-SIDE): Backend MUST recalculate all prices from product master data
          // at order creation time (ignoring client prices). Do NOT trust item.price from frontend.
          const checkoutItems: CheckoutItem[] = mappedCart.items.map((item: BackendCartItem) => ({
            id: item.id,
            productId: item.productId, // Keep product ID for order creation
            name: item.name,
            image: item.image,
            price: item.price,
            originalPrice: item.originalPrice,
            quantity: item.quantity,
            discount: item.discount || 0, // Lock fee already paid (only for items with lockedQuantity > 0)
            lockedQuantity: item.lockedQuantity || 0, // How many items have lock fee applied
            category: item.category || '',
            storeId: item.store?.id || '',
            storeName: item.store?.name || '',
          }));

          // Get bill summary from cart totals - Map to correct BillSummary structure
          // Calculate itemTotal from actual cart items (full price before lock fee)
          const itemTotalBeforeLockFee = checkoutItems.reduce((total, item) => total + (item.price * item.quantity), 0);
          // Calculate total lock fee already paid across all items
          // IMPORTANT: Only count discount as lock fee if item has lockedQuantity > 0
          // Regular sale discounts (originalPrice > price) are NOT lock fees
          const lockFeeDiscount = checkoutItems.reduce((total, item) => {
            const lockedQty = (item as { lockedQuantity?: number }).lockedQuantity || 0;
            // Only count as lock fee if item was actually locked
            return total + (lockedQty > 0 ? (item.discount || 0) : 0);
          }, 0);
          // Item total shown in bill = full price (lock fee shown as separate deduction)
          const itemTotal = itemTotalBeforeLockFee;
          const deliveryFee = mappedCart.totals.delivery || mappedCart.totals.shipping || 0;
          // Note: platformFee is NOT charged to customers - it's deducted from merchant payouts
          // Setting to 0 in customer-facing calculations to match backend
          const platformFee = 0;
          const promoDiscount = mappedCart.totals.discount || 0;
          const coinDiscount = 0; // Will be calculated when coins are toggled
          // CA-CMC-024 FIX: Tax should be calculated on the discounted amount.
          // Tax base = itemTotal - lockFeeDiscount - promoDiscount (both deductions apply).
          const taxBase = Math.max(0, itemTotal - lockFeeDiscount - promoDiscount);
          const taxes = Math.round(taxBase * TAX_RATE);

          // Debug: Log the values
          logger.info('💰 [Checkout] Bill calculation:', {
            itemTotal,
            lockFeeDiscount,
            deliveryFee,
            platformFee,
            taxes,
            promoDiscount,
            backendTax: mappedCart.totals.tax,
            backendTotal: mappedCart.totals.total,
          });

          // Calculate total before coin discount (for slider max calculation)
          // CA-CMC-025 FIX: lockFeeDiscount already reflected in taxes (line 522), don't double-count
          const totalBeforeCoinDiscount = Math.max(0, itemTotal + deliveryFee + platformFee + taxes - promoDiscount);

          // Always calculate total payable from our values to ensure consistency
          let totalPayable = totalBeforeCoinDiscount - coinDiscount;

          // Calculate round off to nearest rupee
          const roundOff = Math.round(totalPayable) - totalPayable;
          totalPayable = Math.max(0, Math.round(totalPayable));

          // Calculate savings from actual cart items (originalPrice - price) * quantity
          const calculatedSavings = checkoutItems.reduce((total, item) => {
            const originalPrice = item.originalPrice || item.price;
            const savings = (originalPrice - item.price) * item.quantity;
            return total + Math.max(0, savings);
          }, 0);

          const billSummary: BillSummary = {
            itemTotal,
            
            deliveryFee,
            platformFee,
            taxes,
            promoDiscount,
            lockFeeDiscount,
            coinDiscount,
            cardOfferDiscount: 0, // Will be calculated when card offer is applied
            roundOff,
            totalBeforeCoinDiscount,
            totalPayable,
            cashbackEarned: Math.round((mappedCart.totals.cashback || 0)),
            savings: (calculatedSavings || promoDiscount) + lockFeeDiscount,
          };

          // Get promo code from cart
          const appliedPromoCode: PromoCode | undefined = mappedCart.coupon ? {
            id: mappedCart.coupon.code, // Using code as id since we don't have the actual id
            code: mappedCart.coupon.code,
            title: mappedCart.coupon.code,
            description: `${mappedCart.coupon.discountValue}% off`,
            discountType: mappedCart.coupon.discountType || 'PERCENTAGE',
            discountValue: mappedCart.coupon.discountValue,
            maxDiscount: mappedCart.coupon.appliedAmount,
            minOrderValue: 0,
            validUntil: '',
            isActive: true,
            termsAndConditions: [],
          } : undefined;

          // NEW: Fetch real wallet data
          // Note: Backend uses 'rez' coins, displayed as REZ Coins in UI
          let realCoinSystem: CoinSystem = {
            rezCoin: {
              available: 0,
              used: 0,
              conversionRate: getCoinConversionRate(),
              maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
            },
            promoCoin: {
              available: 0,
              used: 0,
              conversionRate: getCoinConversionRate(),
              maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
            },
            storePromoCoin: {
              available: 0,
              used: 0,
              conversionRate: getCoinConversionRate(),
              maxUsagePercentage: STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE // Store promo coins limited to 30% of order value
            }
          };

          // Build real store data from cart items
          const firstItem = checkoutItems[0];
          let realStore: any = {
            id: firstItem?.storeId || '',
            name: firstItem?.storeName || 'Store',
            distance: '', // Will be fetched from store API
            deliveryFee: deliveryFee,
            minimumOrder: 0,
            estimatedDelivery: '30-45 min',
            categorySlug: '', // Root MainCategory slug for category-specific coins
          };

          let fulfillmentState: FulfillmentState = {
            selectedType: 'delivery',
            availableTypes: [
              { type: 'delivery', label: 'Delivery', icon: 'bicycle-outline', description: 'Deliver to your address', enabled: true, estimatedTime: '30-45 min' },
            ],
          };

          // Fire all independent API calls in parallel for faster checkout initialization.
          // Uses queryClient.fetchQuery for addresses, coupons, and store so results
          // are cached and deduplicated across re-renders / re-mounts.
          const [
            walletRefreshResult,
            couponsResult,
            storeResult,
            mockDataResult,
            addressResult,
          ] = await Promise.allSettled([
            // 1. Refresh wallet context
            refreshSharedWallet(),
            // 2. Fetch available coupons (cached via react-query)
            queryClient.fetchQuery({
              queryKey: queryKeys.checkout.coupons(),
              queryFn: () => couponService.getAvailableCoupons(),
            }),
            // 3. Fetch store details (cached via react-query, only if storeId exists)
            firstItem?.storeId
              ? queryClient.fetchQuery({
                  queryKey: queryKeys.checkout.store(firstItem.storeId),
                  queryFn: () => storesApi.getStoreById(firstItem.storeId),
                  staleTime: 2 * 60_000,
                })
              : Promise.resolve(null),
            // 4. Fetch mock payment methods
            CheckoutData.api.initializeCheckout(),
            // 5. Fetch user addresses (cached via react-query, 5min staleTime)
            queryClient.fetchQuery({
              queryKey: queryKeys.checkout.addresses(),
              queryFn: () => addressApi.getUserAddresses(),
              staleTime: 5 * 60_000,
            }),
          ]);

          // Process wallet refresh result
          let walletCategoryBalances: Record<string, any> | null = null;
          if (walletRefreshResult.status === 'rejected') {
            logger.error('💳 [Checkout] Failed to refresh wallet, using cached balance:', walletRefreshResult.reason);
          }

          // Read wallet data from shared WalletContext (via refs for fresh values after refresh)
          try {
            const storeId = checkoutItems[0]?.storeId;
            const currentWalletData = walletDataRef.current;
            const currentWalletRawData = walletRawDataRef.current;
            walletCategoryBalances = (currentWalletRawData as RawWalletData)?.categoryBalances || null;

            if (currentWalletData) {
              const rezCoin = currentWalletData.coins.find((c) => c.type === 'rez');
              const promoCoin = currentWalletData.coins.find((c) => c.type === 'promo');

              // Find branded coins for this specific store (store-specific coins)
              const brandedCoins = currentWalletData.brandedCoins || [];
              const storeBrandedCoin = storeId
                ? brandedCoins.find((bc: BackendBrandedCoin) => bc.merchantId === storeId)
                : null;

              // Global ReZ coin balance (may be overridden later with category-specific balance)
              const rezAvailable = rezCoin?.amount || 0;

              realCoinSystem = {
                ...realCoinSystem,
                rezCoin: {
                  available: rezAvailable,
                  used: 0,
                  conversionRate: getCoinConversionRate(),
                  maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
                },
                promoCoin: {
                  available: promoCoin?.amount || 0,
                  used: 0,
                  conversionRate: getCoinConversionRate(),
                  maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
                },
                storePromoCoin: {
                  available: storeBrandedCoin?.amount || 0,
                  used: 0,
                  conversionRate: getCoinConversionRate(),
                  maxUsagePercentage: STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE,
                  storeId: storeId,
                  storeName: storeBrandedCoin?.merchantName,
                  storeColor: storeBrandedCoin?.merchantColor,
                }
              };

              logger.info('💰 [Checkout] Wallet coins loaded from context:', {
                rezCoins: realCoinSystem.rezCoin.available,
                promoCoins: realCoinSystem.promoCoin.available,
                brandedCoinsAvailable: realCoinSystem.storePromoCoin?.available || 0,
                storeName: storeBrandedCoin?.merchantName,
                currentStoreId: storeId,
                allBrandedCoins: brandedCoins.map((bc: BackendBrandedCoin) => ({
                  merchantId: bc.merchantId,
                  merchantName: bc.merchantName,
                  amount: bc.amount
                })),
                matchFound: !!storeBrandedCoin
              });
            }
          } catch (walletError) {
            logger.error('💳 [Checkout] Failed to read wallet context, using 0 balance:', walletError as Error);
          }

          // Process coupons result
          let realAvailableCoupons: PromoCode[] = [];
          if (couponsResult.status === 'fulfilled' && couponsResult.value) {
            const couponsResponse = couponsResult.value;
            if (couponsResponse.success && couponsResponse.data) {
              realAvailableCoupons = couponsResponse.data.coupons.map((coupon: any) => ({
                id: coupon._id,
                code: coupon.couponCode,
                title: coupon.title || coupon.couponCode,
                description: coupon.description || `Get discount on your order`,
                discountValue: coupon.discountValue,
                discountType: coupon.discountType,
                minOrderValue: coupon.minOrderValue,
                maxDiscount: coupon.maxDiscountCap || 0,
                isActive: coupon.status === 'active',
                validUntil: coupon.validTo,
                termsAndConditions: coupon.termsAndConditions || [],
              }));
            }
          } else if (couponsResult.status === 'rejected') {
            logger.error('💳 [Checkout] Failed to load coupons:', couponsResult.reason as Error);
          }

          // Process store details result
          if (storeResult.status === 'fulfilled' && storeResult.value) {
            const storeResponse = storeResult.value;
            if (storeResponse.success && storeResponse.data) {
              const storeData = storeResponse.data as BackendStoreData;
              realStore = {
                ...realStore,
                name: storeData.name || realStore.name,
                minimumOrder: storeData.minimumOrder || storeData.settings?.minimumOrder || 0,
                estimatedDelivery: storeData.estimatedDelivery || storeData.deliveryTime || '30-45 min',
                distance: storeData.distance || '',
                categorySlug: storeData.mainCategorySlug || '',
              };

              // Build fulfillment options from serviceCapabilities
              const caps = storeData.serviceCapabilities;
              if (caps) {
                const types: FulfillmentOption[] = [];
                if (caps.homeDelivery?.enabled) {
                  types.push({ type: 'delivery', label: 'Delivery', icon: 'bicycle-outline', description: 'Deliver to your address', enabled: true, estimatedTime: caps.homeDelivery.estimatedTime || '30-45 min' });
                }
                if (caps.storePickup?.enabled) {
                  types.push({ type: 'pickup', label: 'Pickup', icon: 'bag-handle-outline', description: 'Pick up at store', enabled: true, estimatedTime: caps.storePickup.estimatedTime || '15-20 min' });
                }
                if (caps.driveThru?.enabled) {
                  types.push({ type: 'drive_thru', label: 'Drive-Thru', icon: 'car-outline', description: 'Order from your car', enabled: true, estimatedTime: caps.driveThru.estimatedTime || '5-10 min' });
                }
                if (caps.dineIn?.enabled) {
                  types.push({ type: 'dine_in', label: 'Dine-In', icon: 'restaurant-outline', description: 'Eat at the restaurant', enabled: true });
                }
                if (types.length > 0) {
                  fulfillmentState = {
                    selectedType: types[0].type,
                    availableTypes: types,
                  };
                }
              }
            }
          } else if (storeResult.status === 'rejected') {
            logger.warn('Failed to fetch store details, using defaults:', storeResult.reason);
          }

          // Override rez coin balance with category-specific amount if available
          if (realStore?.categorySlug && walletCategoryBalances) {
            const catBal = walletCategoryBalances[realStore.categorySlug];
            if (catBal && catBal.available > 0) {
              realCoinSystem.rezCoin.available = catBal.available;
              logger.info('💰 [Checkout] Category coin balance applied:', realStore.categorySlug, catBal.available);
            }
          }

          // Process mock data result (payment methods)
          const mockData = mockDataResult.status === 'fulfilled' ? mockDataResult.value : await CheckoutData.api.initializeCheckout();

          // Process address result
          let userAddresses: CheckoutDeliveryAddress[] = [];
          let defaultAddress: CheckoutDeliveryAddress | undefined;
          if (addressResult.status === 'fulfilled' && addressResult.value) {
            const addressResponse = addressResult.value;
            logger.info('📍 [Checkout] Address response:', addressResponse);

            if (addressResponse.success && addressResponse.data) {
              userAddresses = addressResponse.data.map((addr: any) => ({
                id: addr.id || addr._id,
                name: addr.title || addr.type || 'Address',
                phone: addr.phone || '', // Will need to be filled by user or fetched from profile
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                city: addr.city,
                state: addr.state,
                pincode: addr.postalCode || addr.pincode,
                country: addr.country || 'India',
                type: addr.type,
                isDefault: addr.isDefault,
                instructions: addr.instructions,
              }));
              // Priority: last-used from recent order > isDefault > first
              // Note: This call depends on userAddresses so it stays sequential
              let lastUsedAddress: CheckoutDeliveryAddress | undefined;
              try {
                const recentOrder = await ordersService.getOrders({ page: 1, limit: 1, status: 'delivered' });
                const lastAddr = recentOrder.data?.orders?.[0]?.delivery?.address;
                if (lastAddr) {
                  lastUsedAddress = userAddresses.find(addr =>
                    addr.addressLine1 === lastAddr.addressLine1 &&
                    addr.pincode === lastAddr.pincode
                  );
                }
              } catch (err: any) {
                errorReporter.captureError(
                  err instanceof Error ? err : new Error('Failed to fetch recent order for address'),
                  { context: 'useCheckout.loadAddresses' },
                  'info'
                );
              } // Non-critical — fallback to default
              defaultAddress = lastUsedAddress || userAddresses.find(addr => addr.isDefault) || userAddresses[0];

              // OG-D004 FIX: Prefer the address the user had selected in the
              // previous checkout session (draft) so that after an OS kill the
              // user does not have to re-select their address from scratch.
              const activeDraft = getActiveDraft();
              if (activeDraft?.selectedAddressId) {
                const draftAddr = userAddresses.find(a => a.id === activeDraft.selectedAddressId);
                if (draftAddr) {
                  defaultAddress = draftAddr;
                  logger.info('📍 [Checkout] Address restored from draft:', draftAddr.addressLine1);
                }
              }

              logger.info('📍 [Checkout] Addresses loaded:', {
                total: userAddresses.length,
                defaultAddress: defaultAddress?.addressLine1 || 'none',
                lastUsedMatch: !!lastUsedAddress,
              });
            }
          } else if (addressResult.status === 'rejected') {
            logger.error('📍 [Checkout] Failed to load addresses:', addressResult.reason as Error);
          }

          // Adjust delivery fee for non-delivery fulfillment
          let adjustedBillSummary = billSummary;
          if (fulfillmentState.selectedType !== 'delivery') {
            const noDeliveryTotal = Math.max(0, billSummary.totalPayable - billSummary.deliveryFee);
            adjustedBillSummary = {
              ...billSummary,
              deliveryFee: 0,
              totalBeforeCoinDiscount: billSummary.totalBeforeCoinDiscount - billSummary.deliveryFee,
              totalPayable: noDeliveryTotal,
            };
          }

          // Auto-apply coins in priority order (Promo → StorePromo → REZ) so the
          // checkout opens with coins pre-applied, matching backend debitInPriorityOrder.
          const autoAppliedCoinSystem = autoApplyCoinsInOrder(realCoinSystem, adjustedBillSummary.totalPayable);
          const autoAppliedBillSummary = CheckoutData.helpers.calculateBillSummary(
            checkoutItems,
            realStore,
            appliedPromoCode,
            { rez: autoAppliedCoinSystem.rezCoin.used, promo: autoAppliedCoinSystem.promoCoin.used },
          );

          if (!isMountedRef.current) return;
          setState(prev => ({
            ...prev,
            items: checkoutItems,
            store: realStore,
            fulfillment: fulfillmentState,
            billSummary: autoAppliedBillSummary,
            selectedAddress: defaultAddress,
            availableAddresses: userAddresses,
            appliedPromoCode,
            availablePromoCodes: realAvailableCoupons,
            coinSystem: autoAppliedCoinSystem,
            availablePaymentMethods: mockData.paymentMethods,
            recentPaymentMethods: mockData.paymentMethods.filter(m => m.isRecent),
            showAddressSection: fulfillmentState.selectedType === 'delivery',
            loading: false,
          }));

          // Track begin_checkout event
          try { analytics.trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, { item_count: checkoutItems.length, cart_value: adjustedBillSummary.itemTotal, store_id: realStore.id }); } catch {} // Silent: non-critical analytics

          return;
        }
      } catch (apiError) {
        logger.warn('⚠️ [Checkout] Failed to load checkout data from API, using fallback:', apiError);
      }

      // Fallback to mock data + real wallet
      // Note: Backend uses 'rez' coins, displayed as REZ Coins in UI
      let realCoinSystem: CoinSystem = {
        rezCoin: {
          available: 0,
          used: 0,
          conversionRate: getCoinConversionRate(),
          maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
        },
        promoCoin: {
          available: 0,
          used: 0,
          conversionRate: getCoinConversionRate(),
          maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
        },
        storePromoCoin: {
          available: 0,
          used: 0,
          conversionRate: getCoinConversionRate(),
          maxUsagePercentage: STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE
        }
      };

      // Read wallet data from shared WalletContext (already refreshed above)
      try {
        logger.info('💳 [Checkout] Reading wallet balance from context (fallback)...');
        const currentWalletData = walletDataRef.current;
        const currentWalletRawData = walletRawDataRef.current;

        if (currentWalletData) {
          const rezCoin = currentWalletData.coins.find((c) => c.type === 'rez');
          const promoCoin = currentWalletData.coins.find((c) => c.type === 'promo');

          // Check for category-specific balance (fallback path)
          const fallbackCategoryBalances = (currentWalletRawData as RawWalletData)?.categoryBalances;
          const fallbackCatSlug = (state.store as any)?.categorySlug;
          const fallbackCatBal = fallbackCatSlug && fallbackCategoryBalances ? fallbackCategoryBalances[fallbackCatSlug] : null;
          const fallbackRezAvailable = fallbackCatBal?.available ?? (rezCoin?.amount || 0);

          realCoinSystem = {
            ...realCoinSystem,
            rezCoin: {
              available: fallbackRezAvailable,
              used: 0,
              conversionRate: getCoinConversionRate(),
              maxUsagePercentage: REZ_COIN_MAX_USAGE_PERCENTAGE
            },
            promoCoin: {
              available: promoCoin?.amount || 0,
              used: 0,
              conversionRate: getCoinConversionRate(),
              maxUsagePercentage: PROMO_COIN_MAX_USAGE_PERCENTAGE
            }
          };

          logger.info('💳 [Checkout] Loaded wallet coins from context:', {
            rez: realCoinSystem.rezCoin.available,
            promo: realCoinSystem.promoCoin.available,
            categoryBalance: fallbackCatBal
          });
        }
      } catch (walletError) {
        logger.error('💳 [Checkout] Failed to read wallet context (fallback), using 0 balance:', walletError as Error);
      }
      
      // Fetch store promo coins for this store (fallback)
      try {
        // For fallback, we might not have checkoutStore, but we can try from state or mock data
        logger.info('💎 [Checkout] Skipping store promo coins in fallback mode');
        // Note: In fallback mode, store ID might not be available yet
      } catch (storeCoinsError) {
        logger.error('💎 [Checkout] Failed to load store promo coins (fallback):', storeCoinsError as Error);
      }

      // Fire independent fallback API calls in parallel (coupons cached via react-query)
      const [fallbackCouponsResult, fallbackMockResult] = await Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: queryKeys.checkout.coupons(),
          queryFn: () => couponService.getAvailableCoupons(),
        }),
        CheckoutData.api.initializeCheckout(),
      ]);

      let realAvailableCoupons: PromoCode[] = [];
      if (fallbackCouponsResult.status === 'fulfilled' && fallbackCouponsResult.value) {
        const couponsResponse = fallbackCouponsResult.value;
        if (couponsResponse.success && couponsResponse.data) {
          realAvailableCoupons = couponsResponse.data.coupons.map((coupon: any) => ({
            id: coupon._id,
            code: coupon.couponCode,
            title: coupon.title || coupon.couponCode,
            description: coupon.description || `Get discount on your order`,
            discountValue: coupon.discountValue,
            discountType: coupon.discountType,
            minOrderValue: coupon.minOrderValue,
            maxDiscount: coupon.maxDiscountCap || 0,
            isActive: coupon.status === 'active',
            validUntil: coupon.validTo,
            termsAndConditions: coupon.termsAndConditions || [],
          }));
          logger.info('💳 [Checkout] Loaded coupons (fallback)');
        }
      } else if (fallbackCouponsResult.status === 'rejected') {
        logger.error('💳 [Checkout] Failed to load coupons (fallback):', fallbackCouponsResult.reason as Error);
      }

      const data = fallbackMockResult.status === 'fulfilled' ? fallbackMockResult.value : await CheckoutData.api.initializeCheckout();

      // Auto-apply coins in priority order on fallback path too
      const fallbackAutoCoins = autoApplyCoinsInOrder(realCoinSystem, data.billSummary?.totalPayable ?? 0);

      if (!isMountedRef.current) return;
      setState(prev => ({
        ...prev,
        items: data.items,
        store: data.store,
        billSummary: data.billSummary,
        availablePromoCodes: realAvailableCoupons,
        coinSystem: fallbackAutoCoins,
        availablePaymentMethods: data.paymentMethods,
        recentPaymentMethods: data.paymentMethods.filter(m => m.isRecent),
        loading: false,
      }));
    } catch (_error) {
      if (!isMountedRef.current) return;
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to initialize checkout',
      }));
    }
  }, []);

  const updateBillSummary = useCallback(() => {
    const coinUsage = {
      rez: state.coinSystem.rezCoin.used,
      promo: state.coinSystem.promoCoin.used,
    };
    
    const newBillSummary = CheckoutData.helpers.calculateBillSummary(
      state.items,
      state.store,
      state.appliedPromoCode,
      coinUsage
    );
    
    setState(prev => ({ ...prev, billSummary: newBillSummary }));
  }, [state.items, state.store, state.appliedPromoCode, state.coinSystem]);

  const applyPromoCode = useCallback(async (code: PromoCode): Promise<{ success: boolean; message: string; discount?: number }> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Prepare cart data for validation - only include non-empty fields
      const cartData = {
        items: state.items.map(item => {
          const cartItem: any = {
            product: item.productId || item.id,
            quantity: item.quantity,
            price: item.price,
          };
          // Only include category and store if they have values
          if (item.category && item.category.trim() !== '') {
            cartItem.category = item.category;
          }
          if (item.storeId && item.storeId.trim() !== '') {
            cartItem.store = item.storeId;
          }
          return cartItem;
        }),
        subtotal: state.items.reduce((total, item) => total + (item.price * item.quantity), 0),
      };

      logger.info('🎟️ [Checkout] Validating coupon with cart data', { code: code.code, cartData });

      const response: any = await couponService.validateCoupon(code.code, cartData);

      logger.info('🎟️ [Checkout] Coupon validation response:', response);

      if (response.success && response.data) {
        // Calculate new bill summary with coupon discount
        const coinUsage = {
          rez: state.coinSystem.rezCoin.used,
          promo: state.coinSystem.promoCoin.used,
        };

        const newBillSummary = CheckoutData.helpers.calculateBillSummary(
          state.items,
          state.store,
          code,
          coinUsage
        );

        // Override promo discount with actual backend value and recalculate totalPayable
        // GF-05 FIX: Guard against undefined discount field in partial/error responses.
        const discountAmount = response.data.discount ?? 0;
        newBillSummary.promoDiscount = discountAmount;
        newBillSummary.savings = (newBillSummary.savings || 0) + discountAmount;

        // Recalculate totalPayable with promo discount and lock fee
        const subtotal = newBillSummary.itemTotal;
        const totalBeforeDiscount = subtotal + newBillSummary.platformFee + newBillSummary.deliveryFee + newBillSummary.taxes;
        const totalAfterDiscount = totalBeforeDiscount - (newBillSummary.lockFeeDiscount || 0) - discountAmount - coinUsage.rez - coinUsage.promo;
        newBillSummary.totalPayable = Math.max(0, Math.round(totalAfterDiscount));

        logger.info('🎟️ [Checkout] New bill summary after coupon:', newBillSummary);
        logger.info('🎟️ [Checkout] Setting state with appliedPromoCode:', code);
        logger.info('🎟️ [Checkout] Setting state with billSummary:', newBillSummary);

        setState(prev => {
          logger.info('🎟️ [Checkout] Previous state:', { appliedPromoCode: prev.appliedPromoCode, billSummary: prev.billSummary });
          const newState = {
            ...prev,
            appliedPromoCode: code,
            billSummary: newBillSummary,
            loading: false,
            showPromoCodeSection: false,
            error: null,
          };
          logger.info('🎟️ [Checkout] New state:', { appliedPromoCode: newState.appliedPromoCode, billSummary: newState.billSummary });
          return newState;
        });

        return { success: true, message: `${code.code} applied! You save ${currencySymbol}${discountAmount}`, discount: discountAmount };
      } else {
        logger.error('💳 [Checkout] Coupon invalid:', response.message as Error);
        const errorMsg = response.message || 'Invalid coupon code';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return { success: false, message: errorMsg };
      }
    } catch (error: any) {
      logger.error('💳 [Checkout] Coupon validation error:', error as Error);
      const errorMsg = 'Failed to validate coupon';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, message: errorMsg };
    }
  }, [state.items, state.store, state.coinSystem]);

  const removePromoCode = useCallback(() => {
    setState(prev => {
      const coinUsage = {
        rez: prev.coinSystem.rezCoin.used,
        promo: prev.coinSystem.promoCoin.used,
      };
      
      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        undefined,
        coinUsage
      );
      
      return {
        ...prev,
        appliedPromoCode: undefined,
        billSummary: newBillSummary,
        error: null, // Clear any existing errors
      };
    });
  }, []);

  // ── Auto-apply coins in priority order (Promo → StorePromo → REZ) ────────────
  // Called on checkout load so the bill summary reflects the correct deduction
  // order from the moment the checkout screen opens — matching what the backend
  // does via debitInPriorityOrder when the order is actually placed.
  //
  // Priority:
  //   1. Promo  — capped at promo.maxUsagePct % of gross bill
  //   2. StorePromo — capped at storePromo.maxUsagePct % of remaining
  //   3. REZ    — covers the rest up to full available balance
  function autoApplyCoinsInOrder(coinSystem: CoinSystem, grossTotal: number): CoinSystem {
    if (grossTotal <= 0) return coinSystem;

    const promoAvailable = coinSystem.promoCoin.available;
    const storePromoAvailable = coinSystem.storePromoCoin?.available ?? 0;
    const rezAvailable = coinSystem.rezCoin.available;

    // Step 1 — Promo (cap = % of gross)
    const maxPromo = Math.floor(grossTotal * (coinSystem.promoCoin.maxUsagePercentage / 100));
    const promoToUse = Math.min(promoAvailable, maxPromo, grossTotal);
    let remaining = grossTotal - promoToUse;

    // Step 2 — Store/Branded promo (cap = % of remaining)
    const maxStorePromo = Math.floor(remaining * (coinSystem.storePromoCoin?.maxUsagePercentage ?? STORE_PROMO_COIN_MAX_USAGE_PERCENTAGE) / 100);
    const storePromoToUse = Math.min(storePromoAvailable, maxStorePromo, remaining);
    remaining -= storePromoToUse;

    // Step 3 — REZ covers the rest
    const rezToUse = Math.min(rezAvailable, remaining);

    return {
      ...coinSystem,
      promoCoin: { ...coinSystem.promoCoin, used: promoToUse },
      storePromoCoin: { ...coinSystem.storePromoCoin, used: storePromoToUse },
      rezCoin: { ...coinSystem.rezCoin, used: rezToUse },
    };
  }

  const toggleRezCoin = useCallback((enabled: boolean) => {
    setState(prev => {
      // Check if user has any coins
      if (enabled && prev.coinSystem.rezCoin.available === 0) {
        // Don't toggle if no coins
        return prev;
      }

      // Calculate subtotal before coin discounts with safety checks
      const itemTotal = prev.items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return total + (price * quantity);
      }, 0);

      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE) || 0;
      const deliveryFee = Number(prev.store.deliveryFee) || 0;
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? Number(prev.appliedPromoCode.discountValue) || 0
          : Math.min(Math.round((itemTotal * (Number(prev.appliedPromoCode.discountValue) || 0)) / 100), Number(prev.appliedPromoCode.maxDiscount) || Infinity)
      ) : 0;

      const subtotalBeforeCoins = Math.max(0, itemTotal + deliveryFee + taxes - promoDiscount);

      if (!enabled) {
        // Disabling REZ: also clear promo and storePromo to reset priority state
        const newCoinSystem = {
          ...prev.coinSystem,
          rezCoin: { ...prev.coinSystem.rezCoin, used: 0 },
          promoCoin: { ...prev.coinSystem.promoCoin, used: 0 },
          storePromoCoin: { ...prev.coinSystem.storePromoCoin, used: 0 },
        };
        const coinUsage = { rez: 0, promo: 0 };
        const newBillSummary = CheckoutData.helpers.calculateBillSummary(prev.items, prev.store, prev.appliedPromoCode, coinUsage);
        return { ...prev, coinSystem: newCoinSystem, billSummary: newBillSummary };
      }

      // Priority order: Promo → StorePromo → REZ (matches backend debitInPriorityOrder)
      // Auto-apply promo coins first (up to their cap), then cover remainder with REZ
      const promoAvailable = Number(prev.coinSystem.promoCoin.available) || 0;
      const promoMaxPct = prev.coinSystem.promoCoin.maxUsagePercentage || 20;
      const maxPromoUsage = Math.floor(subtotalBeforeCoins * promoMaxPct / 100);
      const promoToUse = Math.min(promoAvailable, maxPromoUsage, subtotalBeforeCoins);

      const remainingAfterPromo = Math.max(0, subtotalBeforeCoins - promoToUse);

      // REZ coins cover whatever promo didn't
      const rezToUse = Math.min(Number(prev.coinSystem.rezCoin.available) || 0, remainingAfterPromo);

      const newCoinSystem = {
        ...prev.coinSystem,
        rezCoin: { ...prev.coinSystem.rezCoin, used: rezToUse },
        promoCoin: { ...prev.coinSystem.promoCoin, used: promoToUse },
      };

      const coinUsage = { rez: rezToUse, promo: promoToUse };
      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );

      return { ...prev, coinSystem: newCoinSystem, billSummary: newBillSummary };
    });
  }, []);

  const togglePromoCoin = useCallback((enabled: boolean) => {
    setState(prev => {
      // Check if user has any promo coins
      if (enabled && prev.coinSystem.promoCoin.available === 0) {

        // Don't toggle if no coins
        return prev;
      }

      // Calculate subtotal before coin discounts
      const itemTotal = prev.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE);
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? prev.appliedPromoCode.discountValue
          : Math.min(Math.round((itemTotal * prev.appliedPromoCode.discountValue) / 100), prev.appliedPromoCode.maxDiscount || Infinity)
      ) : 0;

      const subtotalAfterRezCoins = itemTotal + prev.store.deliveryFee + taxes - promoDiscount - prev.coinSystem.rezCoin.used;

      // Promo coins capped at configured max percentage of the GROSS bill (before any coin discounts)
      // This matches backend WalletConfig.coinExpiryConfig.promo.maxUsagePct which is applied against gross total
      const subtotalBeforeCoins = itemTotal + prev.store.deliveryFee + taxes - promoDiscount;
      const maxPromoUsage = Math.floor(subtotalBeforeCoins * prev.coinSystem.promoCoin.maxUsagePercentage / 100);
      const coinsToUse = enabled ? Math.min(prev.coinSystem.promoCoin.available, maxPromoUsage, subtotalAfterRezCoins) : 0;

      const newCoinSystem = {
        ...prev.coinSystem,
        promoCoin: {
          ...prev.coinSystem.promoCoin,
          used: coinsToUse,
        },
      };
      
      const coinUsage = {
        rez: prev.coinSystem.rezCoin.used,
        promo: coinsToUse,
      };

      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );

      return {
        ...prev,
        coinSystem: newCoinSystem,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const toggleStorePromoCoin = useCallback((enabled: boolean) => {
    setState(prev => {
      // Check if user has any store promo coins
      if (enabled && prev.coinSystem.storePromoCoin.available === 0) {

        return prev;
      }

      // Calculate subtotal before coin discounts
      const itemTotal = prev.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE);
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? prev.appliedPromoCode.discountValue
          : Math.min(Math.round((itemTotal * prev.appliedPromoCode.discountValue) / 100), prev.appliedPromoCode.maxDiscount || Infinity)
      ) : 0;

      // Calculate remaining after other coins (REZ and regular promo)
      const subtotalAfterOtherCoins = itemTotal + prev.store.deliveryFee + taxes - promoDiscount - prev.coinSystem.rezCoin.used - prev.coinSystem.promoCoin.used;

      // Store promo coins can be used up to configured max percentage of remaining amount or available coins
      const maxStorePromoUsage = Math.floor(subtotalAfterOtherCoins * prev.coinSystem.storePromoCoin.maxUsagePercentage / 100);
      const coinsToUse = enabled ? Math.min(prev.coinSystem.storePromoCoin.available, maxStorePromoUsage, subtotalAfterOtherCoins) : 0;

      const newCoinSystem = {
        ...prev.coinSystem,
        storePromoCoin: {
          ...prev.coinSystem.storePromoCoin,
          used: coinsToUse,
        },
      };
      
      const coinUsage = {
        rez: prev.coinSystem.rezCoin.used,
        promo: prev.coinSystem.promoCoin.used,
        storePromo: coinsToUse,
      };

      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );

      return {
        ...prev,
        coinSystem: newCoinSystem,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const handleCustomCoinAmount = useCallback((coinType: 'rez' | 'promo' | 'storePromo', amount: number) => {
    logger.info('🎚️ [handleCustomCoinAmount] Called with:', { coinType, amount });
    setState(prev => {

      const coinSystem = prev.coinSystem;
      const isRezCoin = coinType === 'rez';  // 'rez' in handlers maps to rezCoin internally
      const isStorePromo = coinType === 'storePromo';
      const coin = isRezCoin ? coinSystem.rezCoin : (isStorePromo ? coinSystem.storePromoCoin : coinSystem.promoCoin);

      logger.info('🎚️ [handleCustomCoinAmount] Coin state:', { available: coin.available, currentUsed: coin.used });

      // Validate amount
      if (amount <= 0 || amount > coin.available) {
        logger.info('💳 [Checkout] Invalid coin amount - returning early', { amount, available: coin.available });
        return prev;
      }
      
      // Calculate maximum allowed for order with safety checks
      const itemTotal = prev.items.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return total + (price * quantity);
      }, 0);

      // Note: platformFee is NOT charged to customers - deducted from merchant payouts
      const platformFee = 0;
      const taxes = Math.round(itemTotal * TAX_RATE) || 0;
      const deliveryFee = Number(prev.store.deliveryFee) || 0;
      const promoDiscount = prev.appliedPromoCode ? (
        prev.appliedPromoCode.discountType === 'FIXED'
          ? Number(prev.appliedPromoCode.discountValue) || 0
          : Math.min(Math.round((itemTotal * (Number(prev.appliedPromoCode.discountValue) || 0)) / 100), Number(prev.appliedPromoCode.maxDiscount) || Infinity)
      ) : 0;

      const totalBeforeCoinDiscount = Math.max(0, itemTotal + deliveryFee + taxes - promoDiscount);
      let maxAllowed = totalBeforeCoinDiscount;

      if (!isRezCoin) {
        // For promo/store promo coins, subtract rez coins already used
        maxAllowed -= coinSystem.rezCoin.used;

        if (isStorePromo) {
          // Store promo coins: also subtract regular promo coins and apply 30% limit
          maxAllowed -= coinSystem.promoCoin.used;
        }

        // Apply percentage limit
        maxAllowed = Math.floor(maxAllowed * coin.maxUsagePercentage / 100);
      } else {
        // REZ coin: honour the merchant's maxUsagePercentage cap as well.
        // Previously this branch skipped the percentage clamp entirely, which
        // allowed users to redeem 100% of an order in REZ coins even when the
        // merchant capped REZ-coin usage at (e.g.) 30%.
        const percentageCap = Math.floor(totalBeforeCoinDiscount * coin.maxUsagePercentage / 100);
        maxAllowed = Math.min(maxAllowed, percentageCap);
      }

      // Ensure amount doesn't exceed order total
      const finalAmount = Math.min(amount, maxAllowed, coin.available);

      logger.info('🎚️ [handleCustomCoinAmount] Final calculation:', {
        requestedAmount: amount,
        maxAllowed,
        available: coin.available,
        finalAmount
      });

      const newCoinSystem = {
        ...coinSystem,
        [isRezCoin ? 'rezCoin' : (isStorePromo ? 'storePromoCoin' : 'promoCoin')]: {
          ...coin,
          used: finalAmount,
        },
      };

      logger.info('🎚️ [handleCustomCoinAmount] ✅ STATE UPDATED - newCoinSystem.rezCoin.used:', newCoinSystem.rezCoin.used);

      const coinUsage = {
        rez: isRezCoin ? finalAmount : coinSystem.rezCoin.used,
        promo: (isRezCoin || isStorePromo) ? coinSystem.promoCoin.used : finalAmount,
        storePromo: isStorePromo ? finalAmount : (coinSystem.storePromoCoin?.used || 0),
      };
      
      const newBillSummary = CheckoutData.helpers.calculateBillSummary(
        prev.items,
        prev.store,
        prev.appliedPromoCode,
        coinUsage
      );
      
      // Ensure promo discount is preserved and totalPayable is recalculated correctly
      if (prev.appliedPromoCode && newBillSummary.promoDiscount > 0) {

      }
      
      return {
        ...prev,
        coinSystem: newCoinSystem,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const selectPaymentMethod = useCallback((method: PaymentMethod) => {
    setState(prev => ({ ...prev, selectedPaymentMethod: method }));
    // OG-D004 FIX: Persist selected payment method so it survives an OS kill.
    saveDraft({ paymentMethod: method.id });
  }, [saveDraft]);

  const proceedToPayment = useCallback(async () => {
    setState(prev => ({ ...prev, currentStep: 'payment_methods' }));
    router.push('/payment-methods');
  }, []);

  const navigateToOtherPaymentMethods = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: 'payment_methods' }));
    router.push('/payment-methods');
  }, []);

  // Apply card offer to the checkout
  const applyCardOffer = useCallback((offer: {
    _id: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    maxDiscountAmount?: number;
    minOrderValue: number;
    cardType?: 'credit' | 'debit' | 'all';
    bankNames?: string[];
    cardBins?: string[];
  }) => {
    setState(prev => {
      // Calculate the discount amount
      const orderTotal = prev.billSummary?.totalPayable || 0;
      let discountAmount = 0;

      if (offer.type === 'percentage') {
        discountAmount = Math.round((orderTotal * offer.value) / 100);
        // Apply max discount cap if present
        if (offer.maxDiscountAmount && discountAmount > offer.maxDiscountAmount) {
          discountAmount = offer.maxDiscountAmount;
        }
      } else {
        discountAmount = offer.value;
      }

      // Map the offer to CardOffer type
      const cardOffer = {
        _id: offer._id,
        name: offer.name,
        type: offer.type,
        value: offer.value,
        maxDiscountAmount: offer.maxDiscountAmount,
        minOrderValue: offer.minOrderValue,
        cardType: offer.cardType,
        bankNames: offer.bankNames,
        cardBins: offer.cardBins,
      };

      // Update bill summary with card offer discount
      const newBillSummary = {
        ...prev.billSummary,
        cardOfferDiscount: discountAmount,
        totalPayable: Math.max(0, prev.billSummary.totalPayable - discountAmount + prev.billSummary.cardOfferDiscount),
      };

      logger.info('💳 [Checkout] Card offer applied:', { offer: cardOffer, discountAmount, newTotal: newBillSummary.totalPayable });

      return {
        ...prev,
        appliedCardOffer: cardOffer,
        billSummary: newBillSummary,
      };
    });
  }, []);

  // Remove card offer from checkout
  const removeCardOffer = useCallback(() => {
    setState(prev => {
      if (!prev.appliedCardOffer) return prev;

      // Add back the discount that was removed
      const newBillSummary = {
        ...prev.billSummary,
        totalPayable: prev.billSummary.totalPayable + prev.billSummary.cardOfferDiscount,
        cardOfferDiscount: 0,
      };

      logger.info('💳 [Checkout] Card offer removed, new total:', newBillSummary.totalPayable);

      return {
        ...prev,
        appliedCardOffer: undefined,
        billSummary: newBillSummary,
      };
    });
  }, []);

  const processPayment = useCallback(async () => {
    if (!state.selectedPaymentMethod) {
      setState(prev => ({ ...prev, error: 'Please select a payment method' }));
      return;
    }

    // OG-002 FIX: Guard against double-submit (double-tap, reconnect retry).
    // Matches the pattern used in handleWalletPayment/handleCODPayment/handleRazorpayPayment.
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {

      // Validate delivery address (required for delivery only)
      if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
        setState(prev => ({ ...prev, loading: false, error: 'Please select a delivery address' }));
        return;
      }

      // Map frontend checkout data to backend order format
      const orderData = mapFrontendCheckoutToBackendOrder({
        deliveryAddress: state.selectedAddress ? {
          name: state.selectedAddress.name,
          phone: state.selectedAddress.phone,
          addressLine1: state.selectedAddress.addressLine1,
          addressLine2: state.selectedAddress.addressLine2,
          city: state.selectedAddress.city,
          state: state.selectedAddress.state,
          pincode: state.selectedAddress.pincode,
          country: state.selectedAddress.country || 'India',
        } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
        paymentMethod: state.selectedPaymentMethod.id,
        specialInstructions: state.selectedAddress?.instructions || '',
        couponCode: state.appliedPromoCode?.code,
        fulfillmentType: state.fulfillment.selectedType,
        fulfillmentDetails: {
          tableNumber: state.fulfillment.tableNumber,
          vehicleInfo: state.fulfillment.vehicleInfo,
          pickupInstructions: state.fulfillment.pickupInstructions,
        },
      });

      // Add coinsUsed to order data - map rezCoin back to rezCoins for backend
      const coinsUsed = {
        rezCoins: state.coinSystem.rezCoin.used || 0,  // Frontend rezCoin → Backend rezCoins
        promoCoins: state.coinSystem.promoCoin.used || 0,
        storePromoCoins: state.coinSystem.storePromoCoin.used || 0,
        totalCoinsValue: (state.coinSystem.rezCoin.used || 0) +
          (state.coinSystem.promoCoin.used || 0) +
          (state.coinSystem.storePromoCoin.used || 0)
      };
      (orderData as unknown as BackendOrderData).coinsUsed = coinsUsed;

      logger.info('💰 [Checkout] Sending coinsUsed to backend:', JSON.stringify(coinsUsed));
      logger.info('💰 [Checkout] Store promo coin state:', JSON.stringify(state.coinSystem.storePromoCoin));

      // Create order via API.
      // OG-001 FIX: Pipe the per-checkout idempotency key so concurrent network retries
      // (reconnect, double-tap, transport retry) don't create duplicate orders.
      const response: any = await ordersService.createOrder(
        orderData,
        orderIdempotencyKeyRef.current || undefined
      );

      if (response.success && response.data) {
        // Debug: Log the order data to trace ID extraction
        logger.info('✅ [Checkout] Order created successfully:', {
          'response.data.id': response.data.id,
          'response.data._id': response.data._id,
          'orderNumber': response.data.orderNumber,
          'extractedId': response.data.id || response.data._id
        });

        // Clear cart after successful order (both API and context state)
        try {
          await cartService.clearCart();
          await cartActions.clearCart();
        } catch (clearError) {
          logger.error('💳 [Checkout] Failed to clear cart:', clearError as Error);
        }

        const orderId = response.data.id || response.data._id;
        logger.info('🔗 [Checkout] Navigating to payment-success with orderId:', orderId);

        // Non-blocking analytics
        try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId, cartValue: state.billSummary.itemTotal, paymentMethod: state.selectedPaymentMethod?.id || '' }); } catch {} // Silent: non-critical analytics

        // SS-002 FIX: Refresh wallet after COD order so coin balance reflects deducted coins
        refreshSharedWallet().catch(() => {});

        // OG-D004 FIX: Clear checkout draft on success — this checkout is done.
        clearDraft();

        setState(prev => ({ ...prev, currentStep: 'success', loading: false }));
        router.replace(`/payment-success?orderId=${orderId}`);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Order creation failed',
          currentStep: 'payment_methods',
        }));
      }
    } catch (error: any) {
      logger.error('💳 [Checkout] Order creation failed:', error as Error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
        currentStep: 'payment_methods',
      }));
    } finally {
      // OG-002 FIX: Always release the submission lock so the user can retry.
      isSubmittingRef.current = false;
    }
  }, [state.selectedPaymentMethod, state.billSummary, state.items, state.store, state.appliedPromoCode, cartActions]);

  /**
   * Handle wallet payment
   * Process payment using wallet coins and create order
   * @param coinValuesOverride - Optional override for coin values to avoid stale closure issues
   * @param redemptionCode - Optional deal redemption code to apply discount
   * @param offerRedemptionCode - Optional cashback voucher code (RED-xxx) to apply
   */
  const handleWalletPayment = useCallback(async (coinValuesOverride?: {
    rezCoins: number;
    promoCoins: number;
    storePromoCoins: number;
    redemptionCode?: string;
    offerRedemptionCode?: string;
  }) => {

    const totalPayable = state.billSummary.totalPayable;

    // Calculate total available balance
    const totalAvailableBalance = state.coinSystem.rezCoin.available + state.coinSystem.promoCoin.available;

    // Calculate coins that will be used (use toggled amounts, or calculate if not toggled)
    const rezCoinsUsed = state.coinSystem.rezCoin.used > 0
      ? state.coinSystem.rezCoin.used
      : Math.min(state.coinSystem.rezCoin.available, totalPayable);

    const remainingAfterRez = Math.max(0, totalPayable - rezCoinsUsed);
    const promoCoinsUsed = state.coinSystem.promoCoin.used > 0
      ? state.coinSystem.promoCoin.used
      : Math.min(state.coinSystem.promoCoin.available, remainingAfterRez);

    const totalCoinsToUse = rezCoinsUsed + promoCoinsUsed;

    // Validate sufficient balance (check total available, not just used)
    if (totalPayable > 0 && totalAvailableBalance < totalPayable) {
      const shortfall = totalPayable - totalAvailableBalance;
      logger.error('💳 [Checkout] Insufficient balance:', { shortfall, totalPayable, totalAvailableBalance } as any);
      setState(prev => ({
        ...prev,
        error: `Insufficient balance. You need ${shortfall} more RC to complete this purchase.`
      }));
      return;
    }

    // OG-002 FIX: Prevent double-submission if user taps Pay again while a
    // previous attempt is still in flight (e.g. slow network).
    if (isSubmittingRef.current) {
      logger.warn('👛 [Wallet] Payment already in progress, ignoring duplicate call');
      return;
    }
    isSubmittingRef.current = true;

    // OG-004 FIX: Reject immediately if offline so the user sees a clear error
    // instead of a stuck loading spinner waiting for a request that can never complete.
    if (!(await assertOnline())) {
      isSubmittingRef.current = false;
      return;
    }

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {
      // Step 1: Validate delivery address (required for delivery only)
      if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
        setState(prev => ({ ...prev, loading: false, error: 'Please select a delivery address', currentStep: 'checkout' }));
        return;
      }

      const orderData = mapFrontendCheckoutToBackendOrder({
        deliveryAddress: state.selectedAddress ? {
          name: state.selectedAddress.name,
          phone: state.selectedAddress.phone,
          addressLine1: state.selectedAddress.addressLine1,
          addressLine2: state.selectedAddress.addressLine2,
          city: state.selectedAddress.city,
          state: state.selectedAddress.state,
          pincode: state.selectedAddress.pincode,
          country: state.selectedAddress.country || 'India',
        } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
        paymentMethod: 'wallet',
        specialInstructions: state.selectedAddress?.instructions || '',
        couponCode: state.appliedPromoCode?.code,
        fulfillmentType: state.fulfillment.selectedType,
        fulfillmentDetails: {
          tableNumber: state.fulfillment.tableNumber,
          vehicleInfo: state.fulfillment.vehicleInfo,
          pickupInstructions: state.fulfillment.pickupInstructions,
        },
      });

      // Add redemption code if provided (for deal redemptions)
      if (coinValuesOverride?.redemptionCode) {
        (orderData as unknown as BackendOrderData).redemptionCode = coinValuesOverride.redemptionCode;
        logger.info('[Wallet] Redemption code added to order:', coinValuesOverride.redemptionCode);
      }

      // Add offer redemption code if provided (for cashback vouchers RED-xxx)
      if (coinValuesOverride?.offerRedemptionCode) {
        (orderData as unknown as BackendOrderData).offerRedemptionCode = coinValuesOverride.offerRedemptionCode;
        logger.info('[Wallet] Offer redemption code added to order:', coinValuesOverride.offerRedemptionCode);
      }

      // Add lock fee discount if applicable
      if (state.billSummary?.lockFeeDiscount && state.billSummary.lockFeeDiscount > 0) {
        (orderData as unknown as BackendOrderData).lockFeeDiscount = state.billSummary.lockFeeDiscount;
        logger.info('[Wallet] Lock fee discount added to order:', state.billSummary.lockFeeDiscount);
      }

      // Add coinsUsed to order data - map rezCoin back to rezCoins for backend
      // Use override values if provided (passed from checkout.tsx to avoid stale closure)
      // Ensure all values are numbers (not strings)
      const rezCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.rezCoins) || 0
        : Number(state.coinSystem.rezCoin.used) || 0;
      const promoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.promoCoins) || 0
        : Number(state.coinSystem.promoCoin.used) || 0;
      const storePromoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.storePromoCoins) || 0
        : Number(state.coinSystem.storePromoCoin.used) || 0;

      const coinsUsedData = {
        rezCoins: rezCoinsValue,
        promoCoins: promoCoinsValue,
        storePromoCoins: storePromoCoinsValue,
        totalCoinsValue: rezCoinsValue + promoCoinsValue + storePromoCoinsValue,
      };
      logger.info('[Wallet] coinsUsed being sent to backend:', JSON.stringify(coinsUsedData));
      (orderData as unknown as BackendOrderData).coinsUsed = coinsUsedData;

      // ATOMIC WALLET CHECKOUT FIX: Include the wallet payment amount in the
      // createOrder request body. The backend will debit the wallet and create
      // the order in a single MongoDB transaction, eliminating the race window
      // that previously left orders stuck in payment_pending on crash/network drop.
      (orderData as unknown as BackendOrderData).walletPayment = { amount: totalPayable };

      // OG-001 FIX: pass the session idempotency key so reconnect retries
      // reuse the same key and the backend de-duplication fires correctly.
      const orderResponse = await ordersService.createOrder(
        orderData,
        orderIdempotencyKeyRef.current
      );

      if (!orderResponse.success || !orderResponse.data) {
        logger.error('[Checkout] Order + wallet payment failed atomically:', orderResponse.error as unknown as Error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: orderResponse.error || 'Checkout failed. Please try again.',
          currentStep: 'checkout'
        }));
        return;
      }

      // Determine transaction ID — prefer the atomic result returned by the backend.
      // Fall back to the legacy separate-payment path for older backend versions that
      // don't yet return walletPaymentResult.
      let transactionId: string | undefined = (orderResponse.data as { walletPaymentResult?: { transactionId?: string } }).walletPaymentResult?.transactionId;

      if (!transactionId) {
        // Fallback: backend is an older version without atomic wallet support.
        // Run the separate wallet debit as before so we don't break in mixed deploys.
        logger.warn('[Wallet] Backend did not return walletPaymentResult — falling back to separate payment call');
        const paymentData = {
          amount: totalPayable,
          orderId: orderResponse.data.id || orderResponse.data._id,
          storeId: state.store.id,
          storeName: state.store.name,
          description: `Purchase of ${state.items.length} item(s) from ${state.store.name}`,
          items: state.items.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        };

        // OG-001 FIX: Pass the session-scoped idempotency key so the backend
        // wallet route can de-duplicate if this fires twice on reconnect.
        const walletResponse = await walletApi.processPayment(
          paymentData,
          walletIdempotencyKeyRef.current
        );

        if (!walletResponse.success || !walletResponse.data) {
          logger.error('[Checkout] Fallback wallet payment failed:', walletResponse.error as unknown as Error);
          setState(prev => ({
            ...prev,
            loading: false,
            error: walletResponse.error || 'Wallet payment failed',
            currentStep: 'checkout'
          }));
          return;
        }

        transactionId = walletResponse.data.transaction.transactionId;
      }

      // Step 3: Clear cart (both API and context state)
      try {
        await cartService.clearCart();
        await cartActions.clearCart();
      } catch (clearError) {
        logger.error('[Checkout] Failed to clear cart:', clearError as Error);
        // Non-critical error, continue
      }

      // Step 4: Navigate to success page
      setState(prev => ({ ...prev, currentStep: 'success', loading: false }));

      const orderId = orderResponse.data.id || orderResponse.data._id;

      // Non-blocking analytics
      try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId, cartValue: state.billSummary.itemTotal, paymentMethod: 'wallet' }); } catch {} // Silent: non-critical analytics

      // SS-002 FIX: Refresh wallet after wallet payment so the deducted coin balance is shown immediately
      refreshSharedWallet().catch(() => {});

      // OG-D004 FIX: Clear checkout draft on successful wallet payment.
      clearDraft();

      router.replace(`/payment-success?orderId=${orderId}&transactionId=${transactionId}&paymentMethod=wallet`);

    } catch (error: any) {
      logger.error('💳 [Checkout] Wallet payment error:', error as Error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Wallet payment failed',
        currentStep: 'checkout'
      }));
    } finally {
      // OG-002 FIX: Always release the submission lock so the user can retry
      // after a genuine failure (network error, server 500, etc.).
      isSubmittingRef.current = false;
    }
  }, [state.coinSystem, state.billSummary, state.items, state.store, state.appliedPromoCode, cartActions]);

  /**
   * Handle Cash on Delivery (COD) payment
   * Supports multi-store orders by automatically creating separate orders per store
   * @param coinValuesOverride - Optional override for coin values to avoid stale closure issues
   * @param redemptionCode - Optional deal redemption code to apply discount
   * @param offerRedemptionCode - Optional cashback voucher code (RED-xxx) to apply
   */
  const handleCODPayment = useCallback(async (coinValuesOverride?: {
    rezCoins: number;
    promoCoins: number;
    storePromoCoins: number;
    redemptionCode?: string;
    offerRedemptionCode?: string;
  }) => {
    logger.info('💵 [COD] handleCODPayment started');
    logger.info('💵 [COD] coinValuesOverride:', coinValuesOverride);
    logger.info('💵 [COD] Current state:', {
      selectedAddress: state.selectedAddress,
      items: state.items?.length,
      billSummary: state.billSummary
    });

    // OG-002 FIX: Prevent duplicate COD submissions.
    if (isSubmittingRef.current) {
      logger.warn('💵 [COD] Submission already in progress, ignoring duplicate call');
      return;
    }
    isSubmittingRef.current = true;

    // OG-004 FIX: Reject immediately if offline so the user sees a clear error
    // instead of a stuck loading spinner waiting for a request that can never complete.
    if (!(await assertOnline())) {
      isSubmittingRef.current = false;
      return;
    }

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {
      // Step 1: Validate delivery address (required for delivery only)
      if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
        logger.error('💵 [COD] No delivery address selected!');
        setState(prev => ({ ...prev, loading: false, error: 'Please select a delivery address', currentStep: 'checkout' }));
        return;
      }
      logger.info('💵 [COD] Address validated:', state.selectedAddress?.addressLine1 || 'N/A (non-delivery)');

      // Step 2: Group items by store for multi-store support
      const storeGroups = groupItemsByStore(state.items);
      const isMultiStore = storeGroups.length > 1;
      logger.info('💵 [COD] Store groups:', storeGroups.length, isMultiStore ? '(MULTI-STORE ORDER)' : '(single store)');

      // Calculate total coins to distribute
      const rezCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.rezCoins) || 0
        : Number(state.coinSystem.rezCoin.used) || 0;
      const promoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.promoCoins) || 0
        : Number(state.coinSystem.promoCoin.used) || 0;
      const storePromoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.storePromoCoins) || 0
        : Number(state.coinSystem.storePromoCoin.used) || 0;

      const totalCoins = { rezCoins: rezCoinsValue, promoCoins: promoCoinsValue, storePromoCoins: storePromoCoinsValue };
      const totalSubtotal = storeGroups.reduce((sum, g) => sum + g.subtotal, 0);

      // Distribute coins proportionally across stores
      const coinsDistribution = distributeCoinsProportionally(totalCoins, storeGroups, totalSubtotal);

      // Create orders for each store
      const createdOrderIds: string[] = [];
      const failedStores: string[] = [];

      for (const storeGroup of storeGroups) {
        logger.info(`💵 [COD] Creating order for store: ${storeGroup.storeName} (${storeGroup.storeId})`);

        // Get coins for this store
        const storeCoins = coinsDistribution.get(storeGroup.storeId) || { rezCoins: 0, promoCoins: 0, storePromoCoins: 0 };

        // Store promo coins only apply to matching store
        if (storeGroup.storeId === state.coinSystem.storePromoCoin?.storeId) {
          storeCoins.storePromoCoins = storePromoCoinsValue;
        }

        const coinsUsed = {
          rezCoins: storeCoins.rezCoins,
          promoCoins: storeCoins.promoCoins,
          storePromoCoins: storeCoins.storePromoCoins,
          totalCoinsValue: storeCoins.rezCoins + storeCoins.promoCoins + storeCoins.storePromoCoins,
        };

        // Build order data for this store's items with storeId included
        const storeOrderData = mapFrontendCheckoutToBackendOrder({
          deliveryAddress: state.selectedAddress ? {
            name: state.selectedAddress.name,
            phone: state.selectedAddress.phone,
            addressLine1: state.selectedAddress.addressLine1,
            addressLine2: state.selectedAddress.addressLine2,
            city: state.selectedAddress.city,
            state: state.selectedAddress.state,
            pincode: state.selectedAddress.pincode,
            country: state.selectedAddress.country || 'India',
          } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
          paymentMethod: 'cod',
          specialInstructions: state.selectedAddress?.instructions || '',
          couponCode: (() => {
            if (isMultiStore && state.appliedPromoCode?.code) {
              // Warn once per checkout session — coupon cannot be split across stores.
              showToast({
                message: `Promo code "${state.appliedPromoCode.code}" can't be applied to multi-store orders and will not be used.`,
                type: 'warning',
              });
              return undefined;
            }
            return state.appliedPromoCode?.code;
          })(),
          storeId: storeGroup.storeId,
          fulfillmentType: state.fulfillment.selectedType,
          fulfillmentDetails: {
            tableNumber: state.fulfillment.tableNumber,
            vehicleInfo: state.fulfillment.vehicleInfo,
            pickupInstructions: state.fulfillment.pickupInstructions,
          },
          items: storeGroup.items.map(item => ({
            product: item.productId || item.id, // Use productId for backend, fallback to id
            quantity: item.quantity,
            price: item.price,
            name: item.name,
          })),
          coinsUsed,
        });

        // DEBUG: Log all values before condition checks
        logger.info('🔍 [COD DEBUG] Values before adding to order:', {
          'coinValuesOverride': coinValuesOverride,
          'coinValuesOverride?.redemptionCode': coinValuesOverride?.redemptionCode,
          'state.billSummary': state.billSummary,
          'state.billSummary?.lockFeeDiscount': state.billSummary?.lockFeeDiscount,
          'storeGroupIndex': storeGroups.indexOf(storeGroup),
          'isFirstStore': storeGroups.indexOf(storeGroup) === 0,
        });

        // Add redemption code if provided (for deal redemptions) - only for first/single store order
        if (coinValuesOverride?.redemptionCode && storeGroups.indexOf(storeGroup) === 0) {
          (storeOrderData as unknown as BackendOrderData).redemptionCode = coinValuesOverride.redemptionCode;
          logger.info(`💵 [COD] Redemption code added to order for ${storeGroup.storeName}:`, coinValuesOverride.redemptionCode);
        } else {
          logger.info(`⚠️ [COD] Redemption code NOT added. Reason: redemptionCode=${coinValuesOverride?.redemptionCode}, isFirstStore=${storeGroups.indexOf(storeGroup) === 0}`);
        }

        // Add offer redemption code if provided (for cashback vouchers RED-xxx) - only for first/single store order
        if (coinValuesOverride?.offerRedemptionCode && storeGroups.indexOf(storeGroup) === 0) {
          (storeOrderData as unknown as BackendOrderData).offerRedemptionCode = coinValuesOverride.offerRedemptionCode;
          logger.info(`💵 [COD] Offer redemption code added to order for ${storeGroup.storeName}:`, coinValuesOverride.offerRedemptionCode);
        }

        // Add lock fee discount if applicable - only for first/single store order
        if (state.billSummary?.lockFeeDiscount && state.billSummary.lockFeeDiscount > 0 && storeGroups.indexOf(storeGroup) === 0) {
          (storeOrderData as unknown as BackendOrderData).lockFeeDiscount = state.billSummary.lockFeeDiscount;
          logger.info(`💵 [COD] Lock fee discount added to order for ${storeGroup.storeName}:`, state.billSummary.lockFeeDiscount);
        } else {
          logger.info(`⚠️ [COD] Lock fee discount NOT added. Reason: lockFeeDiscount=${state.billSummary?.lockFeeDiscount}, isFirstStore=${storeGroups.indexOf(storeGroup) === 0}`);
        }

        logger.info(`💵 [COD] Store ${storeGroup.storeName} order data:`, {
          storeId: (storeOrderData as unknown as BackendOrderData).storeId,
          itemCount: storeGroup.items.length,
          subtotal: storeGroup.subtotal,
          coinsUsed,
          redemptionCode: (storeOrderData as unknown as BackendOrderData).redemptionCode,
          lockFeeDiscount: (storeOrderData as unknown as BackendOrderData).lockFeeDiscount,
          fullData: JSON.stringify(storeOrderData),
        });

        try {
          // OG-001 FIX: For multi-store orders, derive a per-store key from the
          // session key so each sub-order gets its own idempotency scope.
          const storeOrderKey = `${orderIdempotencyKeyRef.current}-${storeGroup.storeId}`;
          const orderResponse = await ordersService.createOrder(storeOrderData, storeOrderKey);

          if (orderResponse.success && orderResponse.data) {
            // Debug: Log full order response to trace ID extraction
            logger.info(`✅ [COD] Order response for ${storeGroup.storeName}:`, {
              'data.id': orderResponse.data.id,
              'data._id': orderResponse.data._id,
              'orderNumber': orderResponse.data.orderNumber
            });
            const orderId = orderResponse.data.id || orderResponse.data._id;
            if (!orderId) {
              logger.error(`❌ [COD] Order created but no ID found for ${storeGroup.storeName}!`, orderResponse.data as unknown as Error);
            }
            createdOrderIds.push(orderId);
            logger.info(`✅ [COD] Order created for ${storeGroup.storeName}: ${orderId}`);
          } else {
            logger.error(`❌ [COD] Failed to create order for ${storeGroup.storeName}:`, orderResponse.error as unknown as Error);
            failedStores.push(storeGroup.storeName);
          }
        } catch (err: any) {
          logger.error(`❌ [COD] Error creating order for ${storeGroup.storeName}:`, err as Error);
          failedStores.push(storeGroup.storeName);
        }
      }

      // Check if any orders were created
      if (createdOrderIds.length === 0) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to create any orders. Please try again.',
          currentStep: 'checkout'
        }));
        return;
      }

      // Partial success handling
      if (failedStores.length > 0 && createdOrderIds.length > 0) {
        showToast({
          message: `Orders created for some stores. Failed: ${failedStores.join(', ')}`,
          type: 'warning',
          duration: 5000,
        });
      }

      // Clear cart (both API and context state)
      try {
        await cartService.clearCart();
        await cartActions.clearCart();
      } catch (clearError) {
        logger.error('💵 [Checkout] Failed to clear cart:', clearError as Error);
      }

      // Navigate to success page
      logger.info('💵 [COD] Orders created successfully:', createdOrderIds);
      setState(prev => ({ ...prev, currentStep: 'success', loading: false }));

      // OG-002 FIX: `COD_${Date.now()}` collides when two orders are placed in
      // the same millisecond (rapid retries, multi-store checkouts). Prefer the
      // session-scoped idempotency key that's already unique per order intent,
      // then fall back to crypto.randomUUID(), and only as a last resort use
      // the timestamp form.
      const transactionId =
        orderIdempotencyKeyRef.current ||
        globalThis.crypto?.randomUUID?.() ||
        `COD_${Date.now()}`;
      const orderIdsParam = createdOrderIds.join(',');

      // Non-blocking analytics
      try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId: createdOrderIds[0] || '', cartValue: state.billSummary.itemTotal, paymentMethod: 'cod' }); } catch {} // Silent: non-critical analytics

      // SS-002 FIX: Refresh wallet for multi-store COD (coins deducted per store order)
      refreshSharedWallet().catch(() => {});

      // OG-D004 FIX: Clear checkout draft on successful COD placement.
      clearDraft();

      router.replace(`/payment-success?orderId=${orderIdsParam}&transactionId=${transactionId}&paymentMethod=cod&multiStore=${isMultiStore}`);

    } catch (error: any) {
      logger.error('💵 [Checkout] COD payment error:', error as Error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'COD order creation failed',
        currentStep: 'checkout'
      }));
    } finally {
      // OG-002 FIX: Always release the submission lock so the user can retry.
      isSubmittingRef.current = false;
    }
  }, [state.items, state.store, state.appliedPromoCode, state.coinSystem, state.billSummary, router, cartActions, state.selectedAddress]);

  /**
   * Handle Razorpay payment (UPI, Card, NetBanking, Wallets)
   * Opens Razorpay checkout modal and processes payment
   * @param userInfo - Optional user info for Razorpay
   * @param coinValuesOverride - Optional override for coin values to avoid stale closure issues
   * @param redemptionCode - Optional deal redemption code to apply discount
   * @param offerRedemptionCode - Optional cashback voucher code (RED-xxx) to apply
   */
  const handleRazorpayPayment = useCallback(async (
    userInfo?: { name?: string; email?: string; phone?: string },
    coinValuesOverride?: { rezCoins: number; promoCoins: number; storePromoCoins: number; redemptionCode?: string; offerRedemptionCode?: string }
  ) => {

    // Validate delivery address before initiating payment (required for delivery only)
    if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
      showToast({ message: 'Please select a delivery address', type: 'error' });
      setState(prev => ({ ...prev, showAddressSection: true }));
      return;
    }

    const totalPayable = state.billSummary.totalPayable;

    if (totalPayable <= 0) {
      showToast({ message: 'Invalid order amount', type: 'error' });
      return;
    }

    // OG-002 FIX: Prevent duplicate Razorpay payment sessions.
    if (isSubmittingRef.current) {
      logger.warn('💳 [Razorpay] Payment already in progress, ignoring duplicate call');
      return;
    }
    isSubmittingRef.current = true;

    // OG-004 FIX: Reject immediately if offline so the user sees a clear error
    // instead of a stuck loading spinner waiting for a request that can never complete.
    if (!(await assertOnline())) {
      isSubmittingRef.current = false;
      return;
    }

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing' }));

    try {
      // Calculate coins used - map rezCoin back to rezCoins for backend
      // Use override values if provided (passed from checkout.tsx to avoid stale closure)
      // Ensure all values are numbers (not strings)
      const rezCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.rezCoins) || 0
        : Number(state.coinSystem.rezCoin.used) || 0;
      const promoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.promoCoins) || 0
        : Number(state.coinSystem.promoCoin.used) || 0;
      const storePromoCoinsValue = coinValuesOverride
        ? Number(coinValuesOverride.storePromoCoins) || 0
        : Number(state.coinSystem.storePromoCoin.used) || 0;

      const coinsUsed = {
        rezCoins: rezCoinsValue,
        promoCoins: promoCoinsValue,
        storePromoCoins: storePromoCoinsValue,
        totalCoinsValue: rezCoinsValue + promoCoinsValue + storePromoCoinsValue,
      };
      logger.info('💳 [Razorpay] coinsUsed being sent:', JSON.stringify(coinsUsed));

      // Auto-apply card offer if available (will be validated when card is entered in Razorpay)
      // The offer will be applied via the CardOffersSection component or when card is validated
      const appliedCardOffer = state.appliedCardOffer;

      // Create Razorpay payment
      await createRazorpayPayment({
        amount: totalPayable,
        notes: {
          storeId: state.store.id,
          storeName: state.store.name,
          itemCount: state.items.length,
          couponCode: state.appliedPromoCode?.code || '',
          coinsUsed: JSON.stringify(coinsUsed),
          cardOfferId: appliedCardOffer?._id || '',
        },
        userInfo,
        onSuccess: async (paymentResponse) => {
          // OG-D008 FIX: Persist the full Razorpay payment credentials immediately
          // so that if the app is killed before order creation, the payment can be
          // recovered and verified on next launch.
          const razorpayPaymentId = paymentResponse.paymentId;
          saveDraft({
            paymentMethod: 'razorpay',
            razorpayPaymentId: paymentResponse.paymentId,
            razorpayOrderId: paymentResponse.orderId,
            razorpaySignature: paymentResponse.signature || null,
            pendingPaymentAmount: totalPayable,
            orderCreated: false,
          });

          try {
            // Auto-apply card offer if card payment was used
            let appliedCardOffer = null;
            if (paymentResponse.paymentMethod === 'card' || paymentResponse.paymentMethod?.includes('card')) {
              try {
                const storeId = state.store.id;
                const orderValue = state.billSummary.totalPayable;

                // Get best card offer for this store
                const cardOffersResponse = await discountsApi.getCardOffers({
                  storeId,
                  orderValue,
                  page: 1,
                  limit: 1,
                });

                if (cardOffersResponse.success && cardOffersResponse.data?.discounts?.[0]) {
                  const bestOffer = cardOffersResponse.data.discounts[0];

                  // Validate eligibility
                  if (orderValue >= bestOffer.minOrderValue) {
                    // Apply the offer
                    const applyResponse = await discountsApi.applyCardOffer({
                      discountId: bestOffer._id,
                    });
                    
                    if (applyResponse.success) {
                      appliedCardOffer = bestOffer;
                      logger.info('✅ [Checkout] Card offer auto-applied:', bestOffer.name);
                    }
                  }
                }
              } catch (err: any) {
                logger.error('⚠️ [Checkout] Error auto-applying card offer:', err as Error);
                // Non-critical error, continue with order
              }
            }

            // Create order after successful payment
            const orderData = mapFrontendCheckoutToBackendOrder({
              deliveryAddress: state.selectedAddress ? {
                name: state.selectedAddress.name,
                phone: state.selectedAddress.phone,
                addressLine1: state.selectedAddress.addressLine1,
                addressLine2: state.selectedAddress.addressLine2,
                city: state.selectedAddress.city,
                state: state.selectedAddress.state,
                pincode: state.selectedAddress.pincode,
                country: state.selectedAddress.country || 'India',
              } : { name: 'Customer', phone: '', addressLine1: '', city: '', state: '', pincode: '' },
              paymentMethod: 'razorpay',
              specialInstructions: state.selectedAddress?.instructions || '',
              couponCode: state.appliedPromoCode?.code,
              fulfillmentType: state.fulfillment.selectedType,
              fulfillmentDetails: {
                tableNumber: state.fulfillment.tableNumber,
                vehicleInfo: state.fulfillment.vehicleInfo,
                pickupInstructions: state.fulfillment.pickupInstructions,
              },
            });

            // Attach payment and coins info
            (orderData as unknown as BackendOrderData).razorpayPaymentId = paymentResponse.paymentId;
            (orderData as unknown as BackendOrderData).razorpayOrderId = paymentResponse.orderId;
            (orderData as unknown as BackendOrderData).transactionId = paymentResponse.transactionId;
            (orderData as unknown as BackendOrderData).coinsUsed = coinsUsed;

            // Add redemption code if provided (for deal redemptions)
            if (coinValuesOverride?.redemptionCode) {
              (orderData as unknown as BackendOrderData).redemptionCode = coinValuesOverride.redemptionCode;
              logger.info('💳 [Razorpay] Redemption code added to order:', coinValuesOverride.redemptionCode);
            }

            // Add offer redemption code if provided (for cashback vouchers RED-xxx)
            if (coinValuesOverride?.offerRedemptionCode) {
              (orderData as unknown as BackendOrderData).offerRedemptionCode = coinValuesOverride.offerRedemptionCode;
              logger.info('💳 [Razorpay] Offer redemption code added to order:', coinValuesOverride.offerRedemptionCode);
            }

            // Add lock fee discount if applicable
            if (state.billSummary?.lockFeeDiscount && state.billSummary.lockFeeDiscount > 0) {
              (orderData as unknown as BackendOrderData).lockFeeDiscount = state.billSummary.lockFeeDiscount;
              logger.info('💳 [Razorpay] Lock fee discount added to order:', state.billSummary.lockFeeDiscount);
            }

            // Attach card offer if applied
            if (appliedCardOffer) {
              (orderData as unknown as BackendOrderData).cardOfferId = appliedCardOffer._id;
              const orderTotal = state.billSummary?.totalPayable || 0;
              const discountAmount = appliedCardOffer.type === 'percentage'
                ? Math.round((orderTotal * appliedCardOffer.value) / 100)
                : appliedCardOffer.value;
              (orderData as unknown as BackendOrderData).cardOfferDiscount = Math.min(
                discountAmount,
                appliedCardOffer.maxDiscountAmount || discountAmount
              );
            }

            // OG-001 FIX: Pass the session idempotency key. If Razorpay fires
            // onSuccess twice (race condition in SDK), the backend will return
            // the cached first response instead of creating a second order.
            const orderResponse = await ordersService.createOrder(
              orderData,
              orderIdempotencyKeyRef.current
            );

            if (!orderResponse.success || !orderResponse.data) {
              logger.error('❌ [Checkout] Order creation failed after payment:', orderResponse.error as unknown as Error);
              showToast({
                message: 'Payment successful but order creation failed. Please contact support.',
                type: 'error',
              });
              setState(prev => ({
                ...prev,
                loading: false,
                error: 'Order creation failed. Please contact support.',
                currentStep: 'checkout',
              }));
              return;
            }

            // Clear cart (both API and context state)
            try {
              await cartService.clearCart();
              await cartActions.clearCart();
            } catch (clearError) {
              logger.error('⚠️ [Checkout] Failed to clear cart:', clearError as Error);
              // Non-critical error
            }

            // Navigate to success page
            setState(prev => ({ ...prev, currentStep: 'success', loading: false }));

            const orderId = orderResponse.data.id || orderResponse.data._id;
            showToast({ message: 'Payment successful! Order placed', type: 'success' });

            // Non-blocking analytics
            try { analyticsService.trackFulfillmentOrderPlaced({ fulfillmentType: state.fulfillment.selectedType, storeId: state.store.id, orderId, cartValue: state.billSummary.itemTotal, paymentMethod: 'razorpay' }); } catch {} // Silent: non-critical analytics

            // SS-002 FIX: Refresh wallet after Razorpay payment so earned cashback/coins are reflected
            refreshSharedWallet().catch(() => {});

            // OG-D004 FIX: Clear checkout draft on successful Razorpay payment.
            clearDraft();

            router.replace(
              `/payment-success?orderId=${orderId}&transactionId=${paymentResponse.transactionId}&paymentMethod=razorpay`
            );
          } catch (error: any) {
            logger.error('❌ [Checkout] Post-payment error:', error as Error);
            // Client no longer initiates refunds; backend refunds failed-order payments via webhook.
            // The backend owns the refund on failed-order-create to avoid replay and enforce idempotency.
            logger.error(
              `[checkout] Order create failed after payment — backend will refund via webhook (paymentId=${razorpayPaymentId})`,
              error instanceof Error ? error : undefined,
              'Checkout'
            );
            showToast({
              message: 'Your payment is being refunded — you\'ll see it in 3-5 business days',
              type: 'error',
            });
            setState(prev => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error.message : 'Order creation failed',
              currentStep: 'checkout',
            }));
          }
        },
        onError: (error) => {
          logger.error('❌ [Checkout] Razorpay payment error:', error as Error);
          showToast({
            message: error.message || 'Payment failed',
            type: 'error',
          });
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message || 'Payment failed',
            currentStep: 'checkout',
          }));
        },
      });
    } catch (error: any) {
      logger.error('❌ [Checkout] Razorpay initialization error:', error as Error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to initialize payment',
        type: 'error',
      });
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize payment',
        currentStep: 'checkout',
      }));
    } finally {
      // OG-002 FIX: Release the submission lock. Razorpay's SDK handles the
      // user-visible sheet; the lock is released here so if the sheet is
      // dismissed and the user retries, the call is not silently blocked.
      isSubmittingRef.current = false;
    }
  }, [state.billSummary, state.items, state.store, state.appliedPromoCode, state.coinSystem, router, cartActions]);

  // Handler functions for components
  const handlePromoCodeApply = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    // First try to find in available promo codes
    const existingPromo = state.availablePromoCodes.find(p => p.code === code && p.isActive);

    const itemTotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);

    if (existingPromo) {
      // Check minimum order value
      if (itemTotal < existingPromo.minOrderValue) {
        const errorMsg = `Minimum order value ${currencySymbol}${existingPromo.minOrderValue} required for ${code}`;
        setState(prev => ({ ...prev, error: errorMsg }));
        return { success: false, message: errorMsg };
      }

      // Apply the promo code and return its result
      const result = await applyPromoCode(existingPromo);
      return result;
    } else {
      // Code not in available list - try to validate with backend anyway
      // Create a temporary promo code object
      const tempPromoCode: PromoCode = {
        id: code,
        code: code,
        title: code,
        description: 'Promo code',
        discountType: 'PERCENTAGE', // Will be updated from backend response
        discountValue: 0, // Will be updated from backend response
        maxDiscount: 0,
        minOrderValue: 0,
        validUntil: '',
        isActive: true,
        termsAndConditions: [],
      };

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Prepare cart data for validation - only include non-empty fields
        const cartData = {
          items: state.items.map(item => {
            const cartItem: any = {
              product: item.productId || item.id,
              quantity: item.quantity,
              price: item.price,
            };
            // Only include category and store if they have values
            if (item.category && item.category.trim() !== '') {
              cartItem.category = item.category;
            }
            if (item.storeId && item.storeId.trim() !== '') {
              cartItem.store = item.storeId;
            }
            return cartItem;
          }),
          subtotal: itemTotal,
        };

        const response: any = await couponService.validateCoupon(code, cartData);

        if (response.success && response.data) {
          // Update promo code with backend values
          tempPromoCode.discountType = response.data.coupon.type;
          tempPromoCode.discountValue = response.data.coupon.value;

          // Calculate new bill summary with coupon discount
          const coinUsage = {
            rez: state.coinSystem.rezCoin.used,
            promo: state.coinSystem.promoCoin.used,
          };

          const newBillSummary = CheckoutData.helpers.calculateBillSummary(
            state.items,
            state.store,
            tempPromoCode,
            coinUsage
          );

          // Override promo discount with actual backend value
          newBillSummary.promoDiscount = response.data.discount;
          newBillSummary.savings = (newBillSummary.savings || 0) + response.data.discount;

          // Recalculate totalPayable with promo discount and lock fee
          const subtotal = newBillSummary.itemTotal;
          const totalBeforeDiscount = subtotal + newBillSummary.platformFee + newBillSummary.deliveryFee + newBillSummary.taxes;
          const totalAfterDiscount = totalBeforeDiscount - (newBillSummary.lockFeeDiscount || 0) - response.data.discount - coinUsage.rez - coinUsage.promo;
          newBillSummary.totalPayable = Math.max(0, Math.round(totalAfterDiscount));

          setState(prev => ({
            ...prev,
            appliedPromoCode: tempPromoCode,
            billSummary: newBillSummary,
            loading: false,
            showPromoCodeSection: false,
            error: null,
          }));

          return { success: true, message: `${code} applied successfully!` };
        } else {
          const errorMsg = response.message || 'Invalid promo code';
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMsg,
          }));
          return { success: false, message: errorMsg };
        }
      } catch (error: any) {
        const errorMsg = 'Failed to validate promo code';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return { success: false, message: errorMsg };
      }
    }
  }, [state.availablePromoCodes, state.items, state.store, state.coinSystem, applyPromoCode]);

  const handleCoinToggle = useCallback((coinType: 'rez' | 'promo' | 'storePromo', enabled: boolean) => {
    if (coinType === 'rez') {
      toggleRezCoin(enabled);  // 'rez' in handlers maps to rezCoin internally
    } else if (coinType === 'promo') {
      togglePromoCoin(enabled);
    } else if (coinType === 'storePromo') {
      toggleStorePromoCoin(enabled);
    }
  }, [toggleRezCoin, togglePromoCoin, toggleStorePromoCoin]);

  const handlePaymentMethodSelect = useCallback((method: PaymentMethod) => {
    selectPaymentMethod(method);
  }, [selectPaymentMethod]);

  // Set fulfillment type and recalculate fees
  const setFulfillmentType = useCallback((type: FulfillmentType) => {
    setState(prev => {
      const isDelivery = type === 'delivery';
      const oldDeliveryFee = prev.billSummary.deliveryFee;
      const baseDeliveryFee = prev.store.deliveryFee || 0;
      const newDeliveryFee = isDelivery ? baseDeliveryFee : 0;
      const feeDiff = newDeliveryFee - oldDeliveryFee;

      const newBill: BillSummary = {
        ...prev.billSummary,
        deliveryFee: newDeliveryFee,
        totalBeforeCoinDiscount: Math.max(0, prev.billSummary.totalBeforeCoinDiscount + feeDiff),
        totalPayable: Math.max(0, prev.billSummary.totalPayable + feeDiff),
      };

      // Non-blocking analytics
      try {
        analyticsService.trackFulfillmentTypeSelected({
          fulfillmentType: type,
          storeId: prev.store.id,
          cartValue: prev.billSummary.itemTotal,
          previousType: prev.fulfillment.selectedType,
        });
      } catch {} // Silent: non-critical analytics

      return {
        ...prev,
        fulfillment: { ...prev.fulfillment, selectedType: type },
        billSummary: newBill,
        showAddressSection: isDelivery,
      };
    });
  }, []);

  // Set fulfillment details (table number, vehicle info, etc.)
  const setFulfillmentDetails = useCallback((details: Partial<FulfillmentDetails>) => {
    setState(prev => ({
      ...prev,
      fulfillment: {
        ...prev.fulfillment,
        ...details,
      },
    }));
  }, []);

  // Select delivery address
  const selectAddress = useCallback((address: CheckoutDeliveryAddress) => {
    setState(prev => ({
      ...prev,
      selectedAddress: address,
      showAddressSection: false,
    }));
    // OG-D004 FIX: Persist selected address ID so it survives an OS kill.
    saveDraft({ selectedAddressId: address.id });
  }, [saveDraft]);

  const handleAddressSelect = useCallback((address: CheckoutDeliveryAddress) => {
    selectAddress(address);
  }, [selectAddress]);

  const handleProceedToPayment = useCallback(() => {
    // Validate address before proceeding (only required for delivery)
    if (state.fulfillment.selectedType === 'delivery' && !state.selectedAddress) {
      showToast({
        message: 'Please select a delivery address',
        type: 'error',
      });
      setState(prev => ({ ...prev, showAddressSection: true }));
      return;
    }
    proceedToPayment();
  }, [proceedToPayment, state.selectedAddress, state.fulfillment.selectedType]);

  const handleBackNavigation = useCallback(() => {
    if (state.currentStep === 'payment_methods') {
      setState(prev => ({ ...prev, currentStep: 'checkout' }));
      router.back();
    } else {
      router.back();
    }
  }, [state.currentStep]);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return {
    state,
    actions: {
      applyPromoCode,
      removePromoCode,
      toggleRezCoin,
      togglePromoCoin,
      selectPaymentMethod,
      selectAddress,
      updateBillSummary,
      proceedToPayment,
      processPayment,
      setFulfillmentType,
      setFulfillmentDetails,
    },
    handlers: {
      handlePromoCodeApply,
      handleCoinToggle,
      handleCustomCoinAmount,
      handlePaymentMethodSelect,
      handleAddressSelect,
      handleProceedToPayment,
      handleBackNavigation,
      handleWalletPayment,
      handleCODPayment,
      handleRazorpayPayment,
      removePromoCode,
      navigateToOtherPaymentMethods,
      applyCardOffer,
      removeCardOffer,
    },
  };
};