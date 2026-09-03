import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ModerationStatus, TraitReviewSource } from "@prisma/client";
import { TraitReviewService } from "./trait-review.service";
import { DatabaseService } from "../database/database.service";
import { ItemsService } from "../items/items.service";
import { mockDatabaseService } from "../../test/setup";

/**
 * First tests for this service, covering deferral only.
 *
 * Deferral is the one action in this queue that is not a review outcome, and
 * the whole of its correctness is in what it does *not* touch: a defer that
 * quietly resolved a review would destroy an item, and a defer that wrote to
 * the character would apply traits nobody approved. Those absences are what
 * these pin.
 */

// `createGranted` is how a refused redemption hands the member's item back.
const mockItemsService = { createGranted: jest.fn() };

describe("TraitReviewService", () => {
  let service: TraitReviewService;

  const REVIEW_ID = "review-1";
  const MODERATOR = "mod-1";

  const pendingReview = (overrides: Record<string, unknown> = {}) => ({
    id: REVIEW_ID,
    characterId: "char-1",
    status: ModerationStatus.PENDING,
    source: TraitReviewSource.MYO,
    deferralCount: 0,
    ...overrides,
  });

  /** The `data` handed to traitReview.update on the last call. */
  const updateData = () =>
    mockDatabaseService.traitReview.update.mock.calls.at(-1)?.[0].data as
      | Record<string, unknown>
      | undefined;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraitReviewService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ItemsService, useValue: mockItemsService },
      ],
    }).compile();

    service = module.get<TraitReviewService>(TraitReviewService);

    mockDatabaseService.traitReview.findUnique.mockResolvedValue(
      pendingReview(),
    );
    mockDatabaseService.traitReview.update.mockResolvedValue(pendingReview());
  });

  describe("deferReview", () => {
    it("stamps the sort key, the moderator and the note", async () => {
      await service.deferReview(REVIEW_ID, MODERATOR, " waiting on the owner ");

      expect(updateData()).toEqual({
        deferredAt: expect.any(Date),
        deferredById: MODERATOR,
        deferralCount: { increment: 1 },
        deferralNote: "waiting on the owner",
      });
    });

    it("counts every defer rather than overwriting the last one", async () => {
      // Incremented in the database, not read-then-written: two moderators
      // pressing this at once must not lose one of the presses.
      await service.deferReview(REVIEW_ID, MODERATOR);

      expect(updateData()?.deferralCount).toEqual({ increment: 1 });
    });

    it("clears a previous note when deferred again with none", async () => {
      await service.deferReview(REVIEW_ID, MODERATOR);

      expect(updateData()?.deferralNote).toBeNull();
    });

    it("treats a whitespace-only note as no note", async () => {
      await service.deferReview(REVIEW_ID, MODERATOR, "   ");

      expect(updateData()?.deferralNote).toBeNull();
    });

    it("leaves the review pending and unresolved", async () => {
      await service.deferReview(REVIEW_ID, MODERATOR);

      const data = updateData();
      expect(data).not.toHaveProperty("status");
      expect(data).not.toHaveProperty("resolvedAt");
      expect(data).not.toHaveProperty("resolvedById");
    });

    it("does not touch the character", async () => {
      // The proposed traits are still proposed. Writing them here would apply
      // an edit no moderator approved.
      await service.deferReview(REVIEW_ID, MODERATOR);

      expect(mockDatabaseService.character.update).not.toHaveBeenCalled();
    });

    it("does not hand a redemption's item back", async () => {
      // Refusing an MYO returns the ticket. Deferring one must not, or a
      // moderator parking an entry would be handing out free items.
      await service.deferReview(REVIEW_ID, MODERATOR);

      expect(mockItemsService.createGranted).not.toHaveBeenCalled();
    });

    it("guards the update on the review still being pending", async () => {
      // The status was read a moment ago; the where clause is what makes a
      // concurrent approval win instead of being overwritten.
      await service.deferReview(REVIEW_ID, MODERATOR);

      expect(
        mockDatabaseService.traitReview.update.mock.calls.at(-1)?.[0].where,
      ).toEqual({ id: REVIEW_ID, status: ModerationStatus.PENDING });
    });

    it("refuses a review that is not pending", async () => {
      mockDatabaseService.traitReview.findUnique.mockResolvedValue(
        pendingReview({ status: ModerationStatus.APPROVED }),
      );

      await expect(service.deferReview(REVIEW_ID, MODERATOR)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDatabaseService.traitReview.update).not.toHaveBeenCalled();
    });

    it("refuses a review that does not exist", async () => {
      mockDatabaseService.traitReview.findUnique.mockResolvedValue(null);

      await expect(service.deferReview(REVIEW_ID, MODERATOR)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
