/**
 * The startup screen in `index.html`: the CharDB wordmark, painted with the
 * HTML so the page is never blank while the bundle downloads and the app
 * works out who is signed in. The app calls `dismissBootScreen` once the first
 * page has rendered; it never comes back after that.
 */

export const BOOT_SCREEN_ID = "boot-screen";

const FADE_MS = 300;

let held = false;

/**
 * Keeps the screen up while a page is about to send the browser to another
 * origin: dismissing would flash the shell for a moment before the browser
 * leaves, and the next origin shows its own startup screen.
 */
export const holdBootScreen = (): void => {
  held = true;
};

/** Ends a hold when the page turns out to stay, and dismisses the screen. */
export const releaseBootScreen = (): void => {
  held = false;
  dismissBootScreen();
};

export const dismissBootScreen = (): void => {
  if (held) return;
  const el = document.getElementById(BOOT_SCREEN_ID);
  if (!el || el.dataset.leaving === "true") return;
  el.dataset.leaving = "true";

  // Not faded in yet (its 200ms delay had not passed): nothing to fade out.
  const opacity = parseFloat(getComputedStyle(el).opacity);
  if (!(opacity > 0)) {
    el.remove();
    return;
  }

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  // Pin the current opacity before replacing the fade-in animation, so the
  // fade-out starts where the fade-in left off instead of jumping.
  el.style.animation = "none";
  el.style.opacity = String(opacity);
  void el.offsetHeight;
  el.style.transition = `opacity ${reducedMotion ? 0.01 : FADE_MS}ms ease`;
  el.style.opacity = "0";

  const remove = () => el.remove();
  el.addEventListener("transitionend", remove, { once: true });
  // transitionend does not fire if the page is hidden or the transition is
  // interrupted; the screen must not outlive the app's first page.
  window.setTimeout(remove, FADE_MS + 100);
};
