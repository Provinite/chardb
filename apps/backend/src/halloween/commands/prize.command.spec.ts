import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import { PrizeCommand } from "./prize.command";
import { HalloweenLinks } from "../halloween-links";
import { ADMINISTRATOR, GUILD_ID, buildInteraction } from "../testing/fixtures";
import { linksFor } from "../testing/command-harness";

const sub = (
  name: string,
  options?: APIApplicationCommandInteractionDataOption[],
) =>
  ({
    type: ApplicationCommandOptionType.Subcommand,
    name,
    ...(options ? { options } : {}),
  }) as APIApplicationCommandInteractionDataOption;

const adminGroup = (child: APIApplicationCommandInteractionDataOption) =>
  ({
    type: ApplicationCommandOptionType.SubcommandGroup,
    name: "admin",
    options: [child],
  }) as APIApplicationCommandInteractionDataOption;

const str = (name: string, value: string) =>
  ({ type: ApplicationCommandOptionType.String, name, value }) as const;

describe("/prize", () => {
  let links: HalloweenLinks;
  let command: PrizeCommand;
  /** What the last run answered with. */
  let reply: unknown;

  beforeEach(() => {
    reply = undefined;
    links = linksFor("cloverse");
    jest.spyOn(links, "halloweenPage");
    jest.spyOn(links, "prizeListPage");
    command = new PrizeCommand(links);
  });

  const run = async (
    options: APIApplicationCommandInteractionDataOption[] | undefined,
    permissions = ADMINISTRATOR,
  ) => {
    const result = await command.handle(
      buildInteraction({ name: "prize", options, permissions }),
    );
    reply = result.reply;
    return result;
  };

  describe("routing", () => {
    it("requires a subcommand", async () => {
      await expect(run(undefined)).rejects.toThrow("No subcommand provided");
    });

    it("refuses a bare option", async () => {
      await expect(run([str("x", "y")])).rejects.toThrow(
        "No subcommand provided. The prize command requires a subcommand",
      );
    });

    it("only offers the admin subcommands under admin", async () => {
      await expect(run([sub("add")])).rejects.toThrow(
        "Unknown prize sub command",
      );
    });
  });

  describe("list", () => {
    it("links the prize list on chardb", async () => {
      await run([sub("list")], "0");
      expect(links.prizeListPage).toHaveBeenCalledWith(GUILD_ID);
      expect(reply).toEqual({
        content:
          "See every prize and the latest wins on chardb: https://cloverse.chardb.cc/halloween/prizes",
      });
    });

    it("says where to look when there is no page to link to", async () => {
      jest.spyOn(links, "prizeListPage").mockResolvedValue(null);
      await run([sub("list")], "0");
      expect(reply).toEqual({
        content:
          "See every prize and the latest wins on chardb, under the community's Halloween section.",
      });
    });
  });

  // Prizes are managed on chardb now. The admin subcommands stay registered
  // with Discord until they are removed there, so they point at the page.
  describe("admin", () => {
    it.each(["add", "edit"])(
      "points /prize admin %s at the Halloween page",
      async (name) => {
        await run([adminGroup(sub(name, [str("id", "myo")]))]);
        expect(links.halloweenPage).toHaveBeenCalledWith(GUILD_ID);
        expect(reply).toEqual({
          content:
            "Prize management has moved to the Halloween page on chardb: https://cloverse.chardb.cc/admin/halloween",
        });
      },
    );

    it("says where to look when there is no page to link to", async () => {
      jest.spyOn(links, "halloweenPage").mockResolvedValue(null);
      await run([adminGroup(sub("add"))]);
      expect(reply).toEqual({
        content:
          "Prize management has moved to the Halloween page on chardb, under the community's Administration.",
      });
    });
  });
});
