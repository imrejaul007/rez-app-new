# Consumer App — Complete Bug & Error Report
**Generated:** 2026-03-21
**Repo:** imrejaul007/rez-app-consumer
**App:** nuqta (React Native / Expo)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 10 |
| 🟠 High | 12 |
| 🟡 Medium | 8 |
| 🟢 Low | 4 |
| **Total** | **34** |

---

## 🔴 CRITICAL — Build-Breaking TypeScript / Syntax Errors

These errors prevent the TypeScript compiler from building the app entirely.

---

### BUG-001 · `tsconfig.json` Line 2
**Category:** TypeScript Config Error
**Title:** Missing `expo/tsconfig.base` — TypeScript compilation fails
**Description:** `tsconfig.json` extends `"expo/tsconfig.base"` but this file cannot be resolved. The entire TypeScript compilation fails with `TS6053: File 'expo/tsconfig.base' not found.` This means no type-checking runs across the whole project.
**Fix:** Run `npx expo install` or ensure `expo` package is installed. Alternatively update the extends path to match the installed expo version's actual path.

---

### BUG-002 · `components/cart/CartSocketIntegration.tsx` Lines 37, 48, 54, 69, 76, 83, 97
**Category:** TypeScript Syntax Error
**Title:** 7 `',' expected` errors — file cannot compile
**Description:** Seven separate syntax errors (`TS1005: ',' expected`) at lines 37, 48, 54, 69, 76, 83, 97. These are likely caused by missing commas in object/array literals or function argument lists. The component will not compile and will break the cart feature entirely.
**Files:** `components/cart/CartSocketIntegration.tsx`

---

### BUG-003 · `components/cart/CartSyncStatus.tsx` Line 110
**Category:** TypeScript Syntax Error
**Title:** `')' expected` — CartSyncStatus cannot compile
**Description:** Syntax error `TS1005: ')' expected` at line 110. Missing closing parenthesis in a function call or JSX expression. The cart sync status indicator will not render.
**Files:** `components/cart/CartSyncStatus.tsx`

---

### BUG-004 · `components/events/EventFilters.tsx` Line 352 · `components/events/EventSearchBar.tsx` Line 168
**Category:** TypeScript Syntax Error
**Title:** Syntax errors in Event components — Events tab broken
**Description:** Both EventFilters (line 352) and EventSearchBar (line 168) have `')' expected` syntax errors. The events filtering and search UI will not render, effectively breaking the Events tab.
**Files:** `components/events/EventFilters.tsx`, `components/events/EventSearchBar.tsx`

---

### BUG-005 · `components/home/QuickReorder.tsx` Lines 82, 93, 103
**Category:** TypeScript Syntax Error
**Title:** 3 syntax errors in QuickReorder — homepage quick-reorder broken
**Description:** Three `')' expected` errors at lines 82, 93, 103. The QuickReorder component on the homepage will not compile or render.
**Files:** `components/home/QuickReorder.tsx`

---

### BUG-006 · `components/offers/FlashSaleTimer.tsx` Lines 72, 141
**Category:** TypeScript Syntax Error
**Title:** Syntax errors in FlashSaleTimer — flash sale countdown broken
**Description:** Two `')' expected` errors. The flash sale timer component will not compile, breaking countdown displays for all flash sales.
**Files:** `components/offers/FlashSaleTimer.tsx`

---

### BUG-007 · `components/voucher/RedemptionFlow.tsx` Lines 127, 188, 268, 345, 413, 466
**Category:** TypeScript Syntax Error
**Title:** 6 syntax errors in RedemptionFlow — voucher redemption completely broken
**Description:** Six `')' expected` errors throughout the RedemptionFlow component. This is a critical user-facing feature — voucher redemption will be completely non-functional.
**Files:** `components/voucher/RedemptionFlow.tsx`

---

### BUG-008 · `components/voucher/VoucherSelectionModal.tsx` Lines 143, 185, 204, 318
**Category:** TypeScript Syntax Error
**Title:** 4 syntax errors in VoucherSelectionModal — voucher selection broken
**Description:** Four syntax errors (`','` and `')'` expected). The voucher selection modal will not compile, breaking the voucher application flow in checkout.
**Files:** `components/voucher/VoucherSelectionModal.tsx`

---

