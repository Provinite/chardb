import React, { useState, useEffect, useMemo } from "react";
import { usePageMeta } from "../lib/pageMeta";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Cluster, Stack } from "@chardb/ui";
import { useAuth } from "../contexts/AuthContext";
import { useCommunityHost } from "../contexts/CommunityHostContext";
import { useInviteCodeByIdQuery } from "../graphql/inviteCodes.graphql";
import { useCommunityBySlugQuery } from "../generated/graphql";
import { returnQuery } from "../lib/communityHost";
import { ResendVerification } from "../components/auth/ResendVerification";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import * as styles from "./AuthPage.css";

const inviteCodeField = z
  .string()
  .min(1, "Invite code is required")
  .max(50, "Invite code must be less than 50 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Invite code can only contain letters, numbers, underscores, and hyphens",
  );

/** No code is asked for when joining a community with open sign-up. */
const makeSignupSchema = (codeRequired: boolean) =>
  z
    .object({
      inviteCode: codeRequired ? inviteCodeField : inviteCodeField.optional(),
      username: z
        .string()
        .min(2, "Username must be at least 2 characters")
        .max(30, "Username must be less than 30 characters")
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          "Username can only contain letters, numbers, underscores, and hyphens",
        ),
      email: z.string().email("Please enter a valid email"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password must be less than 100 characters"),
      confirmPassword: z.string(),
      displayName: z
        .string()
        .max(100, "Display name must be less than 100 characters")
        .optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

type SignupForm = z.infer<ReturnType<typeof makeSignupSchema>>;

export const SignupPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  /** Set once the account exists. Swaps the form for the "check your email" card. */
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const { community: hostCommunity, slug: hostSlug } = useCommunityHost();

  // The community being joined is the host's own. An invite link wins over
  // it, so the code it carries is still asked for and used.
  const inviteParam = searchParams.get("invite");
  const community = inviteParam ? null : hostCommunity;

  // Whether sign-up is open comes from a fresh read, not the host's record:
  // that can be the copy remembered from an earlier visit, from before staff
  // opened or closed sign-up.
  const {
    data: freshData,
    loading: freshLoading,
    error: freshError,
  } = useCommunityBySlugQuery({
    variables: { slug: hostSlug ?? "" },
    skip: !community || !hostSlug,
    fetchPolicy: "network-only",
  });
  // A failed read means "unknown", not "invite-only": fall back to the host's
  // own record rather than demand a code an open community does not need.
  const fresh = community
    ? (freshData?.communityBySlug ?? (freshError ? community : null))
    : null;
  const openCommunity = fresh?.openSignupRoleId ? fresh : null;
  // Until the fresh read lands, the form is a placeholder: no field can
  // appear above the others once it does.
  const awaitingCommunity = Boolean(community) && freshLoading;
  const askForCode = !openCommunity && !awaitingCommunity;

  usePageMeta({ title: community ? `Join ${community.name}` : "Sign Up" });

  const schema = useMemo(() => makeSignupSchema(askForCode), [askForCode]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(schema),
  });

  const inviteCode = watch("inviteCode");

  // Auto-populate invite code from URL parameter (run once on mount)
  useEffect(() => {
    if (inviteParam) {
      setValue("inviteCode", inviteParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to join community page if already logged in with invite code
  useEffect(() => {
    if (user && inviteParam) {
      navigate(`/join-community?invite=${inviteParam}`);
    }
  }, [user, inviteParam, navigate]);

  // Signed in already: the community's own page has the Join button.
  useEffect(() => {
    if (user && community) {
      navigate("/", { replace: true });
    }
  }, [user, community, navigate]);

  // Query to validate invite code
  const {
    data: inviteCodeData,
    loading: inviteCodeLoading,
    error: inviteCodeError,
  } = useInviteCodeByIdQuery({
    variables: { id: inviteCode || "" },
    skip: !inviteCode || inviteCode.length < 2,
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      const success = await signup(
        data.username,
        data.email,
        data.password,
        data.displayName,
        askForCode ? data.inviteCode : undefined,
        askForCode ? undefined : openCommunity?.id,
      );
      if (success) {
        // Not the dashboard: signup no longer produces a session. The account
        // exists, and stays unusable until somebody follows the link now
        // sitting in that inbox.
        setRegisteredEmail(data.email);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInviteCodeValidation = () => {
    if (!inviteCode || inviteCode.length < 2) return null;

    if (inviteCodeLoading) {
      return (
        <Cluster gap="xs" className={styles.validation.loading}>
          <AlertTriangle size={16} aria-hidden />
          Checking invite code...
        </Cluster>
      );
    }

    if (inviteCodeError || !inviteCodeData?.inviteCodeById) {
      return (
        <Cluster gap="xs" className={styles.validation.invalid}>
          <XCircle size={16} aria-hidden />
          Invalid invite code
        </Cluster>
      );
    }

    const code = inviteCodeData.inviteCodeById;
    if (!code.isAvailable) {
      return (
        <Cluster gap="xs" className={styles.validation.invalid}>
          <XCircle size={16} aria-hidden />
          This invite code has been exhausted
        </Cluster>
      );
    }

    return (
      <Cluster gap="xs" className={styles.validation.valid}>
        <CheckCircle size={16} aria-hidden />
        Valid invite code ({code.remainingClaims} uses remaining)
      </Cluster>
    );
  };

  if (registeredEmail) {
    return (
      <div className={styles.page}>
        <Stack gap="lg" className={styles.panel}>
          <h1 className={`${styles.header} ${styles.title}`}>
            Check your email
          </h1>

          <ResendVerification
            email={registeredEmail}
            heading="Your account is waiting on one click"
          >
            We've sent a link that confirms this address. Follow it and you can
            sign in — until then the account cannot be used.
          </ResendVerification>

          <p className={styles.footer}>
            Already confirmed?{" "}
            <Link
              to={`/login${returnQuery(searchParams.toString())}`}
              className={styles.link}
            >
              Sign in here
            </Link>
          </p>
        </Stack>
      </div>
    );
  }

  const subtitle = (() => {
    if (awaitingCommunity) return " ";
    if (openCommunity) {
      return (
        <>
          Create a CharDB account to join{" "}
          <span className={styles.communityName}>{openCommunity.name}</span>.
        </>
      );
    }
    if (community) {
      return `${community.name} is invite-only. Enter the invite code you were given.`;
    }
    return "Enter the invite code you were given.";
  })();

  const invitedRole = inviteCodeData?.inviteCodeById?.role;

  return (
    <div className={styles.page}>
      <Stack gap="lg" className={styles.panel}>
        <Stack as="header" gap="xs" className={styles.header}>
          <h1 className={styles.title}>
            {community ? `Join ${community.name}` : "Join CharDB"}
          </h1>
          <p className={styles.subtitle} aria-busy={awaitingCommunity}>
            {subtitle}
          </p>
        </Stack>

        {awaitingCommunity ? (
          // First load: shaped like the fields, standing in until the
          // community says whether there is a code field to show.
          <Stack gap="md" aria-hidden>
            {[0, 1, 2, 3, 4].map((field) => (
              <Stack key={field} gap="xs">
                <span className={styles.placeholderLabel} />
                <span className={styles.placeholderInput} />
                <span className={styles.help} />
              </Stack>
            ))}
            <span className={styles.placeholderInput} />
          </Stack>
        ) : (
          <Stack
            as="form"
            gap="md"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            {askForCode && (
              <Stack gap="xs">
                <label htmlFor="inviteCode" className={styles.label}>
                  Invite code
                </label>
                <input
                  {...register("inviteCode")}
                  type="text"
                  id="inviteCode"
                  className={styles.input}
                  placeholder="Enter your invite code"
                />
                {getInviteCodeValidation()}
                {invitedRole && (
                  <p className={styles.communityBanner}>
                    You'll join{" "}
                    <span className={styles.communityName}>
                      {invitedRole.community.name}
                    </span>{" "}
                    as {invitedRole.name}.
                  </p>
                )}
                {inviteCodeData?.inviteCodeById && !invitedRole && (
                  <p className={styles.communityBanner}>
                    <span className={styles.communityName}>
                      Site registration:
                    </span>{" "}
                    this code gives you access to CharDB.
                  </p>
                )}
                <span className={styles.error}>
                  {errors.inviteCode?.message}
                </span>
              </Stack>
            )}

            <Stack gap="xs">
              <label htmlFor="username" className={styles.label}>
                Username
              </label>
              <input
                {...register("username")}
                type="text"
                id="username"
                // Not "username": sign-in asks for the email, so that is the
                // identifier a password manager should save with the password.
                autoComplete="off"
                className={styles.input}
                placeholder="Choose a username"
              />
              {errors.username ? (
                <span className={styles.error}>{errors.username.message}</span>
              ) : (
                <span className={styles.help}>
                  This will be your unique identifier on the platform
                </span>
              )}
            </Stack>

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
              <label htmlFor="displayName" className={styles.label}>
                Display name (optional)
              </label>
              <input
                {...register("displayName")}
                type="text"
                id="displayName"
                autoComplete="nickname"
                className={styles.input}
                placeholder="How others will see your name"
              />
              {errors.displayName ? (
                <span className={styles.error}>
                  {errors.displayName.message}
                </span>
              ) : (
                <span className={styles.help}>
                  This can be different from your username
                </span>
              )}
            </Stack>

            <Stack gap="xs">
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                id="password"
                autoComplete="new-password"
                className={styles.input}
                placeholder="Create a password"
              />
              <span className={styles.error}>{errors.password?.message}</span>
            </Stack>

            <Stack gap="xs">
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm password
              </label>
              <input
                {...register("confirmPassword")}
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                className={styles.input}
                placeholder="Confirm your password"
              />
              <span className={styles.error}>
                {errors.confirmPassword?.message}
              </span>
            </Stack>

            <Button type="submit" busy={isLoading} disabled={isLoading}>
              Create Account
            </Button>
          </Stack>
        )}

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link
            to={`/login${returnQuery(searchParams.toString())}`}
            className={styles.link}
          >
            Sign in here
          </Link>
        </p>
      </Stack>
    </div>
  );
};
