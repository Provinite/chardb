import { Resolver, Mutation, Args } from "@nestjs/graphql";

import { EmailVerificationService } from "./email-verification.service";
import {
  VerifyEmailInput,
  ResendVerificationEmailInput,
} from "./dto/email-verification.dto";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";

/**
 * Both mutations are public, and have to be: an account cannot sign in until
 * its address is confirmed, so nobody who needs either of these has a session
 * to authenticate with.
 */
@Resolver()
export class EmailVerificationResolver {
  constructor(private readonly verification: EmailVerificationService) {}

  @AllowUnauthenticated()
  @Mutation(() => Boolean, {
    description:
      "Confirms an address from the link in a verification email. Following " +
      "an already-redeemed link for an account that is confirmed succeeds.",
  })
  async verifyEmail(
    @Args("input") input: VerifyEmailInput,
  ): Promise<boolean> {
    await this.verification.redeem(input.token);
    return true;
  }

  @AllowUnauthenticated()
  @Mutation(() => Boolean, {
    description:
      "Sends another verification email. Always returns true, whatever the " +
      "address is or is not, so this cannot be used to discover who has an " +
      "account. Subject to a per-address lifetime cap.",
  })
  async resendVerificationEmail(
    @Args("input") input: ResendVerificationEmailInput,
  ): Promise<boolean> {
    await this.verification.resend(input.email);
    return true;
  }
}
