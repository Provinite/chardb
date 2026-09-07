import React, { useEffect, useRef, useState } from "react";
import { usePageMeta } from "../lib/pageMeta";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { Button } from "@chardb/ui";
import { ApolloError } from "@apollo/client";

import { useVerifyEmailMutation } from "../graphql/email-verification.graphql";

const Container = styled.div`
  max-width: 400px;
  margin: 2rem auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Description = styled.p`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SuccessMessage = styled.div`
  background: ${({ theme }) => theme.colors.success}20;
  border: 1px solid ${({ theme }) => theme.colors.success};
  color: ${({ theme }) => theme.colors.success};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ErrorBox = styled.div`
  background: ${({ theme }) => theme.colors.error}20;
  border: 1px solid ${({ theme }) => theme.colors.error};
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Footer = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const BackLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

type Status = "verifying" | "success" | "error";

const errorMessage = (error: unknown): string => {
  if (error instanceof ApolloError && error.graphQLErrors[0]?.message) {
    return error.graphQLErrors[0].message;
  }
  return "We couldn't confirm that link.";
};

/**
 * The landing page for the link in a verification email.
 *
 * Redeems on mount rather than behind a button. The token is single-use and
 * already sitting in the URL, so a button would only add a step; the
 * already-confirmed case is treated as success by the server precisely so that
 * a mail client or link scanner spending the token first does not turn this
 * into a failure for the person who then clicks it.
 */
export const VerifyEmailPage: React.FC = () => {
  usePageMeta({ title: "Confirm Your Email" });

  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [verifyEmail] = useVerifyEmailMutation();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string | null>(null);

  // Strict mode mounts effects twice in development. Without this the second
  // pass sends the token again -- harmless, because redeeming an already
  // confirmed account succeeds, but it makes the network log lie about what
  // one click does.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setStatus("error");
      setMessage("That link is missing its confirmation code.");
      return;
    }

    void (async () => {
      try {
        await verifyEmail({ variables: { input: { token } } });
        setStatus("success");
      } catch (error) {
        setStatus("error");
        setMessage(errorMessage(error));
      }
    })();
  }, [token, verifyEmail]);

  if (status === "verifying") {
    return (
      <Container>
        <Card>
          <Title>Confirming…</Title>
          <Description>One moment.</Description>
        </Card>
      </Container>
    );
  }

  if (status === "success") {
    return (
      <Container>
        <Card>
          <Title>Email Confirmed</Title>
          <SuccessMessage>
            That's done — your address is confirmed and the account is ready.
          </SuccessMessage>
          <Button type="button" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Title>Link Didn't Work</Title>
        <ErrorBox>{message}</ErrorBox>
        <Description>
          Expired links are normal — they only last a day. Try signing in and
          we'll offer to send a fresh one.
        </Description>
        <Footer>
          <BackLink to="/login">Back to sign in</BackLink>
        </Footer>
      </Card>
    </Container>
  );
};
