import type { APIInteraction } from "@discordjs/core";
import { Color, EVENT_NAME, HalloweenUi } from "./discord/ui";
import type { HalloweenReply } from "./discord/halloween-command";
import { formatLastReset, formatLegacyLocale, formatResetHour } from "./time";

export type InteractionResponseBody = HalloweenReply;

interface ReportableOptions {
  thrownFrom: string;
  /**
   * Whether this is a fault rather than an expected refusal. The bot rethrew
   * these to fail the Lambda; here they are logged at error level instead of
   * warn.
   */
  logAsError: boolean;
  sourceError?: Error;
  /**
   * What varies between occurrences, logged beside the message as
   * `errorDetails`, so the message itself stays the same every time.
   */
  details?: ErrorDetails;
}

export type ErrorDetails = Record<string, string | number | null>;

/** An error the player is told about: `responseBody` becomes the reply. */
export class DiscordReportableError extends Error {
  readonly thrownFrom: string;
  readonly logAsError: boolean;
  readonly sourceError?: Error;
  readonly details?: ErrorDetails;

  constructor(message: string, options: ReportableOptions) {
    super(message);
    this.name = new.target.name;
    this.thrownFrom = options.thrownFrom;
    this.logAsError = options.logAsError;
    this.sourceError = options.sourceError;
    this.details = options.details;
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    _ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      content:
        "Something went wrong. Also, something went wrong while trying to tell you what went wrong. This is awkward. Reference ID: " +
        interaction.id,
    };
  }
}

/** The general-purpose error: shows `message` to the player. */
export class HalloweenDiscordError extends DiscordReportableError {
  constructor(options: {
    thrownFrom: string;
    message: string;
    sourceError?: Error;
    logAsError?: boolean;
    details?: ErrorDetails;
  }) {
    super(options.message, {
      thrownFrom: options.thrownFrom,
      sourceError: options.sourceError,
      logAsError: options.logAsError ?? true,
      details: options.details,
    });
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      embeds: [
        {
          author: ui.author(),
          timestamp: ui.timestamp(),
          color: Color.Error,
          footer: ui.errorFooter(interaction),
          title: `${EVENT_NAME} - Error`,
          description: "Something went wrong",
          fields: [{ name: "Message", value: this.message }],
        },
      ],
    };
  }
}

interface EventDates {
  thrownFrom: string;
  startDate: Date | null;
  endDate: Date | null;
}

function eventDateFields({ startDate, endDate }: EventDates) {
  return [
    {
      name: "Start date",
      value: startDate ? formatLegacyLocale(startDate) : "N/A",
    },
    {
      name: "End date",
      value: endDate ? formatLegacyLocale(endDate) : "N/A",
    },
  ];
}

export class EventEndedError extends DiscordReportableError {
  constructor(private readonly dates: EventDates) {
    super("Event already ended", {
      thrownFrom: dates.thrownFrom,
      logAsError: false,
    });
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      embeds: [
        {
          title: `${EVENT_NAME} - Event over`,
          description:
            "The event is over. Thanks for participating and we'll be back soon with more fun!",
          color: Color.Error,
          timestamp: ui.timestamp(),
          footer: ui.errorFooter(interaction),
          fields: eventDateFields(this.dates),
        },
      ],
    };
  }
}

export class EventNotStartedError extends DiscordReportableError {
  constructor(private readonly dates: EventDates) {
    super("Event not yet started", {
      thrownFrom: dates.thrownFrom,
      logAsError: false,
    });
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      embeds: [
        {
          title: `${EVENT_NAME} - Event not started`,
          description: "The event hasn't started yet, but check back soon!",
          color: Color.Error,
          timestamp: ui.timestamp(),
          footer: ui.errorFooter(interaction),
          fields: eventDateFields(this.dates),
        },
      ],
    };
  }
}

export class MissingGuildSettingsError extends DiscordReportableError {
  constructor(options: { thrownFrom: string; guildId: string }) {
    super("No guild settings found", {
      thrownFrom: options.thrownFrom,
      // Setting the event up is staff's job, not a fault in the bot.
      logAsError: false,
      details: { guildId: options.guildId },
    });
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      embeds: [
        {
          title: `${EVENT_NAME} - Not Ready Yet`,
          description:
            "The admins haven't set up the app for this server yet. Check back soon!",
          color: Color.Error,
          timestamp: ui.timestamp(),
          footer: ui.errorFooter(interaction),
        },
      ],
    };
  }
}

