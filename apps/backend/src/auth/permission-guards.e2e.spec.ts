import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
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
import { AllowAccessToken } from "./decorators/AllowAccessToken";
import { PersonalAccessTokensService } from "./personal-access-tokens/personal-access-tokens.service";
import { PermissionService } from "./PermissionService";
import type { RequestPermissions } from "./request-permissions";

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

  @AllowAnyAuthenticated()
  @AllowAccessToken()
  @Query(() => Boolean)
  probeSignedInOrToken() {
    return true;
  }

  @AllowUnauthenticated()
  @Mutation(() => Boolean)
  probeAnyoneWrites() {
    return true;
  }

  @AllowUnauthenticated()
  @AllowAccessToken()
  @Mutation(() => Boolean)
  probeAnyoneWritesOrToken() {
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
  | "siteAdmin"
  | "token"
  | "adminToken";

type TokenPersona = "token" | "adminToken";
type SignedIn = Exclude<Persona, "anonymous" | TokenPersona>;

const EVERYONE: Persona[] = [
  "anonymous",
  "stranger",
  "member",
  "ownEditor",
  "staff",
  "staffElsewhere",
  "globalFlagHolder",
  "siteAdmin",
  "token",
  "adminToken",
];
const isToken = (persona: Persona): persona is TokenPersona =>
  persona === "token" || persona === "adminToken";
/** Signed in with a session. */
const SIGNED_IN = EVERYONE.filter(
  (persona) => persona !== "anonymous" && !isToken(persona),
);
const NOT_TOKEN = EVERYONE.filter((persona) => !isToken(persona));
const TOKENS: Persona[] = ["token", "adminToken"];

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
 * - `siteAdmin` has `isAdmin` on their account and a role with no
 *   permissions, and owns a character of the species and one of none.
 * - `token` is a personal access token of `siteAdmin`'s granting membership,
 *   `canManageItems` and `canEditOwnCharacter` in the first community.
 * - `adminToken` is a token of `siteAdmin`'s granting the global `isAdmin`
 *   and no community.
 */
describe("what each permission decorator admits (e2e)", () => {
  let testApp: TestApp;
  const tokens = {} as Record<Exclude<Persona, "anonymous">, string>;
  let tokenWhereOwnerIsNoMember: string;
  let siteAdminPermissions: RequestPermissions;
  const ids = {} as {
    community: string;
    elsewhere: string;
    species: string;
    ownEditor: string;
    siteAdmin: string;
    ownEditorsCharacter: string;
    membersCharacter: string;
    adminsCharacter: string;
    adminsSpecieslessCharacter: string;
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
      persona: SignedIn;
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
      {
        persona: "siteAdmin",
        account: { isAdmin: true },
        role: [ids.community, {}],
      },
    ];

    const userIds = {} as Record<SignedIn, string>;
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
    ids.siteAdmin = userIds.siteAdmin;

    const characterOf = async (
      ownerId: string,
      speciesId: string | null = ids.species,
    ) =>
      (
        await testApp.getDb().character.create({
          data: { name: "Ridley", ownerId, creatorId: ownerId, speciesId },
        })
      ).id;
    ids.ownEditorsCharacter = await characterOf(userIds.ownEditor);
    ids.membersCharacter = await characterOf(userIds.member);
    ids.adminsCharacter = await characterOf(userIds.siteAdmin);
    ids.adminsSpecieslessCharacter = await characterOf(userIds.siteAdmin, null);

    const accessTokens = testApp.getApp().get(PersonalAccessTokensService);
    siteAdminPermissions = testApp
      .getApp()
      .get(PermissionService)
      .forUser(
        await testApp
          .getDb()
          .user.findUniqueOrThrow({ where: { id: userIds.siteAdmin } }),
      );
    tokens.token = (
      await accessTokens.create(userIds.siteAdmin, siteAdminPermissions, {
        name: "gate probe",
        expiresInDays: 7,
        communities: [
          {
            communityId: ids.community,
            member: true,
            permissions: [
              CommunityPermission.CanManageItems,
              CommunityPermission.CanEditOwnCharacter,
            ],
          },
        ],
      })
    ).secret;
    tokens.adminToken = (
      await accessTokens.create(userIds.siteAdmin, siteAdminPermissions, {
        name: "gate probe admin",
        expiresInDays: 7,
        communities: [],
        globalPermissions: [GlobalPermission.IsAdmin],
      })
    ).secret;
    // Granted membership where its owner holds no role.
    tokenWhereOwnerIsNoMember = (
      await accessTokens.create(userIds.siteAdmin, siteAdminPermissions, {
        name: "gate probe elsewhere",
        expiresInDays: 7,
        communities: [
          {
            communityId: ids.elsewhere,
            member: true,
            permissions: [CommunityPermission.CanManageItems],
          },
        ],
      })
    ).secret;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  /** Which of the cast an operation lets in. */
  const admitted = async (
    field: string,
    operation: "query" | "mutation" = "query",
  ): Promise<Persona[]> => {
    const let_in: Persona[] = [];
    for (const persona of EVERYONE) {
      const document = `${operation} { ${field} }`;
      const response =
        persona === "anonymous"
          ? await testApp.graphqlRequest(document, {})
          : await testApp.authenticatedGraphqlRequest(
              document,
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
    [
      "@AllowAnyAuthenticated, which a token does not satisfy",
      () => "probeSignedIn",
      SIGNED_IN,
    ],
    [
      "@AllowAnyAuthenticated with @AllowAccessToken",
      () => "probeSignedInOrToken",
      [...SIGNED_IN, ...TOKENS],
    ],
    ["no decorator at all", () => "probeNoDecorator", []],
    [
      "@AllowGlobalAdmin, which a token holds only when granted",
      () => "probeSiteAdmin",
      ["siteAdmin", "adminToken"],
    ],
    [
      "@AllowGlobalPermission, which being a site admin does not grant",
      () => "probeGlobalFlag",
      ["globalFlagHolder"],
    ],
    [
      "@AllowCommunityPermission(Any), which is membership",
      () => `probeMember(communityId: "${ids.community}")`,
      ["member", "ownEditor", "staff", "siteAdmin", "token"],
    ],
    [
      "@AllowCommunityPermission, which being a site admin does not grant",
      () => `probeCommunityPermission(communityId: "${ids.community}")`,
      ["staff", "token"],
    ],
    [
      "@AllowCommunityPermission in another community",
      () => `probeCommunityPermission(communityId: "${ids.elsewhere}")`,
      ["staffElsewhere"],
    ],
    [
      "@AllowCommunityPermission with the community found through a species",
      () => `probeCommunityPermissionBySpecies(speciesId: "${ids.species}")`,
      ["staff", "token"],
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
      ["staff", "siteAdmin", "token", "adminToken"],
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
    [
      "@AllowSelf on the token's owner",
      () => `probeSelf(userId: "${ids.siteAdmin}")`,
      ["siteAdmin"],
    ],
    [
      "@AllowEntityOwner on a character of the token's owner",
      () => `probeOwner(characterId: "${ids.adminsCharacter}")`,
      ["siteAdmin"],
    ],
    [
      "@AllowCharacterProfileEditor on the token owner's character, which the token may edit as its own",
      () => `probeProfileEditor(characterId: "${ids.adminsCharacter}")`,
      ["staff", "token"],
    ],
    [
      "@AllowCharacterRegistryEditor on the token owner's character, which the token was not granted",
      () => `probeRegistryEditor(characterId: "${ids.adminsCharacter}")`,
      ["staff"],
    ],
    [
      "@AllowCharacterProfileEditor on a character of no species, which only its owner may edit",
      () =>
        `probeProfileEditor(characterId: "${ids.adminsSpecieslessCharacter}")`,
      ["siteAdmin"],
    ],
  ];

  it.each(gates)("%s", async (_gate, query, expected) => {
    expect(await admitted(query())).toEqual(expected);
  });

  const writes: Array<[string, string, Persona[]]> = [
    [
      "@AllowUnauthenticated on a mutation, which a token does not satisfy",
      "probeAnyoneWrites",
      NOT_TOKEN,
    ],
    [
      "@AllowUnauthenticated on a mutation with @AllowAccessToken",
      "probeAnyoneWritesOrToken",
      EVERYONE,
    ],
  ];

  it.each(writes)("%s", async (_gate, field, expected) => {
    expect(await admitted(field, "mutation")).toEqual(expected);
  });

  it("a token granted membership where its owner holds no role is no member there", async () => {
    const ask = (field: string) =>
      testApp.authenticatedGraphqlRequest(
        `query { ${field} }`,
        {},
        tokenWhereOwnerIsNoMember,
      );

    const member = await ask(`probeMember(communityId: "${ids.elsewhere}")`);
    expect(member.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

    // Its other grants there still stand.
    const manager = await ask(
      `probeCommunityPermission(communityId: "${ids.elsewhere}")`,
    );
    expect(manager.body.errors).toBeUndefined();
  });

  it("a token loses a granted global permission when its owner does", async () => {
    const db = testApp.getDb();
    await db.user.update({
      where: { id: ids.siteAdmin },
      data: { canListUsers: true },
    });
    const owner = testApp
      .getApp()
      .get(PermissionService)
      .forUser(
        await db.user.findUniqueOrThrow({ where: { id: ids.siteAdmin } }),
      );
    const { secret } = await testApp
      .getApp()
      .get(PersonalAccessTokensService)
      .create(ids.siteAdmin, owner, {
        name: "gate probe flag",
        expiresInDays: 7,
        communities: [],
        globalPermissions: [GlobalPermission.CanListUsers],
      });
    const ask = () =>
      testApp.authenticatedGraphqlRequest(
        `query { probeGlobalFlag }`,
        {},
        secret,
      );

    try {
      expect((await ask()).body.errors).toBeUndefined();

      await db.user.update({
        where: { id: ids.siteAdmin },
        data: { canListUsers: false },
      });

      const refused = await ask();
      expect(refused.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    } finally {
      await db.user.update({
        where: { id: ids.siteAdmin },
        data: { canListUsers: false },
      });
    }
  });
});
