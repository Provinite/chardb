import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsUUID, MinLength, IsBoolean, IsOptional } from 'class-validator';

@InputType({ description: 'Input for creating a new role' })
export class CreateRoleInput {
  /** The name of the role */
  @Field(() => String, { description: 'The name of the role' })
  @IsString()
  @MinLength(1, { message: 'Role name cannot be empty' })
  name!: string;

  /** The community this role belongs to */
  @Field(() => ID, { description: 'The ID of the community this role belongs to' })
  @IsUUID(4, { message: 'Community ID must be a valid UUID' })
  communityId!: string;

  /** Permission to create new species */
  @Field(() => Boolean, { description: 'Whether members with this role can create new species', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canCreateSpecies?: boolean = false;

  /** Permission to create new characters */
  @Field(() => Boolean, { description: 'Whether members with this role can create new characters', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canCreateCharacter?: boolean = false;

  /** Permission to create orphaned characters */
  @Field(() => Boolean, { description: 'Whether members with this role can create orphaned characters', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canCreateOrphanedCharacter?: boolean = false;

  /** Permission to edit characters */
  @Field(() => Boolean, { description: 'Whether members with this role can edit characters', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canEditCharacter?: boolean = false;

  /** Permission to edit own characters only */
  @Field(() => Boolean, { description: 'Whether members with this role can edit their own characters', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canEditOwnCharacter?: boolean = false;

  /** Permission to edit species */
  @Field(() => Boolean, { description: 'Whether members with this role can edit species', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canEditSpecies?: boolean = false;

  /** Permission to create invite codes */
  @Field(() => Boolean, { description: 'Whether members with this role can create invite codes', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canCreateInviteCode?: boolean = false;

  /** Permission to list invite codes */
  @Field(() => Boolean, { description: 'Whether members with this role can list invite codes', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canListInviteCodes?: boolean = false;

  /** Permission to create new roles */
  @Field(() => Boolean, { description: 'Whether members with this role can create new roles', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canCreateRole?: boolean = false;

  /** Permission to edit existing roles */
  @Field(() => Boolean, { description: 'Whether members with this role can edit existing roles', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canEditRole?: boolean = false;

  /** Permission to remove community members */
  @Field(() => Boolean, { description: 'Whether members with this role can remove community members', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canRemoveCommunityMember?: boolean = false;

  /** Permission to manage member roles */
  @Field(() => Boolean, { description: 'Whether members with this role can change other members\' roles', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canManageMemberRoles?: boolean = false;

  /** Permission to manage item types */
  @Field(() => Boolean, { description: 'Whether members with this role can create, edit, and delete item types', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canManageItems?: boolean = false;

  /** Permission to grant items to users */
  @Field(() => Boolean, { description: 'Whether members with this role can grant items to community members', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canGrantItems?: boolean = false;

  /** Permission to upload images to own characters */
  @Field(() => Boolean, { description: 'Whether members with this role can upload images to their own characters', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canUploadOwnCharacterImages?: boolean = false;

  /** Permission to upload images to any character */
  @Field(() => Boolean, { description: 'Whether members with this role can upload images to any character', defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canUploadCharacterImages?: boolean = false;
}

@InputType({ description: 'Input for updating an existing role' })
export class UpdateRoleInput {
  /** The name of the role */
  @Field(() => String, { description: 'The name of the role', nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Role name cannot be empty' })
  name?: string;

  /** Permission to create new species */
  @Field(() => Boolean, { description: 'Whether members with this role can create new species', nullable: true })
  @IsOptional()
  @IsBoolean()
  canCreateSpecies?: boolean;

  /** Permission to create new characters */
  @Field(() => Boolean, { description: 'Whether members with this role can create new characters', nullable: true })
  @IsOptional()
  @IsBoolean()
  canCreateCharacter?: boolean;

  /** Permission to create orphaned characters */
  @Field(() => Boolean, { description: 'Whether members with this role can create orphaned characters', nullable: true })
  @IsOptional()
  @IsBoolean()
  canCreateOrphanedCharacter?: boolean;

  /** Permission to edit characters */
  @Field(() => Boolean, { description: 'Whether members with this role can edit characters', nullable: true })
  @IsOptional()
  @IsBoolean()
  canEditCharacter?: boolean;

  /** Permission to edit own characters only */
  @Field(() => Boolean, { description: 'Whether members with this role can edit their own characters', nullable: true })
  @IsOptional()
  @IsBoolean()
  canEditOwnCharacter?: boolean;

  /** Permission to edit species */
  @Field(() => Boolean, { description: 'Whether members with this role can edit species', nullable: true })
  @IsOptional()
  @IsBoolean()
  canEditSpecies?: boolean;

  /** Permission to create invite codes */
  @Field(() => Boolean, { description: 'Whether members with this role can create invite codes', nullable: true })
  @IsOptional()
  @IsBoolean()
  canCreateInviteCode?: boolean;

  /** Permission to list invite codes */
  @Field(() => Boolean, { description: 'Whether members with this role can list invite codes', nullable: true })
  @IsOptional()
  @IsBoolean()
  canListInviteCodes?: boolean;

  /** Permission to create new roles */
  @Field(() => Boolean, { description: 'Whether members with this role can create new roles', nullable: true })
  @IsOptional()
  @IsBoolean()
  canCreateRole?: boolean;

  /** Permission to edit existing roles */
  @Field(() => Boolean, { description: 'Whether members with this role can edit existing roles', nullable: true })
  @IsOptional()
  @IsBoolean()
  canEditRole?: boolean;

  /** Permission to remove community members */
  @Field(() => Boolean, { description: 'Whether members with this role can remove community members', nullable: true })
  @IsOptional()
  @IsBoolean()
  canRemoveCommunityMember?: boolean;

  /** Permission to manage member roles */
  @Field(() => Boolean, { description: 'Whether members with this role can change other members\' roles', nullable: true })
  @IsOptional()
  @IsBoolean()
  canManageMemberRoles?: boolean;

  /** Permission to manage item types */
  @Field(() => Boolean, { description: 'Whether members with this role can create, edit, and delete item types', nullable: true })
  @IsOptional()
  @IsBoolean()
  canManageItems?: boolean;

  /** Permission to grant items to users */
  @Field(() => Boolean, { description: 'Whether members with this role can grant items to community members', nullable: true })
  @IsOptional()
  @IsBoolean()
  canGrantItems?: boolean;

  /** Permission to upload images to own characters */
  @Field(() => Boolean, { description: 'Whether members with this role can upload images to their own characters', nullable: true })
  @IsOptional()
  @IsBoolean()
  canUploadOwnCharacterImages?: boolean;

  /** Permission to upload images to any character */
  @Field(() => Boolean, { description: 'Whether members with this role can upload images to any character', nullable: true })
  @IsOptional()
  @IsBoolean()
  canUploadCharacterImages?: boolean;
}