import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { TestApp } from "../test/setup-e2e";
import { QueryCount, QueryCounter } from "../test/query-counter";
import { DatabaseService } from "./database/database.service";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CharactersModule } from "./characters/characters.module";
import { ImagesModule } from "./images/images.module";
import { MediaModule } from "./media/media.module";
import { GalleriesModule } from "./galleries/galleries.module";
import { CommentsModule } from "./comments/comments.module";
import { SocialModule } from "./social/social.module";
import { TagsModule } from "./tags/tags.module";
import { CommunitiesModule } from "./communities/communities.module";
import { SpeciesModule } from "./species/species.module";
import { TraitsModule } from "./traits/traits.module";
import { EnumValuesModule } from "./enum-values/enum-values.module";
import { ItemsModule } from "./items/items.module";
import { ItemTransactionsModule } from "./item-transactions/item-transactions.module";
import { CurrenciesModule } from "./currencies/currencies.module";
import { ImageModerationModule } from "./image-moderation/image-moderation.module";

/**
 * Measures #97: how many SQL statements a list query costs as the list grows.
 * A list whose cost is flat in its length has no N+1; one that grows by a
 * fixed amount per item does. Counts come from Prisma's own query log.
 *
 * Set N_PLUS_ONE_LABEL (e.g. "before", "after") to also write the counts to
 * apps/backend/.tmp/n-plus-one-<label>.json.
 */
