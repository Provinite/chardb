import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedCreateCurrencyDocument,
  SeedUpdateCurrencyDocument,
  SeedMintCurrencyDocument,
  SeedBurnCurrencyDocument,
  SeedTransferCurrencyDocument,
  SeedCurrenciesDocument,
  SeedCurrencySupplyDocument,
  SeedMemberWalletDocument,
  SeedCurrencyTransactionsDocument,
  SeedCurrencyHoldersDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * One case per gated currency operation.
 *
 * This exists because of a hole that already shipped once. Every mutation in
 * items.resolver.ts used to carry both `@AllowAnyAuthenticated()` and
 * `@AllowCommunityPermission(...)`. The global guard ORs every permission
 * decorator together, so the pair meant "authenticated OR permitted" -- which
 * is just "authenticated", and any logged-in user could grant items in a
 * community they had never joined.
 *
 * The trap is that the code reads as correct. Currency was written knowing
 * this, but "written knowing this" is not a defence that survives the next
 * edit, so every gated operation gets an attempt from an unpermitted member,
 * an attempt from a non-member, and -- not optional -- a permitted actor who
 * must succeed. A matrix that only asserts rejection passes just as happily
 * against a resolver that refuses everyone.
 */

const NOT_ALLOWED = /forbidden|permission|not allowed|denied/i;

