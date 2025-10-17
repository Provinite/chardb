import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AllowUnauthenticated } from "../decorators/AllowUnauthenticated";

@Injectable()
export class UnauthenticatedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride(AllowUnauthenticated, [
      context.getHandler(),
      context.getClass(),
    ]);

    return isPublic === true;
  }
}
