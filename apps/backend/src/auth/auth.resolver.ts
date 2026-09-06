import { Resolver, Mutation, Args, Context } from "@nestjs/graphql";
import { UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  LoginInput,
  SignupInput,
  AuthPayload,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./dto/auth.dto";
import {
  mapLoginInputToService,
  mapSignupInputToService,
  mapAuthResponseToGraphQL,
} from "./utils/auth-resolver-mappers";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from "./refresh-cookie";

/** What `GraphQLModule.forRoot`'s `context` factory puts on every request. */
type GqlContext = { req: Request; res: Response };

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @AllowUnauthenticated()
  @Mutation(() => AuthPayload)
  async login(
    @Args("input") loginInput: LoginInput,
    @Context() ctx: GqlContext,
  ): Promise<AuthPayload> {
    const serviceInput = mapLoginInputToService(loginInput);
    const serviceResult = await this.authService.login(serviceInput);
    setRefreshCookie(ctx.res, serviceResult.refreshToken);
    return mapAuthResponseToGraphQL(serviceResult);
  }

  @AllowUnauthenticated()
  @Mutation(() => AuthPayload)
  async signup(
    @Args("input") signupInput: SignupInput,
    @Context() ctx: GqlContext,
  ): Promise<AuthPayload> {
    const serviceInput = mapSignupInputToService(signupInput);
    const serviceResult = await this.authService.signup(serviceInput);
    setRefreshCookie(ctx.res, serviceResult.refreshToken);
    return mapAuthResponseToGraphQL(serviceResult);
  }

  /**
   * Mints a fresh access token from the refresh cookie.
   *
   * Takes no argument any more: the token the client used to pass in is now
   * `HttpOnly`, so the client cannot read it to pass it. A missing or expired
   * cookie is an ordinary signed-out state, but it is reported as
   * `UnauthorizedException` rather than null so the client's error path is the
   * same one a rejected token takes.
   */
  @AllowUnauthenticated()
  @Mutation(() => String)
  async refreshToken(@Context() ctx: GqlContext): Promise<string> {
    const token = readRefreshCookie(ctx.req);
    if (!token) {
      throw new UnauthorizedException("No refresh token");
    }

    try {
      const result = await this.authService.refreshToken(token);
      return result.accessToken;
    } catch (error) {
      // A refresh token the server will not honour is never going to start
      // working, so drop it rather than leaving the browser to keep sending it
      // on every future request.
      clearRefreshCookie(ctx.res);
      throw error;
    }
  }

  /**
   * Ends the session by clearing the refresh cookie.
   *
   * This did not need to exist while the tokens were in `localStorage` and the
   * client could simply delete them. It does now: an `HttpOnly` cookie can
   * only be removed by the server that set it.
   */
  @AllowUnauthenticated()
  @Mutation(() => Boolean)
  logout(@Context() ctx: GqlContext): boolean {
    clearRefreshCookie(ctx.res);
    return true;
  }

  @AllowUnauthenticated()
  @Mutation(() => Boolean)
  async forgotPassword(
    @Args("input") input: ForgotPasswordInput,
  ): Promise<boolean> {
    await this.authService.requestPasswordReset(input.email);
    // Always return true to prevent email enumeration
    return true;
  }

  @AllowUnauthenticated()
  @Mutation(() => Boolean)
  async resetPassword(
    @Args("input") input: ResetPasswordInput,
  ): Promise<boolean> {
    await this.authService.resetPassword(input.token, input.newPassword);
    return true;
  }
}
