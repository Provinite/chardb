import rule from "../src/rules/no-model-permission-read";
import { filename, options, ruleTester } from "./ruleTester";

const MODELS = `import type { Role, User } from "./models";`;
const QUERIES = `import { createRole, findCharacters, findMembers, findUser } from "./models";`;
const CLIENT = `import { client } from "./models";`;
const PERMISSIONS = `import type { RequestPermissions, UserEntity } from "./permissions";`;

const valid = (code: string) => ({ code, filename, options });
const invalid = (code: string, ...messageIds: string[]) => ({
  code,
  filename,
  options,
  errors: messageIds.map((messageId) => ({ messageId })),
});

ruleTester.run("no-model-permission-read", rule, {
  valid: [
    // The same names, read off what a request may do.
    valid(`${PERMISSIONS}
      declare const permissions: RequestPermissions;
      export const a = permissions.isAdmin;`),
    valid(`${PERMISSIONS}
      declare const viewer: RequestPermissions;
      export const a = viewer.isAdmin;
      export const { isAdmin } = viewer;`),
    valid(`${PERMISSIONS}
      declare const viewer: RequestPermissions;
      export const a = viewer.inCommunity("c").then((held) => held.canEditCharacter);`),
    // A GraphQL entity carries the flags for display.
    valid(`${PERMISSIONS}
      declare const user: UserEntity;
      export const a = user.canListUsers;`),
    // Other columns of a model.
    valid(`${MODELS}
      declare const user: User;
      declare const role: Role;
      export const a = user.username;
      export const b = role.communityId;`),
    // Writing a role's permissions is not checking them.
    valid(`${QUERIES}
      createRole({ data: { communityId: "c", canEditCharacter: true } });`),
    // Selecting a column is only a problem once it is read.
    valid(`${QUERIES}
      findUser({ select: { id: true, isAdmin: true } });`),
    // Filtering by anything else.
    valid(`${QUERIES}
      findMembers({ where: { userId: "u", role: { communityId: "c" } } });`),
    valid(`${CLIENT}
      client.role.findMany({ where: { communityId: "c" } });`),
    // Writing through the client, and assigning to a model.
    valid(`${CLIENT}
      client.role.update({ where: { id: "r" }, data: { canEditCharacter: true } });`),
    valid(`${MODELS}
      declare const role: Role;
      role.canEditCharacter = true;`),
    // A method that happens to be named like a permission.
    valid(`
      declare const guard: any;
      export const a = guard.canActivate();`),
  ],
  invalid: [
    invalid(
      `${MODELS}
      declare const user: User;
      export const a = user.isAdmin;`,
      "read",
    ),
    // Whatever the variable is called.
    invalid(
      `${MODELS}
      declare const moderator: User;
      declare const req: { user: User };
      export const a = moderator.isAdmin;
      export const b = req.user?.isAdmin;`,
      "read",
      "read",
    ),
    invalid(
      `${MODELS}
      declare const user: User;
      export const a = user.canListUsers;`,
      "read",
    ),
    // Through a narrowed copy of the model.
    invalid(
      `${MODELS}
      declare const actor: Pick<User, "id" | "isAdmin"> | null;
      export const a = actor?.isAdmin;`,
      "read",
    ),
    invalid(
      `${MODELS}
      declare const roles: Role[];
      declare const members: Array<{ role: Role }>;
      export const a = roles.some((r) => r.canEditCharacter);
      export const b = members.filter((m) => m.role.canModerateImages);`,
      "read",
      "read",
    ),
    invalid(
      `${MODELS}
      declare const user: User;
      declare const role: Role;
      export const { isAdmin } = user;
      export const { canEditCharacter: canEdit } = role;`,
      "read",
      "read",
    ),
    // No type to ask about: `any`, or an import that did not resolve, which
    // is what every model becomes where the Prisma client was not generated.
    invalid(
      `import type { User } from "./not-generated";
      declare const user: User;
      declare const anything: any;
      export const a = user.isAdmin;
      export const b = anything.canEditCharacter;
      export const { isAdmin } = user;`,
      "untyped",
      "untyped",
      "untyped",
    ),
    // Assigned by destructuring, not declared.
    invalid(
      `${MODELS}
      declare const user: User;
      let isAdmin: boolean;
      ({ isAdmin } = user);
      export { isAdmin };`,
      "read",
    ),
    // Off what a query selected: a type the client computes, with no
    // declaration of its own for the column.
    invalid(
      `${CLIENT}
      const found = client.user.findUnique({ select: { isAdmin: true } });
      export const a = found.isAdmin;
      export const { isAdmin } = found;`,
      "read",
      "read",
    ),
    // A filter written inline in a query, which is typed by inference.
    invalid(
      `${CLIENT}
      client.role.findMany({ where: { canEditCharacter: true } });
      client.role.count({ where: { OR: [{ canEditCharacter: true }] } });
      client.role.findMany({ where: { "canEditCharacter": true } });
      client.role.findMany({ orderBy: { canEditCharacter: "desc" } });`,
      "filter",
      "filter",
      "filter",
      "filter",
    ),
    // Filtering rows by a role's permission.
    invalid(
      `${QUERIES}
      findMembers({ where: { userId: "u", role: { canEditCharacter: true } } });`,
      "filter",
    ),
    invalid(
      `${QUERIES}
      findCharacters({
        where: {
          ownerId: "u",
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
        },
      });`,
      "filter",
    ),
  ],
});
