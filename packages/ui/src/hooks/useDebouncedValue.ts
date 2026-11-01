import { useEffect, useState } from "react";

/**
 * `value`, once it has held still for `ms`: a search box's text, sent to the
 * server only when the typing pauses. Every change starts the wait over.
 */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return settled;
}
