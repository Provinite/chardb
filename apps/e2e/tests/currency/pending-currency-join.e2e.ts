import { presetTest, expect } from "../../src/fixtures.js";
import { makePrisma } from "../../src/world/ctx.js";
import {
  CurrencyTransactionSource,
  ExternalAccountProvider,
  SeedCreateCurrencyDocument,
  SeedCurrencyTransactionsDocument,
  SeedJoinCommunityDocument,
  SeedMemberWalletDocument,
  SeedMintCurrencyDocument,
} from "../../src/generated/graphql.js";

/**
 * Currency waiting on an external account is credited when its person joins
 * through the real API (#610). The recipient is a DeviantArt handle, answered
 * by the suite's fake DeviantArt; nothing here reaches Discord.
 */

const DEVIANTART = ExternalAccountProvider.Deviantart;
const HANDLE = "lantern-moth";

const test = presetTest("open-signup");

test.describe("claiming on join", () => {
  test.use({ persona: "anon" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("joining with a linked account credits what waited on it, with its ledger row", async ({
    world,
  }) => {
    const { createCurrency } = await world
      .as("commadmin")
      .gql(SeedCreateCurrencyDocument, {
        input: { communityId: world.open.id, name: "Glade Leaf", code: "GLF" },
      });
    await world.as("commadmin").gql(SeedMintCurrencyDocument, {
      input: {
        currencyId: createCurrency.id,
        pendingOwners: [{ provider: DEVIANTART, providerAccountId: HANDLE }],
        amount: 300,
        reason: "Imported from the bank",
      },
    });

    // Linking is an OAuth round trip the suite cannot drive, so the link row
    // is written directly: it is what linking leaves behind. Joining then
    // goes through the real API, which is where the claim runs.
    const prisma = makePrisma();
    let pendingId: string;
    try {
      const waiting = await prisma.pendingOwnership.findFirstOrThrow({
        where: { currencyId: createCurrency.id },
      });
      pendingId = waiting.id;
      await prisma.externalAccount.create({
        data: {
          userId: world.users.outsider.userId,
          provider: DEVIANTART,
          providerAccountId: waiting.providerAccountId,
          displayName: HANDLE,
        },
      });
    } finally {
      await prisma.$disconnect();
    }

    await world
      .as("outsider")
      .gql(SeedJoinCommunityDocument, { communityId: world.open.id });

    const { memberWallet } = await world
      .as("outsider")
      .gql(SeedMemberWalletDocument, {
        communityId: world.open.id,
        userId: world.users.outsider.userId,
      });
    expect(
      memberWallet.balances.find((b) => b.currency.code === "GLF")?.amount,
    ).toBe(300);

    const { currencyTransactions } = await world
      .as("outsider")
      .gql(SeedCurrencyTransactionsDocument, {
        filters: {
          communityId: world.open.id,
          userId: world.users.outsider.userId,
        },
      });
    expect(currencyTransactions.transactions).toEqual([
      expect.objectContaining({
        amount: 300,
        reason: "Imported from the bank",
        source: CurrencyTransactionSource.PendingGrant,
        sourceId: pendingId,
      }),
    ]);
  });
});
