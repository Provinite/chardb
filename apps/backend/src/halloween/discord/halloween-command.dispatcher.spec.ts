import { HalloweenCommandDispatcher } from "./halloween-command.dispatcher";
import type { HalloweenCommandHandler } from "./halloween-command";
import { HalloweenUi } from "./ui";
import { HalloweenDiscordError, OutOfPrizesError } from "../errors";
import { GUILD_ID, USER_ID, buildInteraction } from "../testing/fixtures";
import { HalloweenLogEvent } from "../logging";
import { Logger } from "@nestjs/common";
import { trace } from "@opentelemetry/api";

describe("HalloweenCommandDispatcher", () => {
  const ui = {
    author: () => ({ name: "Daphne" }),
    timestamp: () => "2025-10-17T15:30:00.000Z",
    now: () => new Date("2025-10-17T15:30:00.000Z"),
    errorFooter: (i: { id: string }) => ({ text: `Reference ID: ${i.id}` }),
  } as unknown as HalloweenUi;

  const answer = { content: "Knock knock" };
  let knock: HalloweenCommandHandler & { handle: jest.Mock };
  let dispatcher: HalloweenCommandDispatcher;

  beforeEach(() => {
    knock = {
      name: "knock",
      handle: jest.fn().mockResolvedValue({ reply: answer }),
    };
    dispatcher = new HalloweenCommandDispatcher([knock], ui);
  });

  describe("logging", () => {
    let log: jest.SpyInstance;
    let warn: jest.SpyInstance;
    let error: jest.SpyInstance;

    beforeEach(() => {
      log = jest.spyOn(Logger.prototype, "log").mockImplementation();
      warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
      error = jest.spyOn(Logger.prototype, "error").mockImplementation();
    });

    afterEach(() => jest.restoreAllMocks());

    const completed = (outcome: string) =>
      expect.objectContaining({
        event: HalloweenLogEvent.CommandCompleted,
        interactionId: "ref-1",
        command: "knock",
        guildId: GUILD_ID,
        userId: USER_ID,
        outcome,
        durationMs: expect.any(Number),
      });

    it("logs a command that succeeded", async () => {
      await dispatcher.dispatch(buildInteraction({ id: "ref-1" }));
      expect(log).toHaveBeenCalledWith(completed("ok"));
    });

    it("warns about a command the player was refused", async () => {
      knock.handle.mockRejectedValue(
        new OutOfPrizesError({ thrownFrom: "KnockCommand", guildId: "1" }),
      );
      await dispatcher.dispatch(buildInteraction({ id: "ref-1" }));
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.CommandCompleted,
          interactionId: "ref-1",
          outcome: "refused",
          error: "OutOfPrizesError",
          thrownFrom: "KnockCommand",
        }),
      );
    });

    it("logs a failed command as an error, with its cause", async () => {
      knock.handle.mockRejectedValue(new Error("database on fire"));
      await dispatcher.dispatch(buildInteraction({ id: "ref-1" }));
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.CommandCompleted,
          interactionId: "ref-1",
          outcome: "failed",
          cause: "database on fire",
        }),
        expect.stringContaining("database on fire"),
      );
    });

    it("logs work after the reply that failed, without rejecting", async () => {
      knock.handle.mockResolvedValue({
        reply: answer,
        afterReply: () => Promise.reject(new Error("late failure")),
      });
      const { afterReply } = await dispatcher.dispatch(
        buildInteraction({ id: "ref-1" }),
      );
      await expect(afterReply()).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: HalloweenLogEvent.AfterReplyFailed,
          interactionId: "ref-1",
          command: "knock",
          cause: "late failure",
        }),
        expect.stringContaining("late failure"),
      );
    });

    it("tags the command's trace span", async () => {
      const span = {
        setAttributes: jest.fn(),
        setStatus: jest.fn(),
        recordException: jest.fn(),
        end: jest.fn(),
      };
      const tracer = {
        startActiveSpan: jest.fn(
          (_name: string, _options: unknown, fn: (s: typeof span) => unknown) =>
            fn(span),
        ),
      };
      jest
        .spyOn(trace, "getTracer")
        .mockReturnValue(
          tracer as unknown as ReturnType<typeof trace.getTracer>,
        );
      dispatcher = new HalloweenCommandDispatcher([knock], ui);
      await dispatcher.dispatch(buildInteraction({ id: "ref-1" }));
      expect(tracer.startActiveSpan).toHaveBeenCalledWith(
        "halloween.command knock",
        expect.objectContaining({
          attributes: expect.objectContaining({
            "halloween.interaction_id": "ref-1",
            "halloween.command": "knock",
            "halloween.guild_id": GUILD_ID,
            "halloween.user_id": USER_ID,
          }),
        }),
        expect.any(Function),
      );
      expect(span.setAttributes).toHaveBeenCalledWith({
        "halloween.outcome": "ok",
      });
      expect(span.end).toHaveBeenCalled();
    });
  });

  it("runs the command named by the interaction, and answers with its reply", async () => {
    const interaction = buildInteraction({ name: "knock" });
    const { reply, outcome } = await dispatcher.dispatch(interaction);
    expect(knock.handle).toHaveBeenCalledWith(interaction);
    expect(reply).toBe(answer);
    expect(outcome).toBe("ok");
  });

  it("matches command names case-insensitively", async () => {
    await dispatcher.dispatch(buildInteraction({ name: "KNOCK" }));
    expect(knock.handle).toHaveBeenCalled();
  });

  it("leaves the command's later work for after the reply", async () => {
    const later = jest.fn().mockResolvedValue(undefined);
    knock.handle.mockResolvedValue({ reply: answer, afterReply: later });
    const { afterReply } = await dispatcher.dispatch(buildInteraction());
    expect(later).not.toHaveBeenCalled();
    await afterReply();
    expect(later).toHaveBeenCalled();
  });

  it("has nothing to do after the reply when the command left nothing", async () => {
    const { afterReply } = await dispatcher.dispatch(buildInteraction());
    await expect(afterReply()).resolves.toBeUndefined();
  });

  it("tells the player about an unknown command", async () => {
    const interaction = buildInteraction({ name: "dance" });
    const { reply, outcome } = await dispatcher.dispatch(interaction);
    expect(reply).toEqual(
      new HalloweenDiscordError({
        thrownFrom: "test",
        message: "Unknown command, use /help for details",
      }).responseBody(interaction, ui),
    );
    expect(outcome).toBe("failed");
  });

  it("shows a reportable error's own response", async () => {
    const interaction = buildInteraction();
    const error = new OutOfPrizesError({ thrownFrom: "test", guildId: "1" });
    knock.handle.mockRejectedValue(error);
    const { reply, outcome } = await dispatcher.dispatch(interaction);
    expect(reply).toEqual(error.responseBody(interaction, ui));
    expect(outcome).toBe("refused");
  });

  it("apologises for anything else, and never rejects", async () => {
    const interaction = buildInteraction({ id: "ref-9" });
    knock.handle.mockRejectedValue(new Error("database on fire"));
    const { reply } = await dispatcher.dispatch(interaction);
    expect(reply).toEqual({
      content:
        "Something went wrong. Also, something went wrong while trying to tell you what went wrong. This is awkward. Reference ID: ref-9",
    });
  });
});
