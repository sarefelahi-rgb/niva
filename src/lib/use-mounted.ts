'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * Post-hydration gate without setState-in-effect (ESLint react-hooks v6
 * `set-state-in-effect` compliance). Returns false during SSR and the
 * hydration render, true afterwards — the canonical isHydrated pattern.
 * Used by the landing JSON-LD mount-gates (locale-aware copy must not render
 * during hydration).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
