import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedNotificationPreferencesDocument,
  SeedUpdateNotificationPreferenceDocument,
  SeedUnsubscribeFromNotificationEmailDocument,
  NotificationChannel,
  NotificationKind,
} from "../../src/generated/graphql.js";

/**
 * Delivery preferences (#344).
 *
 * The complaint that opened the issue was an email on every image approval,
 * with nothing anywhere to turn it off. So the load-bearing assertion in this
 * file is the pair of defaults: approvals off, rejections on. Everything else
 * exists to prove the switch is real -- that it survives a reload, and that the
 * table's sparseness is not visible to anyone reading it.
 */

const test = presetTest("community-basic");

test.describe("as a member", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("a member who has never opened settings still has a full matrix", async ({
    world,
  }) => {
    // Rows exist only where somebody disagreed with a default, and this member
    // has disagreed with nothing. An answer per kind here is the merge working.
    const { notificationPreferences } = await world
      .as("member")
      .gql(SeedNotificationPreferencesDocument, {});

    expect(notificationPreferences.length).toBeGreaterThan(0);
    for (const row of notificationPreferences) {
      expect(typeof row.inApp).toBe("boolean");
      expect(typeof row.email).toBe("boolean");
    }
  });

  test("approvals do not email by default and rejections do", async ({
    world,
  }) => {
    const { notificationPreferences } = await world
      .as("member")
      .gql(SeedNotificationPreferencesDocument, {});

    const approved = notificationPreferences.find(
      (row) => row.kind === NotificationKind.ImageApproved,
    );
    const rejected = notificationPreferences.find(
      (row) => row.kind === NotificationKind.ImageRejected,
    );

    // The issue, in two lines: an approval is the expected outcome and tells
    // the uploader nothing they need; a rejection is the one they must act on.
    expect(approved?.email).toBe(false);
    expect(rejected?.email).toBe(true);

    // Both still reach the bell. Turning off the mail is not turning off the
    // notification.
    expect(approved?.inApp).toBe(true);
    expect(rejected?.inApp).toBe(true);
  });

  test("only the kinds with a template offer an email switch", async ({
    world,
  }) => {
    const { notificationPreferences } = await world
      .as("member")
      .gql(SeedNotificationPreferencesDocument, {});

    const emailable = notificationPreferences
      .filter((row) => row.emailSupported)
      .map((row) => row.kind);

    expect(emailable).toEqual([
      NotificationKind.ImageApproved,
      NotificationKind.ImageRejected,
    ]);
  });

  test("email cannot be set for a kind that does not send any", async ({
    world,
  }) => {
    // Refused rather than stored: a "yes" recorded now would start sending the
    // moment somebody wrote the template, which is consent given before the
    // thing existed.
    await expect(
      world.as("member").gql(SeedUpdateNotificationPreferenceDocument, {
        input: {
          kind: NotificationKind.FollowReceived,
          channel: NotificationChannel.Email,
          enabled: true,
        },
      }),
    ).rejects.toThrow(/does not send email/);
  });

  test("the settings page shows the matrix and a toggle sticks", async ({
    page,
    world,
  }) => {
    await page.goto("/profile/edit");

    const approvalEmail = page.getByLabel("Image approved by email");
    await expect(approvalEmail).toBeVisible();
    await expect(approvalEmail).not.toBeChecked();
    await expect(page.getByLabel("Image not approved by email")).toBeChecked();

    // A kind with no template shows no switch at all, rather than a disabled
    // one -- a greyed-out box reads as "off", which is a different claim.
    await expect(page.getByLabel("New followers by email")).toHaveCount(0);
    await expect(page.getByLabel("New followers in app")).toBeVisible();

    await approvalEmail.check();

    await page.reload();
    await expect(page.getByLabel("Image approved by email")).toBeChecked();

    // ...and the server agrees, not just the cache.
    const { notificationPreferences } = await world
      .as("member")
      .gql(SeedNotificationPreferencesDocument, {});
    expect(
      notificationPreferences.find(
        (row) => row.kind === NotificationKind.ImageApproved,
      )?.email,
    ).toBe(true);
  });

  test("security email is named as something that cannot be turned off", async ({
    page,
  }) => {
    await page.goto("/profile/edit");

    // Silence would read as an oversight. Password reset has no row in the
    // matrix because it has no kind, and the page has to say why.
    await expect(page.getByText("Always sent")).toBeVisible();
    await expect(
      page.getByText(/Password resets.*cannot be turned off/),
    ).toBeVisible();
  });
});

test.describe("signed out, from an email link", () => {
  test.use({ persona: "anon" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("an invalid token is refused without an error", async ({ world }) => {
    // A public endpoint gets fed junk. It has to be a flat no, not a 500, and
    // it must not say which part was wrong.
    const { unsubscribeFromNotificationEmail } = await world
      .as("anon")
      .gql(SeedUnsubscribeFromNotificationEmailDocument, {
        input: { token: "not-a-real-token" },
      });

    expect(unsubscribeFromNotificationEmail.success).toBe(false);
    expect(unsubscribeFromNotificationEmail.kind).toBeNull();
  });

  test("the unsubscribe page renders for a token it cannot verify", async ({
    page,
  }) => {
    // The route matters as much as the mutation: the token is a path segment,
    // and a separator the static host mistakes for a file extension makes this
    // 404 before React ever sees it.
    await page.goto("/unsubscribe/aaa~bbb~ccc");

    await expect(
      page.getByRole("heading", { name: "That link is not valid" }),
    ).toBeVisible();
  });
});
