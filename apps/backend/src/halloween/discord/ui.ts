import { Injectable } from "@nestjs/common";
import type {
  APIEmbedAuthor,
  APIEmbedFooter,
  APIInteraction,
} from "@discordjs/core";
import { HalloweenConfig } from "../halloween.config";
import { HalloweenRandom } from "../random";
import { HalloweenClock } from "../clock";

/**
 * Prefix of every embed title. The bot's yearly re-arm was a find-and-replace
 * of this year; now it is one constant.
 */
export const EVENT_NAME = "Cloverse Halloween 2026";

export enum Color {
  Primary = 0xeb6123,
  Error = 0xff0000,
  Warning = 0xffff00,
}

/** How many `candy/N.png` images exist in the image bucket. */
const CANDY_IMAGE_COUNT = 130;

/** How many `icon/N.png` author icons exist: 0-5 are Daphne, 6-10 Luther. */
const AUTHOR_ICON_COUNT = 11;

/** The pieces every embed shares. */
@Injectable()
export class HalloweenUi {
  constructor(
    private readonly config: HalloweenConfig,
    private readonly random: HalloweenRandom,
    private readonly clock: HalloweenClock,
  ) {}

  /** One of the two hosts, with a random portrait. */
  author(): APIEmbedAuthor {
    const index = this.random.int(AUTHOR_ICON_COUNT);
    return {
      name: index > 5 ? "Luther" : "Daphne",
      icon_url: `${this.config.imageBaseUrl}icon/${index}.png`,
    };
  }

  timestamp(): string {
    return this.clock.now().toISOString();
  }

  now(): Date {
    return this.clock.now();
  }

  candyImageUrl(): string {
    return `${this.config.imageBaseUrl}candy/${this.random.int(CANDY_IMAGE_COUNT)}.png`;
  }

  errorFooter(interaction: Pick<APIInteraction, "id">): APIEmbedFooter {
    return { text: `Reference ID: ${interaction.id}` };
  }
}
