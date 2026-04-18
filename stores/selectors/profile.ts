/**
 * Profile store selectors — 9 imports.
 */

import { useProfileStore } from '../profileStore';

/** Only re-renders when profile data changes */
export const useUserProfile = () => useProfileStore((s) => s.user);
