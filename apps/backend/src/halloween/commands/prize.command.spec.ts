import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";
import type { HalloweenPrize } from "@chardb/database";
import { PrizeCommand } from "./prize.command";
import { Color } from "../discord/ui";
import { HalloweenRandom } from "../random";
import { PrizeService } from "../services/prize.service";
import {
  HalloweenDiscordError,
  OutOfPrizesError,
  ValidationError,
} from "../errors";
import { ADMINISTRATOR, GUILD_ID, buildInteraction } from "../testing/fixtures";
import {
  AUTHOR,
  TIMESTAMP,
  lastReply,
  mockDiscord,
  stubUi,
} from "../testing/command-harness";

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
const int = (name: string, value: number) =>
  ({ type: ApplicationCommandOptionType.Integer, name, value }) as const;

describe("/prize", () => {
  let discord: ReturnType<typeof mockDiscord>;
  let prizes: { inStock: jest.Mock; save: jest.Mock };
  let random: HalloweenRandom;
  let command: PrizeCommand;

  beforeEach(() => {
    discord = mockDiscord();
    prizes = {
      inStock: jest.fn().mockResolvedValue([]),
      save: jest.fn((p: HalloweenPrize) => Promise.resolve(p)),
    };
    random = new HalloweenRandom();
    // First choice of everything, and no reordering.
    jest.spyOn(random, "unit").mockReturnValue(0);
    jest.spyOn(random, "int").mockReturnValue(0);
    jest.spyOn(random, "shuffle").mockImplementation((items) => [...items]);
    command = new PrizeCommand(
      discord,
      stubUi(),
      prizes as unknown as PrizeService,
      random,
    );
  });

  const run = (
    options: APIApplicationCommandInteractionDataOption[] | undefined,
    permissions = ADMINISTRATOR,
  ) =>
    command.handle(buildInteraction({ name: "prize", options, permissions }));

  describe("routing", () => {
    it("requires a subcommand", async () => {
      await expect(run(undefined)).rejects.toThrow("No subcommand provided");
    });

    it("refuses a bare option", async () => {
      await expect(run([str("x", "y")])).rejects.toThrow(
        "No subcommand provided. The prize command requires a subcommand",
      );
    });

    it("has no edit command yet, as in the bot", async () => {
      await expect(run([adminGroup(sub("edit"))])).rejects.toThrow(
        "Unknown prize sub command",
      );
    });

    it("only offers add under admin", async () => {
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
      expect(lastReply(discord)).toEqual({
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

    it("samples 20 when there are more", async () => {
      prizes.inStock.mockResolvedValue(
        Array.from({ length: 23 }, (_, i) => prize(`p${i}`)),
      );
      await run([sub("list")], "0");
      const [embed] = (
        lastReply(discord) as {
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

  describe("admin add", () => {
    const add = (options: APIApplicationCommandInteractionDataOption[]) => [
      adminGroup(sub("add", options)),
    ];
    const required = [
      str("id", "myo-common"),
      str("name", "Common MYO"),
      int("stock", 5),
      str("image", "https://i.test/myo.png"),
    ];

    it("is for administrators only", async () => {
      await expect(run(add(required), "0")).rejects.toThrow(
        "You lack the required permissions for that command.",
      );
    });

    it("adds a prize with full stock and the default weight", async () => {
      await run(add(required));
      expect(prizes.save).toHaveBeenCalledWith({
        guildId: GUILD_ID,
        id: "myo-common",
        name: "Common MYO",
        initialStock: 5,
        currentStock: 5,
        image: "https://i.test/myo.png",
        weight: 10,
      });
      expect(lastReply(discord)).toEqual({
        content: "Added 5 units of Common MYO as myo-common with weight 10",
      });
    });

    it("takes a weight and a CharDB item type", async () => {
      await run(
        add([...required, int("weight", 3), str("item-type-id", "it-1")]),
      );
      expect(prizes.save).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 3, itemTypeId: "it-1" }),
      );
    });

    it("takes a CharDB character", async () => {
      await run(add([...required, str("character-id", "ch-1")]));
      expect(prizes.save).toHaveBeenCalledWith(
        expect.objectContaining({ characterId: "ch-1" }),
      );
    });

    // The bot defaulted any falsy weight, so 0 became 10.
    it("treats a weight of 0 as the default", async () => {
      await run(add([...required, int("weight", 0)]));
      expect(prizes.save).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 10 }),
      );
    });

    it("refuses an id that is not a lowercase slug", async () => {
      await expect(
        run(add([str("id", "My Prize"), ...required.slice(1)])),
      ).rejects.toThrow("Couldn't process value for field id");
    });

    it("refuses an unknown option", async () => {
      await expect(run(add([...required, str("colour", "x")]))).rejects.toThrow(
        "Unexpected option, colour. Valid options are ",
      );
    });

    it("passes on the service's validation", async () => {
      const invalid = new ValidationError({
        thrownFrom: "t",
        message: "Prize validation failed",
        validationErrors: [],
      });
      prizes.save.mockRejectedValue(invalid);
      await expect(run(add(required))).rejects.toBe(invalid);
    });

    it("reports any other failure to save", async () => {
      prizes.save.mockRejectedValue(new Error("duplicate key"));
      await expect(run(add(required))).rejects.toThrow(
        new HalloweenDiscordError({
          thrownFrom: "t",
          message: "Couldn't save prize",
        }),
      );
    });
  });
});
