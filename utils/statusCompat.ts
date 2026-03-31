/**
 * Local mirror of @rez/shared statusCompat — Vercel builds each repo in
 * isolation so the workspace package at ../../packages/rez-shared is not
 * available. Keep this in sync with packages/rez-shared/src/statusCompat.ts.
 */

const ORDER_STATUS_MAP: Record<string, string> = {
  in_transit: 'out_for_delivery',
  refund_initiated: 'partially_refunded',
  shipping: 'dispatched',
  packed: 'preparing',
  accepted: 'confirmed',
};

export function normalizeOrderStatus(status: string): string {
  return ORDER_STATUS_MAP[status] ?? status;
}
