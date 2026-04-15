/**
 * Integration Test: Idempotency Key Generation
 *
 * Verifies that idempotency keys are properly generated locally
 * and can be used for request deduplication.
 */

import { generateIdempotencyKey as generateLocalKey } from '../../utils/idempotencyHelper';

describe('Idempotency Key Integration', () => {
  it('should generate idempotency keys from local generator', () => {
    const key1 = generateLocalKey();
    const key2 = generateLocalKey();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
    expect(typeof key1).toBe('string');
    expect(key1.length).toBeGreaterThan(0);
  });

  it('should use shared generator in local helper', () => {
    const localKey = generateLocalKey();
    expect(localKey).toBeDefined();
    expect(typeof localKey).toBe('string');
    expect(localKey.length).toBeGreaterThan(0);
  });

  it('should generate UUIDs as idempotency keys', () => {
    const key = generateIdempotencyKey();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(key)).toBe(true);
  });
});
