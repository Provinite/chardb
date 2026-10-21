import { HalloweenUi, Color } from "./discord/ui";
import {
  DiscordReportableError,
  EventEndedError,
  EventNotStartedError,
  HalloweenDiscordError,
  MissingGuildSettingsError,
  OutOfPrizesError,
  TooManyKnocksError,
  ValidationError,
  isGiftyRateLimitError,
} from "./errors";
import { buildInteraction } from "./testing/fixtures";

const author = { name: "Daphne", icon_url: "https://images.test/icon/0.png" };
const ui = {
  author: () => author,
  timestamp: () => "2025-10-17T15:30:00.000Z",
  now: () => new Date("2025-10-17T15:30:00.000Z"),
  errorFooter: (i: { id: string }) => ({ text: `Reference ID: ${i.id}` }),
} as unknown as HalloweenUi;
const interaction = buildInteraction({ id: "ref-1" });

describe("Halloween errors", () => {
  it("falls back to an apology naming the interaction", () => {
    const error = new DiscordReportableError("boom", {
      thrownFrom: "test",
      logAsError: true,
    });
    expect(error.responseBody(interaction, ui)).toEqual({
      content:
        "Something went wrong. Also, something went wrong while trying to tell you what went wrong. This is awkward. Reference ID: ref-1",
    });
  });

  it("reports a HalloweenDiscordError's message in an error embed", () => {
    const error = new HalloweenDiscordError({
      thrownFrom: "test",
      message: "No user specified",
    });
    expect(error.logAsError).toBe(true);
    expect(error.responseBody(interaction, ui)).toEqual({
      embeds: [
        {
          author,
          timestamp: "2025-10-17T15:30:00.000Z",
          color: Color.Error,
          footer: { text: "Reference ID: ref-1" },
          title: "Cloverse Halloween 2026 - Error",
          description: "Something went wrong",
          fields: [{ name: "Message", value: "No user specified" }],
        },
      ],
    });
  });

  it("can mark a HalloweenDiscordError as expected", () => {
    expect(
      new HalloweenDiscordError({
        thrownFrom: "test",
        message: "x",
        logAsError: false,
      }).logAsError,
    ).toBe(false);
  });

  it("says the event is over", () => {
    const error = new EventEndedError({
      thrownFrom: "test",
      startDate: new Date("2025-10-01T05:00:00Z"),
      endDate: new Date("2025-11-01T05:00:00Z"),
    });
    expect(error.logAsError).toBe(false);
    expect(error.responseBody(interaction, ui)).toEqual({
      embeds: [
        {
          title: "Cloverse Halloween 2026 - Event over",
          description:
            "The event is over. Thanks for participating and we'll be back soon with more fun!",
          color: Color.Error,
          timestamp: "2025-10-17T15:30:00.000Z",
          footer: { text: "Reference ID: ref-1" },
          fields: [
            { name: "Start date", value: "10/1/2025, 5:00:00 AM" },
            { name: "End date", value: "11/1/2025, 5:00:00 AM" },
          ],
        },
      ],
    });
  });

  it("says the event has not started", () => {
    const error = new EventNotStartedError({
      thrownFrom: "test",
      startDate: null,
      endDate: null,
    });
    expect(error.logAsError).toBe(false);
    expect(error.responseBody(interaction, ui)).toEqual({
      embeds: [
        {
          title: "Cloverse Halloween 2026 - Event not started",
          description: "The event hasn't started yet, but check back soon!",
          color: Color.Error,
          timestamp: "2025-10-17T15:30:00.000Z",
          footer: { text: "Reference ID: ref-1" },
          fields: [
            { name: "Start date", value: "N/A" },
            { name: "End date", value: "N/A" },
          ],
        },
      ],
    });
  });

  it("says the server is not set up", () => {
    const error = new MissingGuildSettingsError({
      thrownFrom: "test",
      guildId: "1",
    });
    expect(error.logAsError).toBe(false);
    expect(error.message).toBe("No guild settings found");
    expect(error.details).toEqual({ guildId: "1" });
    expect(error.responseBody(interaction, ui)).toEqual({
      embeds: [
        {
          title: "Cloverse Halloween 2026 - Not Ready Yet",
          description:
            "The admins haven't set up the app for this server yet. Check back soon!",
          color: Color.Error,
          timestamp: "2025-10-17T15:30:00.000Z",
          footer: { text: "Reference ID: ref-1" },
        },
      ],
    });
  });

  it("says the prizes are gone", () => {
    const error = new OutOfPrizesError({ thrownFrom: "test", guildId: "1" });
    expect(error.logAsError).toBe(false);
    expect(error.responseBody(interaction, ui)).toEqual({
      embeds: [
        {
          author,
          timestamp: "2025-10-17T15:30:00.000Z",
          color: Color.Primary,
          title: "Cloverse Halloween 2026 - All Out of Prizes",
          description: "We're all out of prizes this year. Thanks for joining!",
        },
      ],
    });
  });

  it("says the knocks are used up", () => {
    const error = new TooManyKnocksError({
      thrownFrom: "test",
      guildId: "1",
      userId: "2",
      knocksPerDay: 3,
      resetTime: 6,
      lastResetTime: new Date("2025-10-17T11:00:00Z"),
    });
    expect(error.logAsError).toBe(false);
    expect(error.responseBody(interaction, ui)).toEqual({
      embeds: [
        {
          title: "Cloverse Halloween 2026 - Too Many Knocks",
          description:
            "You're out of knocks for now. Come back soon, knocks reset every day.",
          color: Color.Error,
          timestamp: "2025-10-17T15:30:00.000Z",
          footer: { text: "Reference ID: ref-1" },
          fields: [
            { name: "Knocks Per Day", value: "3" },
            { name: "Reset Time", value: "6 AM US Central Time" },
            { name: "Last Reset Time", value: "2025-10-17 6:00:00 AM" },
          ],
        },
      ],
    });
  });

  it("lists each failed field of a validation error", () => {
    const error = new ValidationError({
      thrownFrom: "test",
      message: "Gifty validation failed",
      validationErrors: [
        { field: "toUserId", error: "to user id must be a numeric string" },
      ],
    });
    expect(error.logAsError).toBe(true);
    expect(error.responseBody(interaction, ui)).toEqual({
      content: "Gifty validation failed",
      embeds: [
        {
          title: "Cloverse Halloween 2026 - Validation failed",
          description: "Gifty validation failed",
          fields: [
            { name: "toUserId", value: "to user id must be a numeric string" },
          ],
          color: Color.Error,
          timestamp: "2025-10-17T15:30:00.000Z",
          footer: {
            text: "Need Help? Contact staff with reference id: ref-1",
          },
        },
      ],
    });
  });

  it("recognises the gifty rate limit by its whole-record field", () => {
    const limited = new ValidationError({
      thrownFrom: "test",
      message: "x",
      validationErrors: [
        { field: "*", error: "Each user may only send one gifty per reset" },
      ],
    });
    const other = new ValidationError({
      thrownFrom: "test",
      message: "x",
      validationErrors: [{ field: "toUserId", error: "bad" }],
    });
    expect(isGiftyRateLimitError(limited)).toBe(true);
    expect(isGiftyRateLimitError(other)).toBe(false);
  });
});