export class OutOfPrizesError extends DiscordReportableError {
  constructor(options: { thrownFrom: string; guildId: string }) {
    super("Out of prizes", {
      thrownFrom: options.thrownFrom,
      logAsError: false,
    });
  }

  responseBody(
    _interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      embeds: [
        {
          author: ui.author(),
          timestamp: ui.timestamp(),
          color: Color.Primary,
          title: `${EVENT_NAME} - All Out of Prizes`,
          description: "We're all out of prizes this year. Thanks for joining!",
        },
      ],
    };
  }
}

/**
 * A knock or gifty could not get its locks or finish inside its deadline,
 * because many arrived at once. Nothing was saved; trying again works.
 */
export class BusyError extends DiscordReportableError {
  constructor(options: { thrownFrom: string; sourceError?: Error }) {
    super("Too busy to answer in time", {
      thrownFrom: options.thrownFrom,
      logAsError: false,
      sourceError: options.sourceError,
    });
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      embeds: [
        {
          author: ui.author(),
          timestamp: ui.timestamp(),
          color: Color.Warning,
          title: `${EVENT_NAME} - Busy`,
          description: "Lots of knocking right now. Try again in a moment.",
          footer: ui.errorFooter(interaction),
        },
      ],
    };
  }
}

export class TooManyKnocksError extends DiscordReportableError {
  constructor(
    private readonly allowance: {
      thrownFrom: string;
      guildId: string;
      userId: string;
      knocksPerDay: number;
      resetTime: number;
      lastResetTime: Date;
    },
  ) {
    super("Too many knocks", {
      thrownFrom: allowance.thrownFrom,
      logAsError: false,
      details: { guildId: allowance.guildId, userId: allowance.userId },
    });
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      embeds: [
        {
          title: `${EVENT_NAME} - Too Many Knocks`,
          description: `You're out of knocks for now. Come back soon, knocks reset every day.`,
          color: Color.Error,
          timestamp: ui.timestamp(),
          footer: ui.errorFooter(interaction),
          fields: [
            {
              name: "Knocks Per Day",
              value: this.allowance.knocksPerDay.toString(),
            },
            {
              name: "Reset Time",
              value: formatResetHour(this.allowance.resetTime, ui.now()),
            },
            {
              name: "Last Reset Time",
              value: formatLastReset(this.allowance.lastResetTime),
            },
          ],
        },
      ],
    };
  }
}

export interface ValidationFieldError {
  field: string;
  error: string;
}

export class ValidationError extends DiscordReportableError {
  readonly validationErrors: ValidationFieldError[];
  private readonly displayMessage: string;

  constructor(options: {
    thrownFrom: string;
    message: string;
    validationErrors: ValidationFieldError[];
    sourceError?: Error;
    /** False for what a player typed; true (the default) for the bot's faults. */
    logAsError?: boolean;
    details?: ErrorDetails;
  }) {
    super("Validation failed", {
      thrownFrom: options.thrownFrom,
      sourceError: options.sourceError,
      logAsError: options.logAsError ?? true,
      details: options.details,
    });
    this.displayMessage = options.message;
    this.validationErrors = options.validationErrors;
  }

  responseBody(
    interaction: Pick<APIInteraction, "id">,
    ui: HalloweenUi,
  ): InteractionResponseBody {
    return {
      content: this.displayMessage,
      embeds: [
        {
          title: `${EVENT_NAME} - Validation failed`,
          description: this.displayMessage,
          fields: this.validationErrors.map(({ field, error }) => ({
            name: field,
            value: error,
          })),
          color: Color.Error,
          timestamp: ui.timestamp(),
          footer: {
            text: `Need Help? Contact staff with reference id: ${interaction.id}`,
          },
        },
      ],
    };
  }
}

/** The one gifty rule that is about the sender, not the record. */
export function isGiftyRateLimitError(error: ValidationError): boolean {
  return error.validationErrors.some(({ field }) => field === "*");
}
