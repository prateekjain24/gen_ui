import * as React from "react";

export interface StaggeredMountOptions {
  /** Delay applied before the first item animates. Defaults to 0ms. */
  initialDelayMs?: number;
  /** Interval between each item animation. Defaults to 75ms. */
  intervalMs?: number;
  /** When true, skip animation entirely. */
  disabled?: boolean;
  /** Optional key that can be changed to recompute motion preferences (e.g., recipe id). */
  key?: React.DependencyList;
}

export interface StaggeredMountResult {
  /** Resolved animation delays for each index. */
  delays: number[];
  /** Helper to get a delay for an index. */
  getDelay: (index: number) => number;
  /** Helper to build inline style with animation delay for an index. */
  getAnimationStyle: (index: number) => React.CSSProperties | undefined;
  /** Indicates whether motion is enabled after respecting `prefers-reduced-motion`. */
  motionEnabled: boolean;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const subscribeToMotionPreference = (listener: (enabled: boolean) => void): (() => void) | undefined => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const handleChange = () => listener(!mediaQuery.matches);

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }

  if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }

  return undefined;
};

/**
 * Determines animation delays for sequentially mounted items while respecting reduced motion preferences.
 * Useful for staggering field entry when assembling Canvas recipes.
 */
export function useStaggeredMount(count: number, options: StaggeredMountOptions = {}): StaggeredMountResult {
  const { initialDelayMs = 0, intervalMs = 75, disabled = false, key } = options;

  const [motionEnabled, setMotionEnabled] = React.useState(() => !disabled && !prefersReducedMotion());

  React.useEffect(() => {
    if (disabled) {
      setMotionEnabled(false);
      return;
    }

    setMotionEnabled(!prefersReducedMotion());

    const unsubscribe = subscribeToMotionPreference(setMotionEnabled);
    return () => {
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, ...(key ?? [])]);

  const delays = React.useMemo(() => {
    const safeCount = Math.max(0, Math.floor(count));
    if (!motionEnabled || safeCount === 0) {
      return Array(safeCount).fill(0);
    }

    return Array.from({ length: safeCount }, (_, index) => initialDelayMs + index * intervalMs);
  }, [count, initialDelayMs, intervalMs, motionEnabled]);

  const getDelay = React.useCallback((index: number) => delays[index] ?? 0, [delays]);

  const getAnimationStyle = React.useCallback<StaggeredMountResult["getAnimationStyle"]>(
    (index) => {
      if (!motionEnabled) {
        return undefined;
      }
      const delay = getDelay(index);
      return { animationDelay: `${delay}ms` };
    },
    [getDelay, motionEnabled]
  );

  return React.useMemo(
    () => ({
      delays,
      getDelay,
      getAnimationStyle,
      motionEnabled,
    }),
    [delays, getDelay, getAnimationStyle, motionEnabled]
  );
}
