import { reducedMotionQuery } from "../css/media";

const behavior = (): ScrollBehavior =>
  window.matchMedia?.(reducedMotionQuery).matches ? "instant" : "smooth";

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
