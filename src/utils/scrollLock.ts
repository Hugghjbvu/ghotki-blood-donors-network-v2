import { useEffect } from "react";

let activeLocks = 0;
let savedScrollY = 0;

/**
 * Locks background scrolling on document.body while preserving the exact scroll position.
 * Uses a reference counter so nested or sequential modals do not drop the lock prematurely
 * or leave it on. Returns an idempotent cleanup/release function.
 */
export function acquireScrollLock(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) {
    return () => {};
  }

  if (activeLocks === 0) {
    savedScrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    document.body.style.overflow = "hidden";
  }

  activeLocks++;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.body.style.overflow = "";
      document.body.style.removeProperty("overflow");
      if (savedScrollY > 0) {
        window.scrollTo({
          top: savedScrollY,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
      }
    }
  };
}

/**
 * Forcibly removes all body scroll locks and restores scrolling.
 */
export function forceReleaseAllScrollLocks(): void {
  activeLocks = 0;
  if (typeof document !== "undefined" && document.body) {
    document.body.style.overflow = "";
    document.body.style.removeProperty("overflow");
  }
}

/**
 * Gets the current count of active scroll locks.
 */
export function getActiveScrollLockCount(): number {
  return activeLocks;
}

/**
 * React hook to lock body scrolling when `isLocked` is true.
 * Handles sequential/nested modals with reference counting.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    const release = acquireScrollLock();
    return () => {
      release();
    };
  }, [isLocked]);
}
