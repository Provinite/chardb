import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedShopItemsDocument,
  SeedCheckoutDocument,
  SeedRefundShopLineDocument,
  SeedMyShopPurchasesDocument,
  SeedMemberWalletDocument,
  SeedCurrencyTransactionsDocument,
  SeedCreateShopItemDocument,
  SeedUpdateShopItemDocument,
  SeedMemberHoldingsDocument,
  CurrencyTransactionSource,
  CurrencyTransactionKind,
  SeedMintCurrencyDocument,
  SeedCommunityMembersDocument,
  SeedRemoveCommunityMemberDocument,
  SeedCommunityShopPurchasesDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

const NOT_ALLOWED = /forbidden|permission|not allowed|denied/i;

/**
 * The coin shop against a real database.
 *
 * The mocked tests can show the service asks for the right things; only these
 * can show that the CHECK constraints fire and the row locks hold, which is
 * where every interesting failure in a shop lives.
 *
 * `member` starts with 380 Hollow Coin and no Festival Token, so the potion's
 * three price options are deliberately not all affordable -- affordability is
 * per option, not per item.
 */
test.describe("coin shop", () => {
  test.use({ persona: "anon" });

  test.describe("browsing", () => {
    test("lists what is for sale, with every price option", async ({
      world,
    }) => {
      const { shopItems } = await world
        .as("member")
        .gql(SeedShopItemsDocument, { communityId: world.community.id });

      const potion = shopItems.find(
        (i) => i.id === world.shop.potionListing.id,
      );
      expect(potion?.prices).toHaveLength(3);
    });

    test("affordability is per option, not per item", async ({ world }) => {
      const { shopItems } = await world
        .as("member")
        .gql(SeedShopItemsDocument, { communityId: world.community.id });

      const potion = shopItems.find(
        (i) => i.id === world.shop.potionListing.id,
      );

      // 380 Hollow Coin, no Festival Token. The coin-only option is
      // affordable; the two involving tokens are not.
      const byAffordable = potion!.prices.map((p) => p.affordable);
      expect(byAffordable).toContain(true);
      expect(byAffordable).toContain(false);
    });

    test("a member cannot see an inactive listing", async ({ world }) => {
      await world.as("quartermaster").gql(SeedUpdateShopItemDocument, {
        id: world.shop.locketListing.id,
        input: { active: false },
      });

      const asMember = await world.as("member").gql(SeedShopItemsDocument, {
        communityId: world.community.id,
        includeInactive: true,
      });

      // Asking for them is quietly ignored rather than refused -- the flag is
      // staff-only, not an error condition.
      expect(
        asMember.shopItems.some((i) => i.id === world.shop.locketListing.id),
      ).toBe(false);

      const asStaff = await world
        .as("quartermaster")
        .gql(SeedShopItemsDocument, {
          communityId: world.community.id,
          includeInactive: true,
        });
      expect(
        asStaff.shopItems.some((i) => i.id === world.shop.locketListing.id),
      ).toBe(true);
    });

    test("an outsider cannot browse at all", async ({ world }) => {
      await expect(
        world
          .as("outsider")
          .gql(SeedShopItemsDocument, { communityId: world.community.id }),
      ).rejects.toThrow(NOT_ALLOWED);
    });
  });

  test.describe("buying", () => {
    test.beforeEach(async ({ world }) => {
      await world.reset();
    });

    test("charges the coin and grants the item", async ({ world }) => {
      await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });

      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.member - 50);

      // Three potions from the seeded grant, plus the one just bought.
      const { memberHoldings } = await world
        .as("member")
        .gql(SeedMemberHoldingsDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      const potions = memberHoldings.holdings.find(
        (h) => h.itemType.id === world.itemTypes.potion.id,
      );
      expect(potions?.count).toBe(4);
    });

    test("buying three is three refundable lines", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 3,
            },
          ],
        },
      });

      // Quantity lives in the number of rows, so one of the three can be
      // undone without touching the others.
      expect(checkout.lines).toHaveLength(3);
    });

    test("a multi-currency price charges every currency it names", async ({
      world,
    }) => {
      // The member holds no Festival Token, so the two-currency option is
      // unbuyable until they do.
      await world.as("quartermaster").gql(SeedMintCurrencyDocument, {
        input: {
          currencyId: world.currencies.token.id,
          userIds: [world.users.member.userId],
          amount: 5,
          reason: "For the shop test",
        },
      });

      await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              // 20 Hollow Coin AND 2 Festival Token.
              shopPriceId: world.shop.potionListing.priceIds[1],
              quantity: 1,
            },
          ],
        },
      });

      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      const held = Object.fromEntries(
        memberWallet.balances.map((b) => [b.currency.code, b.amount]),
      );
      expect(held.HC).toBe(world.balances.member - 20);
      expect(held.FT).toBe(3);
    });

    test("the whole cart is one spend, not one per line", async ({ world }) => {
      await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
            {
              shopItemId: world.shop.locketListing.id,
              shopPriceId: world.shop.locketListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });

      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: {
            communityId: world.community.id,
            kinds: [CurrencyTransactionKind.Spend],
            limit: 20,
          },
        });

      // 50 + 10 in one row, not two. A statement should show a purchase, not
      // an itemised receipt.
      expect(currencyTransactions.transactions).toHaveLength(1);
      expect(currencyTransactions.transactions[0].amount).toBe(-60);
      expect(currencyTransactions.transactions[0].source).toBe(
        CurrencyTransactionSource.ShopPurchase,
      );
    });

    test("refuses a price option belonging to another listing", async ({
      world,
    }) => {
      await expect(
        world.as("member").gql(SeedCheckoutDocument, {
          input: {
            communityId: world.community.id,
            lines: [
              {
                shopItemId: world.shop.potionListing.id,
                shopPriceId: world.shop.locketListing.priceIds[0],
                quantity: 1,
              },
            ],
          },
        }),
      ).rejects.toThrow(/not one of this listing/i);
    });

    test("refuses a purchase the member cannot afford", async ({ world }) => {
      // The token-only option, against a member holding no tokens. Using the
      // coin price and a big quantity would hit the per-user cap first and
      // pass for the wrong reason.
      await expect(
        world.as("member").gql(SeedCheckoutDocument, {
          input: {
            communityId: world.community.id,
            lines: [
              {
                shopItemId: world.shop.potionListing.id,
                shopPriceId: world.shop.potionListing.priceIds[2],
                quantity: 1,
              },
            ],
          },
        }),
      ).rejects.toThrow(/cannot afford/i);
    });

    test("an unaffordable cart changes nothing at all", async ({ world }) => {
      await world
        .as("member")
        .gql(SeedCheckoutDocument, {
          input: {
            communityId: world.community.id,
            lines: [
              {
                shopItemId: world.shop.potionListing.id,
                shopPriceId: world.shop.potionListing.priceIds[2],
                quantity: 1,
              },
            ],
          },
        })
        .catch(() => undefined);

      // The balance is untouched AND no purchase was recorded. A checkout
      // that took stock or wrote a purchase before failing would leave the
      // shop lying about what it has.
      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.member);

      const { myShopPurchases } = await world
        .as("member")
        .gql(SeedMyShopPurchasesDocument, {
          communityId: world.community.id,
        });
      expect(myShopPurchases).toHaveLength(0);
    });

    test("stock runs out rather than going negative", async ({ world }) => {
      // Only two lockets exist.
      await expect(
        world.as("member").gql(SeedCheckoutDocument, {
          input: {
            communityId: world.community.id,
            lines: [
              {
                shopItemId: world.shop.locketListing.id,
                shopPriceId: world.shop.locketListing.priceIds[0],
                quantity: 3,
              },
            ],
          },
        }),
      ).rejects.toThrow(/not that many|not enough|left/i);
    });

    test("a per-user cap is enforced across separate checkouts", async ({
      world,
    }) => {
      const buy = (quantity: number) =>
        world.as("member").gql(SeedCheckoutDocument, {
          input: {
            communityId: world.community.id,
            lines: [
              {
                shopItemId: world.shop.potionListing.id,
                shopPriceId: world.shop.potionListing.priceIds[0],
                quantity,
              },
            ],
          },
        });

      await buy(2);
      // The cap is 3, and the count is of what is held rather than of
      // checkouts, so a second visit is still limited.
      await expect(buy(2)).rejects.toThrow(/only have 3/i);
      await buy(1);
    });

    test("refuses more than ten of one listing, however it is split", async ({
      world,
    }) => {
      // Every unit is its own item, line, and ledger row inside one
      // transaction, so quantity is a bound on the work one request can ask
      // for. The per-line cap alone would be bypassed by using two lines.
      await expect(
        world.as("member").gql(SeedCheckoutDocument, {
          input: {
            communityId: world.community.id,
            lines: [
              {
                shopItemId: world.shop.potionListing.id,
                shopPriceId: world.shop.potionListing.priceIds[0],
                quantity: 6,
              },
              {
                shopItemId: world.shop.potionListing.id,
                shopPriceId: world.shop.potionListing.priceIds[1],
                quantity: 6,
              },
            ],
          },
        }),
      ).rejects.toThrow(/at most 10 of one thing/i);

      // Refused before anything was written, so no line survives.
      const { myShopPurchases } = await world
        .as("member")
        .gql(SeedMyShopPurchasesDocument, { communityId: world.community.id });
      expect(myShopPurchases).toHaveLength(0);
    });

    test("refuses a single line asking for more than ten", async ({
      world,
    }) => {
      await expect(
        world.as("member").gql(SeedCheckoutDocument, {
          input: {
            communityId: world.community.id,
            lines: [
              {
                shopItemId: world.shop.potionListing.id,
                shopPriceId: world.shop.potionListing.priceIds[0],
                quantity: 11,
              },
            ],
          },
        }),
      ).rejects.toThrow();
    });
  });

  test.describe("refunds", () => {
    test.beforeEach(async ({ world }) => {
      await world.reset();
    });

    test("gives back the coin and takes back the item", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      const lineId = checkout.lines[0].id;

      await world.as("member").gql(SeedRefundShopLineDocument, { lineId });

      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.member);

      const { memberHoldings } = await world
        .as("member")
        .gql(SeedMemberHoldingsDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      const potions = memberHoldings.holdings.find(
        (h) => h.itemType.id === world.itemTypes.potion.id,
      );
      // Back to the three from the seeded grant.
      expect(potions?.count).toBe(3);
    });

    test("a refund appends rather than rewriting", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      const lineId = checkout.lines[0].id;
      await world.as("member").gql(SeedRefundShopLineDocument, { lineId });

      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 20 },
        });

      // The spend is still there, and the refund sits beside it. Deleting the
      // original would leave a member's statement unable to explain itself.
      const shopRows = currencyTransactions.transactions.filter(
        (t) => t.source === CurrencyTransactionSource.ShopPurchase,
      );
      expect(shopRows.some((t) => t.amount < 0)).toBe(true);
      expect(shopRows.some((t) => t.amount > 0)).toBe(true);
    });

    test("the same line cannot be refunded twice", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      const lineId = checkout.lines[0].id;
      await world.as("member").gql(SeedRefundShopLineDocument, { lineId });

      await expect(
        world.as("member").gql(SeedRefundShopLineDocument, { lineId }),
      ).rejects.toThrow(/already been refunded/i);
    });

    test("one of three can be undone without touching the others", async ({
      world,
    }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 3,
            },
          ],
        },
      });

      await world
        .as("member")
        .gql(SeedRefundShopLineDocument, { lineId: checkout.lines[0].id });

      const { myShopPurchases } = await world
        .as("member")
        .gql(SeedMyShopPurchasesDocument, {
          communityId: world.community.id,
        });
      const lines = myShopPurchases[0].lines;
      expect(lines.filter((l) => l.refundedAt !== null)).toHaveLength(1);
      expect(lines.filter((l) => l.refundedAt === null)).toHaveLength(2);

      // 150 spent, 50 returned.
      const { memberWallet } = await world
        .as("member")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(world.balances.member - 100);
    });

    test("refunding restores stock", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.locketListing.id,
              shopPriceId: world.shop.locketListing.priceIds[0],
              quantity: 2,
            },
          ],
        },
      });

      const soldOut = await world
        .as("member")
        .gql(SeedShopItemsDocument, { communityId: world.community.id });
      expect(
        soldOut.shopItems.find((i) => i.id === world.shop.locketListing.id)
          ?.stock,
      ).toBe(0);

      await world
        .as("member")
        .gql(SeedRefundShopLineDocument, { lineId: checkout.lines[0].id });

      const after = await world
        .as("member")
        .gql(SeedShopItemsDocument, { communityId: world.community.id });
      expect(
        after.shopItems.find((i) => i.id === world.shop.locketListing.id)
          ?.stock,
      ).toBe(1);
    });

    test("a refund frees the allowance it used", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 3,
            },
          ],
        },
      });

      await world
        .as("member")
        .gql(SeedRefundShopLineDocument, { lineId: checkout.lines[0].id });

      // A cap is on what you hold, not on how many times you clicked buy --
      // otherwise undoing a mistake would spend the allowance it returned.
      const { shopItems } = await world
        .as("member")
        .gql(SeedShopItemsDocument, { communityId: world.community.id });
      expect(
        shopItems.find((i) => i.id === world.shop.potionListing.id)
          ?.purchasedByViewer,
      ).toBe(2);
    });

    test("somebody else cannot refund your purchase", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      const lineId = checkout.lines[0].id;

      await expect(
        world.as("othermember").gql(SeedRefundShopLineDocument, { lineId }),
      ).rejects.toThrow(/not your purchase/i);
    });

    test("a buyer who has left the community keeps their item", async ({
      world,
    }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      const lineId = checkout.lines[0].id;

      const { communityMembersByCommunity } = await world
        .as("commadmin")
        .gql(SeedCommunityMembersDocument, {
          communityId: world.community.id,
        });
      const membership = communityMembersByCommunity.nodes.find(
        (n) => n.userId === world.users.member.userId,
      );
      if (!membership) throw new Error("member has no membership row");
      await world
        .as("commadmin")
        .gql(SeedRemoveCommunityMemberDocument, { id: membership.id });

      // Coin cannot be paid to a non-member, so the refund cannot complete.
      // The thing that must not happen is the item being destroyed anyway:
      // that would take the item and give nothing back.
      await expect(
        world.as("quartermaster").gql(SeedRefundShopLineDocument, { lineId }),
      ).rejects.toThrow(/left this community/i);

      const { memberHoldings } = await world
        .as("quartermaster")
        .gql(SeedMemberHoldingsDocument, {
          communityId: world.community.id,
          userId: world.users.member.userId,
        });
      const potions = memberHoldings.holdings.find(
        (h) => h.itemType.id === world.itemTypes.potion.id,
      );
      // Three seeded plus the one just bought, none destroyed.
      expect(potions?.count).toBe(4);
    });

    test("staff see the community's purchases, and may refund past the window", async ({
      world,
    }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      const lineId = checkout.lines[0].id;

      const { communityShopPurchases } = await world
        .as("quartermaster")
        .gql(SeedCommunityShopPurchasesDocument, {
          communityId: world.community.id,
        });

      const purchase = communityShopPurchases.find((p) => p.id === checkout.id);
      expect(purchase?.buyer?.username).toBe(world.users.member.username);

      const line = purchase?.lines.find((l) => l.id === lineId);
      // "Not your purchase" and the undo window are the buyer's reasons, not
      // staff's. Neither should block a moderator.
      expect(line?.refundableByViewer).toBe(true);
      expect(line?.refundBlockedReason).toBeNull();
    });

    test("a refunded line says who refunded it", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });

      await world.as("quartermaster").gql(SeedRefundShopLineDocument, {
        lineId: checkout.lines[0].id,
      });

      const { communityShopPurchases } = await world
        .as("quartermaster")
        .gql(SeedCommunityShopPurchasesDocument, {
          communityId: world.community.id,
        });
      const line = communityShopPurchases
        .find((p) => p.id === checkout.id)
        ?.lines.find((l) => l.id === checkout.lines[0].id);

      expect(line?.refundedAt).toBeTruthy();
      expect(line?.refundedBy?.username).toBe(
        world.users.quartermaster.username,
      );
      expect(line?.refundBlockedReason).toBe("Already refunded");
    });

    test("an ordinary member cannot read the community's purchases", async ({
      world,
    }) => {
      await expect(
        world.as("member").gql(SeedCommunityShopPurchasesDocument, {
          communityId: world.community.id,
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("staff can refund somebody else's purchase", async ({ world }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      const lineId = checkout.lines[0].id;

      const { refundShopPurchaseLine } = await world
        .as("quartermaster")
        .gql(SeedRefundShopLineDocument, { lineId });
      expect(refundShopPurchaseLine.refundedAt).toBeTruthy();
    });
  });

  test.describe("defining what is sold", () => {
    test.beforeEach(async ({ world }) => {
      await world.reset();
    });

    test("a member cannot create a listing", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedCreateShopItemDocument, {
          input: {
            communityId: world.community.id,
            itemTypeId: world.itemTypes.potion.id,
            name: "Members Own Shop",
            prices: [
              {
                components: [
                  { currencyId: world.currencies.coin.id, amount: 1 },
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("a listing cannot be priced in an archived currency", async ({
      world,
    }) => {
      await expect(
        world.as("quartermaster").gql(SeedCreateShopItemDocument, {
          input: {
            communityId: world.community.id,
            itemTypeId: world.itemTypes.potion.id,
            name: "Priced In A Dead Currency",
            prices: [
              {
                components: [
                  { currencyId: world.currencies.retired.id, amount: 5 },
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow(/archived/i);
    });

    test("editing prices does not change what past purchases cost", async ({
      world,
    }) => {
      const { checkout } = await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.potionListing.id,
              shopPriceId: world.shop.potionListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
      expect(checkout.lines[0].costs[0].amount).toBe(50);

      // Put the price up tenfold after the sale.
      await world.as("quartermaster").gql(SeedUpdateShopItemDocument, {
        id: world.shop.potionListing.id,
        input: {
          prices: [
            {
              components: [
                { currencyId: world.currencies.coin.id, amount: 500 },
              ],
            },
          ],
        },
      });

      // The refund returns what was paid, not what it costs now. Reading the
      // price back through the option would hand back ten times the money.
      await world
        .as("member")
        .gql(SeedRefundShopLineDocument, { lineId: checkout.lines[0].id });

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
  });
});
