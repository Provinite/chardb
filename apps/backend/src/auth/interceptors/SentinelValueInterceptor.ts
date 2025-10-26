import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { TRUTHY_NULL, TRUTHY_EMPTY_STRING } from "../constants/sentinel-values";

/**
 * Interceptor that transforms sentinel values back to their actual values.
 *
 * This works in conjunction with NullOnForbiddenFilter, which returns
 * truthy sentinel values when catching ForbiddenException. This interceptor
 * then transforms those sentinels back to their actual null/empty string values.
 *
 * Apply with @UseInterceptors(SentinelValueInterceptor)
 */
@Injectable()
export class SentinelValueInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Transform sentinel values to their actual values
        if (data === TRUTHY_NULL) {
          return null;
        }
        if (data === TRUTHY_EMPTY_STRING) {
          return "";
        }
        return data;
      }),
    );
  }
}
