import type { IncomingMessage } from "http";
import type { Attributes } from "@opentelemetry/api";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

/**
 * Still incubating in @opentelemetry/semantic-conventions, whose incubating
 * entry point makes no stability promise. Grafana Cloud turns it into the
 * `instance` label on every metric series.
 */
export const ATTR_SERVICE_INSTANCE_ID = "service.instance.id";

/**
 * Requests that get no span, no http.server.duration sample and no request
 * log line. The NLB health check is polled every few seconds per task and
 * says nothing about users.
 *
 * Matched the way Express routes: case-insensitive, trailing slash optional.
 */
export const isUntracedRequest = (request: IncomingMessage): boolean => {
  const path = (request.url ?? "").split("?", 1)[0].toLowerCase();
  return path === "/health" || path === "/health/";
};

/**
 * Identifies this process to the OTel backend. The instance id keeps each
 * process's cumulative counters in their own series: two processes sharing
 * one series read as a counter reset on every export.
 *
 * Pass a fresh UUID per process, as the semantic conventions recommend. A
 * hostname is not enough: local checkouts on one machine share it while
 * exporting to the same collector. The `host.name` resource attribute still
 * ties a series to its task's logs.
 */
export const tracingResourceAttributes = (
  env: NodeJS.ProcessEnv,
  instanceId: string,
): Attributes => ({
  [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME || "chardb-backend",
  [ATTR_SERVICE_VERSION]: env.OTEL_SERVICE_VERSION || "1.0.0",
  [ATTR_SERVICE_INSTANCE_ID]: instanceId,
});