test.describe("currency permissions", () => {
  test.use({ persona: "anon" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test.describe("createCurrency — needs canManageItems", () => {
    test("a member without the permission is refused", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedCreateCurrencyDocument, {
          input: {
            communityId: world.community.id,
            name: "Members Mint",
            code: "MM",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedCreateCurrencyDocument, {
          input: {
            communityId: world.community.id,
            name: "Outsider Mint",
            code: "OM",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("neither attempt created anything", async ({ world }) => {
      for (const who of ["member", "outsider"] as const) {
        await world
          .as(who)
          .gql(SeedCreateCurrencyDocument, {
            input: {
              communityId: world.community.id,
              name: `${who} Mint`,
              code: who === "member" ? "MM" : "OM",
            },
          })
          .catch(() => undefined);
      }

      const { currencies } = await world
        .as("quartermaster")
        .gql(SeedCurrenciesDocument, {
          communityId: world.community.id,
          includeArchived: true,
        });
      const codes = currencies.map((c) => c.code);
      expect(codes).not.toContain("MM");
      expect(codes).not.toContain("OM");
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      const { createCurrency } = await world
        .as("quartermaster")
        .gql(SeedCreateCurrencyDocument, {
          input: {
            communityId: world.community.id,
            name: "Legitimate Coin",
            code: "LC",
          },
        });
      expect(createCurrency.code).toBe("LC");
    });
  });

  test.describe("updateCurrency — needs canManageItems", () => {
    test("a member without the permission is refused", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedUpdateCurrencyDocument, {
          id: world.currencies.coin.id,
          input: { name: "Renamed By A Member" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedUpdateCurrencyDocument, {
          id: world.currencies.coin.id,
          input: { name: "Renamed By An Outsider" },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("a member cannot archive a currency out from under staff", async ({
      world,
    }) => {
      await expect(
        world.as("member").gql(SeedUpdateCurrencyDocument, {
          id: world.currencies.coin.id,
          input: { archived: true },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      const { updateCurrency } = await world
        .as("quartermaster")
        .gql(SeedUpdateCurrencyDocument, {
          id: world.currencies.token.id,
          input: { archived: true },
        });
      expect(updateCurrency.archivedAt).toBeTruthy();
    });
  });

  test.describe("mintCurrency — needs canGrantItems", () => {
    test("a member without the permission cannot pay themselves", async ({
      world,
    }) => {
      await expect(
        world.as("member").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userIds: [world.users.member.userId],
            amount: 100000,
            reason: "Self-service",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userIds: [world.users.member.userId],
            amount: 100000,
            reason: "Outsider mint",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("no coin was created by either attempt", async ({ world }) => {
      for (const who of ["member", "outsider"] as const) {
        await world
          .as(who)
          .gql(SeedMintCurrencyDocument, {
            input: {
              currencyId: world.currencies.coin.id,
              userIds: [world.users.member.userId],
              amount: 100000,
              reason: "Should not land",
            },
          })
          .catch(() => undefined);
      }

      const { currencySupply } = await world
        .as("member")
        .gql(SeedCurrencySupplyDocument, { communityId: world.community.id });

      // The supply is the number that matters here: a mint that got through
      // would show up as inflation even if the balance read looked normal.
      expect(
        currencySupply.find((s) => s.currency.code === "HC")?.inCirculation,
      ).toBe(1000);
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      const { mintCurrency } = await world
        .as("quartermaster")
        .gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userIds: [world.users.member.userId],
            amount: 10,
            reason: "Legitimate payout",
          },
        });
      expect(mintCurrency).toBeTruthy();
    });
  });

  test.describe("burnCurrency — needs canGrantItems", () => {
    test("a member cannot take coin off another member", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedBurnCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userId: world.users.othermember.userId,
            amount: 10,
            reason: "Spite",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedBurnCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userId: world.users.member.userId,
            amount: 10,
            reason: "Spite",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("the target's balance survived both attempts", async ({ world }) => {
      for (const who of ["member", "outsider"] as const) {
        await world
          .as(who)
          .gql(SeedBurnCurrencyDocument, {
            input: {
              currencyId: world.currencies.coin.id,
              userId: world.users.othermember.userId,
              amount: 10,
              reason: "Spite",
            },
          })
          .catch(() => undefined);
      }

      const { memberWallet } = await world
        .as("othermember")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.othermember.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.othermember);
    });

    test("a holder of the permission succeeds", async ({ world }) => {
      const { burnCurrency } = await world
        .as("quartermaster")
        .gql(SeedBurnCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            userId: world.users.member.userId,
            amount: 10,
            reason: "Legitimate correction",
          },
        });
      expect(burnCurrency).toBeTruthy();
    });
  });

  test.describe("transferCurrency — needs only membership", () => {
    test("a plain member can send their own coin", async ({ world }) => {
      // Deliberately not gated on an item permission. The balance is the
      // authorisation: you cannot send what you do not hold.
      const { transferCurrency } = await world
        .as("member")
        .gql(SeedTransferCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            toUserId: world.users.othermember.userId,
            amount: 5,
          },
        });
      expect(transferCurrency).toBeTruthy();
    });

    test("someone outside the community is refused", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedTransferCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            toUserId: world.users.member.userId,
            amount: 5,
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });
  });

  test.describe("reads — need membership, nothing more", () => {
    test("a plain member can read the supply table", async ({ world }) => {
      const { currencySupply } = await world
        .as("member")
        .gql(SeedCurrencySupplyDocument, { communityId: world.community.id });
      expect(currencySupply.length).toBeGreaterThan(0);
    });

    test("a plain member can read the community ledger", async ({ world }) => {
      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 10 },
        });
      expect(currencyTransactions.total).toBeGreaterThan(0);
    });

    test("a plain member can read another member's wallet", async ({
      world,
    }) => {
      // Balances are public within a community, like item holdings, so a
      // trade partner can be checked before the trade rather than after.
      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.othermember.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.othermember);
    });

    test("an outsider cannot read the supply table", async ({ world }) => {
      await expect(
        world
          .as("outsider")
          .gql(SeedCurrencySupplyDocument, { communityId: world.community.id }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("an outsider cannot read the ledger", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 10 },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("an outsider cannot read a wallet", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("an outsider cannot read the holder list", async ({ world }) => {
      await expect(
        world.as("outsider").gql(SeedCurrencyHoldersDocument, {
          currencyId: world.currencies.coin.id,
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("an outsider cannot list currencies", async ({ world }) => {
      await expect(
        world
          .as("outsider")
          .gql(SeedCurrenciesDocument, { communityId: world.community.id }),
      ).rejects.toThrow(NOT_ALLOWED);
    });
  });
});
