import { Field, InputType, Int, ID } from "@nestjs/graphql";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

// File upload handled via REST endpoint - this is for GraphQL updates
@InputType()
export class CreateImageFromUploadInput {
  @Field()
  @IsString()
  uploadId: string; // Reference to uploaded file

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  // Artist attribution
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  artistName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  artistUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;
}

@InputType({
  description:
    "A thumbnail framing rect, in the original image's pixels after EXIF rotation is applied. Send back what the cropper measured against the rendered image; the server checks it fits before rendering anything.",
})
export class ImageCropInput {
  @Field(() => Int)
  @IsInt()
  @Min(0)
  x: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  y: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  width: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  height: number;
}

@InputType()
export class UpdateImageInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;

  @Field(() => ImageCropInput, {
    nullable: true,
    description:
      "Re-frame the thumbnail, re-rendering it from the original. Explicit null resets it to a centre crop; omitting the field leaves the current framing alone.",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageCropInput)
  thumbnailCrop?: ImageCropInput | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  // Artist attribution
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  artistName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  artistUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;
}

@InputType()
export class ImageFiltersInput {
  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  uploaderId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  artistId?: string;
}

@InputType()
export class ManageImageTagsInput {
  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  tagNames: string[];
}

// Export for service use
export interface ImageFilters {
  limit?: number;
  offset?: number;
  uploaderId?: string;
  isNsfw?: boolean;
}
