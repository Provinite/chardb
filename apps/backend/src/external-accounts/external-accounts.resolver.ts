import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ExternalAccountsService } from "./external-accounts.service";
import { ExternalAccount } from "./entities/external-account.entity";
import { LinkExternalAccountInput } from "./dto/link-external-account.dto";
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

  @Mutation(() => ExternalAccount, {
    description: "Link an external account to the current user",
  })
  @AllowAnyAuthenticated()
  async linkExternalAccount(
    @CurrentUser() user: User,
    @Args("input") input: LinkExternalAccountInput,
  ): Promise<ExternalAccount> {
    return this.externalAccountsService.linkExternalAccount(
      user.id,
      input.provider,
      input.providerAccountId,
      input.displayName,
    );
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