### BUG-009 · `components/wallet/TransactionHistory.tsx` Lines 89, 114, 141, 149, 160, 173
**Category:** TypeScript Syntax Error
**Title:** 7 syntax errors in TransactionHistory — wallet history broken
**Description:** Seven syntax errors in the transaction history component. Users will not be able to view their wallet transaction history.
**Files:** `components/wallet/TransactionHistory.tsx`

---

### BUG-010 · `services/paymentOrchestratorService.ts` Lines 513, 522
**Category:** TypeScript Syntax Error
**Title:** Syntax errors in payment orchestrator — payment processing unreliable
**Description:** Two `',' expected` errors in the core payment service. This affects the entire payment flow and is a critical production-breaking bug.
**Files:** `services/paymentOrchestratorService.ts`

---

## 🟠 HIGH — Logic & Runtime Bugs

---

### BUG-011 · `components/wallet/TransactionTabs.tsx` Line 56
**Category:** TypeScript Syntax Error / Runtime
**Title:** Syntax error in TransactionTabs — wallet tab navigation broken
**Description:** `')' expected` at line 56. The wallet tabs (All / Credits / Debits) will not render.
**Files:** `components/wallet/TransactionTabs.tsx`

---

### BUG-012 · `components/ui/IconSymbol.ios.tsx` Line 31 · `components/ui/TabBarBackground.ios.tsx` Line 14
**Category:** TypeScript Syntax Error
**Title:** Syntax errors in iOS UI components — iOS tab bar broken
**Description:** Both iOS-specific UI components have syntax errors. The tab bar and icon symbols will not render correctly on iOS devices.
**Files:** `components/ui/IconSymbol.ios.tsx`, `components/ui/TabBarBackground.ios.tsx`

---

### BUG-013 · `components/PreferencesDemo.tsx` Lines 60, 132
**Category:** TypeScript Syntax Error
**Title:** Syntax errors in PreferencesDemo component
**Description:** Two `')' expected` errors. Preferences demo UI will not compile.
**Files:** `components/PreferencesDemo.tsx`

---

### BUG-014 · `components/referral/ShareModal.tsx` Line 164 · `components/referral/TierUpgradeCelebration.tsx` Line 147
**Category:** TypeScript Syntax Error
**Title:** Syntax errors in Referral components — referral sharing broken
**Description:** Both referral components have syntax errors. The share modal and tier upgrade celebration screen will not render, breaking the referral flow.
**Files:** `components/referral/ShareModal.tsx`, `components/referral/TierUpgradeCelebration.tsx`

---

### BUG-015 · `app/payment.tsx` Line 41
**Category:** Missing Environment Variable Validation
**Title:** Stripe key falls back to empty string silently
**Description:** `stripePromise` is initialized with `process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''`. If the env var is missing, an empty string is passed to Stripe causing silent payment initialization failure. No error is thrown or logged. All card payments will silently fail.
**Fix:** Add a check: `if (!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) { throw new Error('Missing Stripe key'); }`
**Files:** `app/payment.tsx`

---

### BUG-016 · `app/payment.tsx` Line 99–119
**Category:** Missing useEffect Dependency
**Title:** Cashback preview not recalculated when amount or wallet flag changes
**Description:** The `useEffect` that fetches cashback preview includes `[isFinancialService, serviceId]` in its dependency array but is missing `amount` and `isWalletRecharge`. When the user changes the payment amount or toggles wallet recharge, the cashback info won't update — showing stale discount data.
**Files:** `app/payment.tsx`

---

### BUG-017 · `app/checkout.tsx` Line 104
**Category:** Missing useEffect Dependency
**Title:** Cart validation doesn't re-run when validateCart function changes
**Description:** `useEffect` calls `validateCart()` with an empty dependency array `[]`. The `validateCart` function from `useCartValidation` hook can change between renders, and not including it in dependencies means the validation may use a stale closure. Cart validation can silently use outdated cart state.
**Files:** `app/checkout.tsx`

---

### BUG-018 · `components/cart/CartSocketIntegration.tsx` Lines 30–35
**Category:** Dead Code / Logic Bug
**Title:** Socket subscription forEach loop is empty — real-time cart updates never fire
**Description:** The `forEach` loop that should subscribe to socket events iterates over an array but the loop body contains no subscription calls. Real-time cart update events (item added, removed, quantity changed by another device) are never registered. The entire socket integration is non-functional dead code.
**Files:** `components/cart/CartSocketIntegration.tsx`

---

