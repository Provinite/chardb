import { Injectable } from "@nestjs/common";
import type { RequestPermissions } from "../../auth/request-permissions";

/**
 * Who sees what only staff see of the Halloween event: the event page, and
 * winners' Discord accounts. The people who hand prizes out
 * (`canGrantItems`, as the shop's purchase list is) and those who set the
 * pool up (`canManageItems`).
 */
@Injectable()
export class HalloweenStaffAccess {
  async isStaff(
    permissions: RequestPermissions,
    communityId: string,
  ): Promise<boolean> {
    const inCommunity = await permissions.inCommunity(communityId);
    return Boolean(inCommunity.canGrantItems || inCommunity.canManageItems);
  }
}
