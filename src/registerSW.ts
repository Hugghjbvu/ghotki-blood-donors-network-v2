/**
 * Safe Service Worker Registration for Ghotki Blood Donors Network
 * - Non-blocking: executes after page load with a 1200ms delay
 * - Fully compatible with standard browsers and Android WebViews
 * - Caches static build assets (/assets/ and fonts)
 * - HTML is never cached and page is NEVER reloaded automatically
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;

  // Safe feature detection: check if service workers are supported
  if (!("serviceWorker" in navigator)) {
    return;
  }

  // Only attempt registration on http/https protocols (avoid file:// in raw WebViews)
  const protocol = window.location.protocol;
  if (protocol !== "http:" && protocol !== "https:") {
    return;
  }

  const register = () => {
    try {
      // Build relative path to sw.js based on current base path
      const swUrl = new URL("sw.js", window.location.href).href;

      navigator.serviceWorker
        .register(swUrl, { scope: "./" })
        .then((registration) => {
          // If a new worker is already installed & waiting, tell it to skip waiting
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          // Listen for updatefound event on the registration
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            // Listen for the new worker reaching the "installed" state
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                // Tell the new worker to activate
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });

          // Periodically check for updates if app stays open
          try {
            registration.update().catch(() => {});
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // Safe catch: some Android WebViews restrict Service Workers or fail silently
        });
    } catch {
      // Safe catch for environment restrictions
    }
  };

  // Ensure first render, fonts, and splash screen are 100% unblocked
  if (document.readyState === "complete") {
    setTimeout(register, 1200);
  } else {
    window.addEventListener("load", () => {
      setTimeout(register, 1200);
    });
  }
}
