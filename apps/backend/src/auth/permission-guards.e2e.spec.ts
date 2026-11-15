import { Args, ID, Query, Resolver } from "@nestjs/graphql";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "./auth.module";
import { CommunityPermission } from "./CommunityPermission";
import { GlobalPermission } from "./GlobalPermission";
import { AllowAnyAuthenticated } from "./decorators/AllowAnyAuthenticated";
import { AllowCharacterProfileEditor } from "./decorators/AllowCharacterProfileEditor";
import { AllowCharacterRegistryEditor } from "./decorators/AllowCharacterRegistryEditor";
import { AllowCommunityPermission } from "./decorators/AllowCommunityPermission";
import { AllowEntityOwner } from "./decorators/AllowEntityOwner";
import { AllowGlobalAdmin } from "./decorators/AllowGlobalAdmin";
import { AllowGlobalPermission } from "./decorators/AllowGlobalPermission";
import { AllowSelf } from "./decorators/AllowSelf";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";
import { ResolveCommunityFrom } from "./decorators/ResolveCommunityFrom";

/**
 * One query per kind of gate, each doing nothing but answering. Whatever
 * refuses a caller here is the guards and nothing else.
 */
@Resolver()
class GateProbeResolver {
  @AllowUnauthenticated()
  @Query(() => Boolean)
  probeAnyone() {
    return true;
  }

  @AllowAnyAuthenticated()
  @Query(() => Boolean)
  probeSignedIn() {
    return true;
  }

  @Query(() => Boolean)
  probeNoDecorator() {
    return true;
  }

  @AllowGlobalAdmin()
  @Query(() => Boolean)
  probeSiteAdmin() {
    return true;
  }

  @AllowGlobalPermission(GlobalPermission.CanListUsers)
  @Query(() => Boolean)
  probeGlobalFlag() {
    return true;
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => Boolean)
  probeMember(@Args("communityId", { type: () => ID }) _communityId: string) {
    return true;
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => Boolean)
  probeCommunityPermission(
    @Args("communityId", { type: () => ID }) _communityId: string,
  ) {
    return true;
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ speciesId: "speciesId" })
  @Query(() => Boolean)
  probeCommunityPermissionBySpecies(
    @Args("speciesId", { type: () => ID }) _speciesId: string,
  ) {
    return true;
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => Boolean)
  probeSiteAdminOrCommunityPermission(
    @Args("communityId", { type: () => ID }) _communityId: string,
  ) {
    return true;
  }

  @AllowSelf({ userId: "userId" })
  @Query(() => Boolean)
  probeSelf(@Args("userId", { type: () => ID }) _userId: string) {
    return true;
  }

  @AllowEntityOwner({ characterId: "characterId" })
  @Query(() => Boolean)
  probeOwner(@Args("characterId", { type: () => ID }) _characterId: string) {
    return true;
  }

  @AllowCharacterProfileEditor({ characterId: "characterId" })
  @Query(() => Boolean)
  probeProfileEditor(
    @Args("characterId", { type: () => ID }) _characterId: string,
  ) {
    return true;
  }

  @AllowCharacterRegistryEditor({ characterId: "characterId" })
  @Query(() => Boolean)
  probeRegistryEditor(
    @Args("characterId", { type: () => ID }) _characterId: string,
  ) {
    return true;
  }
}

type Persona =
  | "anonymous"
  | "stranger"
  | "member"
  | "ownEditor"
  | "staff"
  | "staffElsewhere"
  | "globalFlagHolder"
  | "siteAdmin";

const EVERYONE: Persona[] = [
  "anonymous",
  "stranger",
  "member",
  "ownEditor",
  "staff",
  "staffElsewhere",
  "globalFlagHolder",
  "siteAdmin",
];
const SIGNED_IN = EVERYONE.filter((persona) => persona !== "anonymous");

/**
 * What each `@Allow*` decorator admits and refuses, against a real database
 * and the same three global guards `main.ts` installs.
 *
 * `resolver-permission-coverage.spec.ts` pins which of these every resolver
 * method in the app carries. This is the other half: what carrying one means.
 * Between them a method's gate is tested without a test per method.
 *
 * The cast, all but two of them in one community:
 * - `stranger` is signed in and holds no role anywhere.
 * - `member` holds a role with no permissions, and owns a character.
 * - `ownEditor` holds the two edit-your-own permissions, and owns a character.
 * - `staff` holds the edit-anyone's and manage-items permissions.
 * - `staffElsewhere` holds those in a different community.
 * - `globalFlagHolder` has `canListUsers` on their account and no role.
 * - `siteAdmin` has `isAdmin` on their account and no role.
 */
