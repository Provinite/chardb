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
  let getUserRoles: jest.Mock;
  let service: PermissionService;

  beforeEach(() => {
    getUserRolesInCommunity = jest.fn().mockResolvedValue([]);
    getUserRoles = jest.fn().mockResolvedValue([]);
    service = new PermissionService({
      getUserRolesInCommunity,
      getUserRoles,
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

    it("reads a community's roles again after a read that failed", async () => {
      getUserRolesInCommunity
        .mockRejectedValueOnce(new Error("connection lost"))
        .mockResolvedValue([role({ canEditCharacter: true })]);
      const permissions = service.forUser(user());

      await expect(permissions.inCommunity("c-1")).rejects.toThrow(
        "connection lost",
      );

      expect((await permissions.inCommunity("c-1")).canEditCharacter).toBe(
        true,
      );
    });

    describe("communityIdsWith", () => {
      beforeEach(() => {
        getUserRoles.mockResolvedValue([
          role({ communityId: "c-1", canEditCharacter: true }),
          role({ communityId: "c-1", canEditOwnCharacter: true }),
          role({ communityId: "c-2", canEditOwnCharacter: true }),
          role({ communityId: "c-3", canManageItems: true }),
        ]);
      });

      it("lists the communities where a role holds any of the permissions", async () => {
        const ids = await service
          .forUser(user())
          .communityIdsWith(
            CommunityPermission.CanEditCharacter,
            CommunityPermission.CanEditOwnCharacter,
          );

        expect(getUserRoles).toHaveBeenCalledWith("user-1");
        expect(ids.sort()).toEqual(["c-1", "c-2"]);
      });

      it("answers Any with every community the account is in", async () => {
        const ids = await service
          .forUser(user())
          .communityIdsWith(CommunityPermission.Any);

        expect(ids.sort()).toEqual(["c-1", "c-2", "c-3"]);
      });

      it("lists none for a permission no role holds", async () => {
        expect(
          await service
            .forUser(user())
            .communityIdsWith(CommunityPermission.CanDeleteCharacter),
        ).toEqual([]);
      });

      it("reads the account's roles once however often it is asked", async () => {
        const permissions = service.forUser(user());

        await Promise.all([
          permissions.communityIdsWith(CommunityPermission.CanEditCharacter),
          permissions.communityIdsWith(CommunityPermission.CanManageItems),
        ]);

        expect(getUserRoles).toHaveBeenCalledTimes(1);
      });
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
      expect(getUserRoles).not.toHaveBeenCalled();
    });
  });

  describe("forAccessToken", () => {
    const grants = [
      {
        communityId: "c-1",
        permissions: [
          CommunityPermission.Any,
          CommunityPermission.CanManageItems,
          "canDoSomethingRemoved",
        ],
      },
      {
        communityId: "c-2",
        permissions: [CommunityPermission.CanEditCharacter],
      },
    ];

    const owner = user({ isAdmin: true, canListUsers: true });

    /** The owner holds a role in each of these communities and no other. */
    const ownerIsMemberOf = (...communityIds: string[]) => {
      getUserRolesInCommunity.mockImplementation(
        async (_userId: string, communityId: string) =>
          communityIds.includes(communityId) ? [role({ communityId })] : [],
      );
      getUserRoles.mockResolvedValue(
        communityIds.map((communityId) => role({ communityId })),
      );
    };

    it("holds no global permission it was not granted, whatever its owner's account holds", () => {
      const permissions = service.forAccessToken(owner, grants, []);

      expect(permissions.isAdmin).toBe(false);
      for (const permission of Object.values(GlobalPermission)) {
        expect(permissions.hasGlobal(permission)).toBe(false);
      }
    });

    it("holds a granted global permission its owner holds", () => {
      const permissions = service.forAccessToken(owner, grants, [
        GlobalPermission.IsAdmin,
        GlobalPermission.CanListUsers,
      ]);

      expect(permissions.isAdmin).toBe(true);
      expect(permissions.hasGlobal(GlobalPermission.IsAdmin)).toBe(true);
      expect(permissions.hasGlobal(GlobalPermission.CanListUsers)).toBe(true);
      expect(permissions.hasGlobal(GlobalPermission.CanCreateCommunity)).toBe(
        false,
      );
    });

    it("holds no granted global permission its owner no longer holds", () => {
      const permissions = service.forAccessToken(
        user({ isAdmin: true, canListUsers: false }),
        grants,
        [GlobalPermission.CanListUsers],
      );

      expect(permissions.hasGlobal(GlobalPermission.CanListUsers)).toBe(false);
    });

    it("never holds canGrantGlobalPermissions, though granted and held", () => {
      const permissions = service.forAccessToken(
        user({ isAdmin: true, canGrantGlobalPermissions: true }),
        grants,
        [GlobalPermission.CanGrantGlobalPermissions],
      );

      expect(
        permissions.hasGlobal(GlobalPermission.CanGrantGlobalPermissions),
      ).toBe(false);
    });

    it("ignores a global permission name the code no longer knows", () => {
      const permissions = service.forAccessToken(
        user({ isAdmin: true, canDoSomethingRemoved: true } as Partial<User>),
        grants,
        ["canDoSomethingRemoved"],
      );

      expect(
        permissions.hasGlobal("canDoSomethingRemoved" as GlobalPermission),
      ).toBe(false);
    });

    it("grants exactly the permissions it names in a community it names", async () => {
      ownerIsMemberOf("c-1");
      const permissions = service.forAccessToken(owner, grants, []);

      expect(await permissions.inCommunity("c-1")).toEqual({
        hasMembership: true,
        canManageItems: true,
      });
      expect(
        await permissions.hasInCommunity(
          "c-1",
          CommunityPermission.CanEditCharacter,
        ),
      ).toBe(false);
    });

    it("is a member only where membership was granted", async () => {
      ownerIsMemberOf("c-1", "c-2");
      const permissions = service.forAccessToken(owner, grants, []);

      expect(
        await permissions.hasInCommunity("c-1", CommunityPermission.Any),
      ).toBe(true);
      expect(
        await permissions.hasInCommunity("c-2", CommunityPermission.Any),
      ).toBe(false);
      expect(
        await permissions.hasInCommunity(
          "c-2",
          CommunityPermission.CanEditCharacter,
        ),
      ).toBe(true);
    });

    // A member token acts as its owner in member-only places: their wallet,
    // their purchases. Where the owner is no member there is nothing to act as.
    it("is no member where its owner holds no role, though granted", async () => {
      ownerIsMemberOf();
      const permissions = service.forAccessToken(owner, grants, []);

      expect(await permissions.inCommunity("c-1")).toEqual({
        hasMembership: false,
        canManageItems: true,
      });
      expect(
        await permissions.hasInCommunity("c-1", CommunityPermission.Any),
      ).toBe(false);
      expect(
        await permissions.communityIdsWith(CommunityPermission.Any),
      ).toEqual([]);
    });

    it("grants nothing in a community it does not name", async () => {
      ownerIsMemberOf("c-3");
      const permissions = service.forAccessToken(owner, grants, []);

      expect(await permissions.inCommunity("c-3")).toEqual({
        hasMembership: false,
      });
    });

    it("lists the communities that grant any of the permissions", async () => {
      ownerIsMemberOf("c-1", "c-2");
      const permissions = service.forAccessToken(owner, grants, []);

      expect(
        await permissions.communityIdsWith(
          CommunityPermission.CanManageItems,
          CommunityPermission.CanEditCharacter,
        ),
      ).toEqual(["c-1", "c-2"]);
      expect(
        await permissions.communityIdsWith(CommunityPermission.Any),
      ).toEqual(["c-1"]);
      expect(
        await permissions.communityIdsWith(
          CommunityPermission.CanDeleteCharacter,
        ),
      ).toEqual([]);
    });

    it("reads the owner's roles only to answer membership, once per community", async () => {
      ownerIsMemberOf("c-1", "c-2");
      const permissions = service.forAccessToken(owner, grants, []);

      await permissions.inCommunity("c-2");
      await permissions.hasInCommunity(
        "c-1",
        CommunityPermission.CanManageItems,
      );
      expect(getUserRolesInCommunity).not.toHaveBeenCalled();

      await permissions.inCommunity("c-1");
      await permissions.hasInCommunity("c-1", CommunityPermission.Any);
      expect(getUserRolesInCommunity).toHaveBeenCalledTimes(1);
      expect(getUserRolesInCommunity).toHaveBeenCalledWith("user-1", "c-1");
    });
  });
});
