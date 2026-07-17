"use client";

import { useEffect, useState } from "react";

/**
 * useState that mirrors to sessionStorage. Survives page reloads within
 * the same tab. Cleared when the tab closes.
 *
 * Usage:
 *   const [title, setTitle] = useSessionState("create-spend.title", "");
 */
export function useSessionState<T>(
  key: string,
  initial: T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage on mount.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // Ignore parse errors — keep initial value.
    }
    setHydrated(true);
  }, [key]);

  // Mirror to sessionStorage on change (after hydration to avoid stomping).
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or similar — silently ignore.
    }
  }, [hydrated, key, value]);

  return [value, setValue];
}
