import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class CreateEnumValueSettingInput {
  /** ID of the enum value this setting allows */
  @Field(() => ID, { description: 'ID of the enum value this setting allows' })
  @IsUUID()
  @IsNotEmpty()
  enumValueId: string;

  /** ID of the species variant this setting belongs to */
  @Field(() => ID, { description: 'ID of the species variant this setting belongs to' })
  @IsUUID()
  @IsNotEmpty()
  speciesVariantId: string;
}

@InputType()
export class UpdateEnumValueSettingInput {
  /** ID of the enum value this setting allows */
  @Field(() => ID, { nullable: true, description: 'ID of the enum value this setting allows' })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  enumValueId?: string;

  /** ID of the species variant this setting belongs to */
  @Field(() => ID, { nullable: true, description: 'ID of the species variant this setting belongs to' })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  speciesVariantId?: string;
}