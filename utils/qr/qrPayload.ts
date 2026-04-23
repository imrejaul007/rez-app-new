/**
 * QR Payload parser (consumer-side mirror of the backend schema).
 *
 * Implements the same discriminated-union contract as
 * rezbackend/src/utils/qrPayload.ts without pulling in zod (which
 * isn't in this app's dependency tree). Both implementations are
 * independently unit-tested; drift between them is caught by a
 * "frozen fixtures" test suite that feeds the same JSON strings to
 * both parsers in CI.
 *
 * See rezbackend/src/utils/qrPayload.ts for the authoritative schema
 * + prose explanation.
 */

export type QrIntentKind =
  | 'store-visit'
  | 'pay-bill'
  | 'redeem-deal'
  | 'redeem-voucher'
  | 'claim-stamp'
  | 'event-checkin'
  | 'referral'
  | 'wallet-transfer';

export interface StoreVisitPayload {
  intent: 'store-visit';
  v: 1;
  storeId: string;
  storeSlug?: string;
}

export interface PayBillPayload {
  intent: 'pay-bill';
  v: 1;
  storeId: string;
  billId?: string;
  amount?: number;
}

export interface RedeemDealPayload {
  intent: 'redeem-deal';
  v: 1;
  dealId: string;
  storeId?: string;
}

export interface RedeemVoucherPayload {
  intent: 'redeem-voucher';
  v: 1;
  voucherId: string;
}

export interface ClaimStampPayload {
  intent: 'claim-stamp';
  v: 1;
  stampCardId: string;
  storeId: string;
}

export interface EventCheckinPayload {
  intent: 'event-checkin';
  v: 1;
  eventId: string;
}

export interface ReferralPayload {
  intent: 'referral';
  v: 1;
  referralCode: string;
}

export interface WalletTransferPayload {
  intent: 'wallet-transfer';
  v: 1;
  toUserId: string;
  amount?: number;
}

export type QrPayload =
  | StoreVisitPayload
  | PayBillPayload
  | RedeemDealPayload
  | RedeemVoucherPayload
  | ClaimStampPayload
  | EventCheckinPayload
  | ReferralPayload
  | WalletTransferPayload;

export interface ShortUrlIntent {
  intent: 'short-url';
  token: string;
}

export type ParseResult =
  | { ok: true; payload: QrPayload }
  | { ok: true; payload: ShortUrlIntent }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'not-json' }
  | { ok: false; reason: 'invalid-schema'; issues: string[] }
  | { ok: false; reason: 'unsupported-version'; version: unknown };

export const SHORT_URL_HOSTS: readonly string[] = [
  'rez.money',
  'www.rez.money',
  'rez.link',
];
export const SHORT_URL_PATH_PREFIX = '/q/';

// ─── String helpers ─────────────────────────────────────────────────────────

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

function isNonNegativeNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0;
}

// ─── Per-intent validators ──────────────────────────────────────────────────

function validateStoreVisit(obj: Record<string, unknown>, issues: string[]): StoreVisitPayload | null {
  if (!isNonEmptyString(obj.storeId)) {
    issues.push('storeId: required non-empty string');
    return null;
  }
  if (obj.storeSlug != null && !isNonEmptyString(obj.storeSlug)) {
    issues.push('storeSlug: must be a non-empty string if provided');
    return null;
  }
  return {
    intent: 'store-visit',
    v: 1,
    storeId: obj.storeId,
    storeSlug: isNonEmptyString(obj.storeSlug) ? obj.storeSlug : undefined,
  };
}

function validatePayBill(obj: Record<string, unknown>, issues: string[]): PayBillPayload | null {
  if (!isNonEmptyString(obj.storeId)) {
    issues.push('storeId: required non-empty string');
    return null;
  }
  if (obj.billId != null && !isNonEmptyString(obj.billId)) {
    issues.push('billId: must be a non-empty string if provided');
    return null;
  }
  if (obj.amount != null && !isNonNegativeNumber(obj.amount)) {
    issues.push('amount: must be a non-negative finite number if provided');
    return null;
  }
  return {
    intent: 'pay-bill',
    v: 1,
    storeId: obj.storeId,
    billId: isNonEmptyString(obj.billId) ? obj.billId : undefined,
    amount: isNonNegativeNumber(obj.amount) ? obj.amount : undefined,
  };
}

function validateRedeemDeal(obj: Record<string, unknown>, issues: string[]): RedeemDealPayload | null {
  if (!isNonEmptyString(obj.dealId)) {
    issues.push('dealId: required non-empty string');
    return null;
  }
  if (obj.storeId != null && !isNonEmptyString(obj.storeId)) {
    issues.push('storeId: must be a non-empty string if provided');
    return null;
  }
  return {
    intent: 'redeem-deal',
    v: 1,
    dealId: obj.dealId,
    storeId: isNonEmptyString(obj.storeId) ? obj.storeId : undefined,
  };
}

