import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanKind } from '@opentelemetry/api';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TracingMiddleware.name);
  private readonly tracer = trace.getTracer('thclone-middleware', '1.0.0');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Create a span for this request
    const span = this.tracer.startSpan(`${req.method} ${req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.scheme': req.protocol,
        'http.host': req.get('host'),
        'http.user_agent': req.get('user-agent'),
        'http.origin': req.get('origin'),
        'http.referer': req.get('referer'),
        'request.id': req.get('x-request-id') || 'unknown',
        'request.size': req.get('content-length') || 0,
      },
    });

    // Special handling for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      span.addEvent('cors_preflight_start');
      span.setAttributes({
        'cors.preflight': true,
        'cors.origin': req.get('origin'),
        'cors.method': req.get('access-control-request-method'),
        'cors.headers': req.get('access-control-request-headers'),
      });
      
      this.logger.verbose(`🔍 CORS preflight request: ${req.get('origin')} -> ${req.path}`);
    }

    // Log slow requests
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response.size': body ? body.length : 0,
        'request.duration_ms': duration,
      });

      if (req.method === 'OPTIONS') {
        span.addEvent('cors_preflight_complete', {
          'duration_ms': duration,
          'status_code': res.statusCode,
        });
        
        if (duration > 100) {
          span.addEvent('slow_cors_preflight', {
            'duration_ms': duration,
            'warning': 'CORS preflight took longer than 100ms',
          });
        }
      }

      // Log particularly slow requests
      if (duration > 1000) {
        span.addEvent('slow_request', {
          'duration_ms': duration,
          'warning': 'Request took longer than 1 second',
        });
        
        console.warn(`🐌 Slow request detected: ${req.method} ${req.path} took ${duration}ms`);
      }

      span.setStatus({ code: res.statusCode >= 400 ? 2 : 1 }); // ERROR : OK
      span.end();
      
      return originalSend.call(this, body);
    };

    // Continue with the request in the span context
    context.with(trace.setSpan(context.active(), span), () => {
      next();
    });
  }
}