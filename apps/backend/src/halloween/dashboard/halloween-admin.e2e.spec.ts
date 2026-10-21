import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { HalloweenModule } from "../halloween.module";
import { CharactersModule } from "../../characters/characters.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { mockDiscord } from "../testing/command-harness";
import { GuildSettingsService } from "../services/guild-settings.service";
import { PrizeService } from "../services/prize.service";

const GUILD = "100000000000000001";

const UPDATE_SETTINGS = `
  mutation UpdateSettings($communityId: ID!, $input: HalloweenSettingsInput!) {
    updateHalloweenSettings(communityId: $communityId, input: $input) {
      startDate endDate knocksPerDay resetTime winRate winChannel
    }
  }
`;

const settingsInput = {
  startDate: "2026-10-01T05:00:00.000Z",
  endDate: "2026-11-01T05:00:00.000Z",
  knocksPerDay: 3,
  resetTime: 6,
  winRate: 0.4,
  winChannel: "300000000000000009",
};

/**
 * Running the event from chardb: the settings `/settings set` used to change,
 * and the prize pool `/prize admin add` used to fill.
 */
describe("Halloween management (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let managerToken: string;
  let granterToken: string;
  const discord = mockDiscord();

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        // CharactersModule resolves a character's species and media.
        imports: [
          DatabaseModule,
          AuthModule,
          CharactersModule,
          HalloweenModule,
        ],
      },
      (builder) =>
        builder.overrideProvider(HalloweenDiscordClient).useValue(discord),
    );
    db = testApp.getDb();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD, halloweenEnabled: true },
    });

    const stamp = Date.now();
    const manager = await testApp.createTestUser({
      username: `manager_${stamp}`,
      email: `manager_${stamp}@example.com`,
    });
    const managerRole = await testApp.createTestRole(communityId, {
      canManageItems: true,
    });
    await testApp.createTestCommunityMember(manager.id, managerRole.id);
    managerToken = await testApp.generateTestToken(
      manager.id,
      manager.username,
    );

    const granter = await testApp.createTestUser({
      username: `granter_${stamp}`,
      email: `granter_${stamp}@example.com`,
    });
    const granterRole = await testApp.createTestRole(communityId, {
      canGrantItems: true,
    });
    await testApp.createTestCommunityMember(granter.id, granterRole.id);
    granterToken = await testApp.generateTestToken(
      granter.id,
      granter.username,
    );
  });

  describe("updateHalloweenSettings", () => {
    const update = (input: Record<string, unknown>, token = managerToken) =>
      testApp.authenticatedGraphqlRequest(
        UPDATE_SETTINGS,
        { communityId, input },
        token,
      );

    it("sets the event up the first time", async () => {
      const res = await update(settingsInput);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.updateHalloweenSettings).toEqual(settingsInput);
      expect(
        await db.halloweenGuildSettings.findUniqueOrThrow({
          where: { guildId: GUILD },
        }),
      ).toMatchObject({ knocksPerDay: 3, resetTime: 6, winRate: 0.4 });
    });

    it("changes it afterwards", async () => {
      await update(settingsInput);
      const res = await update({
        ...settingsInput,
        knocksPerDay: 5,
        winChannel: null,
      });
      expect(res.body.data.updateHalloweenSettings).toMatchObject({
        knocksPerDay: 5,
        winChannel: null,
      });
    });

    // The bot posts every win there; a channel in someone else's server would
    // have this community's wins announced to them.
    describe("the win channel", () => {
      beforeEach(() => discord.channelGuildId.mockClear());

      it("must be in this community's Discord server", async () => {
        discord.channelGuildId.mockResolvedValueOnce("100000000000000999");
        const res = await update(settingsInput);
        expect(res.body.errors?.[0].message).toBe(
          "The win channel must be a channel in this community's Discord server that the bot can see",
        );
        expect(discord.channelGuildId).toHaveBeenCalledWith(
          settingsInput.winChannel,
        );
        expect(await db.halloweenGuildSettings.count()).toBe(0);
      });

      it("must be one the bot can see", async () => {
        discord.channelGuildId.mockResolvedValueOnce(null);
        const res = await update(settingsInput);
        expect(res.body.errors?.[0].message).toBe(
          "The win channel must be a channel in this community's Discord server that the bot can see",
        );
      });

      it("is checked only when it changes", async () => {
        await update(settingsInput);
        await update({ ...settingsInput, knocksPerDay: 5 });
        expect(discord.channelGuildId).toHaveBeenCalledTimes(1);
      });

      it("is not needed", async () => {
        const res = await update({ ...settingsInput, winChannel: null });
        expect(res.body.errors).toBeUndefined();
        expect(discord.channelGuildId).not.toHaveBeenCalled();
      });
    });

    // /knock caches settings for ten seconds; a change made here must not
    // wait that long on this instance.
    it("reaches the next knock at once", async () => {
      await update(settingsInput);
      const settings = testApp.getModuleRef().get(GuildSettingsService);
      expect((await settings.getCached(GUILD)).knocksPerDay).toBe(3);
      await update({ ...settingsInput, knocksPerDay: 5 });
      expect((await settings.getCached(GUILD)).knocksPerDay).toBe(5);
    });

    it("refuses settings the bot could not run", async () => {
      const res = await update({
        ...settingsInput,
        startDate: "2026-11-01T05:00:00.000Z",
        endDate: "2026-10-01T05:00:00.000Z",
        winRate: 2,
      });
      expect(res.body.errors?.[0].message).toBe(
        "Start date must be before end date if they are both set. Win rate must be a decimal between 0 and 1",
      );
      expect(await db.halloweenGuildSettings.count()).toBe(0);
    });

    it("needs a linked Discord server", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { discordGuildId: null },
      });
      const res = await update(settingsInput);
      expect(res.body.errors?.[0].message).toBe(
        "Link a Discord server to this community first",
      );
    });

    it("is for members who can manage items, not just grant them", async () => {
      const res = await update(settingsInput, granterToken);
      expect(res.body.errors?.[0]).toBeDefined();
      expect(await db.halloweenGuildSettings.count()).toBe(0);
    });

    it("refuses a community the event is not turned on for", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });
      const res = await update(settingsInput);
      expect(res.body.errors?.[0].message).toBe(
        "The Halloween event is not enabled for this community",
      );
    });
  });

  describe("prizes", () => {
    const gql = (
      query: string,
      variables: Record<string, unknown>,
      token = managerToken,
    ) =>
      testApp.authenticatedGraphqlRequest(
        query,
        { communityId, ...variables },
        token,
      );

    const CREATE = `
      mutation Create($communityId: ID!, $input: CreateHalloweenPrizeInput!) {
        createHalloweenPrize(communityId: $communityId, input: $input) {
          id name initialStock currentStock weight image delivery itemTypeId characterId
        }
      }
    `;
    const UPDATE = `
      mutation Update($communityId: ID!, $prizeId: ID!, $input: UpdateHalloweenPrizeInput!) {
        updateHalloweenPrize(communityId: $communityId, prizeId: $prizeId, input: $input) {
          id name initialStock currentStock weight image
        }
      }
    `;
    const REMOVE = `
      mutation Remove($communityId: ID!, $prizeId: ID!) {
        removeHalloweenPrize(communityId: $communityId, prizeId: $prizeId)
      }
    `;
    const ITEM_TYPES = `
      query ItemTypes($communityId: ID!, $search: String!) {
        halloweenPrizeItemTypes(communityId: $communityId, search: $search) {
          id name image { id }
        }
      }
    `;
    const CHARACTERS = `
      query Characters($communityId: ID!, $search: String!) {
        halloweenPrizeCharacters(communityId: $communityId, search: $search) {
          id name species { name } mainMedia { id }
        }
      }
    `;

    const staffPrize = {
      id: "adopt",
      name: "Spooky Adopt",
      stock: 2,
      image: "https://i.test/adopt.png",
    };

    let otherCommunityId: string;
    let speciesId: string;

    beforeEach(async () => {
      await gql(UPDATE_SETTINGS, { input: settingsInput });
      speciesId = (await testApp.createTestSpecies(communityId)).id;
      otherCommunityId = (await testApp.createTestCommunity("Elsewhere")).id;
    });

    const character = (data: Record<string, unknown> = {}) =>
      db.character.create({
        data: { name: "Ghost", speciesId, ...data },
      });

    describe("createHalloweenPrize", () => {
      it("adds a prize staff hand over, with its image URL", async () => {
        const res = await gql(CREATE, { input: staffPrize });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.createHalloweenPrize).toEqual({
          id: "adopt",
          name: "Spooky Adopt",
          initialStock: 2,
          currentStock: 2,
          weight: 10,
          image: "https://i.test/adopt.png",
          delivery: "STAFF",
          itemTypeId: null,
          characterId: null,
        });
      });

      it("adds a chardb item prize, which takes no image of its own", async () => {
        const itemType = await db.itemType.create({
          data: { name: "Edit Kit", communityId },
        });
        const res = await gql(CREATE, {
          input: {
            id: "edit-kit",
            name: "Edit Kit",
            stock: 300,
            itemTypeId: itemType.id,
          },
        });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.createHalloweenPrize).toMatchObject({
          delivery: "CHARDB_ITEM",
          itemTypeId: itemType.id,
          image: null,
          currentStock: 300,
        });
      });

      it("refuses an image URL on a chardb prize", async () => {
        const itemType = await db.itemType.create({
          data: { name: "Edit Kit", communityId },
        });
        const res = await gql(CREATE, {
          input: {
            id: "edit-kit",
            name: "Edit Kit",
            stock: 3,
            itemTypeId: itemType.id,
            image: "https://i.test/kit.png",
          },
        });
        expect(res.body.errors?.[0].message).toBe(
          "A chardb prize shows its item's or character's own image",
        );
      });

      it("requires an image for a prize staff hand over", async () => {
        const res = await gql(CREATE, {
          input: { id: "adopt", name: "Spooky Adopt", stock: 1 },
        });
        expect(res.body.errors?.[0].message).toBe(
          "image must be an https or http string URL to a png or jpg image",
        );
      });

      it("adds an unowned character of the community", async () => {
        const ghost = await character();
        const res = await gql(CREATE, {
          input: {
            id: "ghost",
            name: "Ghost",
            stock: 1,
            characterId: ghost.id,
          },
        });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.createHalloweenPrize).toMatchObject({
          delivery: "CHARDB_CHARACTER",
        });
      });

      it("refuses a character prize with more than one in stock", async () => {
        const ghost = await character();
        const res = await gql(CREATE, {
          input: {
            id: "ghost",
            name: "Ghost",
            stock: 2,
            characterId: ghost.id,
          },
        });
        expect(res.body.errors?.[0].message).toBe(
          "A character prize has a stock of 1",
        );
        expect(await db.halloweenPrize.count()).toBe(0);
      });

      it("refuses a weight of 0", async () => {
        const res = await gql(CREATE, { input: { ...staffPrize, weight: 0 } });
        expect(res.body.errors?.[0].message).toBe(
          "weight must be an integer between 1 and 1000",
        );
      });

      it("refuses another community's item type", async () => {
        const itemType = await db.itemType.create({
          data: { name: "Foreign", communityId: otherCommunityId },
        });
        const res = await gql(CREATE, {
          input: {
            id: "foreign",
            name: "Foreign",
            stock: 1,
            itemTypeId: itemType.id,
          },
        });
        expect(res.body.errors?.[0].message).toMatch(
          /belongs to another community/,
        );
      });

      it("refuses a character someone already owns", async () => {
        const owner = await testApp.createTestUser({
          username: `owner_${Date.now()}`,
          email: `owner_${Date.now()}@example.com`,
        });
        const owned = await character({ ownerId: owner.id });
        const res = await gql(CREATE, {
          input: {
            id: "owned",
            name: "Owned",
            stock: 1,
            characterId: owned.id,
          },
        });
        expect(res.body.errors?.[0].message).toMatch(/already owned/);
      });

      it("refuses a character that is already a prize", async () => {
        const ghost = await character();
        await gql(CREATE, {
          input: {
            id: "ghost",
            name: "Ghost",
            stock: 1,
            characterId: ghost.id,
          },
        });
        const res = await gql(CREATE, {
          input: {
            id: "ghost-again",
            name: "Ghost",
            stock: 1,
            characterId: ghost.id,
          },
        });
        expect(res.body.errors?.[0].message).toBe(
          'That character is already the prize "ghost"',
        );
        expect(await db.halloweenPrize.count()).toBe(1);
      });

      it("refuses a second prize with the same id", async () => {
        await gql(CREATE, { input: staffPrize });
        const res = await gql(CREATE, { input: staffPrize });
        expect(res.body.errors?.[0].message).toBe(
          'There is already a prize called "adopt"',
        );
      });

      it("needs the event set up first", async () => {
        await db.halloweenGuildSettings.deleteMany();
        const res = await gql(CREATE, { input: staffPrize });
        expect(res.body.errors?.[0].message).toBe(
          "Set the event up before adding prizes",
        );
      });

      it("is for members who can manage items", async () => {
        const res = await gql(CREATE, { input: staffPrize }, granterToken);
        expect(res.body.errors?.[0]).toBeDefined();
        expect(await db.halloweenPrize.count()).toBe(0);
      });
    });

    describe("updateHalloweenPrize", () => {
      beforeEach(async () => {
        await gql(CREATE, { input: { ...staffPrize, stock: 5 } });
      });

      it("changes the name, weight and image", async () => {
        const res = await gql(UPDATE, {
          prizeId: "adopt",
          input: {
            name: "Spookier Adopt",
            weight: 3,
            image: "https://i.test/b.png",
          },
        });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.updateHalloweenPrize).toMatchObject({
          name: "Spookier Adopt",
          weight: 3,
          image: "https://i.test/b.png",
        });
      });

      it("sets the stock left, keeping the count already given out", async () => {
        // Two of five already won.
        await db.halloweenPrize.update({
          where: { guildId_id: { guildId: GUILD, id: "adopt" } },
          data: { currentStock: 3 },
        });
        const res = await gql(UPDATE, {
          prizeId: "adopt",
          input: { currentStock: 10 },
        });
        expect(res.body.data.updateHalloweenPrize).toMatchObject({
          initialStock: 12,
          currentStock: 10,
        });
      });

      // A winner holds the pool and takes one while the edit is in flight. The
      // edit waits its turn, then counts that win as given out.
      it("keeps a win that lands while the stock is being edited", async () => {
        await db.halloweenPrize.update({
          where: { guildId_id: { guildId: GUILD, id: "adopt" } },
          data: { currentStock: 3 },
        });
        const prizes = testApp.getModuleRef().get(PrizeService);
        let release!: () => void;
        const released = new Promise<void>((r) => (release = r));
        let won!: () => void;
        const hasWon = new Promise<void>((r) => (won = r));
        const winner = db.$transaction(
          async (tx) => {
            await prizes.lockInStock(GUILD, tx);
            await prizes.decrement("adopt", GUILD, tx);
            won();
            await released;
          },
          { timeout: 10_000 },
        );
        await hasWon;

        const edit = gql(UPDATE, {
          prizeId: "adopt",
          input: { currentStock: 5 },
        });
        await new Promise((r) => setTimeout(r, 200));
        release();
        await winner;
        const res = await edit;

        // Five given out: the two before, the win, and none lost.
        expect(res.body.data.updateHalloweenPrize).toMatchObject({
          initialStock: 8,
          currentStock: 5,
        });
      });

      it("can take the stock to zero", async () => {
        await db.halloweenPrize.update({
          where: { guildId_id: { guildId: GUILD, id: "adopt" } },
          data: { currentStock: 4 },
        });
        const res = await gql(UPDATE, {
          prizeId: "adopt",
          input: { currentStock: 0 },
        });
        expect(res.body.data.updateHalloweenPrize).toMatchObject({
          initialStock: 1,
          currentStock: 0,
        });
      });

      it("refuses a weight of 0", async () => {
        const res = await gql(UPDATE, {
          prizeId: "adopt",
          input: { weight: 0 },
        });
        expect(res.body.errors?.[0].message).toBe(
          "Weight must be a whole number from 1 to 1000",
        );
      });

      it("never changes a character prize's stock", async () => {
        const ghost = await character();
        await gql(CREATE, {
          input: {
            id: "ghost",
            name: "Ghost",
            stock: 1,
            characterId: ghost.id,
          },
        });
        // Won, so out of stock: putting it back would offer a character
        // somebody already has.
        await db.halloweenPrize.update({
          where: { guildId_id: { guildId: GUILD, id: "ghost" } },
          data: { currentStock: 0 },
        });
        const res = await gql(UPDATE, {
          prizeId: "ghost",
          input: { currentStock: 1 },
        });
        expect(res.body.errors?.[0].message).toBe(
          "A character prize's stock can't be changed",
        );
        const ghostPrize = await db.halloweenPrize.findUniqueOrThrow({
          where: { guildId_id: { guildId: GUILD, id: "ghost" } },
        });
        expect(ghostPrize.currentStock).toBe(0);
      });

      it("refuses a negative stock", async () => {
        const res = await gql(UPDATE, {
          prizeId: "adopt",
          input: { currentStock: -1 },
        });
        expect(res.body.errors?.[0].message).toBe(
          "Stock must be a whole number from 0 to 999",
        );
      });

      it("refuses a prize that does not exist", async () => {
        const res = await gql(UPDATE, {
          prizeId: "nope",
          input: { weight: 1 },
        });
        expect(res.body.errors?.[0].message).toBe('No prize called "nope"');
      });

      it("is for members who can manage items", async () => {
        const res = await gql(
          UPDATE,
          { prizeId: "adopt", input: { weight: 1 } },
          granterToken,
        );
        expect(res.body.errors?.[0]).toBeDefined();
      });
    });

    describe("removeHalloweenPrize", () => {
      beforeEach(async () => {
        await gql(CREATE, { input: staffPrize });
      });

      it("removes a prize nobody has won", async () => {
        const res = await gql(REMOVE, { prizeId: "adopt" });
        expect(res.body.data.removeHalloweenPrize).toBe(true);
        expect(await db.halloweenPrize.count()).toBe(0);
      });

      it("keeps a prize somebody has won", async () => {
        await db.halloweenKnockEvent.create({
          data: {
            guildId: GUILD,
            userId: "200000000000000001",
            prizeId: "adopt",
          },
        });
        const res = await gql(REMOVE, { prizeId: "adopt" });
        expect(res.body.errors?.[0].message).toBe(
          "Somebody has won this prize, so it stays on record. Set its stock to 0 instead.",
        );
        expect(await db.halloweenPrize.count()).toBe(1);
      });
    });

    describe("halloweenPrizeItemTypes", () => {
      it("searches the community's own item types", async () => {
        await db.itemType.create({ data: { name: "Edit Kit", communityId } });
        await db.itemType.create({ data: { name: "Candy", communityId } });
        await db.itemType.create({
          data: { name: "Edit Foreign", communityId: otherCommunityId },
        });
        const res = await gql(ITEM_TYPES, { search: "edit" });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.halloweenPrizeItemTypes).toEqual([
          { id: expect.any(String), name: "Edit Kit", image: null },
        ]);
      });

      it("is for members who can manage items", async () => {
        const res = await gql(ITEM_TYPES, { search: "ed" }, granterToken);
        expect(res.body.errors?.[0]).toBeDefined();
      });
    });

    describe("halloweenPrizeCharacters", () => {
      it("searches the community's unowned, unclaimed characters", async () => {
        const free = await character({ name: "Free Ghost" });
        await db.character.create({
          data: {
            name: "Foreign Ghost",
            speciesId: (await testApp.createTestSpecies(otherCommunityId)).id,
          },
        });
        const owner = await testApp.createTestUser({
          username: `owner_${Date.now()}`,
          email: `owner_${Date.now()}@example.com`,
        });
        await character({ name: "Owned Ghost", ownerId: owner.id });
        const promised = await character({ name: "Promised Ghost" });
        await db.pendingOwnership.create({
          data: {
            characterId: promised.id,
            provider: "DISCORD",
            providerAccountId: "200000000000000009",
          },
        });

        const res = await gql(CHARACTERS, { search: "ghost" });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.halloweenPrizeCharacters).toEqual([
          {
            id: free.id,
            name: "Free Ghost",
            species: { name: expect.any(String) },
            mainMedia: null,
          },
        ]);
      });

      it("leaves out characters already in the prize pool", async () => {
        const pooled = await character({ name: "Pooled Ghost" });
        const free = await character({ name: "Free Ghost" });
        await gql(CREATE, {
          input: {
            id: "pooled",
            name: "Pooled Ghost",
            stock: 1,
            characterId: pooled.id,
          },
        });
        const res = await gql(CHARACTERS, { search: "ghost" });
        expect(res.body.data.halloweenPrizeCharacters).toEqual([
          expect.objectContaining({ id: free.id, name: "Free Ghost" }),
        ]);
      });

      it("is for members who can manage items", async () => {
        const res = await gql(CHARACTERS, { search: "gh" }, granterToken);
        expect(res.body.errors?.[0]).toBeDefined();
      });
    });

    describe("seeing the page", () => {
      const DASHBOARD = `
        query Dashboard($communityId: ID!) {
          halloweenDashboard(communityId: $communityId) { guildId }
        }
      `;

      it("is open to members who can manage items as well as grant them", async () => {
        const manager = await gql(DASHBOARD, {});
        const granter = await gql(DASHBOARD, {}, granterToken);
        expect(manager.body.errors).toBeUndefined();
        expect(granter.body.errors).toBeUndefined();
      });

      it("is closed to other members", async () => {
        const stamp = Date.now();
        const member = await testApp.createTestUser({
          username: `member_${stamp}`,
          email: `member_${stamp}@example.com`,
        });
        const role = await testApp.createTestRole(communityId, {});
        await testApp.createTestCommunityMember(member.id, role.id);
        const token = await testApp.generateTestToken(
          member.id,
          member.username,
        );
        const res = await gql(DASHBOARD, {}, token);
        expect(res.body.errors?.[0]).toBeDefined();
      });
    });
  });
});
