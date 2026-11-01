import { EventEmitter } from "events";
import * as express from "express";
import * as request from "supertest";
import type { LoggerService } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { requestLogger } from "./request-logger.middleware";

const capture = () => {
  const log = jest.fn();
  const logger = { log } as unknown as LoggerService;
  const lines = () => log.mock.calls.map(([line]: [string]) => line);
  return { logger, lines };
};

describe("requestLogger", () => {
  /**
   * Express strips a router's mount path from req.url while that router
   * handles the request, and GraphQL answers from inside its mount. Reading
   * req.url when the response finished logged every GraphQL request as
   * "POST /".
   */
  it("logs the full path of a request answered under a mount path", async () => {
    const { logger, lines } = capture();
    const app = express();
    app.use(requestLogger(logger));
    const router = express.Router();
    router.post("/", (_req, res) => {
      res.status(200).end();
    });
    app.use("/graphql", router);

    await request(app).post("/graphql").expect(200);

    expect(lines()).toHaveLength(2);
    expect(lines()[0]).toMatch(/^POST \/graphql - /);
    expect(lines()[1]).toMatch(/^POST \/graphql - 200 - \d+ms$/);
  });

  /** Probes arrive every few seconds per task and are exported as logs. */
  it("skips health checks", async () => {
    const { logger, lines } = capture();
    const app = express();
    app.use(requestLogger(logger));
    app.get("/health", (_req, res) => {
      res.status(200).end();
    });

    await request(app).get("/health").expect(200);

    expect(lines()).toHaveLength(0);
  });

  /**
   * "finish" never fires when the client goes away first, which left an
   * aborted upload with an arrival line and nothing after it.
   */
  it("logs a request the client abandoned before the response", () => {
    const { logger, lines } = capture();
    const req = {
      method: "POST",
      url: "/graphql",
      originalUrl: "/graphql",
      ip: "127.0.0.1",
    } as Request;
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      writableFinished: false,
    });
    const next: NextFunction = jest.fn();

    requestLogger(logger)(req, res as unknown as Response, next);
    res.emit("close");

    expect(lines()).toHaveLength(2);
    expect(lines()[1]).toMatch(/^POST \/graphql - aborted - \d+ms$/);
  });
});
