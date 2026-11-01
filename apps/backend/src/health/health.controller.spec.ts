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

    const health = new HealthController().healthCheck();

    expect(health.status).toBe("ok");
    expect(startSpan).not.toHaveBeenCalled();
    expect(startActiveSpan).not.toHaveBeenCalled();
  });
});
