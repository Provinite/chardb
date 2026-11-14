import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const eslint = new ESLint({ cwd: root });

const RULE = "@chardb/permissions/no-model-permission-read";

/** Linting the backend builds a TypeScript program for it first. */
const TIMEOUT = 120_000;

const PREAMBLE = `
  import { Prisma } from "@chardb/database";
  import type { Role, User } from "@chardb/database";
  import type { DatabaseService } from "../database/database.service";
  import type { RequestPermissions } from "../auth/request-permissions";
  declare const db: DatabaseService;
  declare const id: string;
  declare const ids: string[];
  declare const user: User;
  declare const role: Role;
  declare const users: User[];
  declare const permissions: RequestPermissions;
  declare function idOf(spec: object): string;
`;

/**
 * What the rule reports for a statement in an async function, linted as a
 * backend source file with the repository's config and the real client.
 */
const reports = async (body: string) => {
  const code = `${PREAMBLE}\nexport const run = async () => {\n${body}\n};\n`;
  const [result] = await eslint.lintText(code, {
    filePath: `${root}/apps/backend/src/users/users.service.ts`,
  });
  return result.messages
    .filter((message) => message.ruleId === RULE || message.fatal)
    .map((message) => message.messageId ?? message.message);
};

/**
 * One line per shape a review of this rule found it getting wrong at some
 * point, or confirmed it getting right. The rule is tuned against the names
 * and shapes of Prisma's generated types, and a change that fixes one of
 * these has repeatedly broken another.
 */
const READS: Array<[string, string]> = [
  ["a full row", "return user.isAdmin;"],
  ["a global flag", "return user.canListUsers;"],
  ["optional chaining", "return users[0]?.isAdmin;"],
  ["destructuring", "const { isAdmin } = user; return isAdmin;"],
  [
    "nested destructuring",
    "const { role: { canEditCharacter } } = { role }; return canEditCharacter;",
  ],
  ["array destructuring", "const [{ isAdmin }] = users; return isAdmin;"],
  ["a loop", "for (const { isAdmin } of users) if (isAdmin) return true;"],
  [
    "a destructured parameter",
    "return users.filter(({ isAdmin }) => isAdmin);",
  ],
  [
    "destructuring assignment",
    "let isAdmin: boolean; ({ isAdmin } = user); return isAdmin;",
  ],
  ["a spread copy", "return { ...user }.isAdmin;"],
  ["Pick", 'return (user as Pick<User, "id" | "isAdmin">).isAdmin;'],
  ["Partial", "return (role as Partial<Role>).canEditCharacter;"],
  ["Readonly", "return (role as Readonly<Role>).canEditCharacter;"],
  ["a nullable row", "return (user as User | null)?.isAdmin;"],
  [
    "findUnique",
    "return (await db.user.findUnique({ where: { id } }))?.isAdmin;",
  ],
  [
    "a selected column",
    "return (await db.user.findUnique({ where: { id }, select: { isAdmin: true } }))?.isAdmin;",
  ],
  [
    "a selected relation",
    "return (await db.communityMember.findFirst({ select: { role: true } }))?.role.canEditCharacter;",
  ],
  [
    "a nested select",
    "return (await db.communityMember.findFirst({ select: { role: { select: { canGrantItems: true } } } }))?.role.canGrantItems;",
  ],
  [
    "an included relation",
    "return (await db.communityMember.findMany({ include: { role: true } })).some((m) => m.role.canModerateImages);",
  ],
  [
    "omit",
    "return (await db.role.findFirst({ omit: { name: true } }))?.canEditCharacter;",
  ],
  [
    "a created row",
    'return (await db.role.create({ data: { name: "x", communityId: id } })).canEditCharacter;',
  ],
  [
    "an updated row",
    "return (await db.role.update({ where: { id }, data: {} })).canEditCharacter;",
  ],
  [
    "a transaction's result",
    "return (await db.$transaction((tx) => tx.user.findUniqueOrThrow({ where: { id } }))).isAdmin;",
  ],
  [
    "a grouped row",
    'return (await db.role.groupBy({ by: ["canEditCharacter"], _count: true })).map((g) => g.canEditCharacter);',
  ],
  [
    "an aggregate maximum",
    "return (await db.user.aggregate({ where: { id }, _max: { isAdmin: true } }))._max.isAdmin;",
  ],
  [
    "a payload type",
    "return (role as Prisma.RoleGetPayload<{ select: { canManageItems: true } }>).canManageItems;",
  ],
  [
    "a generic over a model",
    "return (<T extends User>(u: T) => u.isAdmin)(user);",
  ],
  [
    "Pick of a generic",
    'return (<T extends User>(u: Pick<T, "isAdmin">) => u.isAdmin)(user);',
  ],
];