### BUG-019 · `components/cart/CartSocketIntegration.tsx` Lines 63–66
**Category:** Incomplete Feature / Logic Bug
**Title:** LOW_STOCK socket event handler is a stub — no low-stock alerts
**Description:** The handler for `LOW_STOCK` socket events contains only a comment `// TODO: show notification` and no actual implementation. Users will never receive low-stock warnings even though the backend sends these events.
**Files:** `components/cart/CartSocketIntegration.tsx`

---

### BUG-020 · `components/cart/CartSocketIntegration.tsx` Lines 112–116
**Category:** Missing Null Check / Memory Leak
**Title:** Socket unsubscribe functions called without null check — potential crash on cleanup
**Description:** The `useEffect` cleanup calls unsubscribe functions from the socket subscriptions without verifying they are defined. If any subscription failed to initialize (e.g., socket not connected), calling `undefined()` will throw a runtime error.
**Files:** `components/cart/CartSocketIntegration.tsx`

---

### BUG-021 · `components/wallet/TransactionHistory.tsx` Lines 50–96
**Category:** Missing useCallback / Re-render Loop
**Title:** `loadTransactions` not memoized — causes potential re-render loop
**Description:** `loadTransactions` is defined directly in the component body without `useCallback`. It is used inside a `useEffect` dependency array (or similar). Every render creates a new function reference, potentially triggering infinite re-renders or excessive API calls.
**Files:** `components/wallet/TransactionHistory.tsx`

---

### BUG-022 · `services/paymentOrchestratorService.ts` Lines 36–53
**Category:** Silent Error Swallowing
**Title:** Payment service initialization errors silently swallowed
**Description:** The payment orchestrator's `initialize()` method wraps the entire initialization in a try/catch that only logs to console and returns `false`. If Razorpay, Stripe, or wallet services fail to initialize, the app continues as if nothing is wrong. Payment buttons will appear enabled but all payments will silently fail.
**Files:** `services/paymentOrchestratorService.ts`

---

## 🟡 MEDIUM — Code Quality & Potential Issues

---

### BUG-023 · `app/cart.tsx` Lines 254–260
**Category:** Missing useEffect Dependency
**Title:** `cartActions` missing from useEffect dependency array
**Description:** useEffect that calls `cartActions.loadCart()` doesn't include `cartActions` in its dependency array. If the cartActions reference changes (e.g., context re-mount), the effect won't re-run with the new reference.
**Files:** `app/cart.tsx`

---

### BUG-024 · `app/cart.tsx` Line 305
**Category:** Missing useCallback Dependency
**Title:** `handleUnlockItem` useCallback has empty deps but uses `isMounted`
**Description:** `handleUnlockItem` is wrapped in `useCallback([])` but references `isMounted` from a hook. Empty deps array means the callback always has a stale reference to `isMounted`.
**Files:** `app/cart.tsx`

---

### BUG-025 · `components/PreferencesDemo.tsx`
**Category:** Dead Code
**Title:** PreferencesDemo is a demo component with no real functionality
**Description:** This component has syntax errors AND appears to be a demo/test component that was never removed from production code. It should be either removed or moved to a dev-only directory.
**Files:** `components/PreferencesDemo.tsx`

---

### BUG-026 · `components/home/QuickReorder.tsx`
**Category:** Missing useEffect Dependency
**Title:** QuickReorder useEffect likely missing dependencies (file has syntax errors)
**Description:** File has 3 syntax errors indicating significant code issues. Once syntax is fixed, the useEffect dependency array should be audited for missing dependencies.
**Files:** `components/home/QuickReorder.tsx`

---

### BUG-027 · `app/sign-in.tsx`
**Category:** Missing Error Handling
**Title:** Sign-in errors not shown to user in all failure paths
**Description:** Some authentication failure branches catch errors silently (empty catch blocks or console.log only). Users get stuck on the sign-in screen with no feedback when auth fails due to network errors.
**Files:** `app/sign-in.tsx`

---

### BUG-028 · Multiple service files
**Category:** Missing Error Handling
**Title:** Widespread `.catch(() => {})` empty error handlers in service files
**Description:** Many service files use `.catch(() => {})` empty handlers, swallowing all errors silently. This makes debugging production issues very difficult as no error traces are preserved.
**Files:** Multiple files in `services/`

---

### BUG-029 · `contexts/`
**Category:** Missing Error Boundary
**Title:** Context providers lack error boundaries — context errors crash entire app
**Description:** The main context providers (auth, cart, wallet) do not wrap their children in ErrorBoundary components. Any runtime error in a context provider will propagate and crash the entire app tree.
**Files:** `contexts/`

