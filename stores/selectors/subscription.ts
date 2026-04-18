/**
 * Subscription store selectors — 10 imports.
 */

import { useSubscriptionStore } from '../subscriptionStore';

/** Only re-renders when subscription tier changes */
export const useSubscriptionTier = () =>
  useSubscriptionStore((s) => s.state?.currentSubscription?.tier);

/** Only re-renders when subscribed status changes */
export const useIsSubscribed = () =>
  useSubscriptionStore((s) => s.computed?.isSubscribed ?? false);
