/**
 * Unified Order Type Definition
 *
 * This is the CANONICAL order interface used throughout the application.
 * All order data should be normalized to this structure.
 *
 * KEY DECISIONS:
 * - Standard ID field: 'id' (string)
 * - Status enums for order, payment, delivery
 * - Pricing breakdown as nested object
 * - Timeline tracking for order events
 */

import { UserAddress, UserPaymentMethod } from './User';
import { ProductVariantSelection } from './Product';

// ============================================================================
// BACKEND CANONICAL TOTALS (mirrors IOrderTotals in rezbackend/src/models/Order.ts)
// ============================================================================

/**
 * Canonical order totals — field names mirror IOrderTotals in the backend model.
 * Use these names when reading from API responses.
 */
export interface IOrderTotals {
  subtotal: number;
  tax: number;
  /** Delivery fee — backend field name is 'delivery', NOT 'deliveryFee' */
  delivery: number;
  discount: number;
  lockFeeDiscount?: number;
  cashback: number;
  total: number;
  paidAmount: number;
  refundAmount?: number;
  /** 15% of subtotal — platform commission */
  platformFee: number;
  /** subtotal - platformFee — what merchant receives */
  merchantPayout: number;
}

// ============================================================================
// CORE ORDER INTERFACE
// ============================================================================

export interface Order {
  // ========== IDENTIFIERS ==========
  /** Primary identifier */
  id: string;

  /** Human-readable order number */
  orderNumber: string;

  /** User ID */
  userId: string;

  // ========== ORDER ITEMS ==========
  /** Items in this order */
  items: OrderItem[];

  // ========== PRICING ==========
  /**
   * Backend canonical totals — primary source of truth.
   * Field names match IOrderTotals in rezbackend/src/models/Order.ts.
   * Prefer reading from this field over `pricing`.
   */
  totals?: IOrderTotals;

  /** Pricing breakdown (legacy/UI-facing shape — use `totals` for financial data) */
  pricing: OrderPricing;

  // ========== STATUS ==========
  /** Order status */
  status: OrderStatus;

  /** Payment status */
  paymentStatus: PaymentStatus;

  /** Delivery status */
  deliveryStatus: DeliveryStatus;

  // ========== ADDRESSES ==========
  /** Shipping address */
  shippingAddress: UserAddress;

  /** Billing address (if different) */
  billingAddress?: UserAddress;

  // ========== PAYMENT ==========
  /** Payment method used */
  paymentMethod: OrderPaymentMethod;

  /** Payment ID/Transaction ID */
  paymentId?: string;

  /** Payment date */
  paidAt?: string | Date;

  // ========== DELIVERY ==========
  /** Delivery method */
  deliveryMethod: DeliveryMethod;

  /** Tracking information */
  tracking?: OrderTracking;

  /** Estimated delivery date */
  estimatedDeliveryDate?: string | Date;

  /** Actual delivery date */
  actualDeliveryDate?: string | Date;

  // ========== STORE INFORMATION ==========
  /** Store ID (if single-store order) */
  storeId?: string;

  /** Store name */
  storeName?: string;

  /** Stores involved (for multi-store orders) */
  stores?: Array<{
    id: string;
    name: string;
    itemCount: number;
  }>;

  // ========== TIMELINE ==========
  /** Order timeline/history */
  timeline: OrderTimelineEvent[];

  // ========== NOTES & INSTRUCTIONS ==========
  /** Customer notes */
  customerNotes?: string;

  /** Delivery instructions */
  deliveryInstructions?: string;

  /** Internal notes (merchant/admin only) */
  internalNotes?: string;

  // ========== CANCELLATION & RETURNS ==========
  /** Can this order be cancelled? */
  canCancel?: boolean;

  /** Can this order be returned? */
  canReturn?: boolean;

  /** Cancellation details */
  cancellation?: OrderCancellation;

  /** Return details */
  return?: OrderReturn;

  // ========== INVOICE ==========
  /** Invoice number */
  invoiceNumber?: string;

  /** Invoice URL */
  invoiceUrl?: string;

  // ========== METADATA ==========
  /** Order source */
  source?: 'web' | 'mobile' | 'app' | 'pos';

  /** Device type */
  deviceType?: 'mobile' | 'tablet' | 'desktop';

  /** Created at */
  createdAt: string | Date;

  /** Updated at */
  updatedAt: string | Date;

