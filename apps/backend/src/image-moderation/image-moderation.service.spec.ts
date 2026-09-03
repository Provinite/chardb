import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, BadRequestException } from "@nestjs/common";
import { ModerationStatus, CurrencyTransactionSource } from "@prisma/client";
import { ImageModerationService } from "./image-moderation.service";
import { DatabaseService } from "../database/database.service";
import { PermissionService } from "../auth/PermissionService";
import { EmailService } from "../email/email.service";
import { CurrencyLedgerService } from "../currencies/currency-ledger.service";
import { MediaService } from "../media/media.service";
import { CommunityPermission } from "../auth/CommunityPermission";
import { mockDatabaseService } from "../../test/setup";

/**
 * First tests for this service.
 *
 * Approve and reject had no coverage at all before currency was attached to
 * them, which is why the award cases here also pin the surrounding behaviour:
 * a rollback that loses an approval is now possible in a way it was not, and
 * that is the whole reason the payment is inside the transaction.
 */

const mockPermissionService = { hasCommunityPermission: jest.fn() };
const mockEmailService = {
  sendImageApprovedEmail: jest.fn(),
  sendImageRejectedEmail: jest.fn(),
};
const mockLedger = { credit: jest.fn() };
const mockMediaService = { findAwardRecipients: jest.fn() };

