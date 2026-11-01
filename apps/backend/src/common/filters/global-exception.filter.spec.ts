import {
  ArgumentsHost,
  Body,
  Controller,
  INestApplication,
  Logger,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { GlobalExceptionFilter } from "./global-exception.filter";

/** The error raw-body raises when the client disconnects mid-body. */
const abortedBody = () =>
  Object.assign(new Error("request aborted"), {
    status: 400,
    statusCode: 400,
    expose: true,
    code: "ECONNABORTED",
    type: "request.aborted",
  });

const httpHost = () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  // Express has stripped the /graphql mount path from url by now.
  const req = {
    method: "POST",
    url: "/",
    originalUrl: "/graphql",
    ip: "127.0.0.1",
    get: () => "",
    is: () => false,
  };
  const host = {
    getType: () => "http",
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
};

describe("GlobalExceptionFilter", () => {
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    error = jest.spyOn(Logger.prototype, "error").mockImplementation();
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * A client that stops sending its body is not a server fault. Reporting it
   * as a 500 put it on the error dashboards and in error-level logs.
   */
  it("answers a client abort with the parser's 400 and logs a warning", () => {
    const { host, response } = httpHost();

    new GlobalExceptionFilter().catch(abortedBody(), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("keeps the status of other exposed body-parser errors", () => {
    const { host, response } = httpHost();
    const tooLarge = Object.assign(new Error("request entity too large"), {
      status: 413,
      statusCode: 413,
      expose: true,
      type: "entity.too.large",
    });

    new GlobalExceptionFilter().catch(tooLarge, host);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  /** Throttling, missing routes and validation are the client's doing. */
  it("logs an HttpException below 500 as a warning", () => {
    const { host, response } = httpHost();

    new GlobalExceptionFilter().catch(new NotFoundException(), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  /**
   * http-errors marks only client errors as safe to show. Anything else that
   * merely carries a status could hold internal detail in its message.
   */
  it("treats an unexposed error with a status as a hidden 500", () => {
    const { host, response } = httpHost();
    const internal = Object.assign(new Error("relation users does not exist"), {
      status: 404,
      type: "lookup",
    });

    new GlobalExceptionFilter().catch(internal, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Internal server error",
      statusCode: 500,
    });
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("still reports an unknown error as a 500 with the error attached", () => {
    const { host, response } = httpHost();
    const boom = new Error("boom");

    new GlobalExceptionFilter().catch(boom, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toMatchObject({ err: boom });
  });

  it("logs the full request path, not the part below the mount", () => {
    const { host } = httpHost();

    new GlobalExceptionFilter().catch(new Error("boom"), host);
    new GlobalExceptionFilter().catch(abortedBody(), host);

    expect(error.mock.calls[0][0]).toMatchObject({ url: "/graphql" });
    expect(warn.mock.calls[0][0]).toMatchObject({ url: "/graphql" });
  });

  /**
   * Nest's own Express error handler turns body-parser's SyntaxError into a
   * BadRequestException before any filter sees it. Only a running app shows
   * which shape actually arrives.
   */
  describe("in a running app", () => {
    @Controller("echo")
    class EchoController {
      @Post()
      echo(@Body() body: unknown) {
        return body;
      }
    }

    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [EchoController],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      app.useGlobalFilters(new GlobalExceptionFilter());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it("answers malformed JSON with a 400 and logs a warning", async () => {
      await request(app.getHttpServer())
        .post("/echo")
        .set("Content-Type", "application/json")
        .send("{not json")
        .expect(400);

      expect(error).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});
