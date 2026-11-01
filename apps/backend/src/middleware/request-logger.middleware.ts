import type { LoggerService } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { isUntracedRequest } from "../tracing-requests";

/**
 * Logs each request as it arrives and again when its response closes, or
 * "aborted" when the client went away before the response finished.
 *
 * Reads req.originalUrl: Express rewrites req.url to the part below a router's
 * mount path, so by the time a GraphQL response finishes req.url is "/".
 */
export const requestLogger =
  (logger: LoggerService) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (isUntracedRequest(req)) {
      next();
      return;
    }

    const start = Date.now();

    logger.log(`${req.method} ${req.originalUrl} - ${req.ip}`);

    res.on("close", () => {
      const duration = Date.now() - start;
      const outcome = res.writableFinished ? res.statusCode : "aborted";
      logger.log(
        `${req.method} ${req.originalUrl} - ${outcome} - ${duration}ms`,
      );
    });

    next();
  };
