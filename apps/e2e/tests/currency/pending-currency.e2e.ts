import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  ExternalAccountProvider,
  SeedExternalMembersDocument,
  SeedMintCurrencyDocument,
  SeedPendingHoldingsDocument,
} from "../../src/generated/graphql.js";

/**
 * Currency minted to external accounts with no user here yet (#610), over the
 * real API and in the browser.
 *
 * Recipients are DeviantArt handles: the e2e backend talks to a fake
 * DeviantArt (src/servers/fake-deviantart.ts) that knows every handle. Nothing
 * here names a Discord account, because there is no fake Discord and the
 * suite must never reach the real one.
 */

const { Deviantart: DEVIANTART, Patreon: PATREON } = ExternalAccountProvider;
const NOT_ALLOWED = /forbidden|permission|not allowed|denied/i;
const HANDLE = "lantern-moth";

const test = presetTest("community-items");

test.describe("minting to external accounts", () => {
  test.use({ persona: "anon" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /** The quartermaster can grant items, so can mint; nothing more. */
  const mintToHandle = (
    world: World<CommunityItemsWorld>,
    amount: number,
    handle = HANDLE,
  ) =>
    world.as("quartermaster").gql(SeedMintCurrencyDocument, {
      input: {
        currencyId: world.currencies.coin.id,
        pendingOwners: [{ provider: DEVIANTART, providerAccountId: handle }],
        amount,
        reason: "Imported from the bank",
      },
    });

  const externalMembers = (
    world: World<CommunityItemsWorld>,
    persona: string,
  ) =>
    world.as(persona).gql(SeedExternalMembersDocument, {
      communityId: world.community.id,
      search: HANDLE,
      provider: DEVIANTART,
    });

  test("a mint waits on the account, and staff see it waiting", async ({
    world,
  }) => {
    await mintToHandle(world, 100);
    await mintToHandle(world, 25);

    const { externalMembers: page } = await externalMembers(world, "commadmin");
    expect(page.members).toHaveLength(1);
    const [member] = page.members;
    // A currency-only holder still gets its names: the field guards resolve
    // the pending row's community through its currency.
    expect(member.holder.displayIdentifier).toBe(HANDLE);
    expect(member.holder.providerAccountId).toMatch(/^[0-9a-f-]{36}$/);
    expect(member.holder.currencyId).toBe(world.currencies.coin.id);
    expect(member.itemCount).toBe(0);
    expect(member.balances).toEqual([
      expect.objectContaining({
        amount: 125,
        grantCount: 2,
        currency: expect.objectContaining({ id: world.currencies.coin.id }),
      }),
    ]);

    const { pendingHoldings } = await world
      .as("commadmin")
      .gql(SeedPendingHoldingsDocument, {
        communityId: world.community.id,
        provider: DEVIANTART,
        providerAccountId: member.holder.providerAccountId,
      });
    expect(pendingHoldings.holder.displayIdentifier).toBe(HANDLE);
    expect(pendingHoldings.totalItems).toBe(0);
    expect(pendingHoldings.claimedBy).toBeNull();
    expect(pendingHoldings.balances).toEqual([
      expect.objectContaining({ amount: 125, grantCount: 2 }),
    ]);
  });

  test("a handle spelled two ways is one account and one grant", async ({
    world,
  }) => {
    await world.as("quartermaster").gql(SeedMintCurrencyDocument, {
      input: {
        currencyId: world.currencies.coin.id,
        pendingOwners: [
          { provider: DEVIANTART, providerAccountId: HANDLE },
          { provider: DEVIANTART, providerAccountId: HANDLE.toUpperCase() },
        ],
        amount: 10,
        reason: "Event prize",
      },
    });

    const { externalMembers: page } = await externalMembers(world, "commadmin");
    expect(page.members[0].balances[0]).toMatchObject({
      amount: 10,
      grantCount: 1,
    });
  });

  test.describe("input", () => {
    test("a mint naming nobody is refused", async ({ world }) => {
      await expect(
        world.as("quartermaster").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            amount: 10,
            reason: "Nobody",
          },
        }),
      ).rejects.toThrow(/Name at least one recipient/);
    });

    test("a provider that cannot be a pending owner is refused", async ({
      world,
    }) => {
      await expect(
        world.as("quartermaster").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            pendingOwners: [
              { provider: PATREON, providerAccountId: "someone" },
            ],
            amount: 10,
            reason: "Event prize",
          },
        }),
      ).rejects.toThrow(/not supported/i);
    });

    test("more than 200 external accounts in one mint is refused", async ({
      world,
    }) => {
      await expect(
        world.as("quartermaster").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            pendingOwners: Array.from({ length: 201 }, (_, i) => ({
              provider: DEVIANTART,
              providerAccountId: `artist-${i}`,
            })),
            amount: 10,
            reason: "Event prize",
          },
        }),
      ).rejects.toThrow(/200/);
    });
  });

  test.describe("who may do what", () => {
    test("a member cannot mint to an external account", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedMintCurrencyDocument, {
          input: {
            currencyId: world.currencies.coin.id,
            pendingOwners: [
              { provider: DEVIANTART, providerAccountId: HANDLE },
            ],
            amount: 10,
            reason: "Paying myself",
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    for (const persona of ["member", "quartermaster"]) {
      test(`${persona} cannot list what waits on external accounts`, async ({
        world,
      }) => {
        await mintToHandle(world, 100);

        await expect(externalMembers(world, persona)).rejects.toThrow(
          NOT_ALLOWED,
        );
      });

      test(`${persona} cannot open an external account's pending holdings`, async ({
        world,
      }) => {
        await mintToHandle(world, 100);
        const { externalMembers: page } = await externalMembers(
          world,
          "commadmin",
        );

        await expect(
          world.as(persona).gql(SeedPendingHoldingsDocument, {
            communityId: world.community.id,
            provider: DEVIANTART,
            providerAccountId: page.members[0].holder.providerAccountId,
          }),
        ).rejects.toThrow(NOT_ALLOWED);
      });
    }
  });

  test.describe("in the browser", () => {
    test.use({ persona: "commadmin" });

    test("External Members shows the balance, and the holder's page lists it", async ({
      page,
      world,
    }) => {
      await mintToHandle(world, 1000);
      await mintToHandle(world, 250);

      await page.goto(`${world.community.url}/external-members`);
      await page
        .getByRole("searchbox", { name: "Search external members" })
        .fill(HANDLE);
      const row = page
        .getByTestId("external-member")
        .filter({ hasText: `@${HANDLE}` });
      await expect(row).toContainText("⬡1,250");

      await row.getByRole("link").click();
      await expect(page).toHaveURL(/\/external-members\/deviantart\//);
      const balance = page.locator(
        `[data-testid="pending-balance"][data-currency-id="${world.currencies.coin.id}"]`,
      );
      await expect(balance).toContainText(world.currencies.coin.name);
      await expect(balance).toContainText("2 grants");
      await expect(balance).toContainText("⬡1,250");
      await expect(page.getByTestId("pending-holdings-empty")).toHaveCount(0);
    });
  });
});
