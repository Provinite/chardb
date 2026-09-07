import { presetTest, expect } from "../../src/fixtures.js";
import { SeedViewerFollowCountsDocument } from "../../src/generated/graphql.js";

/**
 * Commenting on a character, which was impossible for everyone.
 *
 * `Comment.likesCount` is declared by `CommentLikesResolver` in the social
 * module -- not by `CommentsResolver`, which is why reading the comments module
 * showed nothing wrong -- and it carried no `@Allow*`. Under a deny-by-default
 * guard chain that means forbidden to everyone, admins included.
 *
 * The field is `Int!`, so the 403 propagated: it nulled the Comment, which
 * nulled the list, which made `CommentList` render its error branch. That
 * branch replaced the entire section including the form, so a failing read took
 * away the ability to write and the page offered no way forward (#310).
 *
 * Both halves are covered here, because either one alone would have made the
 * report survivable: the field resolves now, and the form no longer disappears
 * when the read behind it fails.
 */

const test = presetTest("community-items");
test.use({ persona: "member" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

test("a member can post a comment on a character and see it", async ({
  page,
  world,
}) => {
  await page.goto(world.characters.marrowfen.url);

  // A character with no comments looks fine even when broken: with an empty
  // list `likesCount` is never resolved, so nothing 403s. That is why the
  // report was "comments break when you try to leave one" rather than "the
  // comments section is broken" -- posting the first one is what surfaces it.
  await expect(page.getByText("No comments yet")).toBeVisible();

  await page.getByPlaceholder("Write a comment...").fill("First!");
  await page.getByRole("button", { name: "Comment", exact: true }).click();

  // The count, not the text. `getByText("First!")` also matches the comment
  // still sitting in the textarea when the post fails, so it passes against
  // the bug -- the count only moves when both the write and the read behind it
  // succeeded.
  await expect(page.getByText("1 comment", { exact: true })).toBeVisible();
  await expect(page.getByTestId("comments-error")).toHaveCount(0);
});

test("a comment survives a reload, so the list read works too", async ({
  page,
  world,
}) => {
  await page.goto(world.characters.marrowfen.url);

  await page.getByPlaceholder("Write a comment...").fill("Still here");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("Still here")).toBeVisible();

  // The mutation and the query select `likesCount` independently, and the
  // reporter hit the query -- the section was already broken on arrival, before
  // anyone typed anything. A reload is the only way to assert the read path
  // rather than the write path's own response.
  await page.reload();

  await expect(page.getByText("Still here")).toBeVisible();
  await expect(page.getByTestId("comments-error")).toHaveCount(0);
});

test("the comment form stays when the list fails to load", async ({
  page,
  world,
}) => {
  // The guarantee that made #310 a dead end rather than a degraded page. Forced
  // rather than waited for: with the decorator fixed there is no longer a
  // natural way to make this read fail, and "one failing read must not remove
  // the form" is a claim about the component, not about that resolver.
  await page.route("**/graphql", async (route) => {
    const body = route.request().postData() ?? "";
    if (body.includes("GetComments")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [{ message: "Forbidden resource" }],
          data: null,
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(world.characters.marrowfen.url);

  await expect(page.getByTestId("comments-error")).toBeVisible();
  // The whole point: the read failed and you can still write.
  await expect(page.getByPlaceholder("Write a comment...")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comment", exact: true }),
  ).toBeVisible();
});

test("a viewer's follow counts resolve rather than 403", async ({ world }) => {
  // The same defect as `Comment.likesCount` -- an undecorated `@ResolveField`
  // on User -- but with no page behind it, so there is nothing to click. See
  // the comment on `SeedViewerFollowCounts` for why it is asserted here.
  const { me } = await world.as("member").gql(SeedViewerFollowCountsDocument);

  expect(me.followersCount).toBe(0);
  expect(me.followingCount).toBe(0);
});
