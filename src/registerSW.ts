/**
 * Safe Service Worker Registration for Ghotki Blood Donors Network
 * - Non-blocking: executes after page load
 * - Fully compatible with standard browsers and Android WebViews
 * - Checks for background updates to static build assets
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
          // Listen for new service worker installations
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New build deployed; will seamlessly activate on next open
                }
              };
            }
          };

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