const FILTERS: Array<[string, string]> = [
  [
    "findMany",
    "await db.role.findMany({ where: { canEditCharacter: true } });",
  ],
  [
    "findFirst through a relation",
    "await db.communityMember.findFirst({ where: { userId: id, role: { canCreateOrphanedCharacter: true } } });",
  ],
  ["count", "await db.role.count({ where: { canEditCharacter: true } });"],
  [
    "updateMany",
    "await db.role.updateMany({ where: { canEditCharacter: true }, data: {} });",
  ],
  [
    "deleteMany",
    "await db.role.deleteMany({ where: { canEditCharacter: true } });",
  ],
  [
    "a relation filter",
    "await db.community.findMany({ where: { roles: { some: { canEditCharacter: true } } } });",
  ],
  [
    "OR",
    "await db.role.findMany({ where: { OR: [{ canEditCharacter: true }] } });",
  ],
  [
    "NOT",
    "await db.role.findMany({ where: { NOT: { canEditCharacter: true } } });",
  ],
  [
    "an included relation's filter",
    "await db.community.findMany({ include: { roles: { where: { canEditCharacter: true } } } });",
  ],
  [
    "orderBy",
    'await db.role.findMany({ orderBy: { canEditCharacter: "desc" } });',
  ],
  [
    "cursor",
    "await db.role.findMany({ cursor: { id, canManageItems: true } });",
  ],
  [
    "a transaction client",
    "await db.$transaction((tx) => tx.role.findMany({ where: { canModerateImages: true } }));",
  ],
  [
    "a callback's result",
    "await db.role.findMany({ where: { OR: ids.map((communityId) => ({ communityId, canEditCharacter: true })) } });",
  ],
  [
    "a chained callback's result",
    "await db.role.findMany({ where: { OR: ids.map((communityId) => ({ communityId, canEditCharacter: true })).filter(Boolean) } });",
  ],
  [
    "a ternary",
    "await db.role.findMany({ where: id ? { canEditCharacter: true } : {} });",
  ],
  [
    "a nested deleteMany",
    "await db.community.update({ where: { id }, data: { roles: { deleteMany: { canGrantItems: true } } } });",
  ],
  [
    "a nested update's filter",
    "await db.community.update({ where: { id }, data: { roles: { updateMany: { where: { canManageItems: true }, data: {} } } } });",
  ],
  [
    "an annotated where",
    "const where: Prisma.RoleWhereInput = { canEditCharacter: true }; return where;",
  ],
  [
    "an annotated unique where",
    "const where: Prisma.RoleWhereUniqueInput = { id, canEditCharacter: true }; return where;",
  ],
  [
    "an annotated ordering",
    'const order: Prisma.RoleOrderByWithRelationInput = { canEditCharacter: "asc" }; return order;',
  ],
  [
    "awaited callbacks' results",
    "await db.role.findMany({ where: { OR: await Promise.all(ids.map(async (communityId) => ({ communityId, canEditCharacter: true }))) } });",
  ],
  [
    "a concatenated callback's result",
    "await db.role.findMany({ where: { OR: [{ name: id }].concat(ids.map((name) => ({ name, canEditCharacter: true }))) } });",
  ],
  [
    "an assigned object",
    "await db.role.findMany({ where: Object.assign({ communityId: id }, { canEditCharacter: true }) });",
  ],
  [
    "a callback's return inside a switch",
    'await db.role.findMany({ where: { OR: ids.map((communityId) => { switch (communityId) { case "a": return { communityId, canEditCharacter: true }; default: return { communityId }; } }) } });',
  ],
];

