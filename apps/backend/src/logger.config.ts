import { WinstonModuleOptions } from "nest-winston";
import * as winston from "winston";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import { errFormat } from "./logging/err-format";

/**
 * Winston logger configuration for NestJS with OpenTelemetry integration
 *
 * Features:
 * - Console transport for local development (formatted, colorized)
 * - OpenTelemetry transport for sending logs to OTLP endpoint (production)
 * - Automatic trace/span ID correlation
 * - Structured JSON logging
 * - An `Error` under the `err` field serialized with its stack and cause
 *   (see `logging/err-format.ts`)
 */
export const loggerConfig: WinstonModuleOptions = {
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    // Before `metadata()`, which gathers the fields under `metadata`.
    errFormat(),
    winston.format.metadata(),
  ),
  transports: [
    // Console transport for local development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, context, ...meta }) => {
            const contextStr = context ? `[${context}]` : "";
            const metaStr =
              Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`;
          },
        ),
      ),
    }),
    // OpenTelemetry transport for production logging to Grafana Cloud
    new OpenTelemetryTransportV3(),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    new OpenTelemetryTransportV3(),
  ],
};
