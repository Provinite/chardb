import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toaster, toast, type Toast } from "react-hot-toast";
import { X } from "lucide-react";
import { INERT_EXEMPT, vars } from "@chardb/ui";
import * as styles from "./ThemedToaster.css";

const toneOf = (t: Toast) =>
  t.type === "success" ? "success" : t.type === "error" ? "error" : "neutral";

/**
 * The toasts, in their own child of `<body>` that an open dialog leaves out
 * of `inert`, so a toast shown over a dialog can still be clicked and
 * focused, and is still announced.
 */
export const ThemedToaster: React.FC = () => {
  const [host] = useState(() => {
    const el = document.createElement("div");
    el.setAttribute(INERT_EXEMPT, "");
    return el;
  });
  useLayoutEffect(() => {
    document.body.append(host);
    return () => host.remove();
  }, [host]);

  return createPortal(
    <Toaster
      position="top-right"
      gutter={12}
      // The library positions its container with inline styles, which a
      // class cannot override; this prop is how it takes others. Tokens only.
      containerStyle={{
        top: vars.space.lg,
        right: vars.space.lg,
        zIndex: vars.layer.toast.base,
      }}
      toastOptions={{
        duration: 4000,
        success: { duration: 3500 },
        error: { duration: 6000 },
      }}
    >
      {(t) => (
        <div className={styles.slide} data-visible={t.visible}>
          <div className={styles.toast({ tone: toneOf(t) })}>
            <div className={styles.message}>
              {typeof t.message === "function" ? t.message(t) : t.message}
            </div>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => toast.dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </Toaster>,
    host,
  );
};