const ALLOWED: Array<[string, string]> = [
  [
    "a literal turned into a string in a filter",
    "await db.role.findMany({ where: { name: JSON.stringify({ canManageItems: true }) } });",
  ],
  [
    "a literal tested for membership in a filter",
    "await db.role.findMany({ where: { id: { in: ids.filter((x) => [{ canEditCharacter: true }].length > x.length) } } });",
  ],
  [
    "a literal a filter's callback loops over",
    "await db.role.findMany({ where: { id: { in: ids.filter((x) => { for (const probe of [{ canEditCharacter: true }]) { if (probe) return true; } return Boolean(x); }) } } });",
  ],
  [
    "a literal a filter's callback only tests",
    "await db.role.findMany({ where: { id: { in: ids.filter((x) => { while (x && { canEditCharacter: true }) { return true; } return false; }) } } });",
  ],
  ["the request's permissions", "return permissions.isAdmin;"],
  [
    "a community's permissions",
    "return (await permissions.inCommunity(id)).canEditCharacter;",
  ],
  ["another column", "return [user.username, role.communityId];"],
  ["assigning a column", "role.canEditCharacter = true;"],
  [
    "creating with a column",
    'await db.role.create({ data: { name: "x", communityId: id, canEditCharacter: true } });',
  ],
  [
    "updating a column",
    "await db.role.update({ where: { id }, data: { canEditCharacter: true } });",
  ],
  [
    "a scalar set",
    "await db.role.update({ where: { id }, data: { canEditCharacter: { set: true } } });",
  ],
  [
    "an upsert's branches",
    'await db.role.upsert({ where: { id }, create: { name: "x", communityId: id, canEditCharacter: true }, update: { canEditCharacter: false } });',
  ],
  [
    "a nested create",
    'await db.community.update({ where: { id }, data: { roles: { create: [{ name: "x", canEditCharacter: true }] } } });',
  ],
  [
    "a nested update's data",
    "await db.community.update({ where: { id }, data: { roles: { update: { where: { id }, data: { canEditCharacter: true } } } } });",
  ],
  [
    "selecting a column without reading it",
    "await db.user.findMany({ select: { id: true, isAdmin: true } });",
  ],
  [
    "an input being written",
    "return (data: Prisma.UserUpdateInput) => data.isAdmin !== undefined;",
  ],
  ["a column's name", "return Prisma.RoleScalarFieldEnum.canEditCharacter;"],
  ["a column reference", "return db.role.fields.canEditCharacter;"],
  [
    "a count of a column",
    "return (await db.role.aggregate({ _count: { canEditCharacter: true } }))._count.canEditCharacter;",
  ],
  [
    "a literal given to another function in a filter",
    "await db.role.findMany({ where: { id: idOf({ canEditCharacter: true }) } });",
  ],
  [
    "another function's own filter",
    "await db.role.findMany({ take: idOf({ where: { canEditCharacter: true } }).length });",
  ],
  [
    "a literal a filter's callback does not return",
    'await db.role.findMany({ where: { id: { in: ids.map((x) => { const wanted = { canEditCharacter: true }; return wanted ? x : ""; }) } } });',
  ],
  [
    "a transaction body's unrelated literal",
    "await db.$transaction(async () => { idOf({ where: { canEditCharacter: true } }); });",
  ],
  [
    "a method named like a permission",
    "return (role as never as { canActivate(): boolean }).canActivate();",
  ],
];

describe("shapes the rule has been checked against", () => {
  it.each(READS)(
    "reports a read off %s",
    async (_shape, body) => {
      expect(await reports(body)).toContain("read");
      expect(await reports(body)).not.toContain("untyped");
    },
    TIMEOUT,
  );

  it.each(FILTERS)(
    "reports a filter in %s",
    async (_shape, body) => {
      expect(await reports(body)).toEqual(["filter"]);
    },
    TIMEOUT,
  );

  it.each(ALLOWED)(
    "allows %s",
    async (_shape, body) => {
      expect(await reports(body)).toEqual([]);
    },
    TIMEOUT,
  );
});