describe("list query cost (#97)", () => {
  const counter = new QueryCounter();
  const results: Record<string, Record<number, QueryCount>> = {};
  let testApp: TestApp;
  let db: DatabaseService;
  let token: string;
  let ownerId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        imports: [
          DatabaseModule,
          AuthModule,
          UsersModule,
          CharactersModule,
          ImagesModule,
          MediaModule,
          GalleriesModule,
          CommentsModule,
          SocialModule,
          TagsModule,
          CommunitiesModule,
          SpeciesModule,
          TraitsModule,
          EnumValuesModule,
          ItemsModule,
          ItemTransactionsModule,
          CurrenciesModule,
          ImageModerationModule,
        ],
      },
      (builder) =>
        builder
          .overrideProvider(DatabaseService)
          .useValue(counter.createDatabaseService()),
      { fieldResolverEnhancers: ["guards", "interceptors", "filters"] },
    );
    db = testApp.getApp().get(DatabaseService);
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const owner = await testApp.createTestUser();
    ownerId = owner.id;
    token = await testApp.generateTestToken(owner.id);
  });

  afterAll(async () => {
    const label = process.env.N_PLUS_ONE_LABEL;
    if (label) {
      const dir = join(process.cwd(), ".tmp");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, `n-plus-one-${label}.json`),
        JSON.stringify(results, null, 2),
      );
    }
    await testApp.teardown();
  });

  /**
   * n characters in one species, each with a gallery and a text media, all
   * tagged and liked, so every per-item field has a row to find.
   */
  async function seedCharacters(n: number): Promise<void> {
    const community = await testApp.createTestCommunity();
    const species = await testApp.createTestSpecies(community.id);
    const tag = await db.tag.create({
      data: { name: `tag-${Date.now()}`, displayName: "Tag" },
    });
    for (let i = 0; i < n; i++) {
      const character = await db.character.create({
        data: {
          name: `Character ${i}`,
          ownerId,
          creatorId: ownerId,
          speciesId: species.id,
        },
      });
      const gallery = await db.gallery.create({
        data: { name: `Gallery ${i}`, ownerId, characterId: character.id },
      });
      const text = await db.textContent.create({
        data: { content: `Story ${i}`, wordCount: 2 },
      });
      const media = await db.media.create({
        data: {
          title: `Story ${i}`,
          ownerId,
          characterId: character.id,
          galleryId: gallery.id,
          textContentId: text.id,
        },
      });
      await db.characterTag.create({
        data: { characterId: character.id, tagId: tag.id },
      });
      await db.mediaTag.create({ data: { mediaId: media.id, tagId: tag.id } });
      await db.like.create({
        data: { userId: ownerId, characterId: character.id },
      });
      await db.like.create({ data: { userId: ownerId, galleryId: gallery.id } });
    }
  }

  /** One character with n liked comments on it. */
  async function seedComments(n: number): Promise<Record<string, unknown>> {
    const character = await db.character.create({
      data: { name: "Commented", ownerId, creatorId: ownerId },
    });
    for (let i = 0; i < n; i++) {
      const comment = await db.comment.create({
        data: {
          content: `Comment ${i}`,
          authorId: ownerId,
          characterId: character.id,
        },
      });
      await db.like.create({ data: { userId: ownerId, commentId: comment.id } });
    }
    return { characterId: character.id };
  }

  /** One species with n ENUM traits of three values each. */
  async function seedTraits(n: number): Promise<Record<string, unknown>> {
    const community = await testApp.createTestCommunity();
    const species = await testApp.createTestSpecies(community.id);
    for (let i = 0; i < n; i++) {
      const trait = await db.trait.create({
        data: { name: `Trait ${i}`, valueType: "ENUM", speciesId: species.id },
      });
      for (let v = 0; v < 3; v++) {
        await db.enumValue.create({
          data: { name: `Value ${v}`, traitId: trait.id, order: v },
        });
      }
    }
    return { speciesId: species.id };
  }

  /** A community where the viewer holds a role with `permissions`. */
  async function communityWithRole(
    permissions: Record<string, boolean>,
  ): Promise<string> {
    const community = await testApp.createTestCommunity();
    const role = await testApp.createTestRole(community.id, permissions);
    await db.communityMember.create({
      data: { roleId: role.id, userId: ownerId },
    });
    return community.id;
  }

  /** n item grants in a community whose items the viewer manages. */
  async function seedItemLedger(n: number): Promise<Record<string, unknown>> {
    const communityId = await communityWithRole({ canManageItems: true });
    const itemType = await db.itemType.create({
      data: { name: "Widget", communityId },
    });
    for (let i = 0; i < n; i++) {
      const item = await db.item.create({
        data: { itemTypeId: itemType.id, ownerId },
      });
      await db.itemTransaction.create({
        data: {
          communityId,
          itemTypeId: itemType.id,
          itemId: item.id,
          kind: "GRANT",
          batchId: `batch-${i}`,
          toUserId: ownerId,
          staffNote: "note",
        },
      });
    }
    return { communityId };
  }

  /** n currency mints in a community whose items the viewer manages. */
  async function seedCurrencyLedger(
    n: number,
  ): Promise<Record<string, unknown>> {
    const communityId = await communityWithRole({ canManageItems: true });
    const currency = await db.currency.create({
      data: { communityId, name: "Coins", code: "CN" },
    });
    for (let i = 0; i < n; i++) {
      await db.currencyTransaction.create({
        data: {
          currencyId: currency.id,
          userId: ownerId,
          kind: "MINT",
          amount: 1,
          balanceAfter: i + 1,
          batchId: `batch-${i}`,
          staffNote: "note",
        },
      });
    }
    return { communityId };
  }

  /** n pending images in a community the viewer moderates. */
  async function seedModerationQueue(
    n: number,
  ): Promise<Record<string, unknown>> {
    const communityId = await communityWithRole({ canModerateImages: true });
    for (let i = 0; i < n; i++) {
      const image = await db.image.create({
        data: {
          filename: `image-${i}.png`,
          originalFilename: `image-${i}.png`,
          originalUrl: `https://example.com/image-${i}.png`,
          uploaderId: ownerId,
          width: 1,
          height: 1,
          fileSize: 1,
          mimeType: "image/png",
        },
      });
      await db.media.create({
        data: { title: `Upload ${i}`, ownerId, communityId, imageId: image.id },
      });
    }
    return { communityId };
  }

  /** Runs `query` over lists of 2 and of 6 and returns both costs. */
  async function costAtTwoAndSix(
    name: string,
    query: string,
    seed: (n: number) => Promise<Record<string, unknown> | void>,
  ): Promise<Record<number, QueryCount>> {
    const cost: Record<number, QueryCount> = {};
    for (const n of [2, 6]) {
      await testApp.clearDatabase();
      const owner = await testApp.createTestUser();
      ownerId = owner.id;
      token = await testApp.generateTestToken(owner.id);
      const variables = (await seed(n)) ?? {};
      cost[n] = await counter.measure(async () => {
        const response = await testApp.authenticatedGraphqlRequest(
          query,
          variables,
          token,
        );
        expect(response.body.errors).toBeUndefined();
      });
    }
    results[name] = cost;
    return cost;
  }

  it("counts a single query as one statement", async () => {
    const cost = await counter.measure(() => db.user.findMany());
    expect(cost.sql).toBe(1);
  });

  describe("a list's character lookups batch", () => {
    it("Gallery.character", async () => {
      const cost = await costAtTwoAndSix(
        "Gallery.character",
        `query {
          galleries(filters: { limit: 20 }) {
            galleries { id character { id name species { id community { id } } } }
          }
        }`,
        seedCharacters,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });

    it("Media.character", async () => {
      const cost = await costAtTwoAndSix(
        "Media.character",
        `query {
          media(filters: { limit: 20 }) {
            media { id character { id name species { id community { id } } } }
          }
        }`,
        seedCharacters,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });
  });

  describe("a list's counts load in one query per field", () => {
    it("Character.likesCount and _count", async () => {
      const cost = await costAtTwoAndSix(
        "Character.likesCount+_count",
        `query {
          characters(filters: { limit: 20 }) {
            characters { id likesCount _count { media } }
          }
        }`,
        seedCharacters,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });

    it("Gallery.likesCount and _count", async () => {
      const cost = await costAtTwoAndSix(
        "Gallery.likesCount+_count",
        `query {
          galleries(filters: { limit: 20 }) {
            galleries { id likesCount _count { media } }
          }
        }`,
        seedCharacters,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });

    it("Comment.likesCount", async () => {
      const cost = await costAtTwoAndSix(
        "Comment.likesCount",
        `query ($characterId: ID!) {
          comments(filters: { entityType: CHARACTER, entityId: $characterId }) {
            comments { id likesCount }
          }
        }`,
        seedComments,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });
  });

  describe("a list's tags load in one query", () => {
    it("Character.tags and tags_rel", async () => {
      const cost = await costAtTwoAndSix(
        "Character.tags+tags_rel",
        `query {
          characters(filters: { limit: 20 }) {
            characters { id tags tags_rel { tag { id } } }
          }
        }`,
        seedCharacters,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });

    it("Media.tags_rel", async () => {
      const cost = await costAtTwoAndSix(
        "Media.tags_rel",
        `query {
          media(filters: { limit: 20 }) { media { id tags_rel { tag { id } } } }
        }`,
        seedCharacters,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });
  });

  it("a species' trait enum values load in one query", async () => {
    const cost = await costAtTwoAndSix(
      "Trait.enumValues",
      `query ($speciesId: ID!) {
        speciesById(id: $speciesId) { id traits { id enumValues { id } } }
      }`,
      seedTraits,
    );
    expect(cost[6].sql).toBe(cost[2].sql);
  });

  describe("a list's permission checks run once per request", () => {
    it("ItemTransaction.staffNote", async () => {
      const cost = await costAtTwoAndSix(
        "ItemTransaction.staffNote",
        `query ($communityId: ID!) {
          itemTransactions(filters: { communityId: $communityId }) {
            transactions { id staffNote }
          }
        }`,
        seedItemLedger,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });

    it("CurrencyTransaction.staffNote", async () => {
      const cost = await costAtTwoAndSix(
        "CurrencyTransaction.staffNote",
        `query ($communityId: ID!) {
          currencyTransactions(filters: { communityId: $communityId }) {
            transactions { id staffNote }
          }
        }`,
        seedCurrencyLedger,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });

    it("Media.pendingModerationImage", async () => {
      const cost = await costAtTwoAndSix(
        "Media.pendingModerationImage",
        `query ($communityId: ID!) {
          mediaModerationQueue(communityId: $communityId) {
            media { id pendingModerationImage { id } }
          }
        }`,
        seedModerationQueue,
      );
      expect(cost[6].sql).toBe(cost[2].sql);
    });
  });
});
