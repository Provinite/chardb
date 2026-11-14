import rule from "../src/rules/no-model-permission-read";
import { filename, options, ruleTester } from "./ruleTester";

const MODELS = `import type { Role, User } from "./models";`;
const QUERIES = `import { createRole, findCharacters, findMembers, findUser } from "./models";`;
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
