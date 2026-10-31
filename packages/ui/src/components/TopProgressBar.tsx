import { forwardRef } from "react";
import { visuallyHidden } from "../styles/visuallyHidden.css";
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
 *
 * Screen readers hear the label once each time the bar appears, from a status
 * region that stays mounted: a live region announces changes to its text, and
 * one that arrives already holding text is often not read at all.
 */
export const TopProgressBar = forwardRef<HTMLDivElement, TopProgressBarProps>(
  function TopProgressBar({ active, label, className }, ref) {
    return (
      <>
        <span role="status" className={visuallyHidden}>
          {active ? label : ""}
        </span>
        {active && (
          <div
            ref={ref}
            role="progressbar"
            aria-label={label}
            className={className ? `${styles.bar} ${className}` : styles.bar}
          >
            <div className={styles.indicator} />
          </div>
        )}
      </>
    );
  },
);
