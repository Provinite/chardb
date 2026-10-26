import { Field, ID, InputType, Int } from "@nestjs/graphql";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/** Matches `CharacterFolder.name`'s column width. */
export const MAX_FOLDER_NAME_LENGTH = 50;

/**
 * How deeply folders may nest, counting the root level as 1.
 *
 * Deep enough that nobody organising characters runs into it, shallow enough
 * that the browser's breadcrumb stays readable and a rollup never walks far.
 */
export const MAX_FOLDER_DEPTH = 5;

/**
 * How many folders one person may keep.
 *
 * A bound on the tree walks below, which all load the whole workspace at once
 * because it is small. Nothing about the feature stops working at 200; the
 * queries just stop being free.
 */
export const MAX_FOLDERS_PER_OWNER = 200;

/** How many characters one call may file at once. */
export const MAX_BULK_CHARACTERS = 200;

/** How many folders one character may be in. */
export const MAX_FOLDERS_PER_CHARACTER = 50;

@InputType()
export class CreateCharacterFolderInput {
  @Field({ description: "Folder name, as it should be displayed." })
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_FOLDER_NAME_LENGTH)
  name: string;

  @Field(() => ID, {
    nullable: true,
    description: "Folder to nest inside. Omit for a folder at the root.",
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Field({
    nullable: true,
    defaultValue: false,
    description: "Hide it, and everything under it, from everyone else.",
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

@InputType()
export class UpdateCharacterFolderInput {
  @Field(() => ID)
  @IsUUID()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_FOLDER_NAME_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

@InputType({
  description:
    "Reparent a folder, reorder it among its siblings, or both. One input " +
    "because dropping a folder in the browser can mean either, and the drop " +
    "target decides which.",
})
export class MoveCharacterFolderInput {
  @Field(() => ID)
  @IsUUID()
  id: string;

  @Field(() => ID, {
    nullable: true,
    description:
      "The new parent. Null moves the folder to the root; omitting it leaves " +
      "the parent alone.",
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @Field(() => Int, {
    nullable: true,
    description:
      "Where among its new siblings it lands, counting from 0. Omit to put " +
      "it last. Supplying this fixes the order of that whole sibling group, " +
      "which until then was alphabetical.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  index?: number;
}

@InputType({
  description:
    "File characters. With `fromFolderId` this is a move; without one it is " +
    "an add that leaves existing folders alone. A null `toFolderId` with a " +
    "`fromFolderId` returns them to the root.",
})
export class MoveCharactersToFolderInput {
  @Field(() => [ID], {
    description:
      "All must be yours -- the call is refused rather than partly applied " +
      "if any is not.",
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BULK_CHARACTERS)
  @IsUUID("4", { each: true })
  characterIds: string[];

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  toFolderId?: string | null;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  fromFolderId?: string | null;
}

@InputType()
export class SetCharacterFoldersInput {
  @Field(() => ID)
  @IsUUID()
  characterId: string;

  @Field(() => [ID], {
    description:
      "The complete set of folders this character should be in. Anything " +
      "not listed is removed; an empty list returns it to the root.",
  })
  @IsArray()
  @ArrayMaxSize(MAX_FOLDERS_PER_CHARACTER)
  @IsUUID("4", { each: true })
  folderIds: string[];
}
