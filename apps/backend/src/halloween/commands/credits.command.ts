import { Injectable } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import type { HalloweenCommandHandler } from "../discord/halloween-command";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { requireChatInput } from "./command-helpers";

/** Cloverse server roles thanked by mention. */
const SPECIAL_THANKS_ROLES = {
  helpers: "230685975653777409",
  mods: "230670492539813888",
  patreon: "808143046381404191",
  patronSpeedpaint: "277238776781209601",
  patronMerch: "277238728630599681",
  patronEvents: "277238676822556682",
  patronDibs: "277238542638514176",
  patronTips: "277238448698556419",
};

const CREDITS = [
  { credit: "Idea & Planning", names: ["CloverCoin", "Provinite"] },
  { credit: "Software Engineering", names: ["Provinite @ Github"] },
  {
    credit: "Assistant _to the_ Senior Engineer",
    names: ["LarsonDanes @ Github"],
  },
  {
    credit: "Artwork & Organization",
    names: [
      "SpiritBurn",
      "CloverCoin",
      "fishyyllama",
      "MonsterMillie",
      "Neo the Baka",
      "PeaBandJ",
      "PixelRaccoon",
      "Ollie-liversonthemoon",
      "Chocobanyana",
      "CinnriStreusel",
      "OMG Productions",
      "Maze/Woodes",
      "23icefire",
      "EmmyGoatArt",
      "Skippy",
      "Owlcoholik",
      "RedRoadRot",
      "LilMxVooboo",
      "Frymaform",
    ],
  },
  {
    credit: "Special Thanks",
    names: Object.values(SPECIAL_THANKS_ROLES).map((roleId) => `<@&${roleId}>`),
  },
];

/** `/credits` */
@Injectable()
export class CreditsCommand implements HalloweenCommandHandler {
  readonly name = "credits";

  constructor(
    private readonly discord: HalloweenDiscordClient,
    private readonly ui: HalloweenUi,
  ) {}

  async handle(interaction: APIApplicationCommandGuildInteraction): Promise<void> {
    requireChatInput(interaction);
    await this.discord.editOriginalResponse(interaction.token, {
      embeds: [
        {
          author: this.ui.author(),
          color: Color.Primary,
          title: `${EVENT_NAME} - Credits`,
          timestamp: this.ui.timestamp(),
          fields: CREDITS.map(({ credit, names }) => ({
            name: credit,
            value: names.join(", "),
          })),
        },
      ],
    });
  }
}
