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
 * Requests that get no span and no http.server.duration sample. The NLB health
 * check is polled every few seconds per task and says nothing about users.
 */
export const isUntracedRequest = (request: IncomingMessage): boolean => {
  const path = (request.url ?? "").split("?", 1)[0];
  return path === "/health";
};

/**
 * Identifies this process to the OTel backend. The instance id keeps each
 * task's cumulative counters in their own series: two tasks sharing one
 * series read as a counter reset on every export.
 *
 * The hostname is unique per Fargate task and matches the `host_name` on its
 * logs and spans.
 */
export const tracingResourceAttributes = (
  env: NodeJS.ProcessEnv,
  hostname: string,
): Attributes => ({
  [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME || "chardb-backend",
  [ATTR_SERVICE_VERSION]: env.OTEL_SERVICE_VERSION || "1.0.0",
  [ATTR_SERVICE_INSTANCE_ID]: hostname,
});
