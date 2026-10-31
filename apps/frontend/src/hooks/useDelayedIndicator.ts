import { useEffect, useRef, useState } from "react";
import { timingMs } from "@chardb/ui/theme";

/**
 * Whether a loading indicator for `busy` work should be on screen, following
 * STYLING.md's loader timing: nothing until the work has run for
 * `timing.loader.delay`, so fast work never flashes one, and once shown, at
 * least `timing.loader.minVisible`, so it never blinks on and off.
 */
export const useDelayedIndicator = (busy: boolean): boolean => {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (busy) {
      if (shownAt.current !== null) return;
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, timingMs.loader.delay);
      return () => window.clearTimeout(timer);
    }

    if (shownAt.current === null) return;
    const remaining = shownAt.current + timingMs.loader.minVisible - Date.now();
    const hide = () => {
      shownAt.current = null;
      setVisible(false);
    };
    if (remaining <= 0) {
      hide();
      return;
    }
    const timer = window.setTimeout(hide, remaining);
    return () => window.clearTimeout(timer);
  }, [busy]);

  return visible;
};
