import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedMintCurrencyDocument,
  SeedBurnCurrencyDocument,
  SeedTransferCurrencyDocument,
  SeedMemberWalletDocument,
  SeedCurrencySupplyDocument,
  SeedCurrencyTransactionsDocument,
  SeedCurrencyHoldersDocument,
  SeedCurrenciesDocument,
  SeedCreateCurrencyDocument,
  SeedUpdateCurrencyDocument,
  CurrencyTransactionKind,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * The currency API against a real database.
 *
 * The unit tests mock Prisma, so they prove the service asks for the right
 * things. These prove the database answers the way the service assumes -- in
 * particular that the non-negative CHECK constraint fires, which no mocked test
 * can establish.
 */
test.describe("currency API", () => {
  test.use({ persona: "anon" });

  test.describe("reads", () => {
    test("a wallet lists every currency, including ones held at zero", async ({
      world,
    }) => {
      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });

      const byCode = Object.fromEntries(
        memberWallet.balances.map((b) => [b.currency.code, b.amount]),
      );

      // 500 granted, 120 sent away.
      expect(byCode.HC).toBe(world.balances.member);
      // Never held any, but the member still needs to know it exists.
      expect(byCode.FT).toBe(0);
    });

    test("an archived currency is absent from a wallet", async ({ world }) => {
      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });

      expect(memberWallet.balances.map((b) => b.currency.code)).not.toContain(
        "OBM",
      );
    });

    test("supply counts circulation and holders separately", async ({
      world,
    }) => {
      const { currencySupply } = await world
        .as("member")
        .gql(SeedCurrencySupplyDocument, { communityId: world.community.id });

      const coin = currencySupply.find((s) => s.currency.code === "HC");

      // 1000 minted, none removed, split across two people. A transfer moved
      // coin between them without changing either number.
      expect(coin?.inCirculation).toBe(1000);
      expect(coin?.holders).toBe(2);
      expect(coin?.mintedLast30Days).toBe(1000);
      expect(coin?.removedLast30Days).toBe(0);
      expect(coin?.largestBalance).toBe(world.balances.othermember);
    });

    test("supply includes archived currencies, which still hold balances", async ({
      world,
    }) => {
      const { currencySupply } = await world
        .as("member")
        .gql(SeedCurrencySupplyDocument, { communityId: world.community.id });

      expect(currencySupply.map((s) => s.currency.code)).toContain("OBM");
    });

    test("the currency list hides archived unless asked", async ({ world }) => {
      const visible = await world
        .as("member")
        .gql(SeedCurrenciesDocument, { communityId: world.community.id });
      expect(visible.currencies.map((c) => c.code)).not.toContain("OBM");

      const all = await world.as("member").gql(SeedCurrenciesDocument, {
        communityId: world.community.id,
        includeArchived: true,
      });
      expect(all.currencies.map((c) => c.code)).toContain("OBM");
    });

    test("holders are largest first and exclude zero balances", async ({
      world,
    }) => {
      const { currencyHolders } = await world
        .as("member")
        .gql(SeedCurrencyHoldersDocument, {
          currencyId: world.currencies.coin.id,
        });

      expect(currencyHolders.map((h) => h.amount)).toEqual([
        world.balances.othermember,
        world.balances.member,
      ]);
      expect(currencyHolders.every((h) => h.amount > 0)).toBe(true);
    });

    test("a transfer wrote two rows sharing one batch id", async ({
      world,
    }) => {
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            kinds: [CurrencyTransactionKind.Transfer],
            limit: 50,
          },
        });

      expect(currencyTransactions.transactions).toHaveLength(2);
      const [a, b] = currencyTransactions.transactions;
      expect(a.batchId).toBe(b.batchId);
      // Opposite signs, same magnitude.
      expect(a.amount).toBe(-b.amount);
      expect(Math.abs(a.amount)).toBe(120);
    });

    test("each side of a transfer records its own resulting balance", async ({
      world,
    }) => {
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            kinds: [CurrencyTransactionKind.Transfer],
            limit: 50,
          },
        });

      const sender = currencyTransactions.transactions.find(
        (t) => t.amount < 0,
      );
      const recipient = currencyTransactions.transactions.find(
        (t) => t.amount > 0,
      );

      // balanceAfter is what the increment itself returned, so it must agree
      // with the balance each member actually ends up holding.
      expect(sender?.balanceAfter).toBe(world.balances.member);
      expect(recipient?.balanceAfter).toBe(world.balances.othermember);
    });

    test("a bulk grant wrote one row per recipient in one batch", async ({
      world,
    }) => {
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            kinds: [CurrencyTransactionKind.Mint],
            limit: 50,
          },
        });

      expect(currencyTransactions.transactions).toHaveLength(2);
      const batches = new Set(
        currencyTransactions.transactions.map((t) => t.batchId),
      );
      expect(batches.size).toBe(1);
    });

    test("filtering by user matches rows where they are the counterparty", async ({
      world,
    }) => {
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            userId: world.users.othermember.userId,
            kinds: [CurrencyTransactionKind.Transfer],
            limit: 50,
          },
        });

      // Both legs come back: othermember owns one and is named on the other.
      expect(currencyTransactions.transactions).toHaveLength(2);
    });
  });

  test.describe("staff notes", () => {
    test("a holder of item permissions reads them", async ({ world }) => {
      const { currencyTransactions } = await world
        .as("quartermaster")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            kinds: [CurrencyTransactionKind.Mint],
            limit: 50,
          },
        });

      expect(currencyTransactions.transactions[0].staffNote).toContain(
        "Tier 2 flat rate",
      );
    });

    test("a plain member gets null, not an error", async ({ world }) => {
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            kinds: [CurrencyTransactionKind.Mint],
            limit: 50,
          },
        });

      // The row is legitimately visible to them. Only the note is not.
      expect(currencyTransactions.transactions).not.toHaveLength(0);
      for (const row of currencyTransactions.transactions) {
        expect(row.staffNote).toBeNull();
      }
    });

    test("search never matches a staff note", async ({ world }) => {
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            search: "Tier 2 flat rate",
            limit: 50,
          },
        });

      // If this returned a row, a member could probe for the contents of a
      // note they cannot read, one guess at a time.
      expect(currencyTransactions.total).toBe(0);
    });

    test("search does match a public reason", async ({ world }) => {
      // The control. Without it, the assertion above would pass against a
      // search that is simply broken.
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            search: "Lanternfall placement",
            limit: 50,
          },
        });

      expect(currencyTransactions.total).toBeGreaterThan(0);
    });
  });

  test.describe("writes", () => {
    test.beforeEach(async ({ world }) => {
      await world.reset();
    });

    test("a balance cannot be driven negative by a burn", async ({ world }) => {
      await expect(
        world.as("quartermaster").gql(SeedBurnCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userId: world.users.member.userId,
            amount: world.balances.member + 1,
            reason: "Attempting an overdraft",
          },
        }),
      ).rejects.toThrow(/does not hold|not enough|insufficient/i);
    });

    test("a refused burn leaves the balance untouched", async ({ world }) => {
      await world
        .as("quartermaster")
        .gql(SeedBurnCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userId: world.users.member.userId,
            amount: 99999,
            reason: "Attempting an overdraft",
          },
        })
        .catch(() => undefined);

      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });

      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.member);
    });

    test("a member cannot send more than they hold", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedTransferCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            toUserId: world.users.othermember.userId,
            amount: world.balances.member + 1,
          },
        }),
      ).rejects.toThrow(/do not have|not enough|insufficient/i);
    });

    test("a member cannot send an untradeable currency", async ({ world }) => {
      // Enforced at the ledger, not just hidden in the wallet. The Send button
      // being absent is a courtesy; this is the rule.
      await expect(
        world.as("member").gql(SeedTransferCurrencyDocument, {
          input: {
            currencyId: world.currencies.bound.id,
            toUserId: world.users.othermember.userId,
            amount: 10,
          },
        }),
      ).rejects.toThrow(/cannot be sent to another member/i);
    });

    test("a refused transfer credits nobody", async ({ world }) => {
      const before = await world.as("member").gql(SeedMemberWalletDocument, {
        communityId: world.community.id,
        userId: world.users.othermember.userId,
      });

      await world
        .as("member")
        .gql(SeedTransferCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            toUserId: world.users.othermember.userId,
            amount: 99999,
          },
        })
        .catch(() => undefined);

      const after = await world.as("member").gql(SeedMemberWalletDocument, {
        communityId: world.community.id,
        userId: world.users.othermember.userId,
      });

      // The credit and the debit are one transaction. If the debit fails the
      // credit must go with it, or coin appears from nowhere.
      expect(
        after.memberWallet.balances.find((b) => b.currency.code === "HC")
          ?.amount,
      ).toBe(
        before.memberWallet.balances.find((b) => b.currency.code === "HC")
          ?.amount,
      );
    });

    test("a member cannot send to themselves", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedTransferCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            toUserId: world.users.member.userId,
            amount: 10,
          },
        }),
      ).rejects.toThrow(/yourself/i);
    });

    test("currency cannot be granted to a non-member", async ({ world }) => {
      await expect(
        world.as("quartermaster").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userIds: [world.users.outsider.userId],
            amount: 50,
            reason: "Should not land",
          },
        }),
      ).rejects.toThrow(/not a member/i);
    });

    test("a grant naming one non-member pays nobody", async ({ world }) => {
      await world
        .as("quartermaster")
        .gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userIds: [world.users.member.userId, world.users.outsider.userId],
            amount: 50,
            reason: "Should not land",
          },
        })
        .catch(() => undefined);

      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });

      // The membership check runs before any balance moves, so a partially
      // valid recipient list is rejected whole rather than half-applied.
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.member);
    });

    test("an archived currency refuses a grant", async ({ world }) => {
      await expect(
        world.as("quartermaster").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.retired.id,
            userIds: [world.users.member.userId],
            amount: 50,
            reason: "Should not land",
          },
        }),
      ).rejects.toThrow(/archived/i);
    });

    test("a restored currency accepts a grant again", async ({ world }) => {
      await world.as("quartermaster").gql(SeedUpdateCurrencyDocument, {
        id: world.currencies.retired.id,
        input: { archived: false },
      });

      const { mintCurrency } = await world
        .as("quartermaster")
        .gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.retired.id,
            userIds: [world.users.member.userId],
            amount: 50,
            reason: "Back in use",
          },
        });

      expect(mintCurrency).toBeTruthy();
    });

    test("two currencies in one community cannot share a code", async ({
      world,
    }) => {
      await expect(
        world.as("quartermaster").gql(SeedCreateCurrencyDocument, {
          input: {
            communityId: world.community.id,
            name: "Something Else",
            code: "hc",
          },
        }),
        // Lowercase on purpose: codes are stored uppercase, so "hc" must
        // collide with "HC" rather than creating a second currency that
        // renders identically everywhere.
      ).rejects.toThrow(/already has a currency with the code HC/i);
    });

    test("a grant and the ledger row explaining it are one transaction", async ({
      world,
    }) => {
      const before = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 1 },
        });

      await world.as("quartermaster").gql(SeedMintCurrencyDocument, {
        input: {
          currencyId: world.currencies.token.id,
          userIds: [world.users.member.userId],
          amount: 25,
          reason: "Festival entry",
        },
      });

      const after = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 1 },
        });

      expect(after.currencyTransactions.total).toBe(
        before.currencyTransactions.total + 1,
      );

      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "FT")?.amount,
      ).toBe(25);
    });

    test("a burn records the balance it left behind", async ({ world }) => {
      await world.as("quartermaster").gql(SeedBurnCurrencyDocument, {
        input: {
          currencyId: world.currencies.coin.id,
          userId: world.users.member.userId,
          amount: 80,
          reason: "Reversed a duplicate payout",
        },
      });

      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            kinds: [CurrencyTransactionKind.Burn],
            limit: 10,
          },
        });

      const row = currencyTransactions.transactions[0];
      expect(row.amount).toBe(-80);
      expect(row.balanceAfter).toBe(world.balances.member - 80);
    });
  });
});
