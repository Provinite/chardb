import { InputType, Field } from "@nestjs/graphql";
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from "class-validator";
import {
  COMMUNITY_SLUG_MAX_LENGTH,
  COMMUNITY_SLUG_MIN_LENGTH,
  rejectCommunitySlug,
} from "@chardb/shared";

/**
 * Rejects slugs the site cannot serve, with the reason.
 *
 * The rules themselves live in `@chardb/shared` because the frontend parses
 * hostnames back into slugs with the same grammar; this is only the
 * class-validator wrapper around them.
 */
@ValidatorConstraint({ name: "isCommunitySlug", async: false })
export class IsCommunitySlugConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === "string" && rejectCommunitySlug(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    if (typeof args.value !== "string") return "Slug must be a string";

    switch (rejectCommunitySlug(args.value)) {
      case "too-short":
        return `Slug must be at least ${COMMUNITY_SLUG_MIN_LENGTH} characters`;
      case "too-long":
        return `Slug must be at most ${COMMUNITY_SLUG_MAX_LENGTH} characters`;
      case "malformed":
        return "Slug may only contain lowercase letters, numbers and interior hyphens";
      case "reserved":
        return `"${args.value}" is reserved by the site and cannot be used`;
      default:
        return "Invalid slug";
    }
  }
}

@InputType()
export class CreateCommunityInput {
  /** Name of the community (must be unique) */
  @Field({ description: "Name of the community" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  /**
   * The subdomain this community will be served from. Permanent: there is no
   * corresponding field on `UpdateCommunityInput`, because changing it would
   * break every link the community's members have already shared.
   */
  @Field({
    description:
      "Subdomain label for the community -- `cloverse` in `cloverse.chardb.cc`. Permanent once set.",
  })
  @IsString()
  @Validate(IsCommunitySlugConstraint)
  slug: string;
}

@InputType()
export class UpdateCommunityInput {
  /** Name of the community (must be unique) */
  @Field({ nullable: true, description: "Name of the community" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  // No `slug`. It is deliberately immutable -- see CreateCommunityInput.
}
