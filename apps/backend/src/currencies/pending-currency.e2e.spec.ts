import {
  CurrencyTransactionKind,
  CurrencyTransactionSource,
  ExternalAccountProvider,
  NotificationKind,
} from "@chardb/database";
import { lockPendingAccounts } from "../pending-ownership/utils/lock-pending-accounts";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { DiscordService } from "../discord/discord.service";
import { DeviantArtService } from "../deviantart/deviantart.service";
import { ItemsModule } from "../items/items.module";
import { ItemsService } from "../items/items.service";
import { PendingOwnershipModule } from "../pending-ownership/pending-ownership.module";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { ExternalAccountsModule } from "../external-accounts/external-accounts.module";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { InviteCodesModule } from "../invite-codes/invite-codes.module";
import { InviteCodesService } from "../invite-codes/invite-codes.service";
import { CurrenciesModule } from "./currencies.module";
import { CurrencyLedgerService } from "./currency-ledger.service";

const DISCORD_ID = "200000000000000042";
const DEVIANTART_HANDLE = "some-artist";
const DEVIANTART_UUID = "6a8a2c4e-1f3b-4d5e-9c7a-0b1d2e3f4a5b";
const { DISCORD, DEVIANTART } = ExternalAccountProvider;

/**
 * Currency minted to an account with no user here waits on that account, and
 * is credited -- with its ledger row -- when its person has linked it and
 * belongs to the community, in whichever order (#610).
 */
