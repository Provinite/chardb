import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanKind } from '@opentelemetry/api';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TracingMiddleware.name);
  private readonly tracer = trace.getTracer('thclone-middleware', '1.0.0');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Always log OPTIONS requests for debugging
    if (req.method === 'OPTIONS') {
      console.log(`📋 OPTIONS request detected: ${req.method} ${req.path} from ${req.get('origin')}`);
    }
    
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

    // Enhanced response tracking
    const originalSend = res.send;
    const originalEnd = res.end;
    
    const finishSpan = () => {
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'http.status_code': res.statusCode,
        'request.duration_ms': duration,
      });

      if (req.method === 'OPTIONS') {
        span.addEvent('cors_preflight_complete', {
          'duration_ms': duration,
          'status_code': res.statusCode,
        });
        
        console.log(`📋 OPTIONS completed: ${duration}ms, status: ${res.statusCode}`);
        
        if (duration > 100) {
          span.addEvent('slow_cors_preflight', {
            'duration_ms': duration,
            'warning': 'CORS preflight took longer than 100ms',
          });
          console.warn(`🐌 Slow OPTIONS request: ${duration}ms`);
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
    };
    
    res.send = function(body) {
      if (body) {
        span.setAttributes({
          'http.response.size': body.length || 0,
        });
      }
      finishSpan();
      return originalSend.call(this, body);
    };
    
    res.end = function(...args: any[]) {
      const [chunk] = args;
      if (chunk) {
        span.setAttributes({
          'http.response.size': chunk.length || 0,
        });
      }
      finishSpan();
      return originalEnd.apply(this, args);
    };

    // Continue with the request in the span context
    context.with(trace.setSpan(context.active(), span), () => {
      next();
    });
  }
}