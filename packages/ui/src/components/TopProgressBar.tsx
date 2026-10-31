import { forwardRef } from "react";
import * as styles from "./TopProgressBar.css";

export interface TopProgressBarProps {
  /** Whether to show it. The caller applies the loader delay and minimum. */
  active: boolean;
  /** Accessible name: what is loading. */
  label: string;
  className?: string;
}

/**
 * The thin bar along the top of the viewport while the next page loads.
 * Indeterminate, and floating over the page, so nothing moves when it appears.
 */
export const TopProgressBar = forwardRef<HTMLDivElement, TopProgressBarProps>(
  function TopProgressBar({ active, label, className }, ref) {
    if (!active) return null;
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-label={label}
        className={className ? `${styles.bar} ${className}` : styles.bar}
      >
        <div className={styles.indicator} />
      </div>
    );
  },
);