describe("ImageModerationService", () => {
  let service: ImageModerationService;

  const IMAGE_ID = "image-1";
  const MODERATOR = "mod-1";
  const COMMUNITY = "comm-1";
  const MEDIA_ID = "media-1";

  /** The data handed to imageModerationAction.create on the last call. */
  const creditCall = () =>
    mockLedger.credit.mock.calls.at(-1)?.[0] as
      | Record<string, unknown>
      | undefined;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageModerationService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CurrencyLedgerService, useValue: mockLedger },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<ImageModerationService>(ImageModerationService);

    // A plain moderator: not a global admin, holds whatever permission is asked
    // for unless a test narrows it.
    mockDatabaseService.user.findUnique.mockResolvedValue({ isAdmin: false });
    mockPermissionService.hasCommunityPermission.mockResolvedValue(true);
    // Serves both lookups the service makes on media: the community
    // resolution and the source id for the ledger row.
    mockDatabaseService.media.findFirst.mockResolvedValue({
      id: MEDIA_ID,
      character: { species: { communityId: COMMUNITY } },
    });
    mockDatabaseService.image.findUnique.mockResolvedValue({
      id: IMAGE_ID,
      moderationStatus: ModerationStatus.PENDING,
      originalFilename: "ridley.png",
      uploader: { email: "clove@example.test", username: "clove" },
    });
    mockDatabaseService.image.update.mockResolvedValue({});
    mockDatabaseService.imageModerationAction.create.mockResolvedValue({
      id: "action-1",
      imageId: IMAGE_ID,
    });
    mockLedger.credit.mockResolvedValue({
      batchId: "batch-1",
      paid: [],
      skipped: [],
    });
    // The currency belongs to the image's community, and both recipients are
    // connected to the media, unless a test says otherwise.
    mockDatabaseService.currency.findUnique.mockResolvedValue({
      communityId: COMMUNITY,
    });
    mockMediaService.findAwardRecipients.mockResolvedValue([
      { userId: "uploader-1" },
      { userId: "artist-1" },
    ]);
  });

  describe("approveImage without an award", () => {
    it("approves and records the action", async () => {
      const action = await service.approveImage(IMAGE_ID, MODERATOR);

      expect(mockDatabaseService.image.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { moderationStatus: ModerationStatus.APPROVED },
        }),
      );
      expect(action).toMatchObject({ id: "action-1" });
    });

    it("pays nobody", async () => {
      await service.approveImage(IMAGE_ID, MODERATOR);
      expect(mockLedger.credit).not.toHaveBeenCalled();
    });

    it("refuses a moderator without permission on this image", async () => {
      mockPermissionService.hasCommunityPermission.mockResolvedValue(false);

      await expect(service.approveImage(IMAGE_ID, MODERATOR)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuses an image that is not pending", async () => {
      mockDatabaseService.image.findUnique.mockResolvedValue({
        id: IMAGE_ID,
        moderationStatus: ModerationStatus.APPROVED,
        originalFilename: "ridley.png",
        uploader: { email: "clove@example.test", username: "clove" },
      });

      // This is also what stops an image being paid for twice: a second
      // approval cannot happen, so a second award cannot either.
      await expect(service.approveImage(IMAGE_ID, MODERATOR)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("approveImage with an award", () => {
    const award = {
      currencyId: "cur-1",
      awards: [
        { userId: "uploader-1", amount: 25 },
        { userId: "artist-1", amount: 40 },
      ],
    };

    it("credits inside the same transaction as the approval", async () => {
      await service.approveImage(IMAGE_ID, MODERATOR, award);

      // The tx client is threaded through, so approving and paying commit
      // together. Approved-but-unpaid is a support ticket; paid-but-unapproved
      // is money for an image nobody can see.
      expect(creditCall()).toEqual(
        expect.objectContaining({ tx: expect.anything() }),
      );
    });

    it("stamps the source so the ledger row can name the media", async () => {
      await service.approveImage(IMAGE_ID, MODERATOR, award);

      expect(creditCall()).toEqual(
        expect.objectContaining({
          source: CurrencyTransactionSource.MEDIA_APPROVAL,
          // The media, not the image: that is what a member can open.
          sourceId: MEDIA_ID,
        }),
      );
    });

    it("names the moderator as the actor", async () => {
      await service.approveImage(IMAGE_ID, MODERATOR, award);

      // The permission to mint came from the community, but who did it is
      // still the moderator, and the ledger's job is to say so.
      expect(creditCall()).toEqual(
        expect.objectContaining({ actorUserId: MODERATOR }),
      );
    });

    it("skips non-members rather than failing the approval", async () => {
      await service.approveImage(IMAGE_ID, MODERATOR, award);

      // An uploader who has since left the community must not be able to
      // block moderation of their old upload.
      expect(creditCall()).toEqual(
        expect.objectContaining({ skipNonMembers: true }),
      );
    });

    it("refuses a currency from a different community", async () => {
      mockDatabaseService.currency.findUnique.mockResolvedValue({
        communityId: "some-other-community",
      });

      // The permission check passes -- the caller really can grant in THIS
      // image's community. Without this check the coin would be minted from
      // whichever community they named, so a moderator of a small community
      // who is merely a member of a large one could mint the large one's
      // currency to themselves. credit() cannot catch it: there the recipient
      // is a legitimate member of the currency's own community.
      await expect(
        service.approveImage(IMAGE_ID, MODERATOR, award),
      ).rejects.toThrow(/does not belong to this image's community/i);
      expect(mockLedger.credit).not.toHaveBeenCalled();
      expect(mockDatabaseService.image.update).not.toHaveBeenCalled();
    });

    it("refuses a currency that does not exist", async () => {
      mockDatabaseService.currency.findUnique.mockResolvedValue(null);

      await expect(
        service.approveImage(IMAGE_ID, MODERATOR, award),
      ).rejects.toThrow(/does not belong to this image's community/i);
    });

    it("refuses a recipient with no connection to the upload", async () => {
      mockMediaService.findAwardRecipients.mockResolvedValue([
        { userId: "uploader-1" },
      ]);

      // Not a privilege escalation -- this caller could pay artist-1 through
      // mintCurrency anyway. It is about the ledger not lying: a
      // MEDIA_APPROVAL row naming somebody unconnected to the upload makes
      // the source attribution worthless.
      await expect(
        service.approveImage(IMAGE_ID, MODERATOR, award),
      ).rejects.toThrow(/connected to this upload/i);
      expect(mockLedger.credit).not.toHaveBeenCalled();
    });

    it("refuses an award from a moderator without canGrantItems", async () => {
      mockPermissionService.hasCommunityPermission.mockImplementation(
        (_userId: string, _communityId: string, permission: string) =>
          Promise.resolve(permission !== CommunityPermission.CanGrantItems),
      );

      // The widget is hidden from this person, but hiding a control is not a
      // check. Without this, anyone who could moderate could mint.
      await expect(
        service.approveImage(IMAGE_ID, MODERATOR, award),
      ).rejects.toThrow(ForbiddenException);
      expect(mockLedger.credit).not.toHaveBeenCalled();
    });

    it("leaves the image pending when the award is refused", async () => {
      mockPermissionService.hasCommunityPermission.mockImplementation(
        (_userId: string, _communityId: string, permission: string) =>
          Promise.resolve(permission !== CommunityPermission.CanGrantItems),
      );

      await service
        .approveImage(IMAGE_ID, MODERATOR, award)
        .catch(() => undefined);

      expect(mockDatabaseService.image.update).not.toHaveBeenCalled();
    });

    it("requires a currency when amounts are given", async () => {
      await expect(
        service.approveImage(IMAGE_ID, MODERATOR, {
          awards: [{ userId: "uploader-1", amount: 25 }],
        }),
      ).rejects.toThrow(/currency is required/i);
    });

    it("ignores an award list that is entirely zeroes", async () => {
      await service.approveImage(IMAGE_ID, MODERATOR, {
        currencyId: "cur-1",
        awards: [{ userId: "uploader-1", amount: 0 }],
      });

      // Nothing to pay means no permission check and no ledger write -- an
      // empty widget must behave exactly like the old Approve button.
      expect(mockLedger.credit).not.toHaveBeenCalled();
      expect(mockDatabaseService.image.update).toHaveBeenCalled();
    });

    it("rolls the approval back when the credit fails", async () => {
      mockLedger.credit.mockRejectedValue(new Error("balance exploded"));

      await expect(
        service.approveImage(IMAGE_ID, MODERATOR, award),
      ).rejects.toThrow(/balance exploded/);

      // The mocked $transaction does not roll back, so this asserts the
      // failure propagates rather than being swallowed -- which is what makes
      // the real transaction roll back. A caught-and-logged credit failure
      // would leave an approval that silently promised money.
      expect(mockLedger.credit).toHaveBeenCalled();
    });

    it("refuses an award on an image attached to no media", async () => {
      mockDatabaseService.media.findFirst.mockResolvedValue(null);
      mockDatabaseService.user.findUnique.mockResolvedValue({ isAdmin: true });

      // A global admin can moderate a media-less image, but there is nothing
      // for the ledger row to point at and no community to find a currency
      // in. The media check runs first because it is the more specific of the
      // two -- no media implies no community, but not the reverse.
      await expect(
        service.approveImage(IMAGE_ID, MODERATOR, award),
      ).rejects.toThrow(/not attached to any media/i);
      expect(mockDatabaseService.image.update).not.toHaveBeenCalled();
    });
  });

  describe("rejectImage", () => {
    beforeEach(() => {
      mockDatabaseService.imageModerationAction.create.mockResolvedValue({
        id: "action-2",
        imageId: IMAGE_ID,
      });
    });

    it("never pays anyone", async () => {
      await service.rejectImage(
        IMAGE_ID,
        MODERATOR,
        "SPAM_LOW_QUALITY" as never,
      );

      expect(mockLedger.credit).not.toHaveBeenCalled();
    });
  });

  describe("deferImage", () => {
    it("stamps the sort key, the moderator and the note", async () => {
      await service.deferImage(IMAGE_ID, MODERATOR, "  waiting on a reupload ");

      expect(mockDatabaseService.image.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: IMAGE_ID },
          data: {
            deferredAt: expect.any(Date),
            deferredById: MODERATOR,
            deferralCount: { increment: 1 },
            deferralNote: "waiting on a reupload",
          },
        }),
      );
    });

    it("clears a previous note when deferred again with none", async () => {
      // Null, not undefined: the note describes why THIS moderator passed,
      // and leaving the last person's reason attached would misattribute it.
      await service.deferImage(IMAGE_ID, MODERATOR);

      expect(mockDatabaseService.image.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deferralNote: null }),
        }),
      );
    });

    it("treats a whitespace-only note as no note", async () => {
      await service.deferImage(IMAGE_ID, MODERATOR, "   ");

      expect(mockDatabaseService.image.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deferralNote: null }),
        }),
      );
    });

    it("leaves the moderation status alone", async () => {
      await service.deferImage(IMAGE_ID, MODERATOR);

      const data = mockDatabaseService.image.update.mock.calls.at(-1)?.[0]
        .data as Record<string, unknown>;
      expect(data).not.toHaveProperty("moderationStatus");
    });

    it("writes nothing to the moderation action log", async () => {
      // Deferring is not a decision. That table's `action` column is a
      // ModerationStatus, and there is no status for "not yet".
      await service.deferImage(IMAGE_ID, MODERATOR);

      expect(
        mockDatabaseService.imageModerationAction.create,
      ).not.toHaveBeenCalled();
    });

    it("never pays anyone", async () => {
      await service.deferImage(IMAGE_ID, MODERATOR);

      expect(mockLedger.credit).not.toHaveBeenCalled();
    });

    it("refuses a moderator without permission on this image", async () => {
      mockPermissionService.hasCommunityPermission.mockResolvedValue(false);

      await expect(service.deferImage(IMAGE_ID, MODERATOR)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDatabaseService.image.update).not.toHaveBeenCalled();
    });

    it("refuses an image that is not pending", async () => {
      // A resolved image is not in the queue, so there is no back of the
      // queue to send it to.
      mockDatabaseService.image.findUnique.mockResolvedValue({
        id: IMAGE_ID,
        moderationStatus: ModerationStatus.REJECTED,
        originalFilename: "ridley.png",
        uploader: { email: "clove@example.test", username: "clove" },
      });

      await expect(service.deferImage(IMAGE_ID, MODERATOR)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDatabaseService.image.update).not.toHaveBeenCalled();
    });
  });
});
