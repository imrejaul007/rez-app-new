// Canonical types: @rez/shared-types — migrate imports when package is published
// Order Types
// Type definitions for order management system

// Canonical source: @rez/shared-types/enums OrderStatus (11 states)
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelling'
  | 'cancelled'
  | 'returned'
  | 'refunded';

/**
 * PaymentStatus aligned with canonical @rez/shared-types/enums PaymentStatus (11 states).
 * Backend canonical values:
 *   pending, processing, completed, failed, cancelled, expired,
 *   refund_initiated, refund_processing, refunded, refund_failed, partially_refunded
 * Consumer app also uses: awaiting_payment, authorized, paid (mapped from backend flow).
 * These are stored as PaymentStatus values in the consumer app's local order cache.
 */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refund_initiated'
  | 'refund_processing'
  | 'refunded'
  | 'refund_failed'
  | 'partially_refunded'
  // Consumer app payment flow states (stored in local order cache)
  | 'awaiting_payment'
  | 'authorized'
  | 'paid';

export type DeliveryStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  subtotal: number; // Changed from totalPrice to match backend
  variant?: {
    size?: string;
    color?: string;
    material?: string;
  };
}

export interface ShippingAddress {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  /**
   * Backend canonical totals (IOrderTotals).
   * Prefer this over the flat deprecated fields below.
   */
  totals?: {
    subtotal: number;
    tax: number;
    /**
     * Backend canonical field name is 'totals.deliveryFee'.
     * The mapper normalizes both 'totals.deliveryFee' and 'totals.delivery' from
     * the backend response into this field. Always use totals.deliveryFee in new code.
     */
    delivery: number;
    discount: number;
    lockFeeDiscount?: number;
    cashback: number;
    total: number;
    paidAmount: number;
    refundAmount?: number;
    platformFee: number;
    merchantPayout: number;
  };
  /** @deprecated Use totals.subtotal */
  subtotal: number;
  /** @deprecated Use totals.tax */
  tax: number;
  /** @deprecated Use totals.delivery (or totals.deliveryFee) */
  shipping: number;
  /**
   * Delivery fee at root level for backwards compatibility.
   * Backend canonical field is 'totals.deliveryFee' (IOrderTotals.deliveryFee).
   * The mapper normalizes this from: backend.totals.deliveryFee, backend.totals.delivery,
   * or backend.summary.shipping. Use order.totals?.delivery in new code.
   */
  deliveryFee?: number;
  delivery_fee?: number;
  shippingCost?: number;
  /** @deprecated Use totals.discount */
  discount: number;
  /** @deprecated Use totals.total */
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  shippingAddress: ShippingAddress;
  paymentMethod: {
    type: 'card' | 'upi' | 'wallet' | 'cod';
    lastFour?: string;
    brand?: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /**
   * FM-02 FIX: Backend populates the user reference as 'user' (ObjectId ref).
   * Some components used order.customer expecting a populated user object.
   * Both aliases are present here so TypeScript accepts either access pattern;
   * the mapper in dataMappers.ts normalises the value onto both fields.
   */
  user?: { id?: string; name?: string; email?: string; phone?: string } | string;
  customer?: { id?: string; name?: string; email?: string; phone?: string } | string;
}

export interface OrderFilter {
  status: 'all' | OrderStatus;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  sortBy: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
  startDate?: string;
  endDate?: string;
}

export interface OrderSummary {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

export interface OrderAnalytics {
  ordersByMonth: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
  ordersByStatus: Array<{
    status: OrderStatus;
    count: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}
