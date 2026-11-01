import type { Prisma } from "@chardb/database";
import { hasStaffPermissions } from "../roles/open-signup-permissions";

/**
 * The role a community gives anyone who joins without an invite code, or null
 * when joining takes one.
 *
 * The one place that decides whether a community is open: signing up, joining
 * and the `Community.openSignupRoleId` field all ask here, so what a client is
 * offered is what the server will do. A stored role that holds a staff
 * permission counts as closed.
 */
export async function findOpenSignupRoleId(
  db: Prisma.TransactionClient,
  communityId: string,
): Promise<string | null> {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { openSignupRole: true },
  });
  const role = community?.openSignupRole;
  return role && !hasStaffPermissions(role) ? role.id : null;
}
