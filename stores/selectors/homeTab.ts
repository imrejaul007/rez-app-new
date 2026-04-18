/**
 * Home tab store selectors — 5 imports.
 */

import { useHomeTabStore } from '../homeTabStore';

/** Only re-renders when active tab changes */
export const useActiveTab = () => useHomeTabStore((s) => s.activeTab);

/** Stable function — never re-renders */
export const useSetActiveTab = () => useHomeTabStore((s) => s.setActiveTab);

/** Derived booleans */
export const useIsPriveActive = () => useHomeTabStore((s) => s.isPriveActive);
export const useIsMallActive = () => useHomeTabStore((s) => s.isMallActive);

/** Only re-renders when prive eligibility changes */
export const usePriveEligibility = () => useHomeTabStore((s) => s.priveEligibility);

/** Only re-renders when prive eligible status changes */
export const useIsPriveEligible = () => useHomeTabStore((s) => s.isPriveEligible);

/** Legacy tab ID — only re-renders when active tab changes */
export const useActiveHomeTab = () => useHomeTabStore((s) => s.activeHomeTab);

/** Stable function — never re-renders */
export const useSetActiveHomeTab = () => useHomeTabStore((s) => s.setActiveHomeTab);

/** Stable function — never re-renders */
export const useRegisterScrollToTop = () => useHomeTabStore((s) => s.registerScrollToTop);
