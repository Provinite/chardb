import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { GqlContextType } from "@nestjs/graphql";
import { Request, Response } from "express";

/**
 * The http-errors shape body-parser and raw-body throw for a body the client
 * got wrong: aborted mid-upload, too large, malformed JSON. Each carries a
 * 4xx status and a `type` such as "request.aborted".
 */
interface BodyParserClientError extends Error {
  status: number;
  type: string;
}

const isBodyParserClientError = (
  exception: unknown,
): exception is BodyParserClientError => {
  if (!(exception instanceof Error)) return false;
  const { status, type } = exception as Partial<BodyParserClientError>;
  return (
    typeof type === "string" &&
    typeof status === "number" &&
    status >= 400 &&
    status < 500
  );
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("GlobalException");

  catch(exception: unknown, host: ArgumentsHost): void {
    // Check if we're in a GraphQL context
    if (host.getType<GqlContextType>() === "graphql") {
      // GraphQL context - just log and rethrow
      this.logError(exception, null, HttpStatus.INTERNAL_SERVER_ERROR);
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // body-parser rejects a bad request body before any route runs, so its
    // errors reach here as plain Errors rather than HttpExceptions.
    if (isBodyParserClientError(exception)) {
      this.logger.warn({
        message: "Request body rejected",
        method: request.method,
        url: request.originalUrl,
        statusCode: exception.status,
        type: exception.type,
      });
      response
        .status(exception.status)
        .json({ message: exception.message, statusCode: exception.status });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    // Log detailed error information
    this.logError(exception, request, status);

    response
      .status(status)
      .json(
        typeof message === "string" ? { message, statusCode: status } : message,
      );
  }

  private logError(
    exception: unknown,
    request: Request | null,
    status: number,
  ): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      method: request?.method || "unknown",
      url: request?.url || "unknown",
      statusCode: status,
      userAgent: request?.get?.("user-agent") || "",
      ip: request?.ip || "unknown",
      fileInfo: {
        originalname: "",
        mimetype: "",
        size: 0,
      },
    };

    // Add file upload info if it's a multipart request
    if (request?.is?.("multipart/form-data")) {
      const file = request.file;
      if (file) {
        errorInfo["fileInfo"] = {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };
      }
    }

    if (exception instanceof HttpException) {
      this.logger.error(
        `HTTP Exception: ${exception.message}`,
        JSON.stringify(errorInfo, null, 2),
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
        JSON.stringify(errorInfo, null, 2),
      );
    } else {
      this.logger.error(
        `Unknown Exception: ${String(exception)}`,
        JSON.stringify(errorInfo, null, 2),
      );
    }
  }
}
