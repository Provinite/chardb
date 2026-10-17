import { useEffect } from "react";
import { usePageMeta } from "../lib/pageMeta";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import toast from "react-hot-toast";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
`;

const Message = styled.div`
  font-size: 1.125rem;
  color: ${(props) => props.theme.colors.text.secondary};
  text-align: center;
`;

/** How long the result stays on screen before returning to Edit Profile. */
const REDIRECT_DELAY_MS = 2000;

/**
 * Patreon is not a pending-ownership target, so unlike the other provider
 * callbacks there are never claimed characters or items to report.
 *
 * The outcome is read straight off the URL the backend redirected to, so
 * there is nothing to wait for: the page says the result immediately rather
 * than showing a spinner for a step that has already finished.
 */
export function PatreonCallbackPage() {
  usePageMeta({ title: "Connecting Patreon" });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get("error");
  const succeeded = !error && searchParams.get("success") === "true";
  const message = error
    ? `Failed to link Patreon account: ${error}`
    : succeeded
      ? "Successfully linked Patreon account!"
      : "Invalid callback response";

  useEffect(() => {
    // A fixed id, so a re-run of this effect (React's strict-mode double
    // invoke) replaces the toast instead of stacking a second one.
    if (succeeded) {
      toast.success(message, { id: "patreon-link-result" });
    } else {
      toast.error(message, { id: "patreon-link-result" });
    }

    // Cleared on unmount, so someone who navigates away before it fires is
    // not pulled back to Edit Profile from wherever they went.
    const timer = setTimeout(
      () => navigate("/profile/edit"),
      REDIRECT_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [message, succeeded, navigate]);

  return (
    <Container>
      <Message>{message}</Message>
      <Message>Returning to your profile settings...</Message>
    </Container>
  );
}
