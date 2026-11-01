import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@chardb/ui";

import { useResendVerificationEmailMutation } from "../../graphql/email-verification.graphql";
import { isRateLimited } from "../../lib/rateLimit";
import * as styles from "./ResendVerification.css";

interface ResendVerificationProps {
  /** The address to send to. Shown back to the reader so a typo is visible. */
  email: string;
  /** Heading line. Differs between "you just signed up" and "you just tried to sign in". */
  heading: string;
  /** The sentence above the button. */
  children: React.ReactNode;
}

/**
 * The "we'll send that link again" panel, shared by the signup and login
 * screens.
 *
 * The success message deliberately says nothing about whether the address has
 * an account, needs confirming, or has used up its allowance. The server
 * refuses all three cases identically and silently -- so an honest message here
 * is a conditional one, and a definite one ("sent!") would be a way to test
 * whether an address is registered.
 */
export const ResendVerification: React.FC<ResendVerificationProps> = ({
  email,
  heading,
  children,
}) => {
  const [resend, { loading }] = useResendVerificationEmailMutation();
  const [sentOnce, setSentOnce] = useState(false);

  const onResend = async () => {
    try {
      await resend({ variables: { input: { email } } });
      setSentOnce(true);
      toast.success(
        "If that address still needs confirming, a new link is on its way.",
      );
    } catch (error) {
      // The error link has already said so.
      if (isRateLimited(error)) return;
      console.error("Resend verification failed:", error);
      toast.error("Couldn't send that just now. Try again in a moment.");
    }
  };

  return (
    <div className={styles.panel}>
      <strong className={styles.heading}>{heading}</strong>
      <p className={styles.body}>{children}</p>
      <p className={styles.body}>
        We sent it to <strong>{email}</strong>.
      </p>
      <Button
        type="button"
        // Outline, not secondary: secondary renders green, which reads as a
        // confirmation the panel has not earned -- nothing has been sent yet.
        tone="outline"
        busy={loading}
        disabled={loading}
        onClick={onResend}
      >
        {sentOnce ? "Send it again" : "Resend the link"}
      </Button>
    </div>
  );
};
