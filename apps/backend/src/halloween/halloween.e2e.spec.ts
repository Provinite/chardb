import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
  type APIApplicationCommandInteractionDataBasicOption,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import { ExternalAccountProvider } from "@chardb/database";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseService } from "../database/database.service";
import { DiscordService } from "../discord/discord.service";
import { HalloweenModule } from "./halloween.module";
import { HalloweenCommandDispatcher } from "./discord/halloween-command.dispatcher";
import { HalloweenDiscordClient } from "./discord/halloween-discord.client";
import { HalloweenRandom } from "./random";
import {
  ADMINISTRATOR,
  GUILD_ID,
  OTHER_USER_ID,
  USER_ID,
  buildInteraction,
} from "./testing/fixtures";
import { mockDiscord } from "./testing/command-harness";

const str = (name: string, value: string) =>
  ({ type: ApplicationCommandOptionType.String, name, value }) as const;
const int = (name: string, value: number) =>
  ({ type: ApplicationCommandOptionType.Integer, name, value }) as const;
const sub = (name: string, options: APIApplicationCommandInteractionDataBasicOption[]) =>
  ({ type: ApplicationCommandOptionType.Subcommand, name, options }) as const;

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
    dispatcher.originalResponseRetryDelaysMs = [];
    random = testApp.getModuleRef().get(HalloweenRandom);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  /** Runs a command; returns what the deferred reply was edited into. */
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
    await dispatcher.dispatch(
      interaction as APIApplicationCommandGuildInteraction,
    );
    const calls = discord.editOriginalResponse.mock.calls.filter(
      ([token]) => token === interaction.token,
    );
    return calls[calls.length - 1]?.[1] as {
      content?: string;
      embeds?: { title?: string; fields?: { name: string; value: string }[] }[];
    };
  };

  const admin = { permissions: ADMINISTRATOR };

  const setUpEvent = async ({ knocksPerDay = "2" } = {}) => {
    await run("settings", [sub("set", [str("setting", "start_date"), str("value", "2020-01-01")])], admin);
    await run("settings", [sub("set", [str("setting", "knocks_per_day"), str("value", knocksPerDay)])], admin);
  };

  const addPrize = (id: string, extra: APIApplicationCommandInteractionDataBasicOption[] = []) =>
    run(
      "prize",
      [
        {
          type: ApplicationCommandOptionType.SubcommandGroup,
          name: "admin",
          options: [
            sub("add", [
              str("id", id),
              str("name", `Prize ${id}`),
              int("stock", 2),
              str("image", `https://i.test/${id}.png`),
              ...extra,
            ]),
          ],
        },
      ],
      admin,
    );

  const alwaysWin = () => jest.spyOn(random, "unit").mockReturnValue(0);
  const alwaysLose = () => jest.spyOn(random, "unit").mockReturnValue(0.999);

  it("sets up an event from Discord", async () => {
    await setUpEvent({ knocksPerDay: "4" });
    expect(
      await db.halloweenGuildSettings.findUnique({ where: { guildId: GUILD_ID } }),
    ).toMatchObject({
      knocksPerDay: 4,
      resetTime: 6,
      winRate: 0.5,
      startDate: new Date("2020-01-01T06:00:00Z"),
    });
    const reply = await addPrize("myo");
    expect(reply.content).toBe("Added 2 units of Prize myo as myo with weight 10");
  });

  it("records a losing knock", async () => {
    await setUpEvent();
    await addPrize("myo");
    alwaysLose();
    const reply = await run("knock");
    expect(reply.embeds?.[0].title).toBe("No one was home");
    expect(await db.halloweenKnockEvent.count()).toBe(1);
  });

  it("awards a prize and delivers its chardb item to the winner's Discord account", async () => {
    const community = await testApp.createTestCommunity();
    await db.community.update({
      where: { id: community.id },
      data: { discordGuildId: GUILD_ID },
    });
    const itemType = await db.itemType.create({
      data: { name: "Candy Corn", communityId: community.id },
    });
    await setUpEvent();
    await addPrize("candy", [str("item-type-id", itemType.id)]);
    alwaysWin();

    const reply = await run("knock");

    expect(reply.embeds?.[0].title).toBe("Winner!");
    const knock = await db.halloweenKnockEvent.findFirstOrThrow();
    expect(knock).toMatchObject({ prizeId: "candy", isPending: false });
    expect(
      (await db.halloweenPrize.findFirstOrThrow()).currentStock,
    ).toBe(1);
    const item = await db.item.findFirstOrThrow({
      where: { itemTypeId: itemType.id },
      include: { pendingOwnership: true },
    });
    expect(item.ownerId).toBeNull();
    expect(item.pendingOwnership).toMatchObject({
      provider: ExternalAccountProvider.DISCORD,
      providerAccountId: USER_ID,
    });
  });

  it("keeps the player's knock when the prize cannot be delivered", async () => {
    // An item prize, but no community is linked to the guild.
    await setUpEvent();
    await addPrize("candy", [str("item-type-id", "no-such-item-type")]);
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
    await setUpEvent({ knocksPerDay: "1" });
    await addPrize("myo");
    alwaysLose();

    const replies = await Promise.all([run("knock"), run("knock")]);

    expect(await db.halloweenKnockEvent.count()).toBe(1);
    expect(replies.map((r) => r.embeds?.[0].title).sort()).toEqual([
      "Cloverse Halloween 2026 - Too Many Knocks",
      "No one was home",
    ]);
  });

  it("lets a gifty pay for a knock past the daily allowance", async () => {
    await setUpEvent({ knocksPerDay: "1" });
    await addPrize("myo");
    alwaysLose();
    await run("knock");

    const gifted = await run("gifty", [
      { type: ApplicationCommandOptionType.User, name: "user", value: USER_ID },
    ], { userId: OTHER_USER_ID });
    expect(gifted.embeds?.[0].title).toBe("Cloverse Halloween 2026 - New Gifty!");

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
    expect(reply.embeds?.[0].title).toBe("Cloverse Halloween 2026 - Not Ready Yet");
  });
});
