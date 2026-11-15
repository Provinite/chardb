import { Visibility } from "@chardb/database";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "./auth.module";
import { UsersModule } from "../users/users.module";
import { CommentsModule } from "../comments/comments.module";
import { CharactersModule } from "../characters/characters.module";
import { CommunityInvitationsModule } from "../community-invitations/community-invitations.module";
import { CharacterOwnershipChangesModule } from "../character-ownership-changes/character-ownership-changes.module";
import { CommunityMembersModule } from "../community-members/community-members.module";
import { ShopModule } from "../shop/shop.module";
import { CurrenciesModule } from "../currencies/currencies.module";
import { ItemsModule } from "../items/items.module";

type SignedIn = "stranger" | "member" | "creator" | "staff" | "siteAdmin";
type Caller = SignedIn | "anonymous";

/**
 * The permission checks a handler or its service makes for itself, after the
 * gate in front of it has already let the caller through.
 *
 * `permission-manifest.txt` cannot show these: it lists most of the handlers
 * here as "signed in" or "anyone", and the real rule is in the body. So each
 * one gets a caller it admits and a caller it refuses, here.
 *
 * The cast, in one community:
 * - `stranger` is signed in and holds no role.
 * - `member` holds a role with no permissions.
 * - `creator` holds `canCreateCharacter`.
 * - `staff` holds `canManageItems`, `canGrantItems` and
 *   `canRemoveCommunityMember`.
 * - `siteAdmin` has `isAdmin` on their account and no role.
 */
