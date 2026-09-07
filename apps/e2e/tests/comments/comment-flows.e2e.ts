import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  SeedCreateCommentDocument,
  SeedCreateGalleryDocument,
  CommentableType,
  Visibility,
} from "../../src/generated/graphql.js";

/**
 * Commenting, end to end, on the pages that offer it.
 *
 * Until #310 none of this had browser coverage at all. What looked like
 * coverage -- `comments.resolver.e2e.spec.ts` -- calls resolver methods
 * directly against a mocked Prisma, so it never touches GraphQL execution, the
 * guard chain or field resolution, and it does not run in CI. A total
 * commenting outage sat green throughout.
 *
 * So these drive the real UI. Every spec that reads a comment back renders
 * `likesCount` and the like control, because that is the field whose 403 nulled
 * the parent and blanked the section; a spec that avoided it would pass against
 * the bug it is here to catch.
 *
 * `CommentList` is generic over its entity, so a gallery is covered alongside a
 * character -- the component and the query are the same, and only the
 * `entityType` differs.
 */

const test = presetTest("community-items");

test.beforeEach(async ({ world }) => {
  await world.reset();
});

/** Post a comment through the form, the way a person does. */
const postComment = async (page: Page, text: string) => {
  await page.getByPlaceholder("Write a comment...").fill(text);
  await page.getByRole("button", { name: "Comment", exact: true }).click();
};

/**
 * One comment's card, scoped so its own controls are unambiguous.
 *
 * The character page carries a LikeButton of its own, so an unscoped
 * `getByRole("button", { name: "Like" })` is two different things.
 */
const commentCard = (page: Page, text: string) =>
  page.getByTestId("comment").filter({ hasText: text });

test.describe("as the comment's author", () => {
  test.use({ persona: "member" });

  test("a reply appears under the comment it answers", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.marrowfen.url);
    await postComment(page, "Top level");
    await expect(page.getByText("1 comment", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Reply", exact: true }).click();
    await page.getByPlaceholder(/^Reply to /).fill("A reply");
    await page
      .getByRole("button", { name: "Reply", exact: true })
      .last()
      .click();

    await expect(page.getByText("A reply")).toBeVisible();

    // Replies are their own Comment objects and select `likesCount` too, so a
    // character with replies exercised the bug a second time, one level down.
    await page.reload();
    await expect(page.getByText("Top level")).toBeVisible();
    await expect(page.getByText("A reply")).toBeVisible();
  });

  test("editing your own comment changes what is stored", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.marrowfen.url);
    await postComment(page, "First draft");
    await expect(page.getByText("First draft")).toBeVisible();

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByPlaceholder("Edit your comment...").fill("Second draft");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText("Second draft")).toBeVisible();
    await expect(page.getByText("First draft")).toHaveCount(0);

    // Reloaded, because the edit form updates in place and would look right
    // even if the mutation had not landed.
    await page.reload();
    await expect(page.getByText("Second draft")).toBeVisible();
  });

  test("cancelling an edit keeps the original", async ({ page, world }) => {
    await page.goto(world.characters.marrowfen.url);
    await postComment(page, "Unchanged");
    await expect(page.getByText("Unchanged")).toBeVisible();

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByPlaceholder("Edit your comment...").fill("Discard me");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    await expect(page.getByText("Unchanged")).toBeVisible();
    await expect(page.getByText("Discard me")).toHaveCount(0);
  });

  test("deleting your own comment removes it", async ({ page, world }) => {
    await page.goto(world.characters.marrowfen.url);
    await postComment(page, "Regrettable");
    await expect(page.getByText("1 comment", { exact: true })).toBeVisible();

    // The delete goes through `window.confirm`, which Playwright dismisses by
    // default -- without this the click does nothing and the assertion below
    // would be asserting the wrong thing.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No comments yet")).toBeVisible();
    await expect(page.getByText("Regrettable")).toHaveCount(0);
  });

  test("a comment can be liked and unliked", async ({ page, world }) => {
    await page.goto(world.characters.marrowfen.url);
    await postComment(page, "Likeable");
    await expect(page.getByText("Likeable")).toBeVisible();

    const card = commentCard(page, "Likeable");
    await card.getByRole("button", { name: "Like" }).click();
    await expect(card.getByRole("button", { name: "Unlike" })).toBeVisible();

    await card.getByRole("button", { name: "Unlike" }).click();
    await expect(card.getByRole("button", { name: "Like" })).toBeVisible();
  });

  test("a gallery takes comments the same way a character does", async ({
    page,
    world,
  }) => {
    // The other entity `CommentList` is mounted on. Same component, same query,
    // different `entityType` -- so this is the one that would catch a fix
    // applied only to the character path.
    const { createGallery } = await world
      .as("member")
      .gql(SeedCreateGalleryDocument, {
        input: {
          name: "Commentable Sketches",
          visibility: Visibility.Public,
        },
      });

    await page.goto(`/gallery/${createGallery.id}`);
    await postComment(page, "Nice gallery");

    await expect(page.getByText("1 comment", { exact: true })).toBeVisible();
    await expect(page.getByText("Nice gallery")).toBeVisible();
  });
});

test.describe("as another member", () => {
  test.use({ persona: "member" });

  test("someone else's comment offers no edit or delete", async ({
    page,
    world,
  }) => {
    await world.as("othermember").gql(SeedCreateCommentDocument, {
      input: {
        content: "Not yours to touch",
        entityType: CommentableType.Character,
        entityId: world.characters.marrowfen.id,
      },
    });

    await page.goto(world.characters.marrowfen.url);

    await expect(page.getByText("Not yours to touch")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Delete", exact: true }),
    ).toHaveCount(0);
  });

  test("an empty comment cannot be submitted", async ({ page, world }) => {
    await page.goto(world.characters.marrowfen.url);

    const submit = page.getByRole("button", { name: "Comment", exact: true });
    await expect(submit).toBeDisabled();

    // Whitespace is not content either.
    await page.getByPlaceholder("Write a comment...").fill("   ");
    await expect(submit).toBeDisabled();
  });

  test("a comment past the length limit cannot be submitted", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.marrowfen.url);

    // The form allows over-typing so it can show the error, and blocks the
    // submit rather than truncating. 2000 is MAX_COMMENT_LENGTH.
    await page.getByPlaceholder("Write a comment...").fill("x".repeat(2001));

    await expect(
      page.getByRole("button", { name: "Comment", exact: true }),
    ).toBeDisabled();
  });
});

test.describe("signed out", () => {
  test.use({ persona: "anon" });

  test("a visitor can read comments but is asked to log in to write", async ({
    page,
    world,
  }) => {
    await world.as("member").gql(SeedCreateCommentDocument, {
      input: {
        content: "Readable by anyone",
        entityType: CommentableType.Character,
        entityId: world.characters.marrowfen.id,
      },
    });

    await page.goto(world.characters.marrowfen.url);

    // The read path with no session at all. `Comment.likesCount` is
    // `@AllowUnauthenticated` precisely so this works -- gating it would 403,
    // null the comment and blank the section, which is #173's failure exactly.
    await expect(page.getByText("Readable by anyone")).toBeVisible();
    await expect(page.getByText("1 comment", { exact: true })).toBeVisible();

    await expect(
      page.getByText("Please log in to leave a comment"),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Write a comment...")).toHaveCount(0);
  });
});
