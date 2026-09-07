import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";
import { Button } from "@chardb/ui";

import { useResendVerificationEmailMutation } from "../../graphql/email-verification.graphql";

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Heading = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Body = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

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
      console.error("Resend verification failed:", error);
      toast.error("Couldn't send that just now. Try again in a moment.");
    }
  };

  return (
    <Panel>
      <Heading>{heading}</Heading>
      <Body>{children}</Body>
      <Body>
        We sent it to <strong>{email}</strong>.
      </Body>
      <Button
        type="button"
        // Outline, not secondary: secondary renders green, which reads as a
        // confirmation the panel has not earned -- nothing has been sent yet.
        variant="outline"
        loading={loading}
        disabled={loading}
        onClick={onResend}
      >
        {sentOnce ? "Send it again" : "Resend the link"}
      </Button>
    </Panel>
  );
};
