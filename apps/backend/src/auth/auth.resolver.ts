import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import {
  LoginInput,
  SignupInput,
  AuthPayload,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './dto/auth.dto';
import {
  mapLoginInputToService,
  mapSignupInputToService,
  mapAuthResponseToGraphQL,
} from './utils/auth-resolver-mappers';
import { AllowUnauthenticated } from './decorators/AllowUnauthenticated';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @AllowUnauthenticated()
  @Mutation(() => AuthPayload)
  async login(@Args('input') loginInput: LoginInput): Promise<AuthPayload> {
    const serviceInput = mapLoginInputToService(loginInput);
    const serviceResult = await this.authService.login(serviceInput);
    return mapAuthResponseToGraphQL(serviceResult);
  }

  @AllowUnauthenticated()
  @Mutation(() => AuthPayload)
  async signup(@Args('input') signupInput: SignupInput): Promise<AuthPayload> {
    const serviceInput = mapSignupInputToService(signupInput);
    const serviceResult = await this.authService.signup(serviceInput);
    return mapAuthResponseToGraphQL(serviceResult);
  }

  @AllowUnauthenticated()
  @Mutation(() => String)
  async refreshToken(@Args('token') token: string): Promise<string> {
    const result = await this.authService.refreshToken(token);
    return result.accessToken;
  }

  @AllowUnauthenticated()
  @Mutation(() => Boolean)
  async forgotPassword(
    @Args('input') input: ForgotPasswordInput,
  ): Promise<boolean> {
    await this.authService.requestPasswordReset(input.email);
    // Always return true to prevent email enumeration
    return true;
  }

  @AllowUnauthenticated()
  @Mutation(() => Boolean)
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<boolean> {
    await this.authService.resetPassword(input.token, input.newPassword);
    return true;
  }
}