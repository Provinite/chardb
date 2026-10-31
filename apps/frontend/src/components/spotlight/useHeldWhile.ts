import { useState } from "react";

/**
 * `value`, except while `hold` is true, when it stays what it last was before
 * the hold began.
 *
 * For results that are briefly wrong while their answer is on its way: the
 * old ones stay on screen instead of flashing to empty and back.
 */
export function useHeldWhile<T>(value: T, hold: boolean): T {
  const [held, setHeld] = useState(value);
  // Adjusting state during render, as React documents for values derived from
  // props: it re-renders before anything is painted.
  if (!hold && held !== value) setHeld(value);
  return hold ? held : value;
}
