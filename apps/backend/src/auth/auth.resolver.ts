import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput, SignupInput, AuthPayload } from './dto/auth.dto';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async login(@Args('input') loginInput: LoginInput): Promise<AuthPayload> {
    return this.authService.login(loginInput);
  }

  @Mutation(() => AuthPayload)
  async signup(@Args('input') signupInput: SignupInput): Promise<AuthPayload> {
    return this.authService.signup(signupInput);
  }

  @Mutation(() => String)
  async refreshToken(@Args('token') token: string): Promise<string> {
    const result = await this.authService.refreshToken(token);
    return result.accessToken;
  }
}