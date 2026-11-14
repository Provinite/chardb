import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { getRequestFromContext } from "../utils/get-request-from-context";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  getRequest(context: ExecutionContext) {
    return getRequestFromContext(context);
  }
}
