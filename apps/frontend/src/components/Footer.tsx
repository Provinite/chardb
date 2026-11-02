import { forwardRef, type ReactNode } from "react";
import * as styles from "./Footer.css";

interface FooterProps {
  /** Links to site pages, supplied by the shell, which owns routing. */
  children?: ReactNode;
}

export const Footer = forwardRef<HTMLElement, FooterProps>(function Footer(
  { children },
  ref,
) {
  const version = import.meta.env.VITE_VERSION || "unknown";

  return (
    <footer ref={ref} className={styles.footer}>
      <p>&copy; 2025 CharDB. A character hosting platform built with ❤️</p>
      {children && (
        <nav aria-label="Site" className={styles.links}>
          {children}
        </nav>
      )}
      <p>Version: {version}</p>
    </footer>
  );
});