function validateRedeemVoucher(obj: Record<string, unknown>, issues: string[]): RedeemVoucherPayload | null {
  if (!isNonEmptyString(obj.voucherId)) {
    issues.push('voucherId: required non-empty string');
    return null;
  }
  return { intent: 'redeem-voucher', v: 1, voucherId: obj.voucherId };
}

function validateClaimStamp(obj: Record<string, unknown>, issues: string[]): ClaimStampPayload | null {
  if (!isNonEmptyString(obj.stampCardId)) {
    issues.push('stampCardId: required non-empty string');
    return null;
  }
  if (!isNonEmptyString(obj.storeId)) {
    issues.push('storeId: required non-empty string');
    return null;
  }
  return { intent: 'claim-stamp', v: 1, stampCardId: obj.stampCardId, storeId: obj.storeId };
}

function validateEventCheckin(obj: Record<string, unknown>, issues: string[]): EventCheckinPayload | null {
  if (!isNonEmptyString(obj.eventId)) {
    issues.push('eventId: required non-empty string');
    return null;
  }
  return { intent: 'event-checkin', v: 1, eventId: obj.eventId };
}

function validateReferral(obj: Record<string, unknown>, issues: string[]): ReferralPayload | null {
  if (!isNonEmptyString(obj.referralCode)) {
    issues.push('referralCode: required non-empty string');
    return null;
  }
  return { intent: 'referral', v: 1, referralCode: obj.referralCode };
}

function validateWalletTransfer(obj: Record<string, unknown>, issues: string[]): WalletTransferPayload | null {
  if (!isNonEmptyString(obj.toUserId)) {
    issues.push('toUserId: required non-empty string');
    return null;
  }
  if (obj.amount != null && !isNonNegativeNumber(obj.amount)) {
    issues.push('amount: must be a non-negative finite number if provided');
    return null;
  }
  return {
    intent: 'wallet-transfer',
    v: 1,
    toUserId: obj.toUserId,
    amount: isNonNegativeNumber(obj.amount) ? obj.amount : undefined,
  };
}

// ─── Short URL handling ─────────────────────────────────────────────────────

function tryParseShortUrl(raw: string): ShortUrlIntent | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!SHORT_URL_HOSTS.includes(url.hostname.toLowerCase())) return null;
    if (!url.pathname.startsWith(SHORT_URL_PATH_PREFIX)) return null;
    const token = url.pathname.slice(SHORT_URL_PATH_PREFIX.length).replace(/\/$/, '');
    if (!token) return null;
    return { intent: 'short-url', token };
  } catch {
    return null;
  }
}

// ─── Parser ─────────────────────────────────────────────────────────────────

export function parseQrPayload(raw: string | null | undefined): ParseResult {
  if (!raw || typeof raw !== 'string') return { ok: false, reason: 'empty' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };

  const short = tryParseShortUrl(trimmed);
  if (short) return { ok: true, payload: short };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, reason: 'not-json' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'invalid-schema', issues: ['root: must be an object'] };
  }

  const obj = parsed as Record<string, unknown>;

  // Version check first.
  if (!('v' in obj)) {
    return { ok: false, reason: 'invalid-schema', issues: ['v: required; must be 1'] };
  }
  if (obj.v === 0 || typeof obj.v !== 'number') {
    return { ok: false, reason: 'invalid-schema', issues: ['v: must be 1'] };
  }
  if (obj.v !== 1) {
    return { ok: false, reason: 'unsupported-version', version: obj.v };
  }

  const intent = obj.intent;
  if (!isNonEmptyString(intent)) {
    return { ok: false, reason: 'invalid-schema', issues: ['intent: required non-empty string'] };
  }

  const issues: string[] = [];
  let payload: QrPayload | null = null;
  switch (intent) {
    case 'store-visit':
      payload = validateStoreVisit(obj, issues);
      break;
    case 'pay-bill':
      payload = validatePayBill(obj, issues);
      break;
    case 'redeem-deal':
      payload = validateRedeemDeal(obj, issues);
      break;
    case 'redeem-voucher':
      payload = validateRedeemVoucher(obj, issues);
      break;
    case 'claim-stamp':
      payload = validateClaimStamp(obj, issues);
      break;
    case 'event-checkin':
      payload = validateEventCheckin(obj, issues);
      break;
    case 'referral':
      payload = validateReferral(obj, issues);
      break;
    case 'wallet-transfer':
      payload = validateWalletTransfer(obj, issues);
      break;
    default:
      return { ok: false, reason: 'invalid-schema', issues: [`intent: unknown value "${intent}"`] };
  }

  if (!payload) return { ok: false, reason: 'invalid-schema', issues };
  return { ok: true, payload };
}
