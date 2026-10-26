import { presetTest, expect } from "../../src/fixtures.js";
import { SeedCreateCharacterDocument } from "../../src/generated/graphql.js";

const test = presetTest("community-basic");

/**
 * The character card's shape (#420).
 *
 * A card is horizontal: a square icon on the left, flush to the card's edges,
 * with the name and badges beside it. The icon is the image's thumbnail, which
 * is square and framed by the uploader, so the box it sits in must be square
 * too or the framing is trimmed again. Measured in a real browser because it
 * is layout: nothing short of one can see it.
 */
test.describe("character card layout", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("the icon is a square the full height of the card", async ({
    page,
    world,
  }) => {
    // A name long enough to wrap if it were allowed to, which would make this
    // card taller than the rest and stretch its icon out of square.
    await world.as("member").gql(SeedCreateCharacterDocument, {
      input: {
        name: "A Character Whose Name Goes On For Rather A Long Way Indeed",
        speciesId: world.species.id,
      },
    });

    await page.goto(`${world.community.url}/my-characters`);
    const cards = page.getByTestId("character-card");
    await expect(cards.first()).toBeVisible();

    const boxes = await cards.evaluateAll((elements) =>
      elements.map((card) => {
        const icon = card.querySelector('[data-testid="character-card-icon"]');
        const c = card.getBoundingClientRect();
        const i = icon?.getBoundingClientRect();
        return {
          card: { left: c.left, top: c.top, height: c.height },
          icon: i && {
            left: i.left,
            top: i.top,
            width: i.width,
            height: i.height,
          },
        };
      }),
    );

    expect(boxes.length).toBeGreaterThan(1);
    const heights = new Set(boxes.map((b) => Math.round(b.card.height)));
    expect(heights.size).toBe(1);

    for (const { card, icon } of boxes) {
      expect(icon).toBeTruthy();
      // Square, the card's full height, against its left edge. The card's
      // 1px border is all that sits between them.
      expect(Math.abs(icon!.width - icon!.height)).toBeLessThanOrEqual(1);
      expect(card.height - icon!.height).toBeLessThanOrEqual(2);
      expect(icon!.left - card.left).toBeLessThanOrEqual(1);
      expect(icon!.top - card.top).toBeLessThanOrEqual(1);
    }
  });
});
