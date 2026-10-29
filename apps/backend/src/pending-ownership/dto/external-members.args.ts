import { ArgsType, Field, ID, Int } from "@nestjs/graphql";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ExternalAccountProvider } from "@chardb/database";
import { PENDING_OWNER_PROVIDERS } from "./pending-ownership.dto";

/** Arguments to externalMembers: one page of a community's external members. */
@ArgsType()
export class ExternalMembersArgs {
  @Field(() => ID)
  @IsUUID()
  communityId: string;

  @Field({
    nullable: true,
    description: "Either name, anywhere in it, or the exact account id.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @Field(() => ExternalAccountProvider, { nullable: true })
  @IsOptional()
  @IsIn(PENDING_OWNER_PROVIDERS)
  provider?: ExternalAccountProvider;

  @Field(() => Int, { defaultValue: 25 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  offset: number = 0;
}