  /** Custom metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// ORDER ITEM
// ============================================================================

export interface OrderItem {
  /** Item ID */
  id: string;

  /** Product ID */
  productId: string;

  /** Product name */
  productName: string;

  /** Product image */
  productImage: string;

  /** Product SKU */
  sku?: string;

  // ========== VARIANT ==========
  /** Selected variant */
  variant?: ProductVariantSelection;

  /** Variant display text */
  variantText?: string;

  // ========== QUANTITY ==========
  /** Quantity ordered */
  quantity: number;

  // ========== PRICING ==========
  /** Price per unit */
  price: number;

  /** Original price */
  originalPrice?: number;

  /** Discount per unit */
  discount?: number;

  /** Subtotal (price × quantity) */
  subtotal: number;

  /** Cashback earned */
  cashback?: number;

  // ========== STATUS ==========
  /** Item status */
  status?: OrderItemStatus;

  /** Can this item be cancelled? */
  canCancel?: boolean;

  /** Can this item be returned? */
  canReturn?: boolean;

  // ========== STORE ==========
  /** Store ID */
  storeId: string;

  /** Store name */
  storeName: string;

  // ========== METADATA ==========
  /** Special instructions for this item */
  instructions?: string;

  /** Custom metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// ORDER PRICING
// ============================================================================

export interface OrderPricing {
  /** Subtotal (sum of item prices) */
  subtotal: number;

  /** Total discount */
  discount: number;

  /** Discount breakdown */
  discountBreakdown?: Array<{
    type: 'coupon' | 'offer' | 'loyalty' | 'cashback';
    code?: string;
    amount: number;
    description: string;
  }>;

  /** Tax amount */
  tax: number;

  /** Tax breakdown */
  taxBreakdown?: Array<{
    name: string;
    rate: number;
    amount: number;
  }>;

  /** Shipping fee */
  shipping: number;

  /** Handling fee */
  handlingFee?: number;

  /** Packaging fee */
  packagingFee?: number;

  /** Other fees */
  otherFees?: number;

  /** Total amount */
  total: number;

  /** Amount paid */
  amountPaid?: number;

  /** Amount refunded */
  amountRefunded?: number;

  /** Currency */
  currency: string;

  /** Total cashback */
  totalCashback?: number;

  /** Total savings */
  totalSavings: number;
}

// ============================================================================
// ORDER PAYMENT METHOD
// ============================================================================

export interface OrderPaymentMethod {
  /** Payment type */
  type: 'card' | 'upi' | 'wallet' | 'cod' | 'net_banking' | 'emi';

  /** Payment details */
  details?: {
    /** For card payments */
    card?: {
      brand: string;
      lastFour: string;
    };

    /** For UPI payments */
    upi?: {
      vpa: string;
    };

    /** For wallet payments */
    wallet?: {
      provider: string;
    };

    /** For EMI payments */
    emi?: {
      tenure: number;
      monthlyAmount: number;
      provider: string;
    };
  };
}

// ============================================================================
// ORDER TRACKING
// ============================================================================

export interface OrderTracking {
  /** Tracking number */
  trackingNumber: string;

  /** Carrier/courier name */
  carrier: string;

  /** Carrier URL */
  carrierUrl?: string;

  /** Current status */
  currentStatus: string;

  /** Current location */
  currentLocation?: string;

  /** Tracking events */
  events: TrackingEvent[];

  /** Estimated delivery date */
  estimatedDelivery?: string | Date;

  /** Last updated */
  lastUpdated: string | Date;
}

export interface TrackingEvent {
  /** Event timestamp */
  timestamp: string | Date;

  /** Event status */
  status: string;

  /** Event location */
  location?: string;

  /** Event description */
  description: string;
}

// ============================================================================
// ORDER TIMELINE
// ============================================================================

export interface OrderTimelineEvent {
  /** Event ID */
  id: string;

  /** Event type */
  type: OrderTimelineEventType;

  /** Event timestamp */
  timestamp: string | Date;

  /** Event title */
  title: string;

  /** Event description */
  description?: string;

  /** Actor (who triggered this event) */
  actor?: {
    id: string;
    name: string;
    type: 'user' | 'merchant' | 'system' | 'admin';
  };

  /** Event metadata */
  metadata?: Record<string, any>;
}

export type OrderTimelineEventType =
  | 'created'
  | 'confirmed'
  | 'payment_received'
  | 'payment_failed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refund_initiated'
  | 'refunded'
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'returned';

