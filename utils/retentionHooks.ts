/**
 * Retention Hooks & Habit Loop Triggers
 * CARLOS: retention — day-1 hooks, streak display, coin expiry warning, session tracking
 *
 * Every touchpoint is a habit loop opportunity. First 7 days determine lifetime value.
 * Notification timing + visual cues + reward psychology drive re-engagement.
 */

import { User } from '@/services/authApi';

/**
 * Check if user is on their first day
 * CARLOS: retention — day-1 habit prompt triggers first action (booking, earning, store visit)
 */
export const isUserFirstDay = (user: User | null): boolean => {
  if (!user?.createdAt) return false;
  const createdAt = new Date(user.createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff === 0;
};

/**
 * Get days since user joined
 * CARLOS: retention — track early user lifecycle stages (day 1, week 1, month 1)
 */
export const getDaysSinceJoined = (user: User | null): number => {
  if (!user?.createdAt) return -1;
  const createdAt = new Date(user.createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Check if user is in critical retention window (first 7 days)
 * CARLOS: retention — day-1 through day-7 determines 90-day retention by 3x
 */
export const isInCriticalRetentionWindow = (user: User | null): boolean => {
  const daysSince = getDaysSinceJoined(user);
  return daysSince >= 0 && daysSince <= 6;
};

/**
 * Suggested first action for day-1 users
 * CARLOS: retention — habit loop trigger — guide user to high-impact action
 */
export const getDay1ChallengeAction = (userPreferences?: any): 'booking' | 'earn' | 'store' => {
  // Simple rotation to A/B test which first action drives highest retention
  const actions: Array<'booking' | 'earn' | 'store'> = ['booking', 'earn', 'store'];
  const hash = Math.random();
  if (hash < 0.33) return 'booking';
  if (hash < 0.66) return 'earn';
  return 'store';
};

/**
 * Session tracking events for cohort analysis
 * CARLOS: retention — session depth drives higher LTV; track app foreground/background
 */
export interface SessionEvent {
  type: 'session_start' | 'session_end';
  timestamp: string;
  sessionDuration?: number; // milliseconds
  userId?: string;
}

/**
 * Track session start (app comes to foreground)
 * CARLOS: retention — measure session depth, time in app, feature usage patterns
 */
export const trackSessionStart = (): SessionEvent => ({
  type: 'session_start',
  timestamp: new Date().toISOString(),
});

/**
 * Track session end (app goes background)
 * CARLOS: retention — session duration influences re-engagement timing (push notifications)
 */
export const trackSessionEnd = (sessionStartTime: number): SessionEvent => ({
  type: 'session_end',
  timestamp: new Date().toISOString(),
  sessionDuration: Date.now() - sessionStartTime,
});

/**
 * Streak calculation from consecutive daily active dates
 * CARLOS: retention — streak display (🔥 3-day streak!) drives habit loop continuation
 *
 * Assumes lastActiveDate is persisted somewhere (AsyncStorage, backend, or Redux)
 * Returns current streak count based on consecutive days
 */
export const calculateStreak = (lastActiveDate: string | null, userId?: string): number => {
  if (!lastActiveDate) return 0;

  const lastActive = new Date(lastActiveDate);
  const today = new Date();

  // Normalize dates to midnight for comparison
  lastActive.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Days since last active
  const daysSinceLast = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  // Streak breaks if >1 day has passed
  if (daysSinceLast > 1) return 0;

  // If active today or yesterday, streak continues — actual count requires backend
  // For now, return 1 to indicate streak is active; real streak count from API
  return daysSinceLast === 0 ? 1 : 1; // Placeholder; backend should track full streak
};

/**
 * Get streak emoji and motivational copy
 * CARLOS: retention — visual + emotional hook to maintain daily habit
 */
export const getStreakDisplay = (streak: number): { emoji: string; text: string } => {
  if (streak === 0) return { emoji: '', text: '' };
  if (streak === 1) return { emoji: '🔥', text: '1-day streak! Start your habit.' };
  if (streak < 7) return { emoji: '🔥', text: `${streak}-day streak! Keep it up.` };
  if (streak < 30) return { emoji: '🔥🔥', text: `${streak}-day streak! You're a REZ champion.` };
  return { emoji: '🔥🔥🔥', text: `${streak}-day streak! Unstoppable!` };
};

/**
 * Coin expiry warning for wallet screen
 * CARLOS: retention — FOMO (fear of missing out) drives immediate redeem action
 *
 * Returns null if no warning needed; returns warning data if coins expiring soon
 */
export interface CoinExpiryWarning {
  amount: number;
  daysLeft: number;
  urgency: 'critical' | 'warning' | 'info';
  message: string;
}

export const getCoinExpiryWarning = (
  expiringAmount: number,
  minDaysLeft: number
): CoinExpiryWarning | null => {
  if (expiringAmount <= 0 || minDaysLeft > 7) return null;

  // CARLOS: retention — progressive urgency colors based on time to expiry
  let urgency: 'critical' | 'warning' | 'info' = 'info';
  if (minDaysLeft === 0) urgency = 'critical'; // Today!
  else if (minDaysLeft <= 2) urgency = 'critical'; // Expires very soon
  else if (minDaysLeft <= 5) urgency = 'warning'; // This week

  // Craft message with specific action
  const message =
    minDaysLeft === 0
      ? `⚠️ ${expiringAmount} coins expire TODAY — redeem now!`
      : `⚠️ ${expiringAmount} coins expiring in ${minDaysLeft} day${minDaysLeft > 1 ? 's' : ''} — use them now!`;

  return {
    amount: expiringAmount,
    daysLeft: minDaysLeft,
    urgency,
    message,
  };
};

/**
 * Check if user should see day-1 habit challenge card
 * CARLOS: retention — day-1 card appears once, then hidden to avoid spam
 */
export const shouldShowDay1Challenge = async (
  user: User | null,
  getStorageValue: (key: string) => Promise<string | null>
): Promise<boolean> => {
  if (!isUserFirstDay(user)) return false;

  // Only show once per session or per day
  const shown = await getStorageValue('day1_challenge_shown');
  return !shown;
};

/**
 * Mark day-1 challenge as shown
 * CARLOS: retention — prevent showing same prompt twice in same session
 */
export const markDay1ChallengeSeen = async (
  setStorageValue: (key: string, value: string) => Promise<void>
): Promise<void> => {
  await setStorageValue('day1_challenge_shown', new Date().toISOString());
};
