import { InputType, Field, ID } from "@nestjs/graphql";
import { ExternalAccountProvider } from "@chardb/database";
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

/**
 * Providers something can be granted to before its owner joins.
 *
 * Narrower than `ExternalAccountProvider`: a pending grant only ever reaches
 * its owner if what staff type here resolves to the id OAuth stores on link,
 * and Patreon has no lookup from a handle to its numeric user id.
 */
export const PENDING_OWNER_PROVIDERS: readonly ExternalAccountProvider[] = [
  ExternalAccountProvider.DISCORD,
  ExternalAccountProvider.DEVIANTART,
  ExternalAccountProvider.TOYHOUSE,
];

@InputType()
export class PendingOwnerInput {
  @Field(() => ExternalAccountProvider, {
    description:
      "The external account provider. PATREON is refused: it cannot be a pending owner.",
  })
  @IsIn(PENDING_OWNER_PROVIDERS, {
    message: "Pending ownership is not supported for this provider",
  })
  provider: ExternalAccountProvider;

  @Field({
    description:
      "The account identifier on the external provider (Discord user ID, DeviantArt username, etc.)",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerAccountId: string;
}

@InputType()
export class CreatePendingOwnershipForCharacterInput {
  @Field(() => ID, { description: "Character ID" })
  @IsUUID()
  characterId: string;

  @Field(() => PendingOwnerInput, {
    description: "External account information",
  })
  pendingOwner: PendingOwnerInput;
}

@InputType()
export class CreatePendingOwnershipForItemInput {
  @Field(() => ID, { description: "Item ID" })
  @IsUUID()
  itemId: string;

  @Field(() => PendingOwnerInput, {
    description: "External account information",
  })
  pendingOwner: PendingOwnerInput;
}

@InputType()
export class PendingOwnershipFiltersInput {
  @Field(() => ExternalAccountProvider, {
    nullable: true,
    description: "Filter by provider",
  })
  @IsEnum(ExternalAccountProvider)
  provider?: ExternalAccountProvider;

  @Field({ nullable: true, description: "Filter by provider account ID" })
  @IsString()
  providerAccountId?: string;

  @Field({
    nullable: true,
    description:
      "Filter by claimed status. True = claimed, False = unclaimed, undefined = all",
  })
  claimed?: boolean;
}
