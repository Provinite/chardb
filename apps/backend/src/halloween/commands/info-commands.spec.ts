import { HelpCommand } from "./help.command";
import { CreditsCommand } from "./credits.command";
import { InfoCommand } from "./info.command";
import { Color } from "../discord/ui";
import { GuildSettingsService } from "../services/guild-settings.service";
import { MissingGuildSettingsError } from "../errors";
import { buildInteraction } from "../testing/fixtures";
import { AUTHOR, TIMESTAMP, stubUi } from "../testing/command-harness";

describe("/help", () => {
  it("explains how to take part", async () => {
    const interaction = buildInteraction({ name: "help" });
    const { reply, afterReply } = await new HelpCommand(stubUi()).handle(
      interaction,
    );
    expect(afterReply).toBeUndefined();
    expect(reply).toEqual({
      embeds: [
        {
          author: {
            name: "Luther",
            icon_url:
              "https://cdn.discordapp.com/app-icons/896600597053202462/14e838bbe4426c28377e05558c72ebd8.png?size=512",
          },
          color: Color.Primary,
          title: "Cloverse Halloween 2026 - How to Participate",
          timestamp: TIMESTAMP,
          fields: [
            {
              name: "Trick or Treat",
              value: "Use the /knock command to try for a prize",
            },
            {
              name: "Connect DeviantArt",
              value:
                "Use the /deviantart command to set your DA username so we can deliver any adopts you win!",
            },
            {
              name: "Issues?",
              value:
                "If you're experiencing any bugs or issues please contact one of the event administrators for help.",
            },
            {
              name: "Want more info?",
              value:
                "You can get details about the event by using the /info command",
            },
            {
              name: "Want to see the juicy prizes?",
              value: "Use the /prize list command to see what you could win!",
            },
          ],
          description:
            "Every day until the event is over, you'll have the opportunity to knock on our door a few times for a chance to win fabulous prizes.",
          footer: {
            text: "Made with ❤️ by Provinite @ Github",
            icon_url:
              "https://www.dropbox.com/s/ln7f5ucr9eza8vh/clovercoin-logo_gold-gradient.png?dl=1",
          },
        },
      ],
    });
  });
});

describe("/credits", () => {
  it("credits the people who made it", async () => {
    const { reply } = await new CreditsCommand(stubUi()).handle(
      buildInteraction({ name: "credits" }),
    );
    expect(reply).toEqual({
      embeds: [
        {
          author: AUTHOR,
          color: Color.Primary,
          title: "Cloverse Halloween 2026 - Credits",
          timestamp: TIMESTAMP,
          fields: [
            { name: "Idea & Planning", value: "CloverCoin, Provinite" },
            { name: "Software Engineering", value: "Provinite @ Github" },
            {
              name: "Assistant _to the_ Senior Engineer",
              value: "LarsonDanes @ Github",
            },
            {
              name: "Artwork & Organization",
              value:
                "SpiritBurn, CloverCoin, fishyyllama, MonsterMillie, Neo the Baka, PeaBandJ, PixelRaccoon, Ollie-liversonthemoon, Chocobanyana, CinnriStreusel, OMG Productions, Maze/Woodes, 23icefire, EmmyGoatArt, Skippy, Owlcoholik, RedRoadRot, LilMxVooboo, Frymaform",
            },
            {
              name: "Special Thanks",
              value:
                "<@&230685975653777409>, <@&230670492539813888>, <@&808143046381404191>, <@&277238776781209601>, <@&277238728630599681>, <@&277238676822556682>, <@&277238542638514176>, <@&277238448698556419>",
            },
          ],
        },
      ],
    });
  });
});

describe("/info", () => {
  const settings = {
    guildId: "100000000000000001",
    resetTime: 6,
    knocksPerDay: 3,
    startDate: new Date("2025-10-01T05:00:00Z"),
    endDate: new Date("2025-11-01T04:59:00Z"),
    winRate: 0.35,
    winChannel: null,
  };

  const run = async (overrides = {}) => {
    const guildSettings = {
      get: jest.fn().mockResolvedValue({ ...settings, ...overrides }),
    } as unknown as GuildSettingsService;
    const { reply } = await new InfoCommand(stubUi(), guildSettings).handle(
      buildInteraction({ name: "info" }),
    );
    return reply;
  };

  it("shows the event's settings in Chicago time", async () => {
    expect(await run()).toEqual({
      embeds: [
        {
          author: AUTHOR,
          timestamp: TIMESTAMP,
          color: Color.Primary,
          title: "Cloverse Halloween 2026 - Info",
          description:
            "Event information and settings. These are the current settings for the event. Note that they may change over time to make sure we give out all of our prizes. All times are in US Central (Chicago) time.",
          fields: [
            { name: "Start Date", value: "2025-10-01 12:00 am" },
            { name: "End Date", value: "2025-10-31 11:59 pm" },
            // The bot printed winRate * 100 as-is, float noise and all.
            { name: "Win Rate (per knock)", value: `${0.35 * 100}%` },
            { name: "Knocks Per Day", value: "3" },
            { name: "Prize Pool", value: "/prize list" },
            { name: "Reset Time", value: "6 AM US Central Time" },
          ],
        },
      ],
    });
  });

  it("keeps the bot's unrounded win rate", async () => {
    const reply = (await run({ winRate: 0.07 })) as {
      embeds: { fields: { name: string; value: string }[] }[];
    };
    expect(reply.embeds[0].fields[2].value).toBe(`${0.07 * 100}%`);
  });

  it("shows N/A for unset dates", async () => {
    const reply = (await run({ startDate: null, endDate: null })) as {
      embeds: { fields: { value: string }[] }[];
    };
    expect(reply.embeds[0].fields[0].value).toBe("N/A");
    expect(reply.embeds[0].fields[1].value).toBe("N/A");
  });

  it("fails when the guild is not set up", async () => {
    const guildSettings = {
      get: jest
        .fn()
        .mockRejectedValue(
          new MissingGuildSettingsError({ thrownFrom: "t", guildId: "1" }),
        ),
    } as unknown as GuildSettingsService;
    await expect(
      new InfoCommand(stubUi(), guildSettings).handle(
        buildInteraction({ name: "info" }),
      ),
    ).rejects.toBeInstanceOf(MissingGuildSettingsError);
  });
});
