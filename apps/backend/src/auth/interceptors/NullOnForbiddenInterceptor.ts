import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from "@nestjs/common";
import { Observable, throwError, of } from "rxjs";
import { catchError } from "rxjs/operators";

/**
 * Interceptor that catches ForbiddenException and returns null instead.
 * Apply with @UseInterceptors(NullOnForbiddenInterceptor)
 */
@Injectable()
export class NullOnForbiddenInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        console.log("OH NO AN ERROR");
        if (error instanceof ForbiddenException) {
          // Return null instead of throwing the error
          return of(null);
        }
        // Re-throw all other errors
        return throwError(() => error);
      }),
    );
  }
}
