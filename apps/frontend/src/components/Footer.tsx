import { forwardRef } from "react";
import * as styles from "./Footer.css";

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  const version = import.meta.env.VITE_VERSION || "unknown";

  return (
    <footer ref={ref} className={styles.footer}>
      <p>&copy; 2025 CharDB. A character hosting platform built with ❤️</p>
      <p>Version: {version}</p>
    </footer>
  );
});
