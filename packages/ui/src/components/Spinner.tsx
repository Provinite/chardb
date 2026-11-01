import * as styles from "./Spinner.css";

export interface SpinnerProps {
  className?: string;
}

/**
 * A spinner for inside a control: a button or an input's end slot, never on
 * its own in an empty section, which gets a skeleton instead. Hidden from
 * screen readers; the control says it is busy with `aria-busy`.
 */
export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={className ? `${styles.spinner} ${className}` : styles.spinner}
    />
  );
}
