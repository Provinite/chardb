import { PassThrough } from "node:stream";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import { loggerConfig } from "../logger.config";

/**
 * The app's logger, as `main.ts` builds it, with its transports swapped for
 * one that records: `err` must arrive serialized, through Nest's `Logger`
 * call shape and the config's own formats.
 */
describe("loggerConfig", () => {
  it("serializes `err` on its way to the transports", () => {
    const lines: Record<string, unknown>[] = [];
    const stream = new PassThrough({ objectMode: true });
    stream.on("data", (line: Record<string, unknown>) => lines.push(line));
    const logger = WinstonModule.createLogger({
      ...loggerConfig,
      transports: [new winston.transports.Stream({ stream })],
      exceptionHandlers: [],
    });
    const err = new Error("database down");

    logger.warn(
      { message: "Could not do the thing", userId: "u1", err },
      "Ctx",
    );

    const [line] = lines;
    const fields = (line.metadata ?? line) as Record<string, unknown>;
    expect(fields.err).toEqual({
      name: "Error",
      message: "database down",
      stack: err.stack,
    });
    expect(fields.userId).toBe("u1");
  });
});
