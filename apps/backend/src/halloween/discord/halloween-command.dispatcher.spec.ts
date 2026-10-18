import { HalloweenCommandDispatcher } from "./halloween-command.dispatcher";
import type { HalloweenCommandHandler } from "./halloween-command";
import { HalloweenDiscordClient } from "./halloween-discord.client";
import { HalloweenUi } from "./ui";
import {
  DiscordWebhookMessageUnavailableError,
  HalloweenDiscordError,
  OutOfPrizesError,
} from "../errors";
import { buildInteraction } from "../testing/fixtures";

describe("HalloweenCommandDispatcher", () => {
  const ui = {
    author: () => ({ name: "Daphne" }),
    timestamp: () => "2025-10-17T15:30:00.000Z",
    now: () => new Date("2025-10-17T15:30:00.000Z"),
    errorFooter: (i: { id: string }) => ({ text: `Reference ID: ${i.id}` }),
  } as unknown as HalloweenUi;

  let discord: {
    getOriginalResponse: jest.Mock;
    editOriginalResponse: jest.Mock;
  };
  let knock: HalloweenCommandHandler & { handle: jest.Mock };
  let dispatcher: HalloweenCommandDispatcher;

  beforeEach(() => {
    discord = {
      getOriginalResponse: jest.fn().mockResolvedValue({ id: "m" }),
      editOriginalResponse: jest.fn().mockResolvedValue({ id: "m" }),
    };
    knock = { name: "knock", handle: jest.fn().mockResolvedValue(undefined) };
    dispatcher = new HalloweenCommandDispatcher(
      [knock],
      discord as unknown as HalloweenDiscordClient,
      ui,
    );
    dispatcher.originalResponseRetryDelaysMs = [0, 0];
  });

  it("runs the command named by the interaction", async () => {
    const interaction = buildInteraction({ name: "knock" });
    await dispatcher.dispatch(interaction);
    expect(knock.handle).toHaveBeenCalledWith(interaction);
  });

  it("matches command names case-insensitively", async () => {
    await dispatcher.dispatch(buildInteraction({ name: "KNOCK" }));
    expect(knock.handle).toHaveBeenCalled();
  });

  it("waits until Discord has registered the deferred reply", async () => {
    const interaction = buildInteraction();
    await dispatcher.dispatch(interaction);
    expect(discord.getOriginalResponse).toHaveBeenCalledWith(
      interaction.token,
    );
    expect(discord.getOriginalResponse.mock.invocationCallOrder[0]).toBeLessThan(
      knock.handle.mock.invocationCallOrder[0],
    );
  });

  it("retries finding the deferred reply", async () => {
    discord.getOriginalResponse
      .mockRejectedValueOnce(new DiscordWebhookMessageUnavailableError("t"))
      .mockResolvedValueOnce({ id: "m" });
    await dispatcher.dispatch(buildInteraction());
    expect(discord.getOriginalResponse).toHaveBeenCalledTimes(2);
    expect(knock.handle).toHaveBeenCalled();
  });

  it("gives up quietly when the deferred reply never appears", async () => {
    discord.getOriginalResponse.mockRejectedValue(
      new DiscordWebhookMessageUnavailableError("t"),
    );
    await expect(dispatcher.dispatch(buildInteraction())).resolves.toBe(
      undefined,
    );
    expect(discord.getOriginalResponse).toHaveBeenCalledTimes(3);
    expect(knock.handle).not.toHaveBeenCalled();
    expect(discord.editOriginalResponse).not.toHaveBeenCalled();
  });

  it("tells the player about an unknown command", async () => {
    const interaction = buildInteraction({ name: "dance" });
    await dispatcher.dispatch(interaction);
    expect(discord.editOriginalResponse).toHaveBeenCalledWith(
      interaction.token,
      new HalloweenDiscordError({
        thrownFrom: "test",
        message: "Unknown command, use /help for details",
      }).responseBody(interaction, ui),
    );
  });

  it("shows a reportable error's own response", async () => {
    const interaction = buildInteraction();
    const error = new OutOfPrizesError({ thrownFrom: "test", guildId: "1" });
    knock.handle.mockRejectedValue(error);
    await dispatcher.dispatch(interaction);
    expect(discord.editOriginalResponse).toHaveBeenCalledWith(
      interaction.token,
      error.responseBody(interaction, ui),
    );
  });

  it("apologises for anything else", async () => {
    const interaction = buildInteraction({ id: "ref-9" });
    knock.handle.mockRejectedValue(new Error("database on fire"));
    await dispatcher.dispatch(interaction);
    expect(discord.editOriginalResponse).toHaveBeenCalledWith(
      interaction.token,
      {
        content:
          "Something went wrong. Also, something went wrong while trying to tell you what went wrong. This is awkward. Reference ID: ref-9",
      },
    );
  });

  it("never rejects, even when reporting the error fails", async () => {
    knock.handle.mockRejectedValue(new Error("first"));
    discord.editOriginalResponse.mockRejectedValue(new Error("second"));
    await expect(dispatcher.dispatch(buildInteraction())).resolves.toBe(
      undefined,
    );
  });
});
