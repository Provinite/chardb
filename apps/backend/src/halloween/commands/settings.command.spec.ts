import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import { SettingsCommand } from "./settings.command";
import { HalloweenLinks } from "../halloween-links";
import { ADMINISTRATOR, GUILD_ID, buildInteraction } from "../testing/fixtures";

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
  let links: { halloweenPage: jest.Mock };
  let command: SettingsCommand;

  beforeEach(() => {
    links = {
      halloweenPage: jest
        .fn()
        .mockResolvedValue("https://cloverse.chardb.cc/admin/halloween"),
    };
    command = new SettingsCommand(links as unknown as HalloweenLinks);
  });

  it.each(["set", "list"])(
    "points /settings %s at the Halloween page",
    async (name) => {
      const { reply } = await command.handle(
        buildInteraction({
          name: "settings",
          options: subcommand(name),
          permissions: ADMINISTRATOR,
        }),
      );
      expect(links.halloweenPage).toHaveBeenCalledWith(GUILD_ID);
      expect(reply).toEqual({
        content:
          "Event settings have moved to the Halloween page on chardb: https://cloverse.chardb.cc/admin/halloween",
      });
    },
  );

  it("says where to look when there is no page to link to", async () => {
    links.halloweenPage.mockResolvedValue(null);
    const { reply } = await command.handle(
      buildInteraction({ name: "settings", options: subcommand("set") }),
    );
    expect(reply).toEqual({
      content:
        "Event settings have moved to the Halloween page on chardb, under the community's Administration.",
    });
  });
});