describe("permission checks made inside handlers (e2e)", () => {
  let testApp: TestApp;
  let communityId: string;
  let speciesId: string;
  let memberRoleId: string;
  const tokens = {} as Record<SignedIn, string>;
  const userIds = {} as Record<SignedIn, string>;
  const usernames = {} as Record<SignedIn, string>;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        CommentsModule,
        CharactersModule,
        CommunityInvitationsModule,
        CharacterOwnershipChangesModule,
        CommunityMembersModule,
        ShopModule,
        CurrenciesModule,
        ItemsModule,
      ],
    });
    await testApp.clearDatabase();

    communityId = (await testApp.createTestCommunity()).id;
    speciesId = (await testApp.createTestSpecies(communityId)).id;

    const cast: Array<{
      who: SignedIn;
      account?: Record<string, unknown>;
      role?: Record<string, boolean>;
    }> = [
      { who: "stranger" },
      { who: "member", role: {} },
      { who: "creator", role: { canCreateCharacter: true } },
      {
        who: "staff",
        role: {
          canManageItems: true,
          canGrantItems: true,
          canRemoveCommunityMember: true,
        },
      },
      { who: "siteAdmin", account: { isAdmin: true } },
    ];
    for (const { who, account, role } of cast) {
      const user = await testApp.createTestUser({
        username: `inside_${who.toLowerCase()}`,
        email: `inside_${who.toLowerCase()}@example.com`,
        ...account,
      });
      if (role) {
        const created = await testApp.createTestRole(communityId, role);
        await testApp.createTestCommunityMember(user.id, created.id);
        if (who === "member") memberRoleId = created.id;
      }
      userIds[who] = user.id;
      usernames[who] = user.username;
      tokens[who] = await testApp.generateTestToken(user.id, user.username);
    }
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  /** A request's data, or the message it was refused with. */
  const ask = async (
    caller: Caller,
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<{ data?: Record<string, unknown>; refusal?: string }> => {
    const response =
      caller === "anonymous"
        ? await testApp.graphqlRequest(query, variables)
        : await testApp.authenticatedGraphqlRequest(
            query,
            variables,
            tokens[caller],
          );
    const [error] = response.body.errors ?? [];
    return error
      ? { refusal: error.message as string }
      : { data: response.body.data as Record<string, unknown> };
  };

  /** Another member of the community, for a test that removes one. */
  let extras = 0;
  const extraMember = async () => {
    const stamp = ++extras;
    const user = await testApp.createTestUser({
      username: `inside_extra_${stamp}`,
      email: `inside_extra_${stamp}@example.com`,
    });
    const membership = await testApp.createTestCommunityMember(
      user.id,
      memberRoleId,
    );
    return {
      membershipId: membership.id,
      token: await testApp.generateTestToken(user.id, user.username),
    };
  };

  describe("a profile's private content", () => {
    const PROFILE = `query ($username: String!) {
      userProfile(username: $username) { canViewPrivateContent }
    }`;
    const STATS = `query ($userId: ID!) {
      userStats(userId: $userId) { charactersCount }
    }`;

    beforeAll(async () => {
      for (const visibility of [Visibility.PUBLIC, Visibility.PRIVATE]) {
        await testApp.getDb().character.create({
          data: {
            name: `Ridley ${visibility}`,
            ownerId: userIds.member,
            creatorId: userIds.member,
            visibility,
          },
        });
      }
    });

    it.each<[Caller, boolean, number]>([
      ["member", true, 2],
      ["siteAdmin", true, 2],
      ["stranger", false, 1],
      ["staff", false, 1],
      ["anonymous", false, 1],
    ])(
      "for %s: may view it %s, and counts %i characters",
      async (caller, mayView, count) => {
        const profile = await ask(caller, PROFILE, {
          username: usernames.member,
        });
        expect(profile.data?.userProfile).toEqual({
          canViewPrivateContent: mayView,
        });

        const stats = await ask(caller, STATS, { userId: userIds.member });
        expect(stats.data?.userStats).toEqual({ charactersCount: count });
      },
    );
  });

  describe.each([
    [
      "communityMembersByUser",
      `query ($id: ID!) { communityMembersByUser(userId: $id) { __typename } }`,
      "You can only view your own community memberships",
    ],
    [
      "communityInvitationsByInvitee",
      `query ($id: ID!) { communityInvitationsByInvitee(inviteeId: $id) { __typename } }`,
      "You can only view your own invitations",
    ],
    [
      "characterOwnershipChangesByUser",
      `query ($id: ID!) { characterOwnershipChangesByUser(userId: $id) { __typename } }`,
      "You can only view your own ownership changes",
    ],
  ])("%s", (_name, query, refusal) => {
    it("answers the account itself and a site admin", async () => {
      for (const caller of ["member", "siteAdmin"] as const) {
        expect(await ask(caller, query, { id: userIds.member })).toEqual({
          data: expect.anything(),
        });
      }
    });

    it("refuses anyone else, staff of their community included", async () => {
      for (const caller of ["stranger", "staff"] as const) {
        expect(await ask(caller, query, { id: userIds.member })).toEqual({
          refusal,
        });
      }
    });
  });

  describe("removeCommunityMember", () => {
    const REMOVE = `mutation ($id: ID!) { removeCommunityMember(id: $id) { id } }`;

    it("refuses a member removing somebody else", async () => {
      const { membershipId } = await extraMember();

      expect(await ask("member", REMOVE, { id: membershipId })).toEqual({
        refusal: "Cannot remove this community member",
      });
    });

    it.each<[SignedIn]>([["staff"], ["siteAdmin"]])(
      "lets %s remove somebody else",
      async (caller) => {
        const { membershipId } = await extraMember();

        expect(await ask(caller, REMOVE, { id: membershipId })).toEqual({
          data: { removeCommunityMember: { id: membershipId } },
        });
      },
    );

    it("lets a member leave", async () => {
      const { membershipId, token } = await extraMember();

      const response = await testApp.authenticatedGraphqlRequest(
        REMOVE,
        { id: membershipId },
        token,
      );

      expect(response.body.errors).toBeUndefined();
    });
  });

  describe("deleteComment", () => {
    const DELETE = `mutation ($id: ID!) { deleteComment(id: $id) }`;

    /** A comment the member left on the creator's profile. */
    const comment = async () =>
      (
        await testApp.getDb().comment.create({
          data: {
            content: "hello",
            authorId: userIds.member,
            userId: userIds.creator,
          },
        })
      ).id;

    it("refuses somebody who neither wrote it nor is a site admin", async () => {
      expect(await ask("staff", DELETE, { id: await comment() })).toEqual({
        refusal: "Forbidden resource",
      });
    });

    it.each<[SignedIn]>([["member"], ["siteAdmin"]])(
      "lets %s delete it",
      async (caller) => {
        expect(await ask(caller, DELETE, { id: await comment() })).toEqual({
          data: { deleteComment: true },
        });
      },
    );
  });

  describe("createCharacter with a trait review source other than CREATION", () => {
    const CREATE = `mutation ($input: CreateCharacterInput!) {
      createCharacter(input: $input) { id }
    }`;
    const input = () => ({
      name: "Imported",
      speciesId,
      traitReviewSource: "IMPORT",
    });

    it("refuses a member who may create characters", async () => {
      expect(await ask("creator", CREATE, { input: input() })).toEqual({
        refusal: "Only site admins can set a custom trait review source",
      });
    });

    it("lets a site admin", async () => {
      expect(await ask("siteAdmin", CREATE, { input: input() })).toEqual({
        data: { createCharacter: { id: expect.any(String) } },
      });
    });
  });

  describe("the shop", () => {
    const SHOP = `query ($communityId: ID!) {
      shopItems(communityId: $communityId, includeInactive: true) { id }
    }`;
    const REFUND = `mutation ($lineId: ID!) {
      refundShopPurchaseLine(lineId: $lineId) { id }
    }`;
    let lineId: string;

    beforeAll(async () => {
      const db = testApp.getDb();
      const itemType = await db.itemType.create({
        data: { name: "Lantern", communityId },
      });
      const [onSale] = await Promise.all(
        [true, false].map((active) =>
          db.shopItem.create({
            data: { communityId, itemTypeId: itemType.id, active },
          }),
        ),
      );
      const purchase = await db.shopPurchase.create({
        data: { communityId, buyerId: userIds.creator },
      });
      lineId = (
        await db.shopPurchaseLine.create({
          data: { purchaseId: purchase.id, shopItemId: onSale.id },
        })
      ).id;
    });

    it("shows what is not for sale to staff and not to a member", async () => {
      const seenBy = async (caller: Caller) =>
        (
          (await ask(caller, SHOP, { communityId })).data
            ?.shopItems as unknown[]
        ).length;

      expect(await seenBy("staff")).toBe(2);
      expect(await seenBy("member")).toBe(1);
    });

    it("refuses a refund to a member who did not make the purchase", async () => {
      expect(await ask("member", REFUND, { lineId })).toEqual({
        refusal: "That is not your purchase",
      });
    });

    // Staff are past the question of whose purchase it is. What stops them
    // here is that this line was never paid for.
    it("lets staff as far as the refund itself", async () => {
      const { refusal } = await ask("staff", REFUND, { lineId });

      expect(refusal).toBeDefined();
      expect(refusal).not.toBe("That is not your purchase");
      expect(refusal).not.toBe("Forbidden resource");
    });
  });

  describe("a staff note on the currency ledger", () => {
    const LEDGER = `query ($communityId: ID!) {
      currencyTransactions(filters: { communityId: $communityId }) {
        transactions { staffNote }
      }
    }`;

    beforeAll(async () => {
      const db = testApp.getDb();
      const currency = await db.currency.create({
        data: { communityId, name: "Hollow Coin", code: "HC" },
      });
      await db.currencyTransaction.create({
        data: {
          currencyId: currency.id,
          userId: userIds.member,
          kind: "MINT",
          amount: 5,
          balanceAfter: 5,
          batchId: "00000000-0000-0000-0000-000000000001",
          staffNote: "for the raffle",
        },
      });
    });

    const notes = async (caller: Caller) =>
      (
        (await ask(caller, LEDGER, { communityId })).data
          ?.currencyTransactions as { transactions: unknown[] }
      ).transactions;

    it("is shown to staff", async () => {
      expect(await notes("staff")).toEqual([{ staffNote: "for the raffle" }]);
    });

    it("is hidden from the member the row is about", async () => {
      expect(await notes("member")).toEqual([{ staffNote: null }]);
    });
  });

  describe("useItem", () => {
    const USE = `mutation ($itemId: ID!) {
      useItem(input: { itemId: $itemId }) { itemTypeName }
    }`;
    const NOT_A_MEMBER = "You must be a member of this community to use that";

    /** A consumable item of this community's, held by `who`. */
    const itemHeldBy = async (who: SignedIn) => {
      const db = testApp.getDb();
      const itemType = await db.itemType.create({
        data: { name: `Ticket for ${who}`, communityId, isConsumable: true },
      });
      return (
        await db.item.create({
          data: { itemTypeId: itemType.id, ownerId: userIds[who] },
        })
      ).id;
    };

    it("refuses a holder who is not in the item's community", async () => {
      expect(
        await ask("stranger", USE, { itemId: await itemHeldBy("stranger") }),
      ).toEqual({ refusal: NOT_A_MEMBER });
    });

    // The type has no effect configured, so a member is refused too, later
    // and for that reason.
    it("lets a member as far as the item's effect", async () => {
      const { refusal } = await ask("member", USE, {
        itemId: await itemHeldBy("member"),
      });

      expect(refusal).toBeDefined();
      expect(refusal).not.toBe(NOT_A_MEMBER);
      expect(refusal).not.toBe("Forbidden resource");
    });
  });
});
