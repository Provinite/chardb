import type { IncomingMessage } from "http";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
  ATTR_SERVICE_INSTANCE_ID,
  isUntracedRequest,
  tracingResourceAttributes,
} from "./tracing-requests";

const request = (method: string, url: string) =>
  ({ method, url }) as IncomingMessage;

describe("isUntracedRequest", () => {
  /**
   * The NLB polls /health about once a second per task, which made it over
   * 90% of all exported spans while real traffic was sampled away.
   */
  it("skips the load balancer health check", () => {
    expect(isUntracedRequest(request("GET", "/health"))).toBe(true);
    expect(isUntracedRequest(request("GET", "/health?probe=1"))).toBe(true);
  });

  /** Express routing ignores case and a trailing slash, so these all land. */
  it("skips every spelling Express routes to the health check", () => {
    expect(isUntracedRequest(request("GET", "/health/"))).toBe(true);
    expect(isUntracedRequest(request("GET", "/Health"))).toBe(true);
    expect(isUntracedRequest(request("GET", "/HEALTH/?x=1"))).toBe(true);
  });

  it("traces everything else", () => {
    expect(isUntracedRequest(request("POST", "/graphql"))).toBe(false);
    expect(isUntracedRequest(request("GET", "/healthz"))).toBe(false);
    expect(isUntracedRequest(request("GET", "/health/deep"))).toBe(false);
    expect(isUntracedRequest(request("OPTIONS", "/"))).toBe(false);
  });
});

describe("tracingResourceAttributes", () => {
  /**
   * Without an instance id every process exports into the same metric
   * series, so each one's cumulative counter looks like a reset of the
   * other's and every rate() and increase() comes out inflated.
   */
  it("sets service.instance.id to the id it is given", () => {
    const attributes = tracingResourceAttributes({}, "instance-a");
    expect(attributes[ATTR_SERVICE_INSTANCE_ID]).toBe("instance-a");
  });

  it("lets OTEL_SERVICE_NAME override the service name", () => {
    expect(
      tracingResourceAttributes({ OTEL_SERVICE_NAME: "other" }, "id")[
        ATTR_SERVICE_NAME
      ],
    ).toBe("other");
    expect(tracingResourceAttributes({}, "id")[ATTR_SERVICE_NAME]).toBe(
      "chardb-backend",
    );
  });
});
