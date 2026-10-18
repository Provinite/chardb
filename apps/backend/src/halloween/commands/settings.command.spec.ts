import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import { SettingsCommand } from "./settings.command";
import { HalloweenLinks } from "../halloween-links";
import { ADMINISTRATOR, GUILD_ID, buildInteraction } from "../testing/fixtures";
import { lastReply, mockDiscord } from "../testing/command-harness";

const subcommand = (
  name: string,
): APIApplicationCommandInteractionDataOption[] => [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name,
  } as APIApplicationCommandInteractionDataOption,
];

/**
 * The event is set up on chardb now. The command stays registered with
 * Discord until it is removed there, so it points admins at the page.
 */
describe("/settings", () => {
  let discord: ReturnType<typeof mockDiscord>;
  let links: { halloweenPage: jest.Mock };
  let command: SettingsCommand;

  beforeEach(() => {
    discord = mockDiscord();
    links = {
      halloweenPage: jest
        .fn()
        .mockResolvedValue("https://cloverse.chardb.cc/admin/halloween"),
    };
    command = new SettingsCommand(discord, links as unknown as HalloweenLinks);
  });

  it.each(["set", "list"])(
    "points /settings %s at the Halloween page",
    async (name) => {
      await command.handle(
        buildInteraction({
          name: "settings",
          options: subcommand(name),
          permissions: ADMINISTRATOR,
        }),
      );
      expect(links.halloweenPage).toHaveBeenCalledWith(GUILD_ID);
      expect(lastReply(discord)).toEqual({
        content:
          "Event settings have moved to the Halloween page on chardb: https://cloverse.chardb.cc/admin/halloween",
      });
    },
  );

  it("says where to look when there is no page to link to", async () => {
    links.halloweenPage.mockResolvedValue(null);
    await command.handle(
      buildInteraction({ name: "settings", options: subcommand("set") }),
    );
    expect(lastReply(discord)).toEqual({
      content:
        "Event settings have moved to the Halloween page on chardb, under the community's Administration.",
    });
  });
});
