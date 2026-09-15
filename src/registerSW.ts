// In-memory flag to prevent double reloads within the same page load
let isReloading = false;
let controllerListenerAttached = false;

/**
 * Safe Service Worker Registration for Ghotki Blood Donors Network
 * - Non-blocking: executes after page load
 * - Fully compatible with standard browsers and Android WebViews
 * - Checks for background updates to static build assets
 * - When a new version activates, performs an in-memory guarded reload so every deploy reaches the user immediately
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

  // Listen for controllerchange event on navigator.serviceWorker and reload the page.
  // Uses an in-memory flag (isReloading) to prevent double reload in the same page load,
  // ensuring genuine new deploys always reload cleanly on controller takeover.
  if (!controllerListenerAttached) {
    controllerListenerAttached = true;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isReloading) return;
      isReloading = true;
      window.location.reload();
    });
  }

  const register = () => {
    try {
      // Build relative path to sw.js based on current base path
      const swUrl = new URL("sw.js", window.location.href).href;

      navigator.serviceWorker
        .register(swUrl, { scope: "./" })
        .then((registration) => {
          // If a new worker is already installed & waiting while a controller exists, tell it to activate
          if (registration.waiting && navigator.serviceWorker.controller) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          // Listen for updatefound event on the registration
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            // Listen for the new worker reaching the "installed" state while a controller already exists
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Tell the new worker to activate immediately
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });

          // Check for updates if app stays open
          try {
            registration.update().catch(() => {});
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // Safe catch: some WebViews restrict Service Workers or fail silently
        });
    } catch {
      // Safe catch for environment restrictions
    }
  };

  // Ensure first render, fonts, and splash screen are 100% unblocked
  if (document.readyState === "complete") {
    setTimeout(register, 1000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(register, 1000);
    });
  }
}
