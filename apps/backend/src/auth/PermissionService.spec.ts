import type { Role, User } from "@chardb/database";
import { CommunityMembersService } from "../community-members/community-members.service";
import { CommunityPermission } from "./CommunityPermission";
import { GlobalPermission } from "./GlobalPermission";
import { PermissionService } from "./PermissionService";

const user = (flags: Partial<User> = {}) =>
  ({
    id: "user-1",
    isAdmin: false,
    canCreateCommunity: false,
    canListUsers: false,
    canListInviteCodes: false,
    canCreateInviteCode: false,
    canGrantGlobalPermissions: false,
    ...flags,
  }) as User;

const role = (flags: Partial<Role>) => flags as Role;

describe("PermissionService", () => {
  let getUserRolesInCommunity: jest.Mock;
  let getCommunityIdsWithPermission: jest.Mock;
  let service: PermissionService;

  beforeEach(() => {
    getUserRolesInCommunity = jest.fn().mockResolvedValue([]);
    getCommunityIdsWithPermission = jest.fn().mockResolvedValue([]);
    service = new PermissionService({
      getUserRolesInCommunity,
      getCommunityIdsWithPermission,
    } as unknown as CommunityMembersService);
  });

  describe("forUser", () => {
    it("reads global permissions off the account", () => {
      const permissions = service.forUser(
        user({ isAdmin: true, canListUsers: true }),
      );

      expect(permissions.isAdmin).toBe(true);
      expect(permissions.hasGlobal(GlobalPermission.CanListUsers)).toBe(true);
      expect(permissions.hasGlobal(GlobalPermission.CanCreateCommunity)).toBe(
        false,
      );
    });

    it("grants a community permission any of the account's roles holds", async () => {
      getUserRolesInCommunity.mockResolvedValue([
        role({ canEditCharacter: true, canManageItems: false }),
        role({ canEditCharacter: false, canManageItems: true }),
      ]);

      const permissions = await service.forUser(user()).inCommunity("c-1");

      expect(getUserRolesInCommunity).toHaveBeenCalledWith("user-1", "c-1");
      expect(permissions.hasMembership).toBe(true);
      expect(permissions.canEditCharacter).toBe(true);
      expect(permissions.canManageItems).toBe(true);
      expect(permissions.canDeleteCharacter).toBeUndefined();
    });

    it("reports no membership where the account holds no role", async () => {
      const permissions = service.forUser(user());

      expect((await permissions.inCommunity("c-1")).hasMembership).toBe(false);
      expect(
        await permissions.hasInCommunity(
          "c-1",
          CommunityPermission.CanEditCharacter,
        ),
      ).toBe(false);
    });

    it("answers Any with membership", async () => {
      getUserRolesInCommunity.mockResolvedValue([role({})]);

      expect(
        await service
          .forUser(user())
          .hasInCommunity("c-1", CommunityPermission.Any),
      ).toBe(true);
    });

    it("reads each community's roles once", async () => {
      const permissions = service.forUser(user());

      await Promise.all([
        permissions.inCommunity("c-1"),
        permissions.hasInCommunity("c-1", CommunityPermission.CanGrantItems),
        permissions.inCommunity("c-2"),
      ]);

      expect(getUserRolesInCommunity).toHaveBeenCalledTimes(2);
    });

    it("lists the communities where the account holds any of the permissions", async () => {
      getCommunityIdsWithPermission.mockResolvedValue(["c-1", "c-2"]);

      const ids = await service
        .forUser(user())
        .communityIdsWith(
          CommunityPermission.CanEditCharacter,
          CommunityPermission.CanEditOwnCharacter,
        );

      expect(ids).toEqual(["c-1", "c-2"]);
      expect(getCommunityIdsWithPermission).toHaveBeenCalledWith("user-1", [
        CommunityPermission.CanEditCharacter,
        CommunityPermission.CanEditOwnCharacter,
      ]);
    });

    it("gives an anonymous caller nothing and reads nothing", async () => {
      const permissions = service.forUser(null);

      expect(permissions.isAdmin).toBe(false);
      expect(permissions.hasGlobal(GlobalPermission.CanListUsers)).toBe(false);
      expect(await permissions.inCommunity("c-1")).toEqual({
        hasMembership: false,
      });
      expect(
        await permissions.hasInCommunity("c-1", CommunityPermission.Any),
      ).toBe(false);
      expect(
        await permissions.communityIdsWith(CommunityPermission.Any),
      ).toEqual([]);
      expect(getUserRolesInCommunity).not.toHaveBeenCalled();
      expect(getCommunityIdsWithPermission).not.toHaveBeenCalled();
    });
  });
});
