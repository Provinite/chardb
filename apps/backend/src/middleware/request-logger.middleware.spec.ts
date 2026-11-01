import * as express from "express";
import * as request from "supertest";
import type { LoggerService } from "@nestjs/common";
import { requestLogger } from "./request-logger.middleware";

describe("requestLogger", () => {
  /**
   * Express strips a router's mount path from req.url while that router
   * handles the request, and GraphQL answers from inside its mount. Reading
   * req.url when the response finished logged every GraphQL request as
   * "POST /".
   */
  it("logs the full path of a request answered under a mount path", async () => {
    const log = jest.fn();
    const logger = { log } as unknown as LoggerService;
    const app = express();
    app.use(requestLogger(logger));
    const router = express.Router();
    router.post("/", (_req, res) => {
      res.status(200).end();
    });
    app.use("/graphql", router);

    await request(app).post("/graphql").expect(200);

    const lines = log.mock.calls.map(([line]: [string]) => line);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^POST \/graphql - /);
    expect(lines[1]).toMatch(/^POST \/graphql - 200 - \d+ms$/);
  });
});
