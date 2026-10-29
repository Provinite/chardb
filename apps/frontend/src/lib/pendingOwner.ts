import { ExternalAccountProvider } from "../generated/graphql";

/**
 * Someone with no account here, known only by an external account: a Discord
 * or DeviantArt user items were granted to (#445).
 *
 * The server blanks the id and names for viewers who may not see who holds
 * what, so every field here can come back empty.
 */
export interface PendingOwnerLike {
  provider: ExternalAccountProvider;
  providerAccountId: string;
  displayIdentifier?: string | null;
  displayName?: string | null;
}

export const PROVIDER_NAME: Record<ExternalAccountProvider, string> = {
  [ExternalAccountProvider.Discord]: "Discord",
  [ExternalAccountProvider.Deviantart]: "DeviantArt",
  [ExternalAccountProvider.Patreon]: "Patreon",
  [ExternalAccountProvider.Toyhouse]: "Toyhouse",
};

/**
 * By the names their account was last seen with. Older rows have only an id
 * until the Discord name lookup runs; with nothing at all, which kind of
 * account it is.
 */
export const pendingLabel = (p: PendingOwnerLike): string => {
  const provider = PROVIDER_NAME[p.provider];
  if (p.displayName && p.displayIdentifier) {
    return `${p.displayName} (@${p.displayIdentifier})`;
  }
  if (p.displayIdentifier) return `@${p.displayIdentifier}`;
  if (p.displayName) return p.displayName;
  if (p.providerAccountId) return `${provider} ${p.providerAccountId}`;
  return `${provider} account`;
};

/** Their pending inventory, or null for a viewer the id is hidden from. */
export const pendingHolderPath = (p: PendingOwnerLike): string | null =>
  p.providerAccountId
    ? `/external-members/${p.provider.toLowerCase()}/${encodeURIComponent(
        p.providerAccountId,
      )}`
    : null;

/** The provider a holder path names, or null for one this app does not know. */
export const providerFromPath = (
  slug: string | undefined,
): ExternalAccountProvider | null =>
  Object.values(ExternalAccountProvider).find(
    (p) => p.toLowerCase() === slug?.toLowerCase(),
  ) ?? null;
