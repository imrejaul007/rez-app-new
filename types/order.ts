// Order Types
// Type definitions for order management system

// Canonical order status — must match rez-shared/src/orderStatuses.ts
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

export type PaymentStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'authorized'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

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
    /** Backend field name is 'delivery', NOT 'deliveryFee' */
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
  /** @deprecated Use totals.delivery */
  shipping: number;
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
