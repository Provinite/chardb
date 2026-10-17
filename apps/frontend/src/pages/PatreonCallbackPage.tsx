import { useEffect, useRef } from "react";
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

const Spinner = styled.div`
  border: 3px solid ${(props) => props.theme.colors.border};
  border-top-color: ${(props) => props.theme.colors.primary};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/**
 * Patreon is not a pending-ownership target, so unlike the other provider
 * callbacks there are never claimed characters or items to report.
 */
export function PatreonCallbackPage() {
  usePageMeta({ title: "Connecting Patreon" });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const error = searchParams.get("error");

    if (error) {
      toast.error(`Failed to link Patreon account: ${error}`);
    } else if (searchParams.get("success")) {
      toast.success("Successfully linked Patreon account!");
    } else {
      toast.error("Invalid callback response");
    }
    setTimeout(() => navigate("/profile/edit"), 2000);
  }, [searchParams, navigate]);

  return (
    <Container>
      <Spinner />
      <Message>Completing account linking...</Message>
    </Container>
  );
}
