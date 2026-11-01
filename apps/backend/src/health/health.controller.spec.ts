import { trace, type Tracer } from "@opentelemetry/api";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * The HTTP instrumentation ignores /health, so a span started here has no
   * parent and is exported as a trace of its own, once per probe.
   */
  it("starts no span of its own", () => {
    const startSpan = jest.fn();
    const startActiveSpan = jest.fn();
    jest
      .spyOn(trace, "getTracer")
      .mockReturnValue({ startSpan, startActiveSpan } as unknown as Tracer);

    new HealthController().healthCheck();

    expect(startSpan).not.toHaveBeenCalled();
    expect(startActiveSpan).not.toHaveBeenCalled();
  });

  /**
   * Public and unauthenticated. Probes read only the status code; the e2e
   * setup reads `status`; `version` says which release is live.
   */
  it("reports only that it is up and which version is running", () => {
    expect(Object.keys(new HealthController().healthCheck()).sort()).toEqual([
      "status",
      "version",
    ]);
    expect(new HealthController().healthCheck().status).toBe("ok");
  });
});