// ============================================================================
// ORDER CANCELLATION
// ============================================================================

export interface OrderCancellation {
  /** Cancellation reason */
  reason: string;

  /** Cancellation reason code */
  reasonCode?: string;

  /** Cancelled by */
  cancelledBy: {
    id: string;
    name: string;
    type: 'user' | 'merchant' | 'system' | 'admin';
  };

  /** Cancellation timestamp */
  cancelledAt: string | Date;

  /** Refund status */
  refundStatus?: 'pending' | 'processing' | 'completed' | 'failed';

  /** Refund amount */
  refundAmount?: number;

  /** Refund date */
  refundedAt?: string | Date;

  /** Notes */
  notes?: string;
}

// ============================================================================
// ORDER RETURN
// ============================================================================

export interface OrderReturn {
  /** Return ID */
  id: string;

  /** Return reason */
  reason: string;

  /** Return reason code */
  reasonCode?: string;

  /** Items being returned */
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason?: string;
  }>;

  /** Return status */
  status: 'requested' | 'approved' | 'rejected' | 'picked_up' | 'completed';

  /** Requested at */
  requestedAt: string | Date;

  /** Approved/Rejected at */
  processedAt?: string | Date;

  /** Pickup details */
  pickup?: {
    scheduledDate?: string | Date;
    actualDate?: string | Date;
    courierName?: string;
    trackingNumber?: string;
  };

  /** Refund details */
  refund?: {
    amount: number;
    method: 'original' | 'wallet' | 'bank';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processedAt?: string | Date;
  };

  /** Notes */
  notes?: string;

  /** Images (proof of return) */
  images?: string[];
}

// ============================================================================
// ENUMS
// ============================================================================

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
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type DeliveryStatus =
  | 'pending'
  | 'preparing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery';

export type DeliveryMethod =
  | 'standard'
  | 'express'
  | 'same_day'
  | 'pickup'
  | 'scheduled';

export type OrderItemStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Order summary (for lists/cards) */
export type OrderSummary = Pick<
  Order,
  | 'id'
  | 'orderNumber'
  | 'status'
  | 'pricing'
  | 'createdAt'
  | 'estimatedDeliveryDate'
>;

/** Order for tracking */
export type OrderForTracking = Pick<
  Order,
  | 'id'
  | 'orderNumber'
  | 'status'
  | 'deliveryStatus'
  | 'tracking'
  | 'estimatedDeliveryDate'
>;

// ============================================================================
// ORDER TOTALS UTILITY FUNCTIONS
//
// These read from `order.totals` (backend canonical) first, then fall back to
// `order.pricing` (legacy UI shape) for backward compatibility.
// Always use these helpers in components instead of accessing fields directly.
// ============================================================================

type OrderLike = { totals?: IOrderTotals; pricing?: Partial<OrderPricing> & {
  shippingAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
}};

/**
 * Get the delivery/shipping fee from an order.
 * Reads totals.delivery (canonical) → pricing.shipping → pricing.shippingAmount → 0
 */
export function getOrderShipping(order: OrderLike): number {
  return (
    order.totals?.delivery ??
    order.pricing?.shipping ??
    order.pricing?.shippingAmount ??
    0
  );
}

/**
 * Get the tax amount from an order.
 * Reads totals.tax (canonical) → pricing.tax → pricing.taxAmount → 0
 */
export function getOrderTax(order: OrderLike): number {
  return (
    order.totals?.tax ??
    order.pricing?.tax ??
    order.pricing?.taxAmount ??
    0
  );
}

/**
 * Get the grand total from an order.
 * Reads totals.total (canonical) → pricing.total → pricing.totalAmount → 0
 */
export function getOrderTotal(order: OrderLike): number {
  return (
    order.totals?.total ??
    order.pricing?.total ??
    order.pricing?.totalAmount ??
    0
  );
}

/**
 * Get the subtotal from an order.
 * Reads totals.subtotal (canonical) → pricing.subtotal → 0
 */
export function getOrderSubtotal(order: OrderLike): number {
  return order.totals?.subtotal ?? order.pricing?.subtotal ?? 0;
}

/**
 * Get the discount from an order.
 * Reads totals.discount (canonical) → pricing.discount → 0
 */
export function getOrderDiscount(order: OrderLike): number {
  return order.totals?.discount ?? order.pricing?.discount ?? 0;
}
