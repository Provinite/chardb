import React from "react";
import { Toaster, toast, type Toast } from "react-hot-toast";
import { X } from "lucide-react";
import { vars } from "@chardb/ui";
import * as styles from "./ThemedToaster.css";

const toneOf = (t: Toast) =>
  t.type === "success" ? "success" : t.type === "error" ? "error" : "neutral";

export const ThemedToaster: React.FC = () => (
  <Toaster
    position="top-right"
    gutter={12}
    // The library positions its container with inline styles, which a class
    // cannot override; this prop is how it takes others. Tokens only.
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
  </Toaster>
);
