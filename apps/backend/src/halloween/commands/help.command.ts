import { Injectable } from "@nestjs/common";
import type { APIApplicationCommandGuildInteraction } from "@discordjs/core";
import type {
  HalloweenCommandHandler,
  HalloweenCommandResult,
} from "../discord/halloween-command";
import { Color, EVENT_NAME, HalloweenUi } from "../discord/ui";
import { requireChatInput } from "./command-helpers";

/** `/help` */
@Injectable()
export class HelpCommand implements HalloweenCommandHandler {
  readonly name = "help";

  constructor(private readonly ui: HalloweenUi) {}

  async handle(
    interaction: APIApplicationCommandGuildInteraction,
  ): Promise<HalloweenCommandResult> {
    requireChatInput(interaction);
    return {
      reply: {
        embeds: [
          {
            // Not ui.author(): /help has always been signed by Luther with the
            // application's own icon.
            author: {
              name: "Luther",
              icon_url:
                "https://cdn.discordapp.com/app-icons/896600597053202462/14e838bbe4426c28377e05558c72ebd8.png?size=512",
            },
            color: Color.Primary,
            title: `${EVENT_NAME} - How to Participate`,
            timestamp: this.ui.timestamp(),
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
      },
    };
  }
}
