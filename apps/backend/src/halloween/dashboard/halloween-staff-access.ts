import { Injectable } from "@nestjs/common";
import { PermissionService } from "../../auth/PermissionService";
import { CommunityPermission } from "../../auth/CommunityPermission";

/**
 * Who sees what only staff see of the Halloween event: the event page, and
 * winners' Discord accounts. The people who hand prizes out
 * (`canGrantItems`, as the shop's purchase list is) and those who set the
 * pool up (`canManageItems`).
 */
@Injectable()
export class HalloweenStaffAccess {
  constructor(private readonly permissions: PermissionService) {}

  async isStaff(userId: string, communityId: string): Promise<boolean> {
    const [canGrant, canManage] = await Promise.all([
      this.permissions.hasCommunityPermission(
        userId,
        communityId,
        CommunityPermission.CanGrantItems,
      ),
      this.permissions.hasCommunityPermission(
        userId,
        communityId,
        CommunityPermission.CanManageItems,
      ),
    ]);
    return canGrant || canManage;
  }
}
