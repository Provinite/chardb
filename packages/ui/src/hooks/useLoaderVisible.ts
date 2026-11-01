import { useEffect, useRef, useState } from "react";
import { timingMs } from "../theme/tokens";

/**
 * Whether a loading indicator for `busy` work should be on screen.
 *
 * It appears only once the work has run `timing.loader.delay`, so a fast
 * response never flashes one, and once shown it stays at least
 * `timing.loader.minVisible`, so it never blinks. Work that starts again
 * while it is held keeps it up without a second delay.
 */
export function useLoaderVisible(busy: boolean): boolean {
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);
  const shownAt = useRef(0);

  useEffect(() => {
    const set = (value: boolean) => {
      shownRef.current = value;
      setShown(value);
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (busy) {
      if (!shownRef.current) {
        timer = setTimeout(() => {
          shownAt.current = Date.now();
          set(true);
        }, timingMs.loader.delay);
      }
    } else if (shownRef.current) {
      const remaining =
        timingMs.loader.minVisible - (Date.now() - shownAt.current);
      if (remaining <= 0) set(false);
      else timer = setTimeout(() => set(false), remaining);
    }
    return () => clearTimeout(timer);
  }, [busy]);

  return shown;
}
