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
 * got wrong, such as an aborted upload or one over the size limit. http-errors
 * sets `expose` only on client errors, which marks the message safe to show.
 * (Malformed JSON arrives as a BadRequestException instead: Nest's own Express
 * error handler converts body-parser's SyntaxError first.)
 */
interface ExposedHttpError extends Error {
  status: number;
  expose: true;
  type?: string;
}

const isExposedHttpError = (
  exception: unknown,
): exception is ExposedHttpError => {
  if (!(exception instanceof Error)) return false;
  const { status, expose } = exception as Partial<ExposedHttpError>;
  return (
    expose === true &&
    typeof status === "number" &&
    status >= 400 &&
    status < 500
  );
};

interface Outcome {
  status: number;
  body: string | object;
}

const outcomeOf = (exception: unknown): Outcome => {
  if (exception instanceof HttpException) {
    return { status: exception.getStatus(), body: exception.getResponse() };
  }
  if (isExposedHttpError(exception)) {
    return { status: exception.status, body: exception.message };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: "Internal server error",
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("GlobalException");

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType<GqlContextType>() === "graphql") {
      this.logger.error({ message: "GraphQL request failed", err: exception });
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, body } = outcomeOf(exception);

    this.logOutcome(exception, request, status);

    response
      .status(status)
      .json(
        typeof body === "string" ? { message: body, statusCode: status } : body,
      );
  }

  /** A status below 500 is the client's doing, so it is only a warning. */
  private logOutcome(exception: unknown, request: Request, status: number) {
    const attributes = {
      method: request.method,
      url: request.originalUrl,
      statusCode: status,
      userAgent: request.get?.("user-agent") ?? "",
      ip: request.ip,
      file: request.file && {
        originalname: request.file.originalname,
        mimetype: request.file.mimetype,
        size: request.file.size,
      },
    };

    if (status < 500) {
      this.logger.warn({
        message: "Request rejected",
        ...attributes,
        type: isExposedHttpError(exception) ? exception.type : undefined,
      });
      return;
    }
    this.logger.error({
      message: "Request failed",
      ...attributes,
      err: exception,
    });
  }
}
