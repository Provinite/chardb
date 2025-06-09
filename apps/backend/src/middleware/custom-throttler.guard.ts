import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Check if this is a GraphQL context
    if (context.getType<'graphql' | 'http'>() === 'graphql') {
      // For now, skip throttling on GraphQL requests to avoid context issues
      // TODO: Implement proper GraphQL throttling if needed
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    
    // Handle case where request might be undefined
    if (!request) {
      return false;
    }
    
    // Skip throttling for OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return true;
    }
    
    // Skip throttling for health check endpoints
    if (request.url?.includes('/health')) {
      return true;
    }
    
    // Skip throttling in development mode for static assets
    if (process.env.NODE_ENV === 'development' && 
        (request.url?.includes('.js') || 
         request.url?.includes('.css') || 
         request.url?.includes('.map'))) {
      return true;
    }
    
    return false;
  }
  
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Handle case where req might be undefined (GraphQL context)
    if (!req) {
      return 'graphql-unknown';
    }
    
    // Use IP + User-Agent for better tracking of unique clients
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get?.('user-agent') || 'unknown';
    return `${ip}-${userAgent.slice(0, 20)}`; // Truncate user agent
  }
}