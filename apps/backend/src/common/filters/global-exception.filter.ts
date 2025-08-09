import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalException');

  catch(exception: unknown, host: ArgumentsHost): void {
    // Check if we're in a GraphQL context
    const gqlHost = host.switchToRpc();
    if (gqlHost?.getContext) {
      // GraphQL context - just log and rethrow
      this.logError(exception, null, HttpStatus.INTERNAL_SERVER_ERROR);
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log detailed error information
    this.logError(exception, request, status);

    response.status(status).json(
      typeof message === 'string' ? { message, statusCode: status } : message
    );
  }

  private logError(exception: unknown, request: Request | null, status: number): void {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      method: request?.method || 'unknown',
      url: request?.url || 'unknown',
      statusCode: status,
      userAgent: request?.get?.('user-agent') || '',
      ip: request?.ip || 'unknown',
    };

    // Add file upload info if it's a multipart request
    if (request?.is?.('multipart/form-data') && (request as any)?.file) {
      const file = (request as any).file;
      errorInfo['fileInfo'] = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    }

    if (exception instanceof HttpException) {
      this.logger.error(
        `HTTP Exception: ${exception.message}`,
        JSON.stringify(errorInfo, null, 2)
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
        JSON.stringify(errorInfo, null, 2)
      );
    } else {
      this.logger.error(
        `Unknown Exception: ${String(exception)}`,
        JSON.stringify(errorInfo, null, 2)
      );
    }
  }
}