import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedApproveImageDocument,
  SeedMediaModerationQueueDocument,
  SeedMemberWalletDocument,
  SeedCurrencyTransactionsDocument,
  CurrencyTransactionSource,
  MediaAwardRelation,
  SeedCreateCommunityDocument,
  SeedCreateCommunityMemberDocument,
  SeedCreateCurrencyDocument,
  SeedRolesByCommunityDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-basic");

const NOT_ALLOWED = /forbidden|permission|not allowed|denied/i;

/**
 * Awarding currency when approving an upload.
 *
 * The fixture names three different people on one image on purpose — uploaded
 * and owned by `member`, drawn by `artist`, depicting a character owned by
 * `othermember` — because the whole point of the recipients widget is telling
 * those apart. In the ordinary case they collapse to one person and there is
 * nothing to test.
 */
test.describe("approval awards", () => {
  test.use({ persona: "anon" });

  test.describe("who can see the recipients", () => {
    test("a moderator who can grant sees them", async ({ world }) => {
      const { mediaModerationQueue } = await world
        .as("payingmod")
        .gql(SeedMediaModerationQueueDocument, {
          communityId: world.community.id,
        });

      const media = mediaModerationQueue.media.find(
        (m) => m.id === world.pendingImage.mediaId,
      );
      expect(media?.awardRecipients).not.toBeNull();
    });

    test("a moderator who cannot grant gets null, and still sees the queue", async ({
      world,
    }) => {
      const { mediaModerationQueue } = await world
        .as("imagemod")
        .gql(SeedMediaModerationQueueDocument, {
          communityId: world.community.id,
        });

      // Null rather than an error: the queue has to keep working for a
      // moderator who only moderates. That null is what hides the widget.
      expect(mediaModerationQueue.total).toBeGreaterThan(0);
      const media = mediaModerationQueue.media.find(
        (m) => m.id === world.pendingImage.mediaId,
      );
      expect(media?.awardRecipients).toBeNull();
    });

    test("the three people are separated, each with their own relation", async ({
      world,
    }) => {
      const { mediaModerationQueue } = await world
        .as("payingmod")
        .gql(SeedMediaModerationQueueDocument, {
          communityId: world.community.id,
        });

      const recipients =
        mediaModerationQueue.media.find(
          (m) => m.id === world.pendingImage.mediaId,
        )?.awardRecipients ?? [];

      const byUsername = Object.fromEntries(
        recipients.map((r) => [r.user.username, r.relations]),
      );

      // member uploaded it and owns the media; artist drew it; othermember
      // owns the character. One person holding two relations gets one row.
      expect(byUsername[world.users.member.username]).toEqual(
        expect.arrayContaining([
          MediaAwardRelation.Uploader,
          MediaAwardRelation.MediaOwner,
        ]),
      );
      expect(byUsername[world.users.artist.username]).toEqual([
        MediaAwardRelation.Artist,
      ]);
      expect(byUsername[world.users.othermember.username]).toEqual([
        MediaAwardRelation.CharacterOwner,
      ]);
      expect(recipients).toHaveLength(3);
    });

    test("everyone named is payable", async ({ world }) => {
      const { mediaModerationQueue } = await world
        .as("payingmod")
        .gql(SeedMediaModerationQueueDocument, {
          communityId: world.community.id,
        });

      const recipients =
        mediaModerationQueue.media.find(
          (m) => m.id === world.pendingImage.mediaId,
        )?.awardRecipients ?? [];
      expect(recipients.every((r) => r.isMember)).toBe(true);
    });
  });

  test.describe("approving with an award", () => {
    test.beforeEach(async ({ world }) => {
      await world.reset();
    });

    test("pays each person their own amount", async ({ world }) => {
      const { approveImage } = await world
        .as("payingmod")
        .gql(SeedApproveImageDocument, {
          input: {
            imageId: world.pendingImage.imageId,
            currencyId: world.currency.id,
            awards: [
              { userId: world.users.member.userId, amount: 25 },
              { userId: world.users.artist.userId, amount: 40 },
            ],
          },
        });

      const byUser = Object.fromEntries(
        approveImage.currencyAwards.map((a) => [a.userId, a.amount]),
      );
      expect(byUser[world.users.member.userId]).toBe(25);
      expect(byUser[world.users.artist.userId]).toBe(40);
    });

    test("the coin actually lands in their wallets", async ({ world }) => {
      await world.as("payingmod").gql(SeedApproveImageDocument, {
        input: {
          imageId: world.pendingImage.imageId,
          currencyId: world.currency.id,
          awards: [{ userId: world.users.artist.userId, amount: 40 }],
        },
      });

      const { memberWallet } = await world
        .as("artist")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.artist.userId,
        });

      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(40);
    });

    test("the ledger row names the media it came from", async ({ world }) => {
      await world.as("payingmod").gql(SeedApproveImageDocument, {
        input: {
          imageId: world.pendingImage.imageId,
          currencyId: world.currency.id,
          awards: [{ userId: world.users.artist.userId, amount: 40 }],
        },
      });

      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 20 },
        });

      // Without this a member reading "+40, upload approved" has no way to
      // reach the upload, and staff auditing cannot tell approvals apart.
      //
      // The media, not the image: an image is an implementation detail of a
      // media, and /media/:id is the page a member can actually open.
      const row = currencyTransactions.transactions[0];
      expect(row.source).toBe(CurrencyTransactionSource.MediaApproval);
      expect(row.sourceId).toBe(world.pendingImage.mediaId);
    });

    test("one approval is one batch, however many people it pays", async ({
      world,
    }) => {
      await world.as("payingmod").gql(SeedApproveImageDocument, {
        input: {
          imageId: world.pendingImage.imageId,
          currencyId: world.currency.id,
          awards: [
            { userId: world.users.member.userId, amount: 25 },
            { userId: world.users.artist.userId, amount: 40 },
            { userId: world.users.othermember.userId, amount: 10 },
          ],
        },
      });

      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 20 },
        });

      const batches = new Set(
        currencyTransactions.transactions.map((t) => t.batchId),
      );
      expect(currencyTransactions.transactions).toHaveLength(3);
      expect(batches.size).toBe(1);
    });

    test("approving without an award pays nobody", async ({ world }) => {
      await world.as("payingmod").gql(SeedApproveImageDocument, {
        input: { imageId: world.pendingImage.imageId },
      });

      const { currencyTransactions } = await world
        .as("member")
        .gql(SeedCurrencyTransactionsDocument, {
          filters: { communityId: world.community.id, limit: 20 },
        });

      expect(currencyTransactions.total).toBe(0);
    });

    test("an image cannot be approved, and so cannot be paid for, twice", async ({
      world,
    }) => {
      const input = {
        imageId: world.pendingImage.imageId,
        currencyId: world.currency.id,
        awards: [{ userId: world.users.artist.userId, amount: 40 }],
      };

      await world.as("payingmod").gql(SeedApproveImageDocument, { input });
      await expect(
        world.as("payingmod").gql(SeedApproveImageDocument, { input }),
      ).rejects.toThrow(/not pending/i);

      const { memberWallet } = await world
        .as("artist")
        .gql(SeedMemberWalletDocument, {
          communityId: world.community.id,
          userId: world.users.artist.userId,
        });
      expect(
        memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
      ).toBe(40);
    });
  });

  test.describe("cross-community minting", () => {
    test.beforeEach(async ({ world }) => {
      await world.reset();
    });

    test("a currency from another community is refused", async ({ world }) => {
      // The shape of the hole this guards: permission is checked against the
      // image's community, so a moderator of a small community who is merely
      // a MEMBER of a large one could name the large one's currency and mint
      // it to themselves. Nothing downstream catches it -- there they are a
      // legitimate member of that currency's own community.
      const { createCommunity: other } = await world
        .as("commadmin")
        .gql(SeedCreateCommunityDocument, {
          createCommunityInput: { name: `Elsewhere ${Date.now()}` },
        });

      const { rolesByCommunity } = await world
        .as("commadmin")
        .gql(SeedRolesByCommunityDocument, { communityId: other.id });
      const memberRole = rolesByCommunity.nodes.find(
        (r) => r.name === "Member",
      );

      // The attacker is an ordinary member over there, and can grant here.
      await world.as("siteadmin").gql(SeedCreateCommunityMemberDocument, {
        createCommunityMemberInput: {
          userId: world.users.payingmod.userId,
          roleId: memberRole!.id,
        },
      });

      const { createCurrency: theirCurrency } = await world
        .as("commadmin")
        .gql(SeedCreateCurrencyDocument, {
          input: { communityId: other.id, name: "Their Coin", code: "TC" },
        });

      await expect(
        world.as("payingmod").gql(SeedApproveImageDocument, {
          input: {
            imageId: world.pendingImage.imageId,
            currencyId: theirCurrency.id,
            awards: [{ userId: world.users.payingmod.userId, amount: 1000000 }],
          },
        }),
      ).rejects.toThrow(/does not belong to this image's community/i);
    });

    test("an award to somebody unconnected to the upload is refused", async ({
      world,
    }) => {
      // commadmin is a member here and could be paid through mintCurrency, so
      // this is not about privilege. It is about the ledger not lying: a
      // MEDIA_APPROVAL row naming somebody with no relationship to the upload
      // makes the source attribution worthless.
      await expect(
        world.as("payingmod").gql(SeedApproveImageDocument, {
          input: {
            imageId: world.pendingImage.imageId,
            currencyId: world.currency.id,
            awards: [{ userId: world.users.commadmin.userId, amount: 25 }],
          },
        }),
      ).rejects.toThrow(/connected to this upload/i);
    });
  });

  test.describe("permission", () => {
    test.beforeEach(async ({ world }) => {
      await world.reset();
    });

    test("a moderator without canGrantItems cannot award", async ({
      world,
    }) => {
      await expect(
        world.as("imagemod").gql(SeedApproveImageDocument, {
          input: {
            imageId: world.pendingImage.imageId,
            currencyId: world.currency.id,
            awards: [{ userId: world.users.artist.userId, amount: 40 }],
          },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });

    test("and the refused award leaves the image unapproved", async ({
      world,
    }) => {
      await world
        .as("imagemod")
        .gql(SeedApproveImageDocument, {
          input: {
            imageId: world.pendingImage.imageId,
            currencyId: world.currency.id,
            awards: [{ userId: world.users.artist.userId, amount: 40 }],
          },
        })
        .catch(() => undefined);

      // Still in the queue. Approving and paying are one transaction, so a
      // refused payment must not leave a silently approved image behind.
      const { mediaModerationQueue } = await world
        .as("imagemod")
        .gql(SeedMediaModerationQueueDocument, {
          communityId: world.community.id,
        });
      expect(
        mediaModerationQueue.media.some(
          (m) => m.id === world.pendingImage.mediaId,
        ),
      ).toBe(true);
    });

    test("but that same moderator can still approve", async ({ world }) => {
      // The positive control. Without it this matrix would pass just as
      // happily against a mutation that refused everyone.
      const { approveImage } = await world
        .as("imagemod")
        .gql(SeedApproveImageDocument, {
          input: { imageId: world.pendingImage.imageId },
        });

      expect(approveImage.currencyAwards).toHaveLength(0);
    });

    test("a plain member cannot approve at all", async ({ world }) => {
      await expect(
        world.as("member").gql(SeedApproveImageDocument, {
          input: { imageId: world.pendingImage.imageId },
        }),
      ).rejects.toThrow(NOT_ALLOWED);
    });
  });
});
