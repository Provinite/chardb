import type { LoggerService } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/**
 * Logs each request as it arrives and again when its response finishes.
 *
 * Reads req.originalUrl: Express rewrites req.url to the part below a router's
 * mount path, so by the time a GraphQL response finishes req.url is "/".
 */
export const requestLogger =
  (logger: LoggerService) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    logger.log(`${req.method} ${req.originalUrl} - ${req.ip}`);

    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.log(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
      );
    });

    next();
  };
