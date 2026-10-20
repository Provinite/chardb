/**
 * How /knock holds up when many players knock at once.
 *
 * Not part of the e2e suite (its name does not end in .e2e.spec.ts); run it
 * by hand against the test database:
 *
 *   yarn workspace @chardb/backend test:load:halloween
 *
 * It drives the real dispatcher and Postgres, with Discord stubbed, and every
 * knock wins, so each one takes a prize and grants a chardb item: the worst
 * case for contention. Each scenario prints how long the reply took and how
 * each knock ended. Discord stops waiting for a reply after three seconds.
 */
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import { TestApp } from "./setup-e2e";
import { DatabaseModule } from "../src/database/database.module";
import { AuthModule } from "../src/auth/auth.module";
import { DatabaseService } from "../src/database/database.service";
import { DiscordService } from "../src/discord/discord.service";
import { HalloweenModule } from "../src/halloween/halloween.module";
import { HalloweenCommandDispatcher } from "../src/halloween/discord/halloween-command.dispatcher";
import { HalloweenDiscordClient } from "../src/halloween/discord/halloween-discord.client";
import { HalloweenRandom } from "../src/halloween/random";
import { GUILD_ID, buildInteraction } from "../src/halloween/testing/fixtures";
import { mockDiscord } from "../src/halloween/testing/command-harness";

const PLAYERS = Number(process.env.LOAD_PLAYERS ?? 40);
const KNOCKS_EACH = Number(process.env.LOAD_KNOCKS ?? 5);

interface Scenario {
  name: string;
  prizes: number;
}

const SCENARIOS: Scenario[] = [
  // Everyone after the same prize: one row, every winner wants it.
  { name: "one prize", prizes: 1 },
  // A typical pool.
  { name: "eight prizes", prizes: 8 },
];

jest.setTimeout(10 * 60_000);

describe("Halloween /knock under load", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let dispatcher: HalloweenCommandDispatcher;
  let interactionId = 0;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, HalloweenModule] },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(mockDiscord())
          .overrideProvider(DiscordService)
          .useValue({ validateUserId: () => Promise.resolve(true) }),
    );
    db = testApp.getDb();
    dispatcher = testApp.getModuleRef().get(HalloweenCommandDispatcher);
    jest
      .spyOn(testApp.getModuleRef().get(HalloweenRandom), "unit")
      .mockReturnValue(0);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const setUp = async ({ prizes }: Scenario) => {
    await testApp.clearDatabase();
    const community = await testApp.createTestCommunity();
    await db.community.update({
      where: { id: community.id },
      data: { discordGuildId: GUILD_ID },
    });
    const itemType = await db.itemType.create({
      data: { name: "Candy Corn", communityId: community.id },
    });
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD_ID,
        startDate: new Date("2020-01-01T06:00:00Z"),
        resetTime: 6,
        knocksPerDay: KNOCKS_EACH,
        winRate: 1,
      },
    });
    await db.halloweenPrize.createMany({
      data: Array.from({ length: prizes }, (_, i) => ({
        guildId: GUILD_ID,
        id: `prize-${String.fromCharCode(97 + i)}`,
        name: `Prize ${i}`,
        initialStock: 999,
        currentStock: 999,
        weight: 10,
        itemTypeId: itemType.id,
      })),
    });
  };

  /** One knock as the endpoint runs it: the reply, then the work after. */
  const knock = async (userId: string) => {
    const interaction = buildInteraction({
      id: `${++interactionId}`,
      name: "knock",
      userId,
    }) as APIApplicationCommandGuildInteraction;
    const started = performance.now();
    const { reply, afterReply } = await dispatcher.dispatch(interaction);
    const replyMs = performance.now() - started;
    await afterReply();
    const title =
      (reply as { embeds?: { title?: string }[] }).embeds?.[0]?.title ?? "?";
    return { replyMs, totalMs: performance.now() - started, title };
  };

  const percentile = (sorted: number[], p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

  for (const scenario of SCENARIOS) {
    it(scenario.name, async () => {
      await setUp(scenario);
      const players = Array.from(
        { length: PLAYERS },
        (_, i) => `${300000000000000000n + BigInt(i)}`,
      );

      const started = performance.now();
      const results = (
        await Promise.all(
          players.map(async (userId) => {
            const mine = [];
            for (let k = 0; k < KNOCKS_EACH; k++) {
              mine.push(await knock(userId));
            }
            return mine;
          }),
        )
      ).flat();
      const wallMs = performance.now() - started;

      const reply = results.map((r) => r.replyMs).sort((a, b) => a - b);
      const total = results.map((r) => r.totalMs).sort((a, b) => a - b);
      const outcomes: Record<string, number> = {};
      for (const { title } of results) {
        outcomes[title] = (outcomes[title] ?? 0) + 1;
      }
      const ms = (n: number) => `${Math.round(n)}ms`;
      const lines = [
        `${scenario.name}: ${PLAYERS} players x ${KNOCKS_EACH} knocks, ${scenario.prizes} prize(s), all wins`,
        `  reply  p50 ${ms(percentile(reply, 50))}  p95 ${ms(percentile(reply, 95))}  p99 ${ms(percentile(reply, 99))}  max ${ms(reply[reply.length - 1])}`,
        `  total  p50 ${ms(percentile(total, 50))}  p95 ${ms(percentile(total, 95))}  max ${ms(total[total.length - 1])}`,
        `  over 3s: ${reply.filter((r) => r > 3000).length}   wall ${ms(wallMs)}`,
        `  outcomes: ${JSON.stringify(outcomes)}`,
        `  items granted: ${await db.item.count()}   wins recorded: ${await db.halloweenKnockEvent.count({ where: { prizeId: { not: null } } })}`,
      ];
      process.stdout.write(`\n${lines.join("\n")}\n`);
    });
  }
});
