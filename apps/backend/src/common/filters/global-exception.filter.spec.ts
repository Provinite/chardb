import { ArgumentsHost, Logger } from "@nestjs/common";
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
  const req = {
    method: "POST",
    url: "/graphql",
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

  it("keeps the status of other body-parser client errors", () => {
    const { host, response } = httpHost();
    const tooLarge = Object.assign(new Error("request entity too large"), {
      status: 413,
      statusCode: 413,
      expose: true,
      type: "entity.too.large",
    });

    new GlobalExceptionFilter().catch(tooLarge, host);

    expect(response.status).toHaveBeenCalledWith(413);
  });

  it("still reports an unknown error as a 500", () => {
    const { host, response } = httpHost();

    new GlobalExceptionFilter().catch(new Error("boom"), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
