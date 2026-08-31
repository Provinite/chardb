import { presetTest, expect } from "../../src/fixtures.js";
import { SeedCheckoutDocument } from "../../src/generated/graphql.js";

/**
 * What a listing you cannot buy tells you.
 *
 * The reason used to render in the same muted style as the line describing the
 * item, so the one sentence explaining a blocked card looked exactly like the
 * card's own metadata -- and a listing you had exhausted your allowance on was
 * not distinguished from a buyable one at all (#290).
 */

const test = presetTest("community-items");
test.use({ persona: "member" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

test("spending your allowance says so, in its own right", async ({
  page,
  world,
}) => {
  const listing = world.shop.potionListing;

  // maxPerUser is 3, so three is the whole allowance.
  await world.as("member").gql(SeedCheckoutDocument, {
    input: {
      communityId: world.community.id,
      lines: [
        {
          shopItemId: listing.id,
          shopPriceId: listing.priceIds[0],
          quantity: 3,
        },
      ],
    },
  });

  await page.goto(world.shop.url);

  const notice = page.getByTestId(`shop-blocked-${listing.id}`);
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText(/Purchase limit reached/);

  // The tooltip has to agree with the notice. It used to say nothing at all on
  // a button disabled by the cap, and claimed you could not afford it on one
  // that was still clickable.
  const priceButton = page
    .getByTestId(`shop-price-${listing.priceIds[0]}`)
    .first();
  await expect(priceButton).toBeDisabled();
  await expect(priceButton).toHaveAttribute("title", "Purchase limit reached");
});

test("a sold-out listing says that instead", async ({ page, world }) => {
  const listing = world.shop.locketListing;

  // Stock is 2, so buying both empties it for everybody.
  await world.as("member").gql(SeedCheckoutDocument, {
    input: {
      communityId: world.community.id,
      lines: [
        {
          shopItemId: listing.id,
          shopPriceId: listing.priceIds[0],
          quantity: 2,
        },
      ],
    },
  });

  await page.goto(world.shop.url);

  const notice = page.getByTestId(`shop-blocked-${listing.id}`);
  await expect(notice).toBeVisible();
  // Sold out outranks everything else: it is sold out whether or not this
  // member could have afforded another.
  await expect(notice).toHaveText(/Sold out/);
  await expect(
    page.getByTestId(`shop-price-${listing.priceIds[0]}`).first(),
  ).toHaveAttribute("title", "Sold out");
});

test("a listing you can buy carries no notice", async ({ page, world }) => {
  // The negative control. Without it these tests would pass against a card
  // that always rendered the notice.
  await page.goto(world.shop.url);

  await expect(
    page.getByTestId(`shop-blocked-${world.shop.potionListing.id}`),
  ).toHaveCount(0);
  await expect(
    page.getByTestId(`shop-blocked-${world.shop.locketListing.id}`),
  ).toHaveCount(0);
});