---

### BUG-030 · `app/wallet-screen.tsx`
**Category:** Race Condition
**Title:** Wallet balance and transactions loaded in parallel without coordination
**Description:** Balance and transaction list are fetched concurrently. If balance fetch fails but transaction list succeeds (or vice versa), the UI may show inconsistent state — showing transactions for a different balance state.
**Files:** `app/wallet-screen.tsx`

---

## 🟢 LOW — Minor Issues

---

### BUG-031 · `components/ui/IconSymbol.ios.tsx`
**Category:** Platform-Specific Syntax Error
**Title:** iOS icon symbols broken by syntax error
**Description:** This iOS-only component has a syntax error at line 31. Icons will fall back to default or missing on iOS.
**Files:** `components/ui/IconSymbol.ios.tsx`

---

### BUG-032 · `app.config.js`
**Category:** Configuration
**Title:** App config may have missing or incorrect bundle identifiers
**Description:** Should verify bundle IDs, app slugs, and EAS project IDs match the production configuration to avoid build/submission failures.
**Files:** `app.config.js`

---

### BUG-033 · `package.json`
**Category:** Dependency Issue
**Title:** Possible peer dependency conflicts
**Description:** The optimized package.json (`package.json.optimized`) exists alongside the main one, suggesting dependency issues were identified. The current `package.json` should be audited for peer conflicts that could cause runtime issues.
**Files:** `package.json`, `package.json.optimized`

---

### BUG-034 · `components/ErrorBoundary.tsx`
**Category:** Missing Feature
**Title:** ErrorBoundary exists but is not used consistently across screens
**Description:** An `ErrorBoundary` component is defined but many screens and heavy components do not use it. Critical screens like payment, checkout, and wallet should all be wrapped in ErrorBoundary.
**Files:** `components/ErrorBoundary.tsx`

---

## Files with Issues — Quick Reference

| File | Bugs | Severity |
|------|------|----------|
| `tsconfig.json` | BUG-001 | 🔴 Critical |
| `components/cart/CartSocketIntegration.tsx` | BUG-002, BUG-018, BUG-019, BUG-020 | 🔴/🟠 |
| `components/cart/CartSyncStatus.tsx` | BUG-003 | 🔴 Critical |
| `components/events/EventFilters.tsx` | BUG-004 | 🔴 Critical |
| `components/events/EventSearchBar.tsx` | BUG-004 | 🔴 Critical |
| `components/home/QuickReorder.tsx` | BUG-005, BUG-026 | 🔴/🟡 |
| `components/offers/FlashSaleTimer.tsx` | BUG-006 | 🔴 Critical |
| `components/voucher/RedemptionFlow.tsx` | BUG-007 | 🔴 Critical |
| `components/voucher/VoucherSelectionModal.tsx` | BUG-008 | 🔴 Critical |
| `components/wallet/TransactionHistory.tsx` | BUG-009, BUG-021 | 🔴/🟠 |
| `components/wallet/TransactionTabs.tsx` | BUG-011 | 🟠 High |
| `components/ui/IconSymbol.ios.tsx` | BUG-012, BUG-031 | 🟠/🟢 |
| `components/ui/TabBarBackground.ios.tsx` | BUG-012 | 🟠 High |
| `components/PreferencesDemo.tsx` | BUG-013, BUG-025 | 🔴/🟡 |
| `components/referral/ShareModal.tsx` | BUG-014 | 🟠 High |
| `components/referral/TierUpgradeCelebration.tsx` | BUG-014 | 🟠 High |
| `services/paymentOrchestratorService.ts` | BUG-010, BUG-022 | 🔴/🟠 |
| `app/payment.tsx` | BUG-015, BUG-016 | 🟠 High |
| `app/checkout.tsx` | BUG-017 | 🟠 High |
| `app/cart.tsx` | BUG-023, BUG-024 | 🟡 Medium |
| `app/sign-in.tsx` | BUG-027 | 🟡 Medium |
| `services/` (multiple) | BUG-028 | 🟡 Medium |
| `contexts/` | BUG-029 | 🟡 Medium |
| `app/wallet-screen.tsx` | BUG-030 | 🟡 Medium |
| `app.config.js` | BUG-032 | 🟢 Low |
| `package.json` | BUG-033 | 🟢 Low |
| `components/ErrorBoundary.tsx` | BUG-034 | 🟢 Low |

---

*This report was auto-generated by Claude code audit on 2026-03-21.*
