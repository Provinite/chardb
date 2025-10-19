import { Controller, Get } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

@Controller('health')
export class HealthController {
  private readonly tracer = trace.getTracer('health-controller', '1.0.0');

  @Get()
  healthCheck() {
    const span = this.tracer.startSpan('health_check');

    try {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'chardb-backend',
        version: process.env.OTEL_SERVICE_VERSION || '1.0.0',
        tracing: {
          enabled: true,
          endpoint:
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
        },
      };

      span.setAttributes({
        'health.status': 'ok',
        'health.check_duration_ms': Date.now(),
      });

      span.end();
      return health;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      span.end();
      throw error;
    }
  }

  @Get('tracing')
  tracingTest() {
    const span = this.tracer.startSpan('tracing_test');

    try {
      // Simulate some work with nested spans
      const childSpan = this.tracer.startSpan('nested_operation');

      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 50) {
        // Busy wait for 50ms
      }

      childSpan.addEvent('work_completed', {
        duration_ms: Date.now() - start,
      });
      childSpan.end();

      const result = {
        message: 'Tracing test completed',
        timestamp: new Date().toISOString(),
        trace_id: span.spanContext().traceId,
        span_id: span.spanContext().spanId,
      };

      span.setAttributes({
        'test.result': 'success',
        'test.duration_ms': Date.now() - start,
      });

      span.end();
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      span.end();
      throw error;
    }
  }
}
