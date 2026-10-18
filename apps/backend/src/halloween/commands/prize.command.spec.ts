import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import type { HalloweenPrize } from "@chardb/database";
import { PrizeCommand } from "./prize.command";
import { Color } from "../discord/ui";
import { HalloweenRandom } from "../random";
import { HalloweenLinks } from "../halloween-links";
import { PrizeService } from "../services/prize.service";
import { PrizeImageService } from "../services/prize-image.service";
import { OutOfPrizesError } from "../errors";
import { ADMINISTRATOR, GUILD_ID, buildInteraction } from "../testing/fixtures";
import { AUTHOR, TIMESTAMP, stubUi } from "../testing/command-harness";

const prize = (
  id: string,
  overrides: Partial<HalloweenPrize> = {},
): HalloweenPrize => ({
  guildId: GUILD_ID,
  id,
  name: `Prize ${id}`,
  initialStock: 5,
  currentStock: 5,
  weight: 10,
  image: `https://i.test/${id}.png`,
  itemTypeId: null,
  characterId: null,
  ...overrides,
});

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
  let prizes: { inStock: jest.Mock; save: jest.Mock };
  let random: HalloweenRandom;
  let images: { imagesFor: jest.Mock };
  let links: { halloweenPage: jest.Mock };
  let command: PrizeCommand;
  /** What the last run answered with. */
  let reply: unknown;

  beforeEach(() => {
    reply = undefined;
    prizes = {
      inStock: jest.fn().mockResolvedValue([]),
      save: jest.fn((p: HalloweenPrize) => Promise.resolve(p)),
    };
    random = new HalloweenRandom();
    // First choice of everything, and no reordering.
    jest.spyOn(random, "unit").mockReturnValue(0);
    jest.spyOn(random, "int").mockReturnValue(0);
    jest.spyOn(random, "shuffle").mockImplementation((items) => [...items]);
    images = {
      imagesFor: jest.fn((list: HalloweenPrize[]) =>
        Promise.resolve(new Map(list.map((p) => [p, p.image]))),
      ),
    };
    links = {
      halloweenPage: jest
        .fn()
        .mockResolvedValue("https://cloverse.chardb.cc/admin/halloween"),
    };
    command = new PrizeCommand(
      stubUi(),
      prizes as unknown as PrizeService,
      images as unknown as PrizeImageService,
      links as unknown as HalloweenLinks,
      random,
    );
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
    it("says when the pool is empty", async () => {
      await expect(run([sub("list")], "0")).rejects.toBeInstanceOf(
        OutOfPrizesError,
      );
    });

    it("lists the remaining prizes with vague stock and a spoiler", async () => {
      prizes.inStock.mockResolvedValue([
        prize("myo", { currentStock: 1, initialStock: 1 }),
        prize("adopt", { currentStock: 7, weight: 3, itemTypeId: "it-1" }),
        prize("char", { currentStock: 30, characterId: "ch-1" }),
      ]);
      await run([sub("list")], "0");
      expect(prizes.inStock).toHaveBeenCalledWith(GUILD_ID);
      expect(reply).toEqual({
        embeds: [
          {
            author: AUTHOR,
            color: Color.Primary,
            title: "Cloverse Halloween 2026 - Prize List",
            timestamp: TIMESTAMP,
            description:
              "These are the remaining prizes still to go for the event!",
            fields: [
              {
                name: "Prize myo",
                value: "Just one remaining ||stock1|wg: 10||",
              },
              {
                name: "Prize adopt",
                value:
                  "A bunch remaining ||stock7|wg: 3|| | [View on CharDB](https://chardb.cc/item/it-1)",
              },
              {
                name: "Prize char",
                value:
                  "Tons remaining ||stock30|wg: 10|| | [View on CharDB](https://chardb.cc/character/ch-1)",
              },
            ],
            // Only prizes that started with more than one in stock are shown.
            image: { url: "https://i.test/adopt.png" },
          },
        ],
      });
    });

    it("shows chardb prizes with their own image, and skips any without one", async () => {
      const candy = prize("candy", { image: null, itemTypeId: "it-1" });
      const ghost = prize("ghost", { image: null, characterId: "ch-1" });
      prizes.inStock.mockResolvedValue([ghost, candy]);
      images.imagesFor.mockResolvedValue(
        new Map([
          [ghost, null],
          [candy, "https://cdn.test/candy.webp"],
        ]),
      );
      await run([sub("list")], "0");
      const [embed] = (reply as { embeds: { image?: { url?: string } }[] })
        .embeds;
      expect(embed.image).toEqual({ url: "https://cdn.test/candy.webp" });
    });

    it("samples 20 when there are more", async () => {
      prizes.inStock.mockResolvedValue(
        Array.from({ length: 23 }, (_, i) => prize(`p${i}`)),
      );
      await run([sub("list")], "0");
      const [embed] = (
        reply as {
          embeds: { description: string; fields: unknown[] }[];
        }
      ).embeds;
      expect(embed.description).toBe(
        "Here are 20 random prizes from 23 total remaining prizes!",
      );
      expect(embed.fields).toHaveLength(20);
      expect(random.shuffle).toHaveBeenCalled();
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
        expect(prizes.save).not.toHaveBeenCalled();
      },
    );

    it("says where to look when there is no page to link to", async () => {
      links.halloweenPage.mockResolvedValue(null);
      await run([adminGroup(sub("add"))]);
      expect(reply).toEqual({
        content:
          "Prize management has moved to the Halloween page on chardb, under the community's Administration.",
      });
    });
  });
});
