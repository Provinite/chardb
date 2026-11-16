import type { PersonalAccessTokenFieldsFragment } from "../../../generated/graphql";
import {
  GLOBAL_PERMISSIONS_MAP,
  PERMISSIONS_MAP,
} from "../../../lib/permissions";

export type AccessTokenStatus = "active" | "expired" | "revoked";

/** Whether a token still works, as the server would decide it at `now`. */
export function accessTokenStatus(
  token: Pick<PersonalAccessTokenFieldsFragment, "expiresAt" | "revokedAt">,
  now: Date,
): AccessTokenStatus {
  if (token.revokedAt) return "revoked";
  return new Date(token.expiresAt).getTime() <= now.getTime()
    ? "expired"
    : "active";
}

type Grant = Pick<
  PersonalAccessTokenFieldsFragment["communities"][number],
  "member" | "permissions"
>;

const labels: Record<string, { name: string }> = PERMISSIONS_MAP;

/** A token's site-wide permissions, as labels. */
export function describeGlobalGrant(
  permissions: PersonalAccessTokenFieldsFragment["globalPermissions"],
): string[] {
  return permissions.map((name) => GLOBAL_PERMISSIONS_MAP[name]?.name ?? name);
}

/** What a token may do in one community, as labels. */
export function describeGrant(grant: Grant): string[] {
  return [
    ...(grant.member ? ["Member"] : []),
    ...grant.permissions.map((name) => labels[name]?.name ?? name),
  ];
}
