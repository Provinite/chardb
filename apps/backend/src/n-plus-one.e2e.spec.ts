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

  /** n characters in one species, each with a gallery and a text media. */
  async function seedCharacters(n: number): Promise<void> {
    const community = await testApp.createTestCommunity();
    const species = await testApp.createTestSpecies(community.id);
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
      await db.media.create({
        data: {
          title: `Story ${i}`,
          ownerId,
          characterId: character.id,
          galleryId: gallery.id,
          textContentId: text.id,
        },
      });
    }
  }

  /** Runs `query` over lists of 2 and of 6 and returns both costs. */
  async function costAtTwoAndSix(
    name: string,
    query: string,
    seed: (n: number) => Promise<void>,
  ): Promise<Record<number, QueryCount>> {
    const cost: Record<number, QueryCount> = {};
    for (const n of [2, 6]) {
      await testApp.clearDatabase();
      const owner = await testApp.createTestUser();
      ownerId = owner.id;
      token = await testApp.generateTestToken(owner.id);
      await seed(n);
      cost[n] = await counter.measure(async () => {
        const response = await testApp.authenticatedGraphqlRequest(
          query,
          {},
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
});
