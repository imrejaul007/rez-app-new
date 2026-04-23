/**
 * Unit tests for the consumer-side QR parser.
 *
 * Mirrors the backend test suite — same input strings, same expected
 * results. If a test passes here and fails on the backend (or vice
 * versa), the two implementations have drifted and must be re-aligned.
 */

import { parseQrPayload, SHORT_URL_HOSTS } from '../qrPayload';
import { routeFromPayload } from '../qrIntentRouter';

describe('parseQrPayload — errors', () => {
  it('empty / whitespace → reason=empty', () => {
    expect(parseQrPayload('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseQrPayload('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('null / undefined / non-string → reason=empty', () => {
    expect(parseQrPayload(null)).toEqual({ ok: false, reason: 'empty' });
    expect(parseQrPayload(undefined)).toEqual({ ok: false, reason: 'empty' });
  });

  it('non-JSON non-URL → reason=not-json', () => {
    const r = parseQrPayload('plain text');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not-json');
  });

  it('valid JSON but missing required fields → reason=invalid-schema', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'store-visit', v: 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'invalid-schema') {
      expect(r.issues.join(' ')).toMatch(/storeId/);
    }
  });

  it('valid JSON but wrong v → reason=unsupported-version', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'store-visit', v: 2, storeId: 'a' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'unsupported-version') expect(r.version).toBe(2);
  });

  it('valid JSON but missing v → reason=invalid-schema', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'store-visit', storeId: 'a' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-schema');
  });

  it('valid JSON array → reason=invalid-schema', () => {
    const r = parseQrPayload(JSON.stringify([1, 2, 3]));
    expect(r.ok).toBe(false);
  });

  it('unknown intent → reason=invalid-schema', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'who-knows', v: 1 }));
    expect(r.ok).toBe(false);
  });
});

describe('parseQrPayload — happy paths', () => {
  it.each([
    ['store-visit', { intent: 'store-visit', v: 1, storeId: 's1' }],
    ['pay-bill', { intent: 'pay-bill', v: 1, storeId: 's1', amount: 500 }],
    ['redeem-deal', { intent: 'redeem-deal', v: 1, dealId: 'd1' }],
    ['redeem-voucher', { intent: 'redeem-voucher', v: 1, voucherId: 'v1' }],
    ['claim-stamp', { intent: 'claim-stamp', v: 1, stampCardId: 'sc1', storeId: 's1' }],
    ['event-checkin', { intent: 'event-checkin', v: 1, eventId: 'e1' }],
    ['referral', { intent: 'referral', v: 1, referralCode: 'C1' }],
    ['wallet-transfer', { intent: 'wallet-transfer', v: 1, toUserId: 'u1' }],
  ])('parses %s', (_label, input) => {
    const r = parseQrPayload(JSON.stringify(input));
    expect(r.ok).toBe(true);
    if (r.ok && 'intent' in r.payload) {
      expect(r.payload.intent).toBe(input.intent);
    }
  });

  it('pay-bill rejects negative amount', () => {
    const r = parseQrPayload(
      JSON.stringify({ intent: 'pay-bill', v: 1, storeId: 's1', amount: -1 }),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects empty storeId even when shape is right', () => {
    const r = parseQrPayload(JSON.stringify({ intent: 'store-visit', v: 1, storeId: '' }));
    expect(r.ok).toBe(false);
  });
});

describe('parseQrPayload — short URL handling', () => {
  it.each(SHORT_URL_HOSTS)('accepts %s', (host) => {
    const r = parseQrPayload(`https://${host}/q/abc123`);
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.intent === 'short-url') expect(r.payload.token).toBe('abc123');
  });

  it('strips trailing slash from token', () => {
    const r = parseQrPayload('https://rez.money/q/abc/');
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.intent === 'short-url') expect(r.payload.token).toBe('abc');
  });

  it('rejects unknown hostname', () => {
    const r = parseQrPayload('https://example.com/q/abc');
    expect(r.ok).toBe(false);
  });

  it('rejects empty token', () => {
    const r = parseQrPayload('https://rez.money/q/');
    expect(r.ok).toBe(false);
  });
});

describe('routeFromPayload', () => {
  it('routes store-visit to /qr-checkin', () => {
    const r = routeFromPayload({ intent: 'store-visit', v: 1, storeId: 's1' });
    expect(r?.pathname).toBe('/qr-checkin');
    expect(r?.params).toEqual({ storeId: 's1' });
  });

  it('routes pay-bill and includes amount as a string', () => {
    const r = routeFromPayload({ intent: 'pay-bill', v: 1, storeId: 's1', amount: 450 });
    expect(r?.pathname).toBe('/pay-in-store');
    expect(r?.params).toEqual({ storeId: 's1', amount: '450' });
  });

  it('routes redeem-deal to /my-vouchers', () => {
    const r = routeFromPayload({ intent: 'redeem-deal', v: 1, dealId: 'd1' });
    expect(r?.pathname).toBe('/my-vouchers');
    expect(r?.params).toEqual({ dealId: 'd1' });
  });

  it('routes claim-stamp to /qr-checkin with stampCardId', () => {
    const r = routeFromPayload({
      intent: 'claim-stamp',
      v: 1,
      stampCardId: 'sc1',
      storeId: 's1',
    });
    expect(r?.pathname).toBe('/qr-checkin');
    expect(r?.params).toEqual({ storeId: 's1', stampCardId: 'sc1' });
  });

  it('routes event-checkin to /karma/scan', () => {
    const r = routeFromPayload({ intent: 'event-checkin', v: 1, eventId: 'e1' });
    expect(r?.pathname).toBe('/karma/scan');
    expect(r?.params).toEqual({ eventId: 'e1' });
  });

  it('routes referral to /referral', () => {
    const r = routeFromPayload({ intent: 'referral', v: 1, referralCode: 'C1' });
    expect(r?.pathname).toBe('/referral');
    expect(r?.params).toEqual({ code: 'C1' });
  });

  it('routes wallet-transfer with amount', () => {
    const r = routeFromPayload({
      intent: 'wallet-transfer',
      v: 1,
      toUserId: 'u1',
      amount: 100,
    });
    expect(r?.pathname).toBe('/wallet/transfer');
    expect(r?.params).toEqual({ toUserId: 'u1', amount: '100' });
  });

  it('returns null for short-url marker', () => {
    expect(routeFromPayload({ intent: 'short-url', token: 'x' })).toBeNull();
  });
});
