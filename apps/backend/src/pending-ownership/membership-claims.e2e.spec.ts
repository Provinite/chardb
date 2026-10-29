import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { DiscordService } from "../discord/discord.service";
import { ItemsModule } from "../items/items.module";
import { ItemsService } from "../items/items.service";
import { PendingOwnershipModule } from "./pending-ownership.module";
import { PendingOwnershipService } from "./pending-ownership.service";
import { ExternalAccountsModule } from "../external-accounts/external-accounts.module";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { InviteCodesModule } from "../invite-codes/invite-codes.module";
import { InviteCodesService } from "../invite-codes/invite-codes.service";

const DISCORD_ID = "200000000000000042";
const { DISCORD } = ExternalAccountProvider;

/**
 * A community's items and characters belong only to its members. Something
 * granted to an outside account waits on that account, and becomes the
 * person's when they are both linked and a member -- in whichever order those
 * happen.
 */
describe("Pending ownership and community membership (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let items: ItemsService;
  let pending: PendingOwnershipService;
  let accounts: ExternalAccountsService;
  let invites: InviteCodesService;
  const getUserInfo = jest.fn().mockResolvedValue({
    userId: DISCORD_ID,
    username: "neo.baka",
    displayName: "Neo the Baka",
  });

  let communityId: string;
  let memberRoleId: string;
  let otherCommunityId: string;
  let itemTypeId: string;
  let characterId: string;
  let player: { id: string };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        imports: [
          DatabaseModule,
          AuthModule,
          ItemsModule,
          PendingOwnershipModule,
          ExternalAccountsModule,
          InviteCodesModule,
        ],
      },
      (builder) =>
        builder.overrideProvider(DiscordService).useValue({ getUserInfo }),
    );
    db = testApp.getDb();
    items = testApp.getModuleRef().get(ItemsService);
    pending = testApp.getModuleRef().get(PendingOwnershipService);
    accounts = testApp.getModuleRef().get(ExternalAccountsService);
    invites = testApp.getModuleRef().get(InviteCodesService);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    communityId = (await testApp.createTestCommunity("Ours")).id;
    otherCommunityId = (await testApp.createTestCommunity("Theirs")).id;
    memberRoleId = (await testApp.createTestRole(communityId)).id;
    itemTypeId = (
      await db.itemType.create({ data: { name: "Candy Corn", communityId } })
    ).id;
    const species = await testApp.createTestSpecies(communityId);
    characterId = (
      await db.character.create({
        data: { name: "Lantern Moth", speciesId: species.id },
      })
    ).id;
    const stamp = Date.now();
    player = await testApp.createTestUser({
      username: `player_${stamp}`,
      email: `player_${stamp}@example.com`,
    });
  });

  const link = () =>
    accounts.linkExternalAccount(player.id, DISCORD, DISCORD_ID, "player");

  const grantToDiscord = () =>
    items.grantItem({
      itemTypeId,
      quantity: 1,
      pendingOwner: { provider: DISCORD, providerAccountId: DISCORD_ID },
      actor: { actorLabel: "test" },
    });

  const join = async () => {
    const code = await db.inviteCode.create({
      data: {
        id: `invite-${Date.now()}`,
        maxClaims: 1,
        creatorId: player.id,
        roleId: memberRoleId,
      },
    });
    await invites.claim(code.id, { userId: player.id });
  };

  const itemOwner = async () =>
    (await db.item.findFirstOrThrow({ where: { itemTypeId } })).ownerId;
  const characterOwner = async () =>
    (await db.character.findUniqueOrThrow({ where: { id: characterId } }))
      .ownerId;

  describe("granting to an account whose person is linked", () => {
    it("gives it to them straight away when they are a member", async () => {
      await testApp.createTestCommunityMember(player.id, memberRoleId);
      await link();
      await grantToDiscord();
      expect(await itemOwner()).toBe(player.id);
    });

    it("keeps an item waiting on the account when they are not a member", async () => {
      await link();
      await expect(grantToDiscord()).resolves.toBeDefined();
      expect(await itemOwner()).toBeNull();
      expect(
        await db.pendingOwnership.count({
          where: { providerAccountId: DISCORD_ID, claimedAt: null },
        }),
      ).toBe(1);
    });

    it("keeps a character waiting on the account when they are not a member", async () => {
      await link();
      await pending.createForCharacter(characterId, DISCORD, DISCORD_ID);
      expect(await characterOwner()).toBeNull();
    });

    it("still refuses a grant straight to a user who is not a member", async () => {
      await expect(
        items.grantItem({
          itemTypeId,
          userId: player.id,
          quantity: 1,
          actor: { actorLabel: "test" },
        }),
      ).rejects.toThrow(
        "User is not a member of the community that owns this item type",
      );
    });
  });

  describe("linking an account", () => {
    it("claims what was waiting in the communities they belong to", async () => {
      await grantToDiscord();
      await testApp.createTestCommunityMember(player.id, memberRoleId);
      await link();
      expect(await itemOwner()).toBe(player.id);
    });

    it("leaves what was granted in communities they are not in", async () => {
      await grantToDiscord();
      await pending.createForCharacter(characterId, DISCORD, DISCORD_ID);
      await testApp.createTestCommunityMember(
        player.id,
        (await testApp.createTestRole(otherCommunityId)).id,
      );
      await link();
      expect(await itemOwner()).toBeNull();
      expect(await characterOwner()).toBeNull();
    });
  });

  // How the Halloween bot grants a prize: inside the knock's own transaction,
  // so the win and the prize commit together.
  describe("granting inside a caller's transaction", () => {
    const grantIn = (
      tx: Parameters<ItemsService["grantItemInTransaction"]>[0],
    ) =>
      items.grantItemInTransaction(
        tx,
        {
          itemTypeId,
          quantity: 1,
          pendingOwner: { provider: DISCORD, providerAccountId: DISCORD_ID },
          actor: { actorLabel: "test" },
        },
        { discordIdVerified: true },
      );

    beforeEach(() => getUserInfo.mockClear());

    it("commits with the caller's transaction", async () => {
      await testApp.createTestCommunityMember(player.id, memberRoleId);
      await link();
      await db.$transaction((tx) => grantIn(tx));
      expect(await itemOwner()).toBe(player.id);
      expect(await db.itemTransaction.count({ where: { kind: "GRANT" } })).toBe(
        1,
      );
    });

    it("rolls back with it, leaving no item, claim or history", async () => {
      await expect(
        db.$transaction(async (tx) => {
          await grantIn(tx);
          throw new Error("the knock failed after the grant");
        }),
      ).rejects.toThrow("the knock failed after the grant");
      expect(await db.item.count({ where: { itemTypeId } })).toBe(0);
      expect(await db.pendingOwnership.count()).toBe(0);
      expect(await db.itemTransaction.count()).toBe(0);
    });

    it("does not ask Discord about an id that came from Discord itself", async () => {
      await db.$transaction((tx) => grantIn(tx));
      expect(getUserInfo).not.toHaveBeenCalled();
    });

    it("still asks Discord about an id typed in by staff", async () => {
      await grantToDiscord();
      expect(getUserInfo).toHaveBeenCalledWith(DISCORD_ID);
    });

    it("keeps the Discord names it was told, for staff to search by (#445)", async () => {
      await grantToDiscord();
      const pendingRow = await db.pendingOwnership.findFirstOrThrow({
        where: { providerAccountId: DISCORD_ID },
      });
      expect(pendingRow.displayIdentifier).toBe("neo.baka");
      expect(pendingRow.displayName).toBe("Neo the Baka");
    });
  });

  describe("joining a community", () => {
    it("claims that community's items and characters waiting on their linked accounts", async () => {
      await link();
      await grantToDiscord();
      await pending.createForCharacter(characterId, DISCORD, DISCORD_ID);

      await join();

      expect(await itemOwner()).toBe(player.id);
      expect(await characterOwner()).toBe(player.id);
      expect(
        await db.pendingOwnership.count({ where: { claimedAt: null } }),
      ).toBe(0);
      // The item's history names who it went to, and why.
      const claim = await db.itemTransaction.findFirst({
        where: { kind: "CLAIM", toUserId: player.id },
      });
      expect(claim).not.toBeNull();
    });

    it("leaves other communities' waiting grants alone", async () => {
      await link();
      const theirType = await db.itemType.create({
        data: { name: "Elsewhere", communityId: otherCommunityId },
      });
      await items.grantItem({
        itemTypeId: theirType.id,
        quantity: 1,
        pendingOwner: { provider: DISCORD, providerAccountId: DISCORD_ID },
        actor: { actorLabel: "test" },
      });

      await join();

      const theirs = await db.item.findFirstOrThrow({
        where: { itemTypeId: theirType.id },
      });
      expect(theirs.ownerId).toBeNull();
    });

    it("claims nothing for someone with no linked account", async () => {
      await grantToDiscord();
      await join();
      expect(await itemOwner()).toBeNull();
    });
  });
});
