import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { ExternalAccountsService } from "./external-accounts.service";
import { ExternalAccount } from "./entities/external-account.entity";
import { UnlinkExternalAccountInput } from "./dto/unlink-external-account.dto";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { User } from "@prisma/client";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";

@Resolver(() => ExternalAccount)
export class ExternalAccountsResolver {
  constructor(private externalAccountsService: ExternalAccountsService) {}

  @Query(() => [ExternalAccount], {
    name: "myExternalAccounts",
    description: "Get all external accounts linked to the current user",
  })
  @AllowAnyAuthenticated()
  async getMyExternalAccounts(@CurrentUser() user: User): Promise<ExternalAccount[]> {
    return this.externalAccountsService.findByUserId(user.id);
  }

  @Mutation(() => Boolean, {
    description: "Unlink an external account from the current user",
  })
  @AllowAnyAuthenticated()
  async unlinkExternalAccount(
    @CurrentUser() user: User,
    @Args("input") input: UnlinkExternalAccountInput,
  ): Promise<boolean> {
    return this.externalAccountsService.unlinkExternalAccount(user.id, input.provider);
  }
}
