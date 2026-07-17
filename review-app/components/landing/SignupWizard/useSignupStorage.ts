import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEY, DEFAULT_SIGNUP_DATA } from "./constants";
import type { SignupData } from "./constants";

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour — clear stale signup data

export function useSignupStorage() {
  const [cachedData, setCachedData] = useState<SignupData>(DEFAULT_SIGNUP_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clear if older than 1 hour or if back at step 1 with stale email data
        const savedAt: number = parsed._savedAt || 0;
        const isExpired = Date.now() - savedAt > SESSION_TTL_MS;
        const isStaleStep1 = !parsed.currentStep || parsed.currentStep === "1";
        if (isExpired || isStaleStep1) {
          localStorage.removeItem(STORAGE_KEY);
          // Don't restore — start fresh
        } else {
          setCachedData({ ...DEFAULT_SIGNUP_DATA, ...parsed });
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoaded(true);
  }, []);

  const updateData = useCallback(
    (updates: Partial<SignupData>) => {
      const updated = { ...cachedData, ...updates, _savedAt: Date.now() };
      setCachedData(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    [cachedData]
  );

  const clearData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCachedData(DEFAULT_SIGNUP_DATA);
  }, []);

  return {
    cachedData,
    isLoaded,
    updateData,
    clearData,
  };
}
