import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { createDenyListAttributesProcessor } from "@opentelemetry/sdk-metrics";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { traceDetailOptions } from "./tracing-detail";

// Honour the standard OTEL_SDK_DISABLED switch before constructing anything.
//
// NodeSDK already checks this variable itself, but only *after* our
// instrumentations have been constructed - and the Node InstrumentationBase
// constructor eagerly patches http/express/graphql/winston via
// require-in-the-middle. Checking here keeps a disabled deployment a true
// no-op: no exporter, no patching, no span pipeline.
//
// Parsed exactly as @opentelemetry/core does: trimmed, lowercased, and only
// the literal "true" counts. "1" and "yes" do NOT disable the SDK.
const tracingDisabled =
  process.env.OTEL_SDK_DISABLED?.trim().toLowerCase() === "true";

let sdk: NodeSDK | undefined;

if (tracingDisabled) {
  console.log("🔍 OpenTelemetry disabled via OTEL_SDK_DISABLED=true");
} else {
  const detail = traceDetailOptions(process.env.DEBUG_TRACE_LEVEL);
  if (detail.unrecognised !== undefined) {
    console.warn(
      "Unrecognised DEBUG_TRACE_LEVEL; using standard",
      detail.unrecognised,
    );
  }

  // Initialize OpenTelemetry SDK with simplified configuration
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "chardb-backend",
      [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "1.0.0",
    }),

    // Trace exporter
    traceExporter: new OTLPTraceExporter({}),

    // net.host.name is copied from the request's Host header, so every
    // hostname a scanner sends minted a new http.server.duration histogram
    // (~18 series each). Cumulative temporality re-exports every combination
    // until the process restarts, which drove prod past Grafana's active
    // series limit. Spans keep both attributes; only the metric drops them.
    views: [
      {
        instrumentName: "http.server.duration",
        attributesProcessors: [
          createDenyListAttributesProcessor(["net.host.name", "net.host.port"]),
        ],
      },
    ],

    // Auto-instrumentations with simplified config
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy instrumentations
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
        "@opentelemetry/instrumentation-dns": {
          enabled: false,
        },
        "@opentelemetry/instrumentation-net": {
          enabled: false,
        },

        // Enable core instrumentations
        "@opentelemetry/instrumentation-http": {
          enabled: true,
          ignoreIncomingRequestHook: () => {
            // Never ignore OPTIONS requests - we want to trace them!
            return false;
          },
          requestHook: (span, request) => {
            // Type guard to check if this is an IncomingMessage (server request)
            if ("headers" in request && request.method === "OPTIONS") {
              const headers = request.headers as Record<
                string,
                string | string[] | undefined
              >;
              span.setAttributes({
                "http.options_request": true,
                "cors.origin": headers.origin || "",
                "cors.method": headers["access-control-request-method"] || "",
                "cors.headers": headers["access-control-request-headers"] || "",
              });
            }
          },
        },

        "@opentelemetry/instrumentation-express": {
          enabled: true,
        },

        "@opentelemetry/instrumentation-graphql": {
          enabled: true,
          allowValues: false,
          // Operations stay. A span per resolved field is DEBUG_TRACE_LEVEL=full
          // only: Nest gives every field a resolver, so
          // ignoreTrivialResolveSpans would still trace every `id`.
          ignoreResolveSpans: !detail.fieldSpans,
        },

        // A span per key queued. The SQL each batch runs is already a Prisma
        // span, so these repeat it at a finer grain.
        "@opentelemetry/instrumentation-dataloader": {
          enabled: detail.dataloaderSpans,
        },
      }),
      // Winston instrumentation for automatic log correlation with traces
      new WinstonInstrumentation({
        enabled: true,
        logSeverity: SeverityNumber.INFO,
      }),
      // Prisma's engine talks to Postgres itself, so the pg instrumentation
      // never sees its queries; this is what puts them in the trace
      // An ignored span takes its children with it, so only leaves are cut:
      // operations and SQL stay, serialization and pool checkouts go
      new PrismaInstrumentation({
        ignoreSpanTypes: [
          "prisma:client:serialize",
          "prisma:engine:connection",
          "prisma:engine:serialize",
          "prisma:engine:response_json_serialization",
        ],
      }),
    ],
  });

  // Start the SDK
  try {
    sdk.start();
    console.log("🔍 OpenTelemetry tracing initialized successfully");
    console.log("🔍 Trace detail level:", detail.level);
    console.log(
      `📊 Traces will be sent to: ${process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || "http://localhost:4318"}`,
    );
    console.log("🖥️  Jaeger UI available at: http://localhost:16686");
  } catch (error) {
    console.error("❌ Error initializing OpenTelemetry:", error);
  }
}

// Graceful shutdown. Registered unconditionally: this is the only SIGTERM
// handler in the process, so dropping it when tracing is off would leave the
// container to be SIGKILLed on every deploy.
process.on("SIGTERM", () => {
  if (!sdk) {
    process.exit(0);
  }

  sdk
    .shutdown()
    .then(() => console.log("📊 OpenTelemetry terminated"))
    .catch((error) =>
      console.error("❌ Error terminating OpenTelemetry", error),
    )
    .finally(() => process.exit(0));
});

export { sdk };
