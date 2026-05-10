/**
 * Safe Router Utilities
 *
 * Wraps expo-router navigation methods with try/catch to prevent
 * navigation errors from crashing the app. Use these helpers in
 * components where navigation targets may be dynamic or user-generated.
 *
 * For static/known routes, using router.push directly is fine.
 */

import { router } from 'expo-router';

/**
 * Navigate to a route (accepts any string path).
 * This is the preferred method for dynamic routes that are constructed at runtime.
 *
 * @param path - Route path, can be a dynamic path like `/product/${id}`
 *
 * @example
 * routerPush(`/products/${productId}`);
 * routerPush('/cart');
 */
export function routerPush(path: string): void {
  router.push(path as any);
}

/**
 * Safely push a new route onto the navigation stack.
 * Logs a warning if navigation fails instead of throwing.
 * @deprecated Use routerPush() for a simpler API without try/catch.
 */
export function safeRouterPush(path: string): void {
  try {
    router.push(path as any);
  } catch (_e) {
    // silently handle
  }
}

/**
 * Navigate to a route using replace (accepts any string path).
 * Replaces the current route without adding to history.
 *
 * @param path - Route path, can be a dynamic path like `/product/${id}`
 *
 * @example
 * routerReplace(`/products/${productId}`);
 * routerReplace('/cart');
 */
export function routerReplace(path: string): void {
  router.replace(path as any);
}

/**
 * Safely replace the current route.
 * Logs a warning if navigation fails instead of throwing.
 * @deprecated Use routerReplace() for a simpler API without try/catch.
 */
export function safeRouterReplace(path: string): void {
  try {
    router.replace(path as any);
  } catch (_e) {
    // silently handle
  }
}

/**
 * Safely go back in the navigation stack.
 * Falls back to pushing the home route if back() fails.
 */
export function safeRouterBack(): void {
  try {
    router.back();
  } catch (e) {
    try {
      router.replace('/' as any);
    } catch (_e2) {
      // silently handle
    }
  }
}

/**
 * Navigate to a route with params object.
 * Useful for typed routes with search params.
 *
 * @param options - Route options with pathname and optional params
 *
 * @example
 * routerNavigate({ pathname: '/product-page', params: { id: '123' } });
 */
export function routerNavigate(options: { pathname: string; params?: Record<string, string> }): void {
  router.push(options as any);
}

/**
 * Safely navigate to a route (push with params object).
 * Useful for typed routes with search params.
 * @deprecated Use routerNavigate() for a simpler API without try/catch.
 */
export function safeRouterNavigate(options: { pathname: string; params?: Record<string, string> }): void {
  try {
    router.push(options as any);
  } catch (_e) {
    // silently handle
  }
}
