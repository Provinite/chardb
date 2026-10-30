import { reducedMotionQuery } from "../css/media";

// "auto" rather than "instant", which older engines reject: under reduced
// motion the theme sets `scroll-behavior: auto`, so "auto" jumps.
const behavior = (): ScrollBehavior =>
  window.matchMedia?.(reducedMotionQuery).matches ? "auto" : "smooth";

/** `scrollIntoView`, smooth unless the user prefers reduced motion. */
export const scrollToElement = (
  el: Element,
  options: Omit<ScrollIntoViewOptions, "behavior"> = {},
) => el.scrollIntoView({ ...options, behavior: behavior() });

/** `scrollTo` on the window or `el`, smooth unless the user prefers reduced motion. */
export const scrollToPosition = (
  position: Omit<ScrollToOptions, "behavior">,
  el: Element | Window = window,
) => el.scrollTo({ ...position, behavior: behavior() });
