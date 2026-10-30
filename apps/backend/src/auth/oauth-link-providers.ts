import { ExternalAccountProvider } from "@chardb/database";
import type { OAuthLinkProvider } from "./oauth-link-state";

/**
 * The providers an account can be linked to, and everything that differs
 * between them.
 *
 * The linking flow itself -- initiate, callback, state binding, the link --
 * is identical for all of them and lives once, in `oauth-link.controller.ts`
 * and `strategies/oauth-link.strategy.ts`. Adding a provider is a new entry
 * here plus its route registration in `auth.module.ts`.
 */

/** Who the user is on the provider: what gets linked. */
export interface OAuthLinkIdentity {
  providerAccountId: string;
  displayName: string;
}

export interface OAuthLinkProviderConfig {
  /** Route segment, passport strategy name and nonce-cookie suffix. */
  segment: OAuthLinkProvider;
  /** Human-readable name, for class names and error messages. */
  label: string;
  provider: ExternalAccountProvider;
  /** `<prefix>_CLIENT_ID`, `<prefix>_CLIENT_SECRET`, `<prefix>_CALLBACK_URL`. */
  envPrefix: string;
  authorizationURL: string;
  tokenURL: string;
  /** Omitted for providers whose authorize endpoint takes no scope. */
  scope?: string;
  /** Reads the user's identity with a fresh access token; throws on failure. */
  fetchIdentity: (accessToken: string) => Promise<OAuthLinkIdentity>;
}

/** `external_accounts.display_name` is a VARCHAR(100). */
const DISPLAY_NAME_MAX = 100;

const getJson = async (
  url: string,
  accessToken: string,
  label: string,
): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label} user profile`);
  }
  return response.json();
};

const unexpectedShape = (label: string): Error =>
  new Error(`${label} API returned an unexpected response shape`);

/** A property of an untyped API response, if the response is an object. */
const field = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;

export const DISCORD: OAuthLinkProviderConfig = {
  segment: "discord",
  label: "Discord",
  provider: ExternalAccountProvider.DISCORD,
  envPrefix: "DISCORD",
  authorizationURL: "https://discord.com/api/oauth2/authorize",
  tokenURL: "https://discord.com/api/oauth2/token",
  scope: "identify",
  fetchIdentity: async (accessToken) => {
    const data = await getJson(
      "https://discord.com/api/v10/users/@me",
      accessToken,
      "Discord",
    );
    const id = field(data, "id");
    const username = field(data, "username");
    if (!id || !username) throw unexpectedShape("Discord");

    // The global display name if set; otherwise the pre-2023 `name#1234`
    // form for accounts that still have a discriminator, else `@username`.
    const globalName = field(data, "global_name");
    const discriminator = field(data, "discriminator");
    const displayName = globalName
      ? String(globalName)
      : discriminator && discriminator !== "0"
        ? `${String(username)}#${String(discriminator)}`
        : `@${String(username)}`;

    return { providerAccountId: String(id), displayName };
  },
};

export const DEVIANTART: OAuthLinkProviderConfig = {
  segment: "deviantart",
  label: "DeviantArt",
  provider: ExternalAccountProvider.DEVIANTART,
  envPrefix: "DEVIANTART",
  authorizationURL: "https://www.deviantart.com/oauth2/authorize",
  tokenURL: "https://www.deviantart.com/oauth2/token",
  scope: "basic",
  fetchIdentity: async (accessToken) => {
    const data = await getJson(
      "https://www.deviantart.com/api/v1/oauth2/user/whoami",
      accessToken,
      "DeviantArt",
    );
    const id = field(data, "userid");
    const username = field(data, "username");
    if (!id || !username) throw unexpectedShape("DeviantArt");
    return { providerAccountId: String(id), displayName: String(username) };
  },
};

export const TOYHOUSE: OAuthLinkProviderConfig = {
  segment: "toyhouse",
  label: "ToyHouse",
  provider: ExternalAccountProvider.TOYHOUSE,
  envPrefix: "TOYHOUSE",
  authorizationURL: "https://toyhou.se/~oauth/authorize",
  tokenURL: "https://toyhou.se/~oauth/token",
  fetchIdentity: async (accessToken) => {
    const data = await getJson(
      "https://toyhou.se/~api/v1/me",
      accessToken,
      "ToyHouse",
    );
    const id = field(data, "id");
    const username = field(data, "username");
    if (!id || !username) throw unexpectedShape("ToyHouse");
    return { providerAccountId: String(id), displayName: String(username) };
  },
};

/**
 * Identity only. The token Patreon hands back is used once, here, and
 * discarded -- nothing stores it.
 */
export const PATREON: OAuthLinkProviderConfig = {
  segment: "patreon",
  label: "Patreon",
  provider: ExternalAccountProvider.PATREON,
  envPrefix: "PATREON",
  authorizationURL: "https://www.patreon.com/oauth2/authorize",
  tokenURL: "https://www.patreon.com/api/oauth2/token",
  scope: "identity",
  fetchIdentity: async (accessToken) => {
    // Patreon's v2 API returns no attributes unless they are asked for by
    // name. `vanity` is the handle in the user's profile URL and is often
    // unset, so `full_name` is the fallback.
    const data = await getJson(
      "https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=full_name,vanity",
      accessToken,
      "Patreon",
    );
    const user = field(data, "data");
    const id = field(user, "id");
    const attributes = field(user, "attributes");
    const name = field(attributes, "vanity") || field(attributes, "full_name");
    if (!id || !name) throw unexpectedShape("Patreon");
    return {
      providerAccountId: String(id),
      displayName: String(name).slice(0, DISPLAY_NAME_MAX),
    };
  },
};
