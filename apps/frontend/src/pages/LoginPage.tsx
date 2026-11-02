import React, { useState } from "react";
import { usePageMeta } from "../lib/pageMeta";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Stack } from "@chardb/ui";
import { useAuth } from "../contexts/AuthContext";
import { useHostCommunity } from "../contexts/CommunityHostContext";
import { localPath, returnDestination } from "../lib/communityHost";
import { ResendVerification } from "../components/auth/ResendVerification";
import * as styles from "./AuthPage.css";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const hostCommunity = useHostCommunity();
  usePageMeta({
    title: hostCommunity ? `Sign in to ${hostCommunity.name}` : "Sign In",
  });

  const [isLoading, setIsLoading] = useState(false);
  /**
   * Set when the password was right but the address has never been confirmed.
   * Holds the address rather than a boolean so the resend panel can send to it
   * and show it back -- a typo at signup is the likeliest reason the first
   * email never arrived.
   */
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Where to go once signed in: the return address in the URL, or this host's
   * home page. The address names a host as well as a path, so a link from one
   * host to another's sign-in form still comes back.
   */
  const returnTo =
    returnDestination(new URLSearchParams(location.search)) ??
    (hostCommunity ? "/" : "/dashboard");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setUnverifiedEmail(null);
    try {
      const outcome = await login(data.email, data.password);
      if (outcome === "unverified") {
        setUnverifiedEmail(data.email);
      } else if (outcome === "success") {
        // Another host is a different origin, which the router cannot reach --
        // that one needs a whole-page navigation. Anywhere on this host stays
        // in the router.
        const path = localPath(returnTo);
        if (path !== null) {
          navigate(path, { replace: true });
        } else {
          window.location.replace(returnTo);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Stack gap="lg" className={styles.panel}>
        <Stack as="header" gap="xs" className={styles.header}>
          <h1 className={styles.title}>
            {hostCommunity
              ? `Sign in to ${hostCommunity.name}`
              : "Welcome Back"}
          </h1>
          {hostCommunity && (
            <p className={styles.subtitle}>
              Your CharDB account works in every community.
            </p>
          )}
        </Stack>

        {unverifiedEmail && (
          <ResendVerification
            email={unverifiedEmail}
            heading="Confirm your email address first"
          >
            Your password was right, but this account still needs its address
            confirmed before it can be used.
          </ResendVerification>
        )}

        <Stack as="form" gap="md" noValidate onSubmit={handleSubmit(onSubmit)}>
          <Stack gap="xs">
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              id="email"
              autoComplete="username"
              className={styles.input}
              placeholder="Enter your email"
            />
            <span className={styles.error}>{errors.email?.message}</span>
          </Stack>

          <Stack gap="xs">
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              id="password"
              autoComplete="current-password"
              className={styles.input}
              placeholder="Enter your password"
            />
            <span className={styles.error}>{errors.password?.message}</span>
          </Stack>

          <Button type="submit" busy={isLoading} disabled={isLoading}>
            Sign In
          </Button>
        </Stack>

        <p className={styles.footer}>
          <Link to="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
        </p>

        <p className={styles.footer}>
          Don't have an account?{" "}
          <Link to="/signup" className={styles.link}>
            Sign up here
          </Link>
        </p>
      </Stack>
    </div>
  );
};