describe("Pending currency grants (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let ledger: CurrencyLedgerService;
  let items: ItemsService;
  let pending: PendingOwnershipService;
  let accounts: ExternalAccountsService;
  let invites: InviteCodesService;
  const getUserInfo = jest.fn().mockResolvedValue({
    userId: DISCORD_ID,
    username: "neo.baka",
    displayName: "Neo the Baka",
  });
  const resolveUsernameToId = jest.fn().mockResolvedValue(DISCORD_ID);
  const resolveUsername = jest.fn().mockResolvedValue({
    uuid: DEVIANTART_UUID,
    username: "Some-Artist",
  });

  let communityId: string;
  let memberRoleId: string;
  let currencyId: string;
  let staff: { id: string };
  let player: { id: string };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        imports: [
          DatabaseModule,
          AuthModule,
          ItemsModule,
          CurrenciesModule,
          PendingOwnershipModule,
          ExternalAccountsModule,
          InviteCodesModule,
        ],
      },
      (builder) =>
        builder
          .overrideProvider(DiscordService)
          .useValue({ getUserInfo, resolveUsernameToId })
          .overrideProvider(DeviantArtService)
          .useValue({ resolveUsername }),
    );
    db = testApp.getDb();
    ledger = testApp.getModuleRef().get(CurrencyLedgerService);
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
    memberRoleId = (await testApp.createTestRole(communityId)).id;
    currencyId = (
      await db.currency.create({
        data: { communityId, name: "Clover", code: "CLV" },
      })
    ).id;
    const stamp = Date.now();
    staff = await testApp.createTestUser({
      username: `staff_${stamp}`,
      email: `staff_${stamp}@example.com`,
    });
    player = await testApp.createTestUser({
      username: `player_${stamp}`,
      email: `player_${stamp}@example.com`,
    });
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

  const balance = async () =>
    (
      await db.currencyBalance.findUnique({
        where: { currencyId_userId: { currencyId, userId: player.id } },
      })
    )?.amount ?? 0;

  const mintToDeviantArt = (amount = 250) =>
    ledger.mint(
      {
        currencyId,
        pendingOwners: [
          { provider: DEVIANTART, providerAccountId: DEVIANTART_HANDLE },
        ],
        amount,
        reason: "Imported from the Cloverse bank",
        staffNote: "bank sheet row",
      },
      staff.id,
    );

  it("waits on a DeviantArt handle as its UUID, then credits it with a ledger row once linked and joined", async () => {
    const batchId = await mintToDeviantArt();

    const waiting = await db.pendingOwnership.findFirstOrThrow({
      where: { currencyId },
    });
    expect(waiting).toMatchObject({
      provider: DEVIANTART,
      providerAccountId: DEVIANTART_UUID,
      displayIdentifier: "Some-Artist",
      amount: 250,
      batchId,
      actorUserId: staff.id,
      claimedAt: null,
    });
    expect(await db.currencyTransaction.count()).toBe(0);

    await accounts.linkExternalAccount(
      player.id,
      DEVIANTART,
      DEVIANTART_UUID,
      "Some-Artist",
    );
    // Linked but not a member: it keeps waiting.
    expect(await balance()).toBe(0);

    await join();

    expect(await balance()).toBe(250);
    const row = await db.currencyTransaction.findFirstOrThrow({
      where: { currencyId, userId: player.id },
    });
    expect(row).toMatchObject({
      kind: CurrencyTransactionKind.MINT,
      amount: 250,
      balanceAfter: 250,
      batchId,
      actorUserId: staff.id,
      reason: "Imported from the Cloverse bank",
      staffNote: "bank sheet row",
      source: CurrencyTransactionSource.PENDING_GRANT,
      sourceId: waiting.id,
    });
    const claimed = await db.pendingOwnership.findUniqueOrThrow({
      where: { id: waiting.id },
    });
    expect(claimed.claimedByUserId).toBe(player.id);
    expect(claimed.claimedAt).not.toBeNull();
  });

  it("credits on link when the person is already a member", async () => {
    await testApp.createTestCommunityMember(player.id, memberRoleId);
    await ledger.mint(
      {
        currencyId,
        pendingOwners: [{ provider: DISCORD, providerAccountId: DISCORD_ID }],
        amount: 40,
        reason: "Event prize",
      },
      staff.id,
    );
    expect(await balance()).toBe(0);

    await accounts.linkExternalAccount(player.id, DISCORD, DISCORD_ID, "neo");

    expect(await balance()).toBe(40);
  });

  it("still credits coin minted before the currency was archived", async () => {
    await mintToDeviantArt(60);
    await db.currency.update({
      where: { id: currencyId },
      data: { archivedAt: new Date() },
    });
    await testApp.createTestCommunityMember(player.id, memberRoleId);

    await accounts.linkExternalAccount(
      player.id,
      DEVIANTART,
      DEVIANTART_UUID,
      "Some-Artist",
    );

    expect(await balance()).toBe(60);
  });

  it("credits a grant once when two claims race for it", async () => {
    await mintToDeviantArt(80);
    await testApp.createTestCommunityMember(player.id, memberRoleId);
    await db.externalAccount.create({
      data: {
        userId: player.id,
        provider: DEVIANTART,
        providerAccountId: DEVIANTART_UUID,
        displayName: "Some-Artist",
      },
    });

    await Promise.all([
      pending.claimAllForAccount(player.id, DEVIANTART, DEVIANTART_UUID),
      pending.claimAllForAccount(player.id, DEVIANTART, DEVIANTART_UUID),
    ]);

    expect(await balance()).toBe(80);
    expect(
      await db.currencyTransaction.count({ where: { userId: player.id } }),
    ).toBe(1);
  });

  it("keeps each mint its own claim and its own ledger row", async () => {
    await mintToDeviantArt(100);
    await mintToDeviantArt(25);
    await testApp.createTestCommunityMember(player.id, memberRoleId);

    await accounts.linkExternalAccount(
      player.id,
      DEVIANTART,
      DEVIANTART_UUID,
      "Some-Artist",
    );

    expect(await balance()).toBe(125);
    const rows = await db.currencyTransaction.findMany({
      where: { userId: player.id },
      orderBy: { balanceAfter: "asc" },
    });
    expect(rows.map((r) => r.amount).sort()).toEqual([100, 25].sort());
    expect(rows.at(-1)?.balanceAfter).toBe(125);
  });

  it("mints straight to a linked member, in the same batch as the named users", async () => {
    await testApp.createTestCommunityMember(player.id, memberRoleId);
    await testApp.createTestCommunityMember(staff.id, memberRoleId);
    await accounts.linkExternalAccount(
      player.id,
      DEVIANTART,
      DEVIANTART_UUID,
      "Some-Artist",
    );

    const batchId = await ledger.mint(
      {
        currencyId,
        userIds: [staff.id],
        pendingOwners: [
          { provider: DEVIANTART, providerAccountId: DEVIANTART_HANDLE },
        ],
        amount: 10,
        reason: "Event prize",
      },
      staff.id,
    );

    expect(await balance()).toBe(10);
    expect(await db.pendingOwnership.count({ where: { currencyId } })).toBe(0);
    const rows = await db.currencyTransaction.findMany({ where: { batchId } });
    expect(rows.map((r) => r.userId).sort()).toEqual(
      [player.id, staff.id].sort(),
    );
    expect(
      rows.every((r) => r.source === CurrencyTransactionSource.DIRECT),
    ).toBe(true);
  });

  it("pays each account named, even when both are one member's", async () => {
    await testApp.createTestCommunityMember(player.id, memberRoleId);
    await accounts.linkExternalAccount(player.id, DISCORD, DISCORD_ID, "neo");
    await accounts.linkExternalAccount(
      player.id,
      DEVIANTART,
      DEVIANTART_UUID,
      "Some-Artist",
    );

    await ledger.mint(
      {
        currencyId,
        userIds: [player.id],
        pendingOwners: [
          { provider: DISCORD, providerAccountId: DISCORD_ID },
          { provider: DEVIANTART, providerAccountId: DEVIANTART_HANDLE },
        ],
        amount: 10,
        reason: "Event prize",
      },
      staff.id,
    );

    expect(await balance()).toBe(30);
  });

  it("names the same account once when it is listed twice", async () => {
    await ledger.mint(
      {
        currencyId,
        pendingOwners: [
          { provider: DEVIANTART, providerAccountId: DEVIANTART_HANDLE },
          { provider: DEVIANTART, providerAccountId: "Some-Artist" },
        ],
        amount: 10,
        reason: "Event prize",
      },
      staff.id,
    );

    expect(await db.pendingOwnership.count({ where: { currencyId } })).toBe(1);
  });

  it("waits on a Discord username as its id, looked up in the community's server", async () => {
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: "300000000000000001" },
    });

    await ledger.mint(
      {
        currencyId,
        pendingOwners: [{ provider: DISCORD, providerAccountId: "neo.baka" }],
        amount: 15,
        reason: "Event prize",
      },
      staff.id,
    );

    expect(resolveUsernameToId).toHaveBeenCalledWith(
      "300000000000000001",
      "neo.baka",
    );
    expect(
      await db.pendingOwnership.findFirstOrThrow({ where: { currencyId } }),
    ).toMatchObject({
      providerAccountId: DISCORD_ID,
      displayIdentifier: "neo.baka",
      displayName: "Neo the Baka",
    });
  });

  it("tells the member when a grant is claimed, and nobody when it is minted", async () => {
    await mintToDeviantArt(250);
    expect(await db.notification.count()).toBe(0);

    await testApp.createTestCommunityMember(player.id, memberRoleId);
    await accounts.linkExternalAccount(
      player.id,
      DEVIANTART,
      DEVIANTART_UUID,
      "Some-Artist",
    );

    const notes = await db.notification.findMany({
      where: { recipientId: player.id },
    });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      kind: NotificationKind.CURRENCY_RECEIVED,
      communityId,
      subjectId: currencyId,
      data: expect.objectContaining({ amount: 250 }),
    });
  });

  describe("racing a mint against a claim", () => {
    /** Resolves once an advisory lock is in the state asked for. */
    const advisoryLock = async (granted: boolean) => {
      for (let i = 0; i < 200; i++) {
        const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`
          SELECT count(*) AS n FROM pg_locks
          WHERE locktype = 'advisory' AND granted = ${granted}`;
        if (n > 0n) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error("No advisory lock reached that state");
    };
    const someoneWaitsOnALock = () => advisoryLock(false);
    const someoneHoldsALock = () => advisoryLock(true);

    it("a link claims coin from a mint that was still in flight when it linked", async () => {
      await testApp.createTestCommunityMember(player.id, memberRoleId);
      let commitMint = () => {};
      const mintHeld = new Promise<void>((resolve) => {
        commitMint = resolve;
      });

      // A mint that has decided the account is unlinked and written its row,
      // but not yet committed.
      const mint = db.$transaction(async (tx) => {
        await lockPendingAccounts(tx, [
          { provider: DEVIANTART, providerAccountId: DEVIANTART_UUID },
        ]);
        await tx.pendingOwnership.create({
          data: {
            currencyId,
            amount: 90,
            provider: DEVIANTART,
            providerAccountId: DEVIANTART_UUID,
            batchId: "in-flight-batch",
            reason: "Event prize",
            actorUserId: staff.id,
          },
        });
        await mintHeld;
      });

      const link = accounts.linkExternalAccount(
        player.id,
        DEVIANTART,
        DEVIANTART_UUID,
        "Some-Artist",
      );
      await someoneWaitsOnALock();
      commitMint();
      await Promise.all([mint, link]);

      expect(await balance()).toBe(90);
    });

    it("a mint pays a member directly once their join, in flight when it began, commits", async () => {
      await accounts.linkExternalAccount(
        player.id,
        DEVIANTART,
        DEVIANTART_UUID,
        "Some-Artist",
      );
      let commitJoin = () => {};
      const joinHeld = new Promise<void>((resolve) => {
        commitJoin = resolve;
      });

      // A join that has taken the account's lock but not yet committed the
      // membership.
      const joining = db.$transaction(async (tx) => {
        await tx.communityMember.create({
          data: { userId: player.id, roleId: memberRoleId },
        });
        await pending.claimPendingInCommunity(tx, player.id, communityId);
        await joinHeld;
      });
      await someoneHoldsALock();

      const mint = mintToDeviantArt(70);
      await someoneWaitsOnALock();
      commitJoin();
      await Promise.all([joining, mint]);

      expect(await balance()).toBe(70);
      expect(await db.pendingOwnership.count({ where: { currencyId } })).toBe(
        0,
      );
    });
  });

  it("refuses a mint that names nobody", async () => {
    await expect(
      ledger.mint(
        { currencyId, userIds: [], amount: 10, reason: "Nobody" },
        staff.id,
      ),
    ).rejects.toThrow("Name at least one recipient");
  });

  describe("staff views", () => {
    beforeEach(async () => {
      await mintToDeviantArt(100);
      await mintToDeviantArt(25);
    });

    it("lists the balance in the account's pending holdings", async () => {
      const report = await items.findPendingHoldings(
        communityId,
        DEVIANTART,
        DEVIANTART_UUID,
      );

      expect(report.holder.displayIdentifier).toBe("Some-Artist");
      expect(report.balances).toEqual([
        expect.objectContaining({
          currency: expect.objectContaining({ id: currencyId }),
          amount: 125,
          grantCount: 2,
        }),
      ]);
    });

    it("lists the account among external members with its balance", async () => {
      const { members } = await pending.findExternalMembers(communityId, {});

      expect(members).toHaveLength(1);
      expect(members[0]).toMatchObject({
        itemCount: 0,
        characterCount: 0,
        balances: [
          expect.objectContaining({
            currency: expect.objectContaining({ id: currencyId }),
            amount: 125,
            grantCount: 2,
          }),
        ],
      });
    });

    it("drops the balance from both once it is claimed, and names the claimant", async () => {
      await testApp.createTestCommunityMember(player.id, memberRoleId);
      await accounts.linkExternalAccount(
        player.id,
        DEVIANTART,
        DEVIANTART_UUID,
        "Some-Artist",
      );

      const report = await items.findPendingHoldings(
        communityId,
        DEVIANTART,
        DEVIANTART_UUID,
      );
      expect(report.balances).toEqual([]);
      expect(report.claimedBy?.id).toBe(player.id);
      const { members } = await pending.findExternalMembers(communityId, {});
      expect(members).toHaveLength(0);
    });
  });
});
