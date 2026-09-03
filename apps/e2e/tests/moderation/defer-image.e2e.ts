import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedDeferImageDocument,
  SeedMediaModerationQueueDocument,
  SeedApproveImageDocument,
} from "../../src/generated/graphql.js";
import type { CommunityBasicWorld } from "../../src/world/presets/community-basic.js";
import type { World } from "../../src/world/types.js";

const test = presetTest("community-basic");

const NOT_ALLOWED = /forbidden|permission|not allowed|denied/i;

/**
 * Sending an image to the back of the moderation queue.
 *
 * The queue lists media but moderates the image behind it, so its ordering
 * reaches across a relation -- `orderBy: { image: { deferredAt: NULLS FIRST } }`.
 * That is the one part of this feature no unit test can vouch for, because a
 * mocked Prisma client will accept any orderBy at all. These run it against
 * real Postgres.
 */
test.describe("deferring an image", () => {
  test.use({ persona: "anon" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const queue = (world: World<CommunityBasicWorld>) =>
    world.as("imagemod").gql(SeedMediaModerationQueueDocument, {
      communityId: world.community.id,
    });

  test("stays in the queue, still pending, with the count and note", async ({
    world,
  }) => {
    await world.as("imagemod").gql(SeedDeferImageDocument, {
      input: {
        imageId: world.pendingImage.imageId,
        note: "waiting on a clean reupload",
      },
    });

    const { mediaModerationQueue } = await queue(world);
    const media = mediaModerationQueue.media.find(
      (m) => m.id === world.pendingImage.mediaId,
    );

    // Still listed and still pending: deferring decides nothing.
    expect(media).toBeDefined();
    expect(mediaModerationQueue.total).toBe(1);
    expect(media?.pendingModerationImage?.moderationStatus).toBe("PENDING");
    expect(media?.pendingModerationImage?.deferralCount).toBe(1);
    expect(media?.pendingModerationImage?.deferralNote).toBe(
      "waiting on a clean reupload",
    );
    expect(media?.pendingModerationImage?.deferredBy?.username).toBe(
      "imagemod",
    );
  });

  test("counts each pass and replaces the note", async ({ world }) => {
    await world.as("imagemod").gql(SeedDeferImageDocument, {
      input: { imageId: world.pendingImage.imageId, note: "first reason" },
    });
    await world.as("payingmod").gql(SeedDeferImageDocument, {
      input: { imageId: world.pendingImage.imageId },
    });

    const { mediaModerationQueue } = await queue(world);
    const image = mediaModerationQueue.media.find(
      (m) => m.id === world.pendingImage.mediaId,
    )?.pendingModerationImage;

    expect(image?.deferralCount).toBe(2);
    // The note belonged to the first moderator's reasoning, and the second
    // left none. Keeping it would attribute their words to someone else.
    expect(image?.deferralNote).toBeNull();
    expect(image?.deferredBy?.username).toBe("payingmod");
  });

  test("refuses a member who cannot moderate images", async ({ world }) => {
    await expect(
      world.as("member").gql(SeedDeferImageDocument, {
        input: { imageId: world.pendingImage.imageId },
      }),
    ).rejects.toThrow(NOT_ALLOWED);
  });

  test("refuses an image that has already been decided", async ({ world }) => {
    await world.as("imagemod").gql(SeedApproveImageDocument, {
      input: { imageId: world.pendingImage.imageId },
    });

    // Approved images are out of the queue entirely, so there is no back of
    // the queue left to send this one to.
    await expect(
      world.as("imagemod").gql(SeedDeferImageDocument, {
        input: { imageId: world.pendingImage.imageId },
      }),
    ).rejects.toThrow(/not pending/i);
  });
});
