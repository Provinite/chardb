import { Injectable } from "@nestjs/common";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
  type APIChatInputApplicationCommandGuildInteraction,
  type APIEmbed,
} from "@discordjs/core";
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
} from "../discord/halloween-command";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { HalloweenRandom } from "../random";
import { HalloweenLinks } from "../halloween-links";
import { PrizeService } from "../services/prize.service";
import { PrizeImageService } from "../services/prize-image.service";
import { HalloweenDiscordError, OutOfPrizesError } from "../errors";
import { requireChatInput } from "./command-helpers";
import { movedToChardb } from "./moved-to-chardb";

const REMAINING_SYNONYMS = [
  "remaining",
  "left",
  "to go",
  "left to treat",
  "still to be won",
];

/** How many prizes `/prize list` shows at most. */
const LIST_SAMPLE_SIZE = 20;

const capitalizeFirstLetter = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1);

/**
 * `/prize list` for everyone. `/prize admin add` and `edit` stay registered
 * with Discord until they are removed there; prizes are managed on chardb
 * now, so they say where.
 */
@Injectable()
export class PrizeCommand implements HalloweenCommandHandler {
  readonly name = "prize";

  constructor(
    private readonly ui: HalloweenUi,
    private readonly prizes: PrizeService,
    private readonly prizeImages: PrizeImageService,
    private readonly links: HalloweenLinks,
    private readonly random: HalloweenRandom,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const chat = requireChatInput(interaction);
    const { options } = chat.data;
    if (!options || !options.length) {
      throw new HalloweenDiscordError({
        thrownFrom: "PrizeCommand",
        message: "No subcommand provided",
        sourceError: new Error("Expected options on prize command, got none."),
      });
    }

    let [subCommand] = options;
    let isAdminGroup = false;
    if (
      subCommand.type === ApplicationCommandOptionType.SubcommandGroup &&
      subCommand.name === "admin"
    ) {
      isAdminGroup = true;
      subCommand = subCommand.options[0];
    }
    if (subCommand.type !== ApplicationCommandOptionType.Subcommand) {
      throw new HalloweenDiscordError({
        thrownFrom: "PrizeCommand",
        message:
          "No subcommand provided. The prize command requires a subcommand",
        sourceError: new Error(
          "Expected subcommand, but option was not of type subcommand",
        ),
      });
    }

    const name = subCommand.name.toLowerCase();
    if (isAdminGroup && (name === "add" || name === "edit")) {
      return this.moved(chat);
    }
    if (!isAdminGroup && name === "list") {
      return this.list(chat);
    }
    throw new HalloweenDiscordError({
      thrownFrom: "PrizeCommand",
      message: "Unknown prize sub command",
      sourceError: new Error(`No handler found for prize subcommand ${name}`),
    });
  }

  private async moved(
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    return {
      reply: movedToChardb(
        "Prize management has",
        await this.links.halloweenPage(interaction.guild_id),
      ),
    };
  }

  private async list(
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    const allPrizes = await this.prizes.inStock(interaction.guild_id);
    const prizes = this.random.shuffle(allPrizes).slice(0, LIST_SAMPLE_SIZE);
    if (!prizes.length) {
      throw new OutOfPrizesError({
        thrownFrom: "PrizeCommand.list",
        guildId: interaction.guild_id,
      });
    }

    const baseEmbed = {
      author: this.ui.author(),
      color: Color.Primary,
      title: `${EVENT_NAME} - Prize List`,
      timestamp: this.ui.timestamp(),
    };
    const embeds: APIEmbed[] = [
      {
        ...baseEmbed,
        description:
          allPrizes.length > LIST_SAMPLE_SIZE
            ? `Here are ${LIST_SAMPLE_SIZE} random prizes from ${allPrizes.length} total remaining prizes!`
            : "These are the remaining prizes still to go for the event!",
        fields: [],
      },
    ];

    const [prizeImages, chardbLink] = await Promise.all([
      this.prizeImages.imagesFor(prizes),
      this.links.chardbLinks(interaction.guild_id),
    ]);

    // An embed holds 25 fields. With at most 20 prizes this never splits, but
    // the bot's chunking is kept for when the sample size changes.
    let images: string[] = [];
    prizes.forEach((prize, index) => {
      const embed = embeds[embeds.length - 1];
      const link = chardbLink(prize);
      const stockInfo = `${capitalizeFirstLetter(
        this.random.vagueNumberName(prize.currentStock),
      )} ${this.random.element(REMAINING_SYNONYMS)} ||stock${prize.currentStock}|wg: ${prize.weight}||`;
      embed.fields?.push({
        name: prize.name,
        value: link ? `${stockInfo} | ${link}` : stockInfo,
      });
      const image = prizeImages.get(prize);
      if (prize.initialStock > 1 && image) {
        images.push(image);
      }
      const isLast = index === prizes.length - 1;
      if ((index && index % 24 === 0) || isLast) {
        if (images.length) {
          embed.image = { url: this.random.element(images) };
        }
        if (!isLast) {
          embeds.push({ ...baseEmbed, fields: [] });
          images = [];
        }
      }
    });

    return { reply: { embeds } };
  }
}
