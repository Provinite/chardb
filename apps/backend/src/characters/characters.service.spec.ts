import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CharactersService } from "./characters.service";
import { DatabaseService } from "../database/database.service";
import { TagsService } from "../tags/tags.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { DiscordService } from "../discord/discord.service";
import { DeviantArtService } from "../deviantart/deviantart.service";
import { PermissionService } from "../auth/PermissionService";
import { TraitReviewService } from "../trait-review/trait-review.service";
import { CharacterFormsService } from "../character-forms/character-forms.service";
import { ModerationStatus, TraitValueType, Visibility } from "@chardb/database";
import { mockDatabaseService } from "../../test/setup";
import { CharacterAvailability } from "./character-availability";

const mockTagsService = {
  getCharacterTags: jest.fn(),
  getCharacterTagRelations: jest.fn(),
  findOrCreateTags: jest.fn(),
};
const mockPendingOwnershipService = {
  findByCharacterId: jest.fn(),
  createForCharacter: jest.fn(),
  remove: jest.fn(),
};
const mockDiscordService = {
  validateUserId: jest.fn(),
  resolveUsernameToId: jest.fn(),
};
const mockDeviantArtService = { resolveUsername: jest.fn() };
const mockPermissionService = {
  hasCommunityPermission: jest.fn(),
  getCommunityPermissions: jest.fn(),
};
const mockTraitReviewService = { createReview: jest.fn() };

/**
 * The single writer of a character's traits.
 *
 * `readForms` answers with one empty form by default, which is what every
 * character in these tests has -- the kickFromSpecies cases override it to
 * hand back the trait values they are about to assert on.
 */
const mockCharacterFormsService = {
  findByCharacter: jest.fn().mockResolvedValue([]),
  readForms: jest.fn(),
  writeForms: jest.fn().mockResolvedValue([]),
  snapshotToWrites: jest.fn().mockResolvedValue([]),
  validateForms: jest.fn().mockResolvedValue(undefined),
};

/** A form snapshot, as `readForms` returns one. */
const form = (
  traitValues: Array<Record<string, unknown>> = [],
  overrides: Record<string, unknown> = {},
) => ({
  formId: "form1",
  name: "Base",
  sortOrder: 0,
  traitValues,
  ...overrides,
});

/**
 * What the character under test has, trait-wise.
 *
 * Traits are rows of their own now rather than a column on the character, so
 * the character mock no longer carries them and this is where a test says what
 * they are.
 */
const givenForms = (...forms: Array<ReturnType<typeof form>>) =>
  mockCharacterFormsService.readForms.mockResolvedValue(forms);

