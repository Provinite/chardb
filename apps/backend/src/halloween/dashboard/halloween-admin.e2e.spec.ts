import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { HalloweenModule } from "../halloween.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { mockDiscord } from "../testing/command-harness";

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

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, HalloweenModule] },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(mockDiscord()),
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
});
