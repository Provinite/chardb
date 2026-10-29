import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { DiscordService } from "../discord/discord.service";
import { ItemsModule } from "../items/items.module";
import { PendingOwnershipModule } from "./pending-ownership.module";
import { PendingOwnershipService } from "./pending-ownership.service";
import { ExternalAccountsModule } from "../external-accounts/external-accounts.module";

const { DISCORD, DEVIANTART } = ExternalAccountProvider;
const NEO = "214000000000009071";
const ART = "some-deviantart-uuid";

/**
 * External members against a real Postgres: the holders-and-counts query is
 * raw SQL, so only a real database proves it (#445).
 */
describe("External members (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let pending: PendingOwnershipService;
  let communityId: string;
  let itemTypeId: string;
  let speciesId: string;

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
        ],
      },
      (builder) =>
        builder.overrideProvider(DiscordService).useValue({
          getUserInfo: jest.fn(),
        }),
    );
    db = testApp.getDb();
    pending = testApp.getModuleRef().get(PendingOwnershipService);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    communityId = (await testApp.createTestCommunity("Ours")).id;
    itemTypeId = (
      await db.itemType.create({ data: { name: "MYO Ticket", communityId } })
    ).id;
    speciesId = (await testApp.createTestSpecies(communityId)).id;
  });

  /** An item waiting on an account, as a grant leaves it. */
  const waitingItem = async (
    providerAccountId: string,
    {
      provider = DISCORD,
      createdAt = new Date("2025-11-15T19:00:00Z"),
      names = {} as { displayIdentifier?: string; displayName?: string },
      onItemType = itemTypeId,
    } = {},
  ) => {
    const item = await db.item.create({
      data: { itemTypeId: onItemType, ownerId: null },
    });
    return db.pendingOwnership.create({
      data: {
        itemId: item.id,
        provider,
        providerAccountId,
        createdAt,
        ...names,
      },
    });
  };

  const neoNames = { displayIdentifier: "neo.baka", displayName: "Neo" };
  const batchAt = new Date("2025-11-22T19:00:00Z");

  /** One older row from before names were kept, then a batch of three. */
  const seedNeo = async () => {
    await waitingItem(NEO, { createdAt: new Date("2025-11-01T19:00:00Z") });
    const batch = [];
    for (let i = 0; i < 3; i++) {
      batch.push(
        await waitingItem(NEO, { createdAt: batchAt, names: neoNames }),
      );
    }
    return batch;
  };

  it("names each person by their newest row and counts everything waiting on them", async () => {
    await seedNeo();

    const { members } = await pending.findExternalMembers(communityId, {});

    expect(members).toHaveLength(1);
    expect(members[0].holder.displayIdentifier).toBe("neo.baka");
    expect(members[0].holder.displayName).toBe("Neo");
    expect(members[0].itemCount).toBe(4);
    expect(members[0].characterCount).toBe(0);
  });

  it("settles a tie on time by id, so the same row names them every time", async () => {
    const batch = await seedNeo();
    const highestId = [...batch]
      .map((r) => r.id)
      .sort()
      .at(-1);

    for (let i = 0; i < 3; i++) {
      const { members } = await pending.findExternalMembers(communityId, {});
      expect(members[0].holder.id).toBe(highestId);
    }
  });

  it("counts a search's match by everything waiting on them, not only the matching rows", async () => {
    await seedNeo();

    const { members } = await pending.findExternalMembers(communityId, {
      search: "neo.ba",
    });

    // The oldest row has no names and does not match the search.
    expect(members[0].itemCount).toBe(4);
  });

  it("leaves out what is no longer waiting here", async () => {
    await seedNeo();
    // Destroyed.
    const destroyed = await waitingItem(NEO, { names: neoNames });
    await db.item.update({
      where: { id: destroyed.itemId! },
      data: { destroyedAt: new Date() },
    });
    // Claimed.
    const claimed = await waitingItem(NEO, { names: neoNames });
    await db.pendingOwnership.update({
      where: { id: claimed.id },
      data: { claimedAt: new Date() },
    });
    // Another community's.
    const elsewhere = await testApp.createTestCommunity("Theirs");
    const theirType = await db.itemType.create({
      data: { name: "Their Ticket", communityId: elsewhere.id },
    });
    await waitingItem(NEO, { names: neoNames, onItemType: theirType.id });

    const { members } = await pending.findExternalMembers(communityId, {});

    expect(members[0].itemCount).toBe(4);
  });

  it("counts characters apart from items, and keeps the page's order", async () => {
    await seedNeo();
    const character = await db.character.create({
      data: { name: "Pinefall", speciesId },
    });
    await db.pendingOwnership.create({
      data: {
        characterId: character.id,
        provider: DEVIANTART,
        providerAccountId: ART,
        displayIdentifier: "someartist",
        createdAt: new Date("2025-11-25T19:00:00Z"),
      },
    });

    const { members } = await pending.findExternalMembers(communityId, {});

    // Newest waiting claim first: the artist's character is newer.
    expect(
      members.map((m) => [
        m.holder.providerAccountId,
        m.itemCount,
        m.characterCount,
      ]),
    ).toEqual([
      [ART, 0, 1],
      [NEO, 4, 0],
    ]);
  });
});
