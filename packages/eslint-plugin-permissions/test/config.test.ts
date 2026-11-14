import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const eslint = new ESLint({ cwd: root });

const RULE = "@chardb/permissions/no-model-permission-read";

/** Linting the backend builds a TypeScript program for it first. */
const TIMEOUT = 120_000;

/**
 * What the rule reports for `code`, linted as a backend source file with the
 * repository's own config and the backend's real types.
 */
const reports = async (code: string) => {
  const [result] = await eslint.lintText(code, {
    filePath: `${root}/apps/backend/src/users/users.service.ts`,
  });
  return result.messages
    .filter((message) => message.ruleId === RULE || message.fatal)
    .map((message) => message.messageId ?? message.message);
};

const isOn = async (file: string) => {
  const config = await eslint.calculateConfigForFile(file);
  const entry = config.rules?.[RULE];
  const level = Array.isArray(entry) ? entry[0] : entry;
  return level === 2 || level === "error";
};

// The rule against the generated Prisma client, which the fixtures only
// imitate. Needs @chardb/database built.
describe("repository config", () => {
  it(
    "refuses a permission read off a Prisma model in backend source",
    async () => {
      expect(
        await reports(`
          import type { Role, User } from "@chardb/database";
          declare const moderator: User;
          declare const members: Array<{ role: Role }>;
          export const a = moderator.isAdmin;
          export const b = moderator.canListUsers;
          export const c = members.some((m) => m.role.canModerateImages);
          export const { isAdmin } = moderator;
        `),
      ).toEqual(["read", "read", "read", "read"]);
    },
    TIMEOUT,
  );

  it(
    "refuses a Prisma filter on a role's permission column",
    async () => {
      expect(
        await reports(`
          import type { Prisma } from "@chardb/database";
          export const mine: Prisma.CharacterWhereInput = {
            species: {
              community: {
                roles: {
                  some: {
                    canEditCharacter: true,
                    communityMembers: { some: { userId: "u" } },
                  },
                },
              },
            },
          };
          export const membership: Prisma.CommunityMemberWhereInput = {
            userId: "u",
            role: { communityId: "c", canCreateOrphanedCharacter: true },
          };
        `),
      ).toEqual(["filter", "filter"]);
    },
    TIMEOUT,
  );

  it(
    "refuses a filter written inline in a Prisma call",
    async () => {
      expect(
        await reports(`
          import type { DatabaseService } from "../database/database.service";
          declare const db: DatabaseService;
          export const run = async (userId: string, communityId: string) => {
            await db.communityMember.findFirst({
              where: {
                userId,
                role: { communityId, canCreateOrphanedCharacter: true },
              },
            });
            await db.character.findMany({
              where: {
                OR: [
                  {
                    ownerId: userId,
                    species: {
                      community: {
                        roles: {
                          some: {
                            canEditOwnCharacter: true,
                            communityMembers: { some: { userId } },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            });
            await db.role.count({ where: { canEditCharacter: true } });
            await db.$transaction((tx) =>
              tx.role.findMany({ where: { canModerateImages: true } }),
            );
            await db.communityMember.findMany({
              where: {
                OR: [communityId].map((id) => ({
                  role: { communityId: id, canManageItems: true },
                })),
              },
            });
            await db.community.update({
              where: { id: communityId },
              data: { roles: { deleteMany: { canGrantItems: true } } },
            });
          };
        `),
      ).toEqual(["filter", "filter", "filter", "filter", "filter", "filter"]);
    },
    TIMEOUT,
  );

  it(
    "refuses a permission read off what a Prisma call selected or included",
    async () => {
      expect(
        await reports(`
          import type { DatabaseService } from "../database/database.service";
          declare const db: DatabaseService;
          export const run = async (id: string) => {
            const actor = await db.user.findUnique({
              where: { id },
              select: { isAdmin: true },
            });
            const role = await db.role.findUnique({
              where: { id },
              select: { canEditCharacter: true },
            });
            const members = await db.communityMember.findMany({
              where: { userId: id },
              include: { role: { select: { canModerateImages: true } } },
            });
            const { canEditCharacter } = role ?? { canEditCharacter: false };
            return [
              actor?.isAdmin,
              role?.canEditCharacter,
              members.filter((m) => m.role.canModerateImages),
              canEditCharacter,
            ];
          };
        `),
      ).toEqual(["read", "read", "read", "read"]);
    },
    TIMEOUT,
  );

  it(
    "allows a Prisma call that writes permissions or reads other columns",
    async () => {
      expect(
        await reports(`
          import type { DatabaseService } from "../database/database.service";
          declare const db: DatabaseService;
          export const run = async (id: string) => {
            await db.role.update({
              where: { id },
              data: { canEditCharacter: true },
            });
            const user = await db.user.findUnique({
              where: { id },
              select: { id: true, username: true },
            });
            return user?.username;
          };
        `),
      ).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    "allows the same names on the client's types that are not rows",
    async () => {
      expect(
        await reports(`
          import { Prisma } from "@chardb/database";
          import type { DatabaseService } from "../database/database.service";
          declare const db: DatabaseService;
          // An input on its way to being written.
          export const grants = (data: Prisma.UserUpdateInput) =>
            data.isAdmin !== undefined;
          export const flag = (data: Prisma.RoleUncheckedCreateInput) =>
            data.canEditCharacter;
          // The column's name, and how many rows have it set.
          export const column = Prisma.RoleScalarFieldEnum.canEditCharacter;
          export const counts = async () => {
            const tally = await db.role.aggregate({
              _count: { canEditCharacter: true },
            });
            return tally._count.canEditCharacter;
          };
          // The caller's own type, passed through one of the client's helpers.
          export const own = (
            mine: Prisma.Exact<{ canEditCharacter: boolean }, { canEditCharacter: boolean }>,
          ) => mine.canEditCharacter;
        `),
      ).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    "allows the same names read off a request's permissions",
    async () => {
      expect(
        await reports(`
          import type { RequestPermissions } from "../auth/request-permissions";
          declare const viewer: RequestPermissions;
          export const a = viewer.isAdmin;
          export const b = viewer
            .inCommunity("c")
            .then((held) => held.canEditCharacter);
        `),
      ).toEqual([]);
    },
    TIMEOUT,
  );

  it("is off where roles are edited, where flags are mapped for display, and in specs", async () => {
    expect(await isOn("apps/backend/src/users/users.service.ts")).toBe(true);
    expect(await isOn("apps/backend/src/auth/PermissionService.ts")).toBe(true);
    expect(
      await isOn("apps/backend/src/users/utils/user-resolver-mappers.ts"),
    ).toBe(false);
    expect(await isOn("apps/backend/src/roles/roles.service.ts")).toBe(false);
    expect(await isOn("apps/backend/src/users/users.service.spec.ts")).toBe(
      false,
    );
    expect(await isOn("apps/frontend/src/App.tsx")).toBe(false);
  });
});
