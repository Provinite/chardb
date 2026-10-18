import { Injectable, Logger } from "@nestjs/common";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandGuildInteraction,
  type APIApplicationCommandInteractionDataSubcommandOption,
  type APIChatInputApplicationCommandGuildInteraction,
  type APIEmbed,
} from "@discordjs/core";
import type { HalloweenPrize } from "@chardb/database";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { HalloweenRandom } from "../random";
import { PrizeService, type PrizeInput } from "../services/prize.service";
import { PrizeImageService } from "../services/prize-image.service";
import {
  DiscordReportableError,
  HalloweenDiscordError,
  OutOfPrizesError,
} from "../errors";
import { formatChardbLink } from "../chardb-link";
import { requireAdministrator, requireChatInput } from "./command-helpers";

const REMAINING_SYNONYMS = [
  "remaining",
  "left",
  "to go",
  "left to treat",
  "still to be won",
];

/** How many prizes `/prize list` shows at most. */
const LIST_SAMPLE_SIZE = 20;

/** Every `/prize admin add` option: how to check it, and where it goes. */
type AddOption = {
  [K in keyof PrizeInput]-?: {
    field: K;
    validate: (s: string) => boolean;
    transform: (s: string) => PrizeInput[K];
  };
}[keyof PrizeInput];

const asIs = (s: string) => s;
const asInt = (s: string) => Number.parseInt(s, 10);

const ADD_OPTIONS: Record<string, AddOption> = {
  id: {
    field: "id",
    validate: (s) => /^[a-z][a-z-]{2,25}$/.test(s),
    transform: asIs,
  },
  name: { field: "name", validate: () => true, transform: asIs },
  stock: {
    field: "initialStock",
    validate: (s) => /^[0-9]+$/.test(s),
    transform: asInt,
  },
  image: { field: "image", validate: () => true, transform: asIs },
  weight: {
    field: "weight",
    validate: (s) => /^[0-9]+$/.test(s),
    transform: asInt,
  },
  "item-type-id": {
    field: "itemTypeId",
    validate: (s) => s.length > 0,
    transform: asIs,
  },
  "character-id": {
    field: "characterId",
    validate: (s) => s.length > 0,
    transform: asIs,
  },
};

const capitalizeFirstLetter = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1);

/** `/prize list` for everyone; `/prize admin add` for administrators. */
@Injectable()
export class PrizeCommand implements HalloweenCommandHandler {
  readonly name = "prize";
  private readonly logger = new Logger(PrizeCommand.name);

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly ui: HalloweenUi,
    private readonly prizes: PrizeService,
    private readonly prizeImages: PrizeImageService,
    private readonly random: HalloweenRandom,
  ) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<void> {
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

    // `admin edit` is registered with Discord but was never implemented.
    const name = subCommand.name.toLowerCase();
    if (isAdminGroup && name === "add") {
      return this.add(chat, subCommand);
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

  private async list(
    interaction: APIChatInputApplicationCommandGuildInteraction,
  ): Promise<void> {
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

    const prizeImages = await this.prizeImages.imagesFor(prizes);

    // An embed holds 25 fields. With at most 20 prizes this never splits, but
    // the bot's chunking is kept for when the sample size changes.
    let images: string[] = [];
    prizes.forEach((prize, index) => {
      const embed = embeds[embeds.length - 1];
      const chardbLink = formatChardbLink(prize);
      const stockInfo = `${capitalizeFirstLetter(
        this.random.vagueNumberName(prize.currentStock),
      )} ${this.random.element(REMAINING_SYNONYMS)} ||stock${prize.currentStock}|wg: ${prize.weight}||`;
      embed.fields?.push({
        name: prize.name,
        value: chardbLink ? `${stockInfo} | ${chardbLink}` : stockInfo,
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

    await this.discord.editOriginalResponse(interaction.token, { embeds });
  }

  private async add(
    interaction: APIChatInputApplicationCommandGuildInteraction,
    subCommand: APIApplicationCommandInteractionDataSubcommandOption,
  ): Promise<void> {
    requireAdministrator(interaction, "PrizeCommand.add");

    const prize: Partial<PrizeInput> = { guildId: interaction.guild_id };
    for (const option of subCommand.options ?? []) {
      const handler = Object.prototype.hasOwnProperty.call(
        ADD_OPTIONS,
        option.name,
      )
        ? ADD_OPTIONS[option.name]
        : undefined;
      if (!handler) {
        throw new HalloweenDiscordError({
          thrownFrom: "PrizeCommand.add",
          message: `Unexpected option, ${option.name}. Valid options are `,
          sourceError: new Error(
            `Unexpected option ${option.name}. Expected one of: ${Object.values(
              ADD_OPTIONS,
            )
              .map((o) => o.field)
              .join(", ")}`,
          ),
        });
      }
      const value = String(option.value);
      if (!handler.validate(value)) {
        throw new HalloweenDiscordError({
          thrownFrom: "PrizeCommand.add",
          message: `Couldn't process value for field ${option.name}`,
          sourceError: new Error(
            `Typecasting safety validation failed while adding prize. Field: ${option.name}`,
          ),
        });
      }
      Object.assign(prize, { [handler.field]: handler.transform(value) });
    }
    if (!prize.weight) {
      prize.weight = 10;
    }
    prize.currentStock = prize.initialStock;

    let saved: HalloweenPrize;
    try {
      // Missing required fields are caught by the service's validation.
      saved = await this.prizes.save(prize as PrizeInput);
    } catch (error) {
      if (error instanceof DiscordReportableError) {
        throw error;
      }
      throw new HalloweenDiscordError({
        thrownFrom: "PrizeCommand.add",
        message: `Couldn't save prize`,
        sourceError:
          error instanceof Error ? error : new Error(JSON.stringify(error)),
      });
    }

    await this.discord.editOriginalResponse(interaction.token, {
      content: `Added ${saved.initialStock} units of ${saved.name} as ${saved.id} with weight ${saved.weight}`,
    });
    this.logger.log({
      event: HalloweenLogEvent.PrizeAdded,
      message: `Added prize ${saved.id} to guild ${interaction.guild_id}`,
      interactionId: interaction.id,
      guildId: interaction.guild_id,
      adminUserId: interaction.member.user.id,
      prizeId: saved.id,
      name: saved.name,
      initialStock: saved.initialStock,
      weight: saved.weight,
      image: saved.image,
      itemTypeId: saved.itemTypeId ?? null,
      characterId: saved.characterId ?? null,
    } satisfies HalloweenLogLine);
  }
}
