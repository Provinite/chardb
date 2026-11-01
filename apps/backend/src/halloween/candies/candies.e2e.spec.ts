import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { ExternalAccountsModule } from "../../external-accounts/external-accounts.module";
import { ExternalAccountsService } from "../../external-accounts/external-accounts.service";
import { CommunityMembershipModule } from "../../community-membership/community-membership.module";
import { CommunityMembershipService } from "../../community-membership/community-membership.service";
import { HalloweenModule } from "../halloween.module";
import { HalloweenCommandDispatcher } from "../discord/halloween-command.dispatcher";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { HalloweenRandom } from "../random";
import { GuildSettingsService } from "../services/guild-settings.service";
import { GUILD_ID, USER_ID, buildInteraction } from "../testing/fixtures";
import { mockDiscord } from "../testing/command-harness";

const OTHER_GUILD = "100000000000000009";

/**
 * Where a lost knock's candy goes: to the chardb user behind the Discord
 * player once they have linked it and joined the guild's community, at the
 * knock if both are already true.
 */
describe("Halloween candies (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let dispatcher: HalloweenCommandDispatcher;
  let random: HalloweenRandom;
  let interactionId = 0;
  let communityId: string;
  let roleId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      {
        imports: [
          DatabaseModule,
          AuthModule,
          HalloweenModule,
          ExternalAccountsModule,
          CommunityMembershipModule,
        ],
      },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(mockDiscord()),
    );
    db = testApp.getDb();
    dispatcher = testApp.getModuleRef().get(HalloweenCommandDispatcher);
    random = testApp.getModuleRef().get(HalloweenRandom);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    testApp.getModuleRef().get(GuildSettingsService).invalidate(GUILD_ID);
    jest.restoreAllMocks();
    jest.spyOn(random, "unit").mockReturnValue(0.999);

    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
    });
    roleId = (await testApp.createTestRole(communityId)).id;
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD_ID,
        startDate: new Date("2020-01-01T06:00:00Z"),
        resetTime: 6,
        knocksPerDay: 5,
        winRate: 0.5,
      },
    });
    // A knock needs a prize in stock, even to lose.
    await db.halloweenPrize.create({
      data: {
        guildId: GUILD_ID,
        id: "myo",
        name: "Prize",
        initialStock: 1,
        currentStock: 1,
        weight: 1,
        image: "https://i.test/myo.png",
      },
    });
  });

  const knock = async () => {
    const interaction = buildInteraction({
      id: `${++interactionId}`,
      name: "knock",
      userId: USER_ID,
      permissions: "0",
    });
    const { afterReply } = await dispatcher.dispatch(
      interaction as APIApplicationCommandGuildInteraction,
    );
    await afterReply();
  };

  const user = (name: string) => {
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return testApp.createTestUser({
      username: `${name}_${stamp}`.slice(0, 30),
      email: `${name}_${stamp}@example.com`,
    });
  };

  const linkDiscord = (userId: string) =>
    testApp
      .getModuleRef()
      .get(ExternalAccountsService, { strict: false })
      .linkExternalAccount(
        userId,
        ExternalAccountProvider.DISCORD,
        USER_ID,
        "player",
      );

  const join = (userId: string) =>
    db.$transaction((tx) =>
      testApp
        .getModuleRef()
        .get(CommunityMembershipService, { strict: false })
        .join(tx, { userId, roleId }),
    );

  it("gives a linked member the candy at the knock", async () => {
    const player = await user("player");
    await join(player.id);
    await linkDiscord(player.id);

    await knock();

    const candy = await db.halloweenCandy.findFirstOrThrow();
    expect(candy).toMatchObject({
      guildId: GUILD_ID,
      slug: expect.any(String),
      discordUserId: USER_ID,
      ownerId: player.id,
    });
    const knockEvent = await db.halloweenKnockEvent.findFirstOrThrow();
    expect(candy.knockEventId).toBe(knockEvent.id);
    expect(candy.slug).toBe(knockEvent.candySlug);
  });

  it("keeps an unlinked player's candy for them, then gives it on linking", async () => {
    await knock();
    expect((await db.halloweenCandy.findFirstOrThrow()).ownerId).toBeNull();

    const player = await user("player");
    await join(player.id);
    await linkDiscord(player.id);

    expect((await db.halloweenCandy.findFirstOrThrow()).ownerId).toBe(
      player.id,
    );
  });

  it("keeps a linked non-member's candy until they join", async () => {
    const player = await user("player");
    await linkDiscord(player.id);

    await knock();
    expect((await db.halloweenCandy.findFirstOrThrow()).ownerId).toBeNull();

    await join(player.id);
    expect((await db.halloweenCandy.findFirstOrThrow()).ownerId).toBe(
      player.id,
    );
  });

  it("does not give candies from another guild's community on linking", async () => {
    const otherKnock = await db.halloweenKnockEvent.create({
      data: { guildId: OTHER_GUILD, userId: USER_ID, candySlug: "banana" },
    });
    await db.halloweenCandy.create({
      data: {
        guildId: OTHER_GUILD,
        slug: "banana",
        knockEventId: otherKnock.id,
        discordUserId: USER_ID,
      },
    });
    const player = await user("player");
    await join(player.id);

    await linkDiscord(player.id);

    expect((await db.halloweenCandy.findFirstOrThrow()).ownerId).toBeNull();
  });

  it("records when a candy was first claimed, at the knock or on linking", async () => {
    const early = await user("early");
    await join(early.id);
    await linkDiscord(early.id);
    await knock();
    const atKnock = await db.halloweenCandy.findFirstOrThrow();
    const knockEvent = await db.halloweenKnockEvent.findFirstOrThrow();
    expect(atKnock.claimedAt).toEqual(knockEvent.time);

    await db.halloweenCandy.deleteMany();
    await db.externalAccount.deleteMany();
    await knock();
    expect((await db.halloweenCandy.findFirstOrThrow()).claimedAt).toBeNull();
    const before = new Date();
    await linkDiscord(early.id);
    const onLink = await db.halloweenCandy.findFirstOrThrow();
    expect(onLink.claimedAt?.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it("never claims a candy a second time, even if it has lost its owner", async () => {
    await knock();
    const candy = await db.halloweenCandy.findFirstOrThrow();
    // Claimed once, then left with no owner, however that came about.
    await db.halloweenCandy.update({
      where: { id: candy.id },
      data: { claimedAt: new Date(), ownerId: null },
    });

    const player = await user("player");
    await join(player.id);
    await linkDiscord(player.id);

    expect((await db.halloweenCandy.findFirstOrThrow()).ownerId).toBeNull();
  });

  it("gives no candy for a win", async () => {
    jest.spyOn(random, "unit").mockReturnValue(0);

    await knock();

    expect(await db.halloweenKnockEvent.count()).toBe(1);
    expect(await db.halloweenCandy.count()).toBe(0);
  });
});
