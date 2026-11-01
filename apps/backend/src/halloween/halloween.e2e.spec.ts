import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { DiscordService } from "../discord/discord.service";
import { ItemsService } from "../items/items.service";
import { HalloweenModule } from "./halloween.module";
import { HalloweenCommandDispatcher } from "./discord/halloween-command.dispatcher";
import { HalloweenDiscordClient } from "./discord/halloween-discord.client";
import { HalloweenRandom } from "./random";
import { PrizeService } from "./services/prize.service";
import { GuildSettingsService } from "./services/guild-settings.service";
import {
  ADMINISTRATOR,
  GUILD_ID,
  OTHER_USER_ID,
  USER_ID,
  buildInteraction,
} from "./testing/fixtures";
import { mockDiscord } from "./testing/command-harness";
import { Logger } from "@nestjs/common";

/**
 * Commands end to end, from the dispatcher down to Postgres. Only Discord is
 * stubbed. The HTTP layer in front of the dispatcher has its own spec.
 */
describe("Halloween bot (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let dispatcher: HalloweenCommandDispatcher;
  let discord: ReturnType<typeof mockDiscord>;
  let random: HalloweenRandom;
  let interactionId = 0;

  beforeAll(async () => {
    discord = mockDiscord();
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, HalloweenModule] },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(discord)
          // grantItem asks chardb's own bot whether the winner's Discord id
          // exists before creating a pending owner for it.
          .overrideProvider(DiscordService)
          .useValue({ validateUserId: () => Promise.resolve(true) }),
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
    // Each test sets the guild up afresh; /knock would otherwise use the last
    // test's settings for ten seconds.
    testApp.getModuleRef().get(GuildSettingsService).invalidate(GUILD_ID);
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  /**
   * Runs a command as the endpoint does: the reply, then whatever the command
   * left for after it. Returns the reply.
   */
  const run = async (
    name: string,
    options?: APIApplicationCommandInteractionDataOption[],
    { userId = USER_ID, permissions = "0" } = {},
  ) => {
    const interaction = buildInteraction({
      id: `${++interactionId}`,
      name,
      options,
      userId,
      permissions,
    });
    const { reply, afterReply } = await dispatcher.dispatch(
      interaction as APIApplicationCommandGuildInteraction,
    );
    await afterReply();
    return reply as {
      content?: string;
      embeds?: { title?: string; fields?: { name: string; value: string }[] }[];
    };
  };

  // The event is set up on chardb now (halloween-admin.e2e.spec.ts covers
  // that), so these start from the rows it would leave.
  const setUpEvent = ({ knocksPerDay = 2 } = {}) =>
    db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD_ID,
        startDate: new Date("2020-01-01T06:00:00Z"),
        resetTime: 6,
        knocksPerDay,
        winRate: 0.5,
      },
    });

  const addPrize = (id: string, delivers: { itemTypeId?: string } = {}) =>
    db.halloweenPrize.create({
      data: {
        guildId: GUILD_ID,
        id,
        name: `Prize ${id}`,
        initialStock: 2,
        currentStock: 2,
        weight: 10,
        image: delivers.itemTypeId ? null : `https://i.test/${id}.png`,
        ...delivers,
      },
    });

  const alwaysWin = () => jest.spyOn(random, "unit").mockReturnValue(0);

  /** A community linked to the guild, with an item type it can give away. */
  const linkedCommunity = async () => {
    const community = await testApp.createTestCommunity();
    await db.community.update({
      where: { id: community.id },
      data: { discordGuildId: GUILD_ID },
    });
    const itemType = await db.itemType.create({
      data: { name: "Candy Corn", communityId: community.id },
    });
    return { community, itemType };
  };
  const alwaysLose = () => jest.spyOn(random, "unit").mockReturnValue(0.999);

  it("records a losing knock", async () => {
    await setUpEvent();
    await addPrize("myo");
    alwaysLose();
    const reply = await run("knock");
    expect(reply.embeds?.[0].title).toBe("No one was home");
    expect(await db.halloweenKnockEvent.count()).toBe(1);
  });

  it("awards a prize and delivers its chardb item to the winner's Discord account", async () => {
    const { itemType } = await linkedCommunity();
    await setUpEvent();
    await addPrize("candy", { itemTypeId: itemType.id });
    alwaysWin();

    const reply = await run("knock");

    expect(reply.embeds?.[0].title).toBe("Winner!");
    const knock = await db.halloweenKnockEvent.findFirstOrThrow();
    expect(knock).toMatchObject({ prizeId: "candy", isPending: false });
    expect((await db.halloweenPrize.findFirstOrThrow()).currentStock).toBe(1);
    const item = await db.item.findFirstOrThrow({
      where: { itemTypeId: itemType.id },
      include: { pendingOwnership: true },
    });
    expect(item.ownerId).toBeNull();
    expect(item.pendingOwnership).toMatchObject({
      provider: ExternalAccountProvider.DISCORD,
      providerAccountId: USER_ID,
    });
    // Its pending owner records the winner; staff hand nothing over.
    expect(await db.halloweenStaffAward.count()).toBe(0);
  });

  it("records a staff prize's win as an award waiting to be handed over", async () => {
    await setUpEvent();
    await addPrize("adopt");
    alwaysWin();

    const reply = await run("knock");

    expect(reply.embeds?.[0].title).toBe("Winner!");
    const knock = await db.halloweenKnockEvent.findFirstOrThrow();
    expect(await db.halloweenStaffAward.findMany()).toEqual([
      expect.objectContaining({
        knockEventId: knock.id,
        guildId: GUILD_ID,
        discordUserId: USER_ID,
        // As the interaction's member carries them.
        discordUsername: "trickortreater",
        discordDisplayName: null,
        deliveredAt: null,
        deliveredById: null,
      }),
    ]);
  });

  it("gives a winner who is a linked member the item outright", async () => {
    const { community, itemType } = await linkedCommunity();
    const stamp = Date.now();
    const player = await testApp.createTestUser({
      username: `player_${stamp}`,
      email: `player_${stamp}@example.com`,
    });
    await testApp.createTestCommunityMember(
      player.id,
      (await testApp.createTestRole(community.id)).id,
    );
    await db.externalAccount.create({
      data: {
        userId: player.id,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: USER_ID,
        displayName: "player",
      },
    });
    await setUpEvent();
    await addPrize("candy", { itemTypeId: itemType.id });
    alwaysWin();

    await run("knock");

    const item = await db.item.findFirstOrThrow({
      where: { itemTypeId: itemType.id },
    });
    expect(item.ownerId).toBe(player.id);
  });

  // The grant is part of the knock: if it fails, so does the knock, and the
  // player keeps it.
  it("rolls back the whole win when the grant fails", async () => {
    const { itemType } = await linkedCommunity();
    await setUpEvent();
    await addPrize("candy", { itemTypeId: itemType.id });
    alwaysWin();
    jest
      .spyOn(testApp.getModuleRef().get(ItemsService), "grantItemInTransaction")
      .mockRejectedValue(new Error("database blip"));

    const reply = await run("knock");

    expect(reply.embeds?.[0].title).not.toBe("Winner!");
    expect(await db.halloweenKnockEvent.count()).toBe(0);
    expect((await db.halloweenPrize.findFirstOrThrow()).currentStock).toBe(2);
    expect(await db.item.count()).toBe(0);
  });

  // The bot locked every prize in stock for each win, so winners queued
  // behind one another. Now a winner locks only the prize they take.
  /**
   * Another winner, holding the guild's prize pool for 2.5 seconds. Wrapped,
   * since an async function returning the promise would wait for it.
   */
  const holdPool = async () => {
    let held!: () => void;
    const locked = new Promise<void>((resolve) => (held = resolve));
    const holder = db.$transaction(
      async (tx) => {
        await testApp
          .getModuleRef()
          .get(PrizeService)
          .lockInStock(GUILD_ID, tx);
        held();
        await tx.$executeRaw`SELECT pg_sleep(2.5)`;
      },
      { timeout: 10_000 },
    );
    await locked;
    return { holder };
  };

  it("does not keep a losing knock waiting on a winner", async () => {
    await setUpEvent();
    await addPrize("myo");
    alwaysLose();
    const { holder } = await holdPool();

    const started = Date.now();
    const reply = await run("knock");
    expect(reply.embeds?.[0].title).toBe("No one was home");
    expect(Date.now() - started).toBeLessThan(1000);
    await holder;
  });

  it("answers busy, and spends nothing, when the pool stays taken too long", async () => {
    await setUpEvent();
    await addPrize("myo");
    alwaysWin();
    const { holder } = await holdPool();

    const started = Date.now();
    const reply = await run("knock");
    expect(Date.now() - started).toBeLessThan(3000);
    expect(reply.embeds?.[0].title).toBe("Cloverse Halloween 2026 - Busy");
    await holder;
    expect(await db.halloweenKnockEvent.count()).toBe(0);
    const [prize] = await db.halloweenPrize.findMany();
    expect(prize.currentStock).toBe(2);
  });

  // Each winner picks from what the winners before them left.
  it("gives two last prizes to two winners at once, one each", async () => {
    await setUpEvent();
    await db.halloweenPrize.createMany({
      data: ["last-a", "last-b"].map((id) => ({
        guildId: GUILD_ID,
        id,
        name: id,
        initialStock: 1,
        currentStock: 1,
        weight: 10,
        image: `https://i.test/${id}.png`,
      })),
    });
    alwaysWin();

    const replies = await Promise.all([
      run("knock"),
      run("knock", undefined, { userId: OTHER_USER_ID }),
    ]);

    expect(replies.map((r) => r.embeds?.[0].title)).toEqual([
      "Winner!",
      "Winner!",
    ]);
    const won = await db.halloweenKnockEvent.findMany({
      orderBy: { prizeId: "asc" },
    });
    expect(won.map((k) => k.prizeId)).toEqual(["last-a", "last-b"]);
    const stock = await db.halloweenPrize.findMany();
    expect(stock.every((p) => p.currentStock === 0)).toBe(true);
  });

  it("keeps the player's knock when the prize cannot be delivered", async () => {
    // An item prize, but no community is linked to the guild.
    await setUpEvent();
    await addPrize("candy", { itemTypeId: "no-such-item-type" });
    alwaysWin();

    const reply = await run("knock");

    expect(reply.embeds?.[0].fields).toContainEqual({
      name: "Message",
      value: "This prize couldn't be delivered. Please let staff know.",
    });
    expect(await db.halloweenKnockEvent.count()).toBe(0);
    expect((await db.halloweenPrize.findFirstOrThrow()).currentStock).toBe(2);
  });

  it("lets only one of two simultaneous knocks spend the last one", async () => {
    await setUpEvent({ knocksPerDay: 1 });
    await addPrize("myo");
    alwaysLose();

    const replies = await Promise.all([run("knock"), run("knock")]);

    expect(await db.halloweenKnockEvent.count()).toBe(1);
    expect(replies.map((r) => r.embeds?.[0].title).sort()).toEqual([
      "Cloverse Halloween 2026 - Too Many Knocks",
      "No one was home",
    ]);
  });

  it("answers busy, and spends nothing, when the player's lock stays taken too long", async () => {
    await setUpEvent();
    await addPrize("myo");
    alwaysWin();

    // Another knock by the same player, stuck holding the lock for longer
    // than a knock may wait for it.
    const key = `halloween:knock:${GUILD_ID}:${USER_ID}`;
    let held!: () => void;
    const locked = new Promise<void>((resolve) => (held = resolve));
    const holder = db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
        held();
        await tx.$executeRaw`SELECT pg_sleep(2.5)`;
      },
      { timeout: 10_000 },
    );
    await locked;

    const started = Date.now();
    const reply = await run("knock");
    expect(Date.now() - started).toBeLessThan(3000);
    expect(reply.embeds?.[0].title).toBe("Cloverse Halloween 2026 - Busy");
    await holder;
    expect(await db.halloweenKnockEvent.count()).toBe(0);
    const [prize] = await db.halloweenPrize.findMany();
    expect(prize.currentStock).toBe(2);
  });

  it("lets a gifty pay for a knock past the daily allowance", async () => {
    await setUpEvent({ knocksPerDay: 1 });
    await addPrize("myo");
    alwaysLose();
    await run("knock");

    const gifted = await run(
      "gifty",
      [
        {
          type: ApplicationCommandOptionType.User,
          name: "user",
          value: USER_ID,
        },
      ],
      { userId: OTHER_USER_ID },
    );
    expect(gifted.embeds?.[0].title).toBe(
      "Cloverse Halloween 2026 - New Gifty!",
    );

    const reply = await run("knock");
    expect(reply.embeds?.[0].fields?.[0]).toEqual({
      name: "Knock Gifted By",
      value: `<@${OTHER_USER_ID}>`,
    });
    expect(
      await db.halloweenGifty.count({ where: { knockEventId: { not: null } } }),
    ).toBe(1);

    const refused = await run("knock");
    expect(refused.embeds?.[0].title).toBe(
      "Cloverse Halloween 2026 - Too Many Knocks",
    );
  });

  it("tells players in a server that is not set up", async () => {
    const reply = await run("knock");
    expect(reply.embeds?.[0].title).toBe(
      "Cloverse Halloween 2026 - Not Ready Yet",
    );
  });

  // A name belongs to the player, not to the event: they can save it early.
  it("saves a DeviantArt name in a server that is not set up yet", async () => {
    const reply = await run("deviantart", [
      {
        type: ApplicationCommandOptionType.String,
        name: "da_username",
        value: "early-bird",
      },
    ]);
    expect(reply.embeds?.[0].title).toBe("Cloverse Halloween 2026 - Setting");
    expect(
      await db.halloweenDeviantArtUser.findFirstOrThrow({
        where: { guildId: GUILD_ID, userId: USER_ID },
      }),
    ).toMatchObject({ deviantArtName: "early-bird" });
  });

  // A gifty is limited to one per reset, and the reset is a setting.
  it.each([
    ["a player", "0"],
    ["an admin, who skips the limit", ADMINISTRATOR],
  ])(
    "tells %s gifting in a server that is not set up, and saves nothing",
    async (_who, permissions) => {
      const reply = await run(
        "gifty",
        [
          {
            type: ApplicationCommandOptionType.User,
            name: "user",
            value: OTHER_USER_ID,
          },
        ],
        { permissions },
      );
      expect(reply.embeds?.[0].title).toBe(
        "Cloverse Halloween 2026 - Not Ready Yet",
      );
      expect(await db.halloweenGifty.count()).toBe(0);
    },
  );

  // Setting the event up is staff's job, not a fault in the bot.
  it("does not page staff when a server is not set up", async () => {
    const error = jest.spyOn(Logger.prototype, "error").mockImplementation();
    await run("knock");
    expect(error).not.toHaveBeenCalled();
  });
});
