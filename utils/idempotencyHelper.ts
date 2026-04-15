/**
 * Idempotency Helper
 *
 * Provides idempotency key generation and management for API requests
 * to ensure safe retry semantics across unreliable networks.
 *
 * Phase 0: Uses @rez/shared/idempotency generateIdempotencyKey
 */

import { generateIdempotencyKey as generateSharedKey } from '@rez/shared/idempotency';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IDEMPOTENCY_CACHE_PREFIX = 'idempotency:';
const IDEMPOTENCY_TTL_MS = 86400000; // 24 hours

/**
 * Generate a new idempotency key for an API request
 * Uses the canonical generator from rez-shared/idempotency
 */
export function generateIdempotencyKey(): string {
  return generateSharedKey();
}

/**
 * Store an idempotency key result in local cache
 * for deduplication on retries
 */
export async function storeIdempotencyResult(
  key: string,
  result: any,
): Promise<void> {
  try {
    const cacheKey = `${IDEMPOTENCY_CACHE_PREFIX}${key}`;
    const entry = {
      result,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to store idempotency result:', error);
  }
}

/**
 * Retrieve cached idempotency result if it exists and is fresh
 */
export async function getIdempotencyResult(key: string): Promise<any | null> {
  try {
    const cacheKey = `${IDEMPOTENCY_CACHE_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    let entry: { timestamp: number; result: any };
    try {
      entry = JSON.parse(cached);
    } catch {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    const age = Date.now() - entry.timestamp;

    // Return null if cache has expired
    if (age > IDEMPOTENCY_TTL_MS) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return entry.result;
  } catch (error) {
    console.error('Failed to retrieve idempotency result:', error);
    return null;
  }
}

/**
 * Clear a cached idempotency result
 */
export async function clearIdempotencyResult(key: string): Promise<void> {
  try {
    const cacheKey = `${IDEMPOTENCY_CACHE_PREFIX}${key}`;
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Failed to clear idempotency result:', error);
  }
}

/**
 * Execute an async operation with idempotency guarantees
 * Returns cached result if operation was recently executed with same key
 */
export async function executeWithIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  // Check for cached result first
  const cached = await getIdempotencyResult(key);
  if (cached !== null) {
    return cached as T;
  }

  // Execute operation
  const result = await operation();

  // Cache the result
  await storeIdempotencyResult(key, result);

  return result;
}
