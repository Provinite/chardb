import React, { useId } from "react";
import { Candy, Ghost } from "lucide-react";
import * as styles from "./HalloweenNavigationSection.css";

export interface HalloweenNavigationSectionProps {
  /** The section's links. */
  children: React.ReactNode;
}

/**
 * The sidebar's Halloween links, under a heading in the event's own night
 * and pumpkin colours, so players find them at a glance while the event is on.
 */
export const HalloweenNavigationSection: React.FC<
  HalloweenNavigationSectionProps
> = ({ children }) => {
  const headingId = useId();
  return (
    <section
      className={styles.section}
      aria-labelledby={headingId}
      data-testid="halloween-navigation"
    >
      <h2 id={headingId} className={styles.heading}>
        <Ghost className={styles.icon} aria-hidden="true" />
        <span className={styles.title}>Halloween</span>
        <Candy className={styles.icon} aria-hidden="true" />
      </h2>
      {children}
    </section>
  );
};