const makeCharacter = (overrides: Record<string, unknown> = {}) => ({
  id: "char1",
  name: "Test Character",
  visibility: Visibility.PUBLIC,
  ownerId: "user1",
  creatorId: "user1",
  speciesId: null,
  speciesVariantId: null,
  registryId: null,
  customFields: {},
  traitReviewStatus: null,
  deletedAt: null,
  deletedById: null,
  mainMediaId: null,
  isSellable: false,
  isTradeable: false,
  price: null,
  details: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("CharactersService", () => {
  let service: CharactersService;
  let db: typeof mockDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: TagsService, useValue: mockTagsService },
        {
          provide: PendingOwnershipService,
          useValue: mockPendingOwnershipService,
        },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: DeviantArtService, useValue: mockDeviantArtService },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: TraitReviewService, useValue: mockTraitReviewService },
        {
          provide: CharacterFormsService,
          useValue: mockCharacterFormsService,
        },
      ],
    }).compile();

    service = module.get<CharactersService>(CharactersService);
    db = module.get<DatabaseService>(
      DatabaseService,
    ) as unknown as typeof mockDatabaseService;

    mockCharacterFormsService.readForms.mockReset();
    mockCharacterFormsService.readForms.mockResolvedValue([form()]);
    mockCharacterFormsService.writeForms.mockClear();
  });

  describe("findOne", () => {
    it("should find a public character", async () => {
      const character = makeCharacter();
      db.character.findFirst.mockResolvedValue(character);

      const result = await service.findOne("char1");

      expect(db.character.findFirst).toHaveBeenCalledWith({
        where: { id: "char1", deletedAt: null },
      });
      expect(result).toEqual(character);
    });

    it("should throw NotFoundException for a non-existent character", async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException for a soft-deleted character", async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.findOne("char1")).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for private character accessed by non-owner", async () => {
      const character = makeCharacter({ visibility: Visibility.PRIVATE });
      db.character.findFirst.mockResolvedValue(character);

      await expect(service.findOne("char1", "user2")).rejects.toThrow();
    });

    it("should allow owner to access private character", async () => {
      const character = makeCharacter({ visibility: Visibility.PRIVATE });
      db.character.findFirst.mockResolvedValue(character);

      const result = await service.findOne("char1", "user1");
      expect(result).toEqual(character);
    });
  });

  describe("findAll", () => {
    it("should include notDeleted filter in the where clause", async () => {
      const mockCharacters = [
        makeCharacter(),
        makeCharacter({ id: "char2", name: "Character 2" }),
      ];
      db.character.findMany.mockResolvedValue(mockCharacters);
      db.character.count.mockResolvedValue(2);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({
        characters: mockCharacters,
        total: 2,
        hasMore: false,
      });

      expect(db.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([{ deletedAt: null }]),
          }),
        }),
      );
    });

    it("should not include soft-deleted characters", async () => {
      db.character.findMany.mockResolvedValue([]);
      db.character.count.mockResolvedValue(0);

      await service.findAll();

      const [call] = db.character.findMany.mock.calls;
      const where = call[0].where;
      expect(where.AND).toEqual(expect.arrayContaining([{ deletedAt: null }]));
    });

    describe("availability", () => {
      beforeEach(() => {
        db.character.findMany.mockResolvedValue([]);
        db.character.count.mockResolvedValue(0);
      });

      /** The AND clause the filter builds, for the last findAll. */
      const lastWhere = () =>
        db.character.findMany.mock.calls.at(-1)?.[0].where.AND as Array<
          Record<string, unknown>
        >;

      it("asks for any of the ticked kinds, not all of them", async () => {
        await service.findAll({
          availability: [
            CharacterAvailability.FREEBIE,
            CharacterAvailability.OFFERS,
          ],
        });

        // A row of checkboxes means "any of these". AND'ing them would return
        // nothing for most combinations and read as a broken filter rather
        // than a strict one.
        expect(lastWhere()).toEqual(
          expect.arrayContaining([
            { OR: [{ isFreebie: true }, { isOpenToOffers: true }] },
          ]),
        );
      });

      it("maps each kind to its own column", async () => {
        await service.findAll({
          availability: [
            CharacterAvailability.FOR_SALE,
            CharacterAvailability.FOR_SALE_COIN,
            CharacterAvailability.TRADE_CHARACTERS,
            CharacterAvailability.TRADE_ART,
          ],
        });

        // Sale-for-money and sale-for-coin are different columns, and so are
        // the two kinds of trade. Collapsing either pair would make the
        // browse filter answer a question nobody asked -- and in the trade
        // case would imply consent to a transfer that was never given.
        expect(lastWhere()).toEqual(
          expect.arrayContaining([
            {
              OR: [
                { isSellable: true },
                { isSellableForCoin: true },
                { isTradeable: true },
                { isTradeableForArt: true },
              ],
            },
          ]),
        );
      });

      it("treats an empty list as no filter at all", async () => {
        await service.findAll({ availability: [] });

        // Unticking the last box returns you to browsing everything. A filter
        // matching nothing would look like the list had broken.
        expect(lastWhere()).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ OR: [] })]),
        );
      });

      it("keeps the negative filter separate from the ticked kinds", async () => {
        await service.findAll({
          isTradeable: false,
          availability: [CharacterAvailability.FREEBIE],
        });

        // "not open to trades" is a different question from "any of these",
        // and a list of things to include cannot express it. Both clauses
        // land, AND'd.
        expect(lastWhere()).toEqual(
          expect.arrayContaining([
            { isTradeable: false },
            { OR: [{ isFreebie: true }] },
          ]),
        );
      });
    });
  });

  describe("softDelete", () => {
    it("should set deletedAt and cancel pending trait reviews", async () => {
      const character = makeCharacter();
      db.character.findFirst.mockResolvedValue(character);
      db.character.update.mockResolvedValue({
        ...character,
        deletedAt: new Date(),
        deletedById: "admin1",
      });
      db.traitReview.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.softDelete("char1", "admin1");

      expect(result).toBe(true);
      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "char1" },
          data: expect.objectContaining({
            deletedById: "admin1",
          }),
        }),
      );
      expect(db.traitReview.updateMany).toHaveBeenCalledWith({
        where: { characterId: "char1", status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
    });

    it("should throw NotFoundException for a non-existent character", async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.softDelete("nonexistent", "admin1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException for an already soft-deleted character", async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.softDelete("char1", "admin1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("purge", () => {
    it("should hard-delete the character", async () => {
      const character = makeCharacter();
      db.character.findFirst.mockResolvedValue(character);
      db.character.delete.mockResolvedValue(character);

      const result = await service.purge("char1");

      expect(result).toBe(true);
      expect(db.character.delete).toHaveBeenCalledWith({
        where: { id: "char1" },
      });
    });

    it("should throw NotFoundException when character does not exist", async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.purge("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should purge a soft-deleted character (findFirst without notDeleted filter)", async () => {
      const character = makeCharacter({
        deletedAt: new Date(),
        deletedById: "admin1",
      });
      db.character.findFirst.mockResolvedValue(character);
      db.character.delete.mockResolvedValue(character);

      const result = await service.purge("char1");
      expect(result).toBe(true);
    });

    it("should cancel pending trait reviews before deleting", async () => {
      const character = makeCharacter();
      db.character.findFirst.mockResolvedValue(character);
      db.character.delete.mockResolvedValue(character);

      await service.purge("char1");

      expect(db.traitReview.updateMany).toHaveBeenCalledWith({
        where: { characterId: "char1", status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
      expect(db.character.delete).toHaveBeenCalledWith({
        where: { id: "char1" },
      });
    });
  });

  describe("assignSpecies", () => {
    /**
     * Not an e2e test, because the mutation is not reachable end to end: the
     * only speciesless characters are ones kicked out of a species, and
     * `AllowCharacterProfileEditor` then has no community to resolve
     * permissions from. That gap predates forms.
     */
    it("leaves the character's existing form alone when none is submitted", async () => {
      const character = makeCharacter({ speciesId: null });
      db.character.findFirst.mockResolvedValue(character);
      db.species.findUnique.mockResolvedValue({
        id: "species1",
        communityId: "community1",
      });
      db.speciesVariant.findFirst.mockResolvedValue({ id: "variant1" });
      mockPermissionService.hasCommunityPermission.mockResolvedValue(true);
      db.character.update.mockResolvedValue(character);

      await service.assignSpecies("char1", "user1", {
        speciesId: "species1",
        speciesVariantId: "variant1",
      });

      // Replacing it would delete the form the character has and create
      // another with a different id, and an id is what a review or an audit
      // row correlates against.
      expect(mockCharacterFormsService.writeForms).not.toHaveBeenCalled();
    });

    it("writes the forms it is given", async () => {
      const character = makeCharacter({ speciesId: null });
      db.character.findFirst.mockResolvedValue(character);
      db.species.findUnique.mockResolvedValue({
        id: "species1",
        communityId: "community1",
      });
      db.speciesVariant.findFirst.mockResolvedValue({ id: "variant1" });
      db.speciesVariant.findUnique.mockResolvedValue({ maxForms: 1 });
      db.trait.findMany.mockResolvedValue([]);
      mockPermissionService.hasCommunityPermission.mockResolvedValue(true);
      db.character.update.mockResolvedValue(character);

      await service.assignSpecies("char1", "user1", {
        speciesId: "species1",
        speciesVariantId: "variant1",
        forms: [{ name: "Base", traitValues: [] }],
      });

      expect(mockCharacterFormsService.writeForms).toHaveBeenCalledWith(
        expect.anything(),
        "char1",
        [{ name: "Base", traitValues: [] }],
      );
    });
  });

  describe("kickFromSpecies", () => {
    it("should throw NotFoundException when character does not exist", async () => {
      db.character.findFirst.mockResolvedValue(null);

      await expect(service.kickFromSpecies("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when character has no species", async () => {
      const character = makeCharacter({ speciesId: null });
      db.character.findFirst.mockResolvedValue(character);

      await expect(service.kickFromSpecies("char1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should nullify speciesId, speciesVariantId and registryId, and reduce the character to one empty form", async () => {
      const character = makeCharacter({
        speciesId: "species1",
        speciesVariantId: "variant1",
        registryId: "001",
        customFields: {},
      });
      db.character.findFirst.mockResolvedValue(character);
      givenForms(form());
      db.trait.findMany.mockResolvedValue([]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue({ ...character, speciesId: null });
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.kickFromSpecies("char1");

      expect(result).toBe(true);
      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "char1" },
          data: expect.objectContaining({
            speciesId: null,
            speciesVariantId: null,
            registryId: null,
          }),
        }),
      );
      // Not "no forms": a character out of its species still has to render,
      // and it has no trait list for a second form to differ in.
      expect(mockCharacterFormsService.writeForms).toHaveBeenCalledWith(
        expect.anything(),
        "char1",
        [{ name: "Base", traitValues: [] }],
      );
    });

    it("should cancel pending trait reviews", async () => {
      const character = makeCharacter({ speciesId: "species1" });
      db.character.findFirst.mockResolvedValue(character);
      givenForms(form());
      db.trait.findMany.mockResolvedValue([]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 1 });

      await service.kickFromSpecies("char1");

      expect(db.traitReview.updateMany).toHaveBeenCalledWith({
        where: { characterId: "char1", status: ModerationStatus.PENDING },
        data: { status: ModerationStatus.CANCELLED },
      });
    });

    it("should flatten string trait values into customFields", async () => {
      const traitValues = [
        { traitId: "trait1", value: "Blue", clarifier: null },
      ];
      const character = makeCharacter({
        speciesId: "species1",
        customFields: { "Existing Field": "kept" },
      });
      db.character.findFirst.mockResolvedValue(character);
      givenForms(form(traitValues));
      db.trait.findMany.mockResolvedValue([
        { id: "trait1", name: "Eye Color", valueType: TraitValueType.STRING },
      ]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies("char1");

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              "Eye Color": "Blue",
              "Existing Field": "kept",
            }),
          }),
        }),
      );
    });

    it("should append clarifier to the display value", async () => {
      const traitValues = [
        { traitId: "trait1", value: "Blue", clarifier: "gradient" },
      ];
      const character = makeCharacter({
        speciesId: "species1",
        customFields: {},
      });
      db.character.findFirst.mockResolvedValue(character);
      givenForms(form(traitValues));
      db.trait.findMany.mockResolvedValue([
        { id: "trait1", name: "Eye Color", valueType: TraitValueType.STRING },
      ]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies("char1");

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              "Eye Color": "Blue (gradient)",
            }),
          }),
        }),
      );
    });

    it("should resolve ENUM trait values to their display names", async () => {
      const traitValues = [
        { traitId: "trait1", value: "spotted", clarifier: null },
      ];
      const character = makeCharacter({
        speciesId: "species1",
        customFields: {},
      });
      db.character.findFirst.mockResolvedValue(character);
      givenForms(form(traitValues));
      db.trait.findMany.mockResolvedValue([
        { id: "trait1", name: "Pattern", valueType: TraitValueType.ENUM },
      ]);
      db.enumValue.findMany.mockResolvedValue([
        { id: "ev1", traitId: "trait1", name: "Spotted" },
      ]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies("char1");

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              Pattern: "Spotted",
            }),
          }),
        }),
      );
    });

    it("should resolve ENUM trait values stored as UUIDs to their display names", async () => {
      const traitValues = [
        { traitId: "trait1", value: "ev-uuid-123", clarifier: null },
      ];
      const character = makeCharacter({
        speciesId: "species1",
        customFields: {},
      });
      db.character.findFirst.mockResolvedValue(character);
      givenForms(form(traitValues));
      db.trait.findMany.mockResolvedValue([
        { id: "trait1", name: "Pattern", valueType: TraitValueType.ENUM },
      ]);
      db.enumValue.findMany.mockResolvedValue([
        { id: "ev-uuid-123", traitId: "trait1", name: "Spotted" },
      ]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies("char1");

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              Pattern: "Spotted",
            }),
          }),
        }),
      );
    });

    it("should concatenate multiple values for the same trait", async () => {
      const traitValues = [
        { traitId: "trait1", value: "Red", clarifier: null },
        { traitId: "trait1", value: "Blue", clarifier: null },
      ];
      const character = makeCharacter({
        speciesId: "species1",
        customFields: {},
      });
      db.character.findFirst.mockResolvedValue(character);
      givenForms(form(traitValues));
      db.trait.findMany.mockResolvedValue([
        { id: "trait1", name: "Colors", valueType: TraitValueType.STRING },
      ]);
      db.enumValue.findMany.mockResolvedValue([]);
      db.character.update.mockResolvedValue(character);
      db.traitReview.updateMany.mockResolvedValue({ count: 0 });

      await service.kickFromSpecies("char1");

      expect(db.character.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: expect.objectContaining({
              Colors: "Red, Blue",
            }),
          }),
        }),
      );
    });
  });
});
