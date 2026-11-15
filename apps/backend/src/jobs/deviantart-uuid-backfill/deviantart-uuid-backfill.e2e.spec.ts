import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
// Before the backfill module: loading PendingOwnershipModule first meets the
// Auth -> Users -> Items -> PendingOwnership import cycle mid-evaluation.
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { DeviantArtService } from "../../deviantart/deviantart.service";
import { DeviantartUuidBackfillModule } from "./deviantart-uuid-backfill.module";
import { DeviantartUuidBackfillService } from "./deviantart-uuid-backfill.service";

const { DEVIANTART } = ExternalAccountProvider;
const HANDLE = "some-artist";
const UUID = "6a8a2c4e-1f3b-4d5e-9c7a-0b1d2e3f4a5b";

/**
 * The backfill turns DeviantArt handles left on pending owners into the
 * UUIDs that linking stores, so the claim can match (#449).
 */
describe("DeviantArt UUID backfill (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let backfill: DeviantartUuidBackfillService;
  const resolveUsername = jest
    .fn()
    .mockResolvedValue({ uuid: UUID, username: "Some-Artist" });

  let itemTypeId: string;
  let speciesId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, DeviantartUuidBackfillModule] },
      (builder) =>
        builder.overrideProvider(DeviantArtService).useValue({
          resolveUsername,
        }),
    );
    db = testApp.getDb();
    backfill = testApp.getModuleRef().get(DeviantartUuidBackfillService);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const communityId = (await testApp.createTestCommunity("Ours")).id;
    itemTypeId = (
      await db.itemType.create({ data: { name: "Candy Corn", communityId } })
    ).id;
    speciesId = (await testApp.createTestSpecies(communityId)).id;
  });

  const itemWaitingOnHandle = async () => {
    const item = await db.item.create({ data: { itemTypeId } });
    await db.pendingOwnership.create({
      data: {
        itemId: item.id,
        provider: DEVIANTART,
        providerAccountId: HANDLE,
        displayIdentifier: HANDLE,
      },
    });
    return item.id;
  };

  const characterWaitingOnHandle = async () => {
    const character = await db.character.create({
      data: { name: "Lantern Moth", speciesId },
    });
    await db.pendingOwnership.create({
      data: {
        characterId: character.id,
        provider: DEVIANTART,
        providerAccountId: HANDLE,
      },
    });
    return character.id;
  };

  it("converts items waiting on a handle, not only characters", async () => {
    const itemId = await itemWaitingOnHandle();
    const characterId = await characterWaitingOnHandle();

    await backfill.run("job-1");

    const rows = await db.pendingOwnership.findMany({
      where: { provider: DEVIANTART },
    });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.providerAccountId).toBe(UUID);
      expect(row.displayIdentifier).toBe("Some-Artist");
    }
    expect(rows.map((r) => r.itemId ?? r.characterId).sort()).toEqual(
      [itemId, characterId].sort(),
    );
  });
});
