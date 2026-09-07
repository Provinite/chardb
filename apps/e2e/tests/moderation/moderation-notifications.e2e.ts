import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedApproveImageDocument,
  SeedRejectImageDocument,
  SeedMyNotificationsDocument,
  SeedUpdateNotificationPreferenceDocument,
  ModerationRejectionReason,
  NotificationChannel,
  NotificationKind,
  NotificationSubjectType,
} from "../../src/generated/graphql.js";

/**
 * Image moderation now reaches the bell (#344).
 *
 * Before this, approving or rejecting an image sent an email and nothing else;
 * `IMAGE_APPROVED` and `IMAGE_REJECTED` were not notification kinds at all. The
 * uploader's only record of it was in their inbox, which is exactly why turning
 * that inbox off had to come with somewhere else for it to land.
 *
 * The image belongs to `member` in this preset, so the notification is asserted
 * from `member`'s own feed rather than from the moderator's.
 */

const test = presetTest("community-basic");

test.describe("moderation notifications", () => {
  test.use({ persona: "anon" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("approving an image tells the uploader", async ({ world }) => {
    await world.as("imagemod").gql(SeedApproveImageDocument, {
      input: { imageId: world.pendingImage.imageId },
    });

    const { notifications } = await world
      .as("member")
      .gql(SeedMyNotificationsDocument, {});

    const approval = notifications.nodes.find(
      (n) => n.kind === NotificationKind.ImageApproved,
    );
    expect(approval).toBeDefined();
    expect(approval?.subjectType).toBe(NotificationSubjectType.Image);
    expect(approval?.subjectId).toBe(world.pendingImage.imageId);
    // The filename is snapshotted at write time, so the row still says which
    // image it was after the image is gone.
    expect(approval?.subjectName).toBeTruthy();
  });

  test("a rejection carries its reason and the moderator's own words", async ({
    world,
  }) => {
    await world.as("imagemod").gql(SeedRejectImageDocument, {
      input: {
        imageId: world.pendingImage.imageId,
        reason: ModerationRejectionReason.NsfwNotTagged,
        reasonText: "Please tag this before reuploading.",
      },
    });

    const { notifications } = await world
      .as("member")
      .gql(SeedMyNotificationsDocument, {});

    const rejection = notifications.nodes.find(
      (n) => n.kind === NotificationKind.ImageRejected,
    );
    expect(rejection).toBeDefined();
    // The enum name, not its rendered label: rewording a label must not rewrite
    // what an old row says happened.
    expect(rejection?.reason).toBe("NSFW_NOT_TAGGED");
    expect(rejection?.reasonText).toBe("Please tag this before reuploading.");
  });

  test("switching the in-app channel off stops the row being written", async ({
    world,
  }) => {
    await world.as("member").gql(SeedUpdateNotificationPreferenceDocument, {
      input: {
        kind: NotificationKind.ImageApproved,
        channel: NotificationChannel.InApp,
        enabled: false,
      },
    });

    await world.as("imagemod").gql(SeedApproveImageDocument, {
      input: { imageId: world.pendingImage.imageId },
    });

    const { notifications } = await world
      .as("member")
      .gql(SeedMyNotificationsDocument, {});

    expect(
      notifications.nodes.filter(
        (n) => n.kind === NotificationKind.ImageApproved,
      ),
    ).toHaveLength(0);
  });

  test("turning off approvals leaves rejections alone", async ({ world }) => {
    // The two are separate kinds with separate switches. Silencing the one that
    // says "all is well" must not silence the one that asks you to do something.
    await world.as("member").gql(SeedUpdateNotificationPreferenceDocument, {
      input: {
        kind: NotificationKind.ImageApproved,
        channel: NotificationChannel.InApp,
        enabled: false,
      },
    });

    await world.as("imagemod").gql(SeedRejectImageDocument, {
      input: {
        imageId: world.pendingImage.imageId,
        reason: ModerationRejectionReason.SpamLowQuality,
      },
    });

    const { notifications } = await world
      .as("member")
      .gql(SeedMyNotificationsDocument, {});

    expect(
      notifications.nodes.some(
        (n) => n.kind === NotificationKind.ImageRejected,
      ),
    ).toBe(true);
  });

  test("it goes to the uploader, not to the moderator who decided", async ({
    world,
  }) => {
    await world.as("imagemod").gql(SeedApproveImageDocument, {
      input: { imageId: world.pendingImage.imageId },
    });

    const { notifications } = await world
      .as("imagemod")
      .gql(SeedMyNotificationsDocument, {});

    expect(
      notifications.nodes.some(
        (n) => n.kind === NotificationKind.ImageApproved,
      ),
    ).toBe(false);
  });
});
