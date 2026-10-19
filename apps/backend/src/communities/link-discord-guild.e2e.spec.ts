import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { DiscordService } from "../discord/discord.service";
import { CommunitiesModule } from "./communities.module";

const GUILD = "100000000000000001";

const LINK = `
  mutation Link($communityId: ID!, $guildId: ID!) {
    linkDiscordGuild(communityId: $communityId, guildId: $guildId) {
      id discordGuildId
    }
  }
`;

/**
 * A Discord server belongs to one community: the Halloween event, item grants
 * to Discord accounts and the bot all find the community by its server.
 */
describe("linkDiscordGuild (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let token: string;
  let communityId: string;
  let otherCommunityId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, CommunitiesModule] },
      (builder) =>
        builder.overrideProvider(DiscordService).useValue({
          verifyGuildAccess: () => Promise.resolve(true),
          getGuildInfo: () => Promise.resolve({ name: "Cloverse" }),
        }),
    );
    db = testApp.getDb();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    communityId = (await testApp.createTestCommunity("Mine")).id;
    otherCommunityId = (await testApp.createTestCommunity("Theirs")).id;
    const stamp = Date.now();
    const admin = await testApp.createTestUser({
      username: `admin_${stamp}`,
      email: `admin_${stamp}@example.com`,
    });
    const role = await testApp.createTestRole(communityId, {
      canEditRole: true,
    });
    await testApp.createTestCommunityMember(admin.id, role.id);
    token = await testApp.generateTestToken(admin.id, admin.username);
  });

  const link = () =>
    testApp.authenticatedGraphqlRequest(
      LINK,
      { communityId, guildId: GUILD },
      token,
    );

  it("links a server no other community has", async () => {
    const res = await link();
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.linkDiscordGuild.discordGuildId).toBe(GUILD);
  });

  it("can link the same server again", async () => {
    await link();
    const res = await link();
    expect(res.body.errors).toBeUndefined();
  });

  it("refuses a server another community already has", async () => {
    await db.community.update({
      where: { id: otherCommunityId },
      data: { discordGuildId: GUILD },
    });
    const res = await link();
    expect(res.body.errors?.[0].message).toBe(
      "That Discord server is already linked to another community",
    );
    const mine = await db.community.findUniqueOrThrow({
      where: { id: communityId },
    });
    expect(mine.discordGuildId).toBeNull();
  });

  it("keeps one server to one community in the database itself", async () => {
    await db.community.update({
      where: { id: otherCommunityId },
      data: { discordGuildId: GUILD },
    });
    await expect(
      db.community.update({
        where: { id: communityId },
        data: { discordGuildId: GUILD },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
