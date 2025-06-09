import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

// Initialize OpenTelemetry SDK with simplified configuration
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "thclone-backend",
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "1.0.0",
  }),

  // Trace exporter
  traceExporter: new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      "http://localhost:4318/v1/traces",
  }),

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
      },

      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },

      "@opentelemetry/instrumentation-graphql": {
        enabled: true,
      },
    }),
  ],
});

// Start the SDK
try {
  sdk.start();
  console.log("🔍 OpenTelemetry tracing initialized successfully");
  console.log(
    `📊 Traces will be sent to: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318"}`,
  );
  console.log("🖥️  Jaeger UI available at: http://localhost:16686");
} catch (error) {
  console.error("❌ Error initializing OpenTelemetry:", error);
}

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("📊 OpenTelemetry terminated"))
    .catch((error) =>
      console.error("❌ Error terminating OpenTelemetry", error),
    )
    .finally(() => process.exit(0));
});

export { sdk };
