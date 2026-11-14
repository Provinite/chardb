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

  it("is off where requests are authenticated, where roles are edited, and in specs", async () => {
    expect(await isOn("apps/backend/src/users/users.service.ts")).toBe(true);
    expect(await isOn("apps/backend/src/auth/PermissionService.ts")).toBe(
      false,
    );
    expect(await isOn("apps/backend/src/roles/roles.service.ts")).toBe(false);
    expect(await isOn("apps/backend/src/users/users.service.spec.ts")).toBe(
      false,
    );
    expect(await isOn("apps/frontend/src/App.tsx")).toBe(false);
  });
});