describe("what each permission decorator admits (e2e)", () => {
  let testApp: TestApp;
  const tokens = {} as Record<Exclude<Persona, "anonymous">, string>;
  const ids = {} as {
    community: string;
    elsewhere: string;
    species: string;
    ownEditor: string;
    ownEditorsCharacter: string;
    membersCharacter: string;
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule],
      providers: [GateProbeResolver],
    });
    await testApp.clearDatabase();

    ids.community = (await testApp.createTestCommunity("Here")).id;
    ids.elsewhere = (await testApp.createTestCommunity("Elsewhere")).id;
    ids.species = (await testApp.createTestSpecies(ids.community)).id;

    const staffRole = {
      canManageItems: true,
      canEditCharacter: true,
      canEditCharacterRegistry: true,
    };
    const cast: Array<{
      persona: Exclude<Persona, "anonymous">;
      account?: Record<string, unknown>;
      role?: [communityId: string, permissions: Record<string, boolean>];
    }> = [
      { persona: "stranger" },
      { persona: "member", role: [ids.community, {}] },
      {
        persona: "ownEditor",
        role: [
          ids.community,
          { canEditOwnCharacter: true, canEditOwnCharacterRegistry: true },
        ],
      },
      { persona: "staff", role: [ids.community, staffRole] },
      { persona: "staffElsewhere", role: [ids.elsewhere, staffRole] },
      { persona: "globalFlagHolder", account: { canListUsers: true } },
      { persona: "siteAdmin", account: { isAdmin: true } },
    ];

    const userIds = {} as Record<Exclude<Persona, "anonymous">, string>;
    for (const { persona, account, role } of cast) {
      const user = await testApp.createTestUser({
        username: `gate_${persona.toLowerCase()}`,
        email: `gate_${persona.toLowerCase()}@example.com`,
        ...account,
      });
      if (role) {
        const created = await testApp.createTestRole(...role);
        await testApp.createTestCommunityMember(user.id, created.id);
      }
      userIds[persona] = user.id;
      tokens[persona] = await testApp.generateTestToken(user.id, user.username);
    }
    ids.ownEditor = userIds.ownEditor;

    const characterOf = async (ownerId: string) =>
      (
        await testApp.getDb().character.create({
          data: {
            name: "Ridley",
            ownerId,
            creatorId: ownerId,
            speciesId: ids.species,
          },
        })
      ).id;
    ids.ownEditorsCharacter = await characterOf(userIds.ownEditor);
    ids.membersCharacter = await characterOf(userIds.member);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  /** Which of the cast a query lets in. */
  const admitted = async (query: string): Promise<Persona[]> => {
    const let_in: Persona[] = [];
    for (const persona of EVERYONE) {
      const response =
        persona === "anonymous"
          ? await testApp.graphqlRequest(`query { ${query} }`, {})
          : await testApp.authenticatedGraphqlRequest(
              `query { ${query} }`,
              {},
              tokens[persona],
            );
      const [error] = response.body.errors ?? [];
      if (!error) {
        let_in.push(persona);
        continue;
      }
      // Refused by a guard, and not by a query that failed to parse.
      expect(error.extensions?.code).toBe("FORBIDDEN");
    }
    return let_in;
  };

  const gates: Array<[string, () => string, Persona[]]> = [
    ["@AllowUnauthenticated", () => "probeAnyone", EVERYONE],
    ["@AllowAnyAuthenticated", () => "probeSignedIn", SIGNED_IN],
    ["no decorator at all", () => "probeNoDecorator", []],
    ["@AllowGlobalAdmin", () => "probeSiteAdmin", ["siteAdmin"]],
    [
      "@AllowGlobalPermission, which being a site admin does not grant",
      () => "probeGlobalFlag",
      ["globalFlagHolder"],
    ],
    [
      "@AllowCommunityPermission(Any), which is membership",
      () => `probeMember(communityId: "${ids.community}")`,
      ["member", "ownEditor", "staff"],
    ],
    [
      "@AllowCommunityPermission, which being a site admin does not grant",
      () => `probeCommunityPermission(communityId: "${ids.community}")`,
      ["staff"],
    ],
    [
      "@AllowCommunityPermission in another community",
      () => `probeCommunityPermission(communityId: "${ids.elsewhere}")`,
      ["staffElsewhere"],
    ],
    [
      "@AllowCommunityPermission with the community found through a species",
      () => `probeCommunityPermissionBySpecies(speciesId: "${ids.species}")`,
      ["staff"],
    ],
    [
      "@AllowCommunityPermission for a community that does not exist",
      () =>
        `probeCommunityPermission(communityId: "00000000-0000-0000-0000-000000000000")`,
      [],
    ],
    [
      "@AllowGlobalAdmin beside @AllowCommunityPermission, which is either",
      () =>
        `probeSiteAdminOrCommunityPermission(communityId: "${ids.community}")`,
      ["staff", "siteAdmin"],
    ],
    [
      "@AllowSelf",
      () => `probeSelf(userId: "${ids.ownEditor}")`,
      ["ownEditor"],
    ],
    [
      "@AllowEntityOwner",
      () => `probeOwner(characterId: "${ids.ownEditorsCharacter}")`,
      ["ownEditor"],
    ],
    [
      "@AllowCharacterProfileEditor on a character whose owner may edit their own",
      () => `probeProfileEditor(characterId: "${ids.ownEditorsCharacter}")`,
      ["ownEditor", "staff"],
    ],
    [
      "@AllowCharacterProfileEditor on a character whose owner may not",
      () => `probeProfileEditor(characterId: "${ids.membersCharacter}")`,
      ["staff"],
    ],
    [
      "@AllowCharacterRegistryEditor on a character whose owner may edit their own",
      () => `probeRegistryEditor(characterId: "${ids.ownEditorsCharacter}")`,
      ["ownEditor", "staff"],
    ],
    [
      "@AllowCharacterRegistryEditor on a character whose owner may not",
      () => `probeRegistryEditor(characterId: "${ids.membersCharacter}")`,
      ["staff"],
    ],
  ];

  it.each(gates)("%s", async (_gate, query, expected) => {
    expect(await admitted(query())).toEqual(expected);
  });
});
