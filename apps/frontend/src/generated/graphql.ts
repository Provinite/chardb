import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export type ActivityContent = {
  __typename?: 'ActivityContent';
  description: Maybe<Scalars['String']['output']>;
  name: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
};

export type ActivityFeedInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type ActivityItem = {
  __typename?: 'ActivityItem';
  content: Maybe<ActivityContent>;
  createdAt: Scalars['DateTime']['output'];
  entityId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  type: Scalars['String']['output'];
  user: User;
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
};

export type Character = {
  __typename?: 'Character';
  _count: CharacterCount;
  age: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  creator: Maybe<User>;
  creatorId: Maybe<Scalars['ID']['output']>;
  customFields: Maybe<Scalars['String']['output']>;
  details: Maybe<Scalars['String']['output']>;
  gender: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSellable: Scalars['Boolean']['output'];
  isTradeable: Scalars['Boolean']['output'];
  likesCount: Scalars['Int']['output'];
  /** Main media item for this character (image or text) */
  mainMedia: Maybe<Media>;
  /** ID of the main media item for this character */
  mainMediaId: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  owner: User;
  ownerId: Scalars['ID']['output'];
  price: Maybe<Scalars['Float']['output']>;
  /** Species this character belongs to */
  species: Maybe<Species>;
  /** ID of the species this character belongs to */
  speciesId: Maybe<Scalars['ID']['output']>;
  /** Species variant this character belongs to */
  speciesVariant: Maybe<SpeciesVariant>;
  /** ID of the species variant this character belongs to */
  speciesVariantId: Maybe<Scalars['ID']['output']>;
  tags: Array<Scalars['String']['output']>;
  tags_rel: Array<CharacterTag>;
  /** Trait values assigned to this character */
  traitValues: Array<CharacterTraitValue>;
  updatedAt: Scalars['DateTime']['output'];
  userHasLiked: Scalars['Boolean']['output'];
  visibility: Visibility;
};

export type CharacterConnection = {
  __typename?: 'CharacterConnection';
  characters: Array<Character>;
  hasMore: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

export type CharacterCount = {
  __typename?: 'CharacterCount';
  media: Scalars['Int']['output'];
};

export type CharacterFiltersInput = {
  ageRange?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  isSellable?: InputMaybe<Scalars['Boolean']['input']>;
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: Scalars['Int']['input'];
  maxPrice?: InputMaybe<Scalars['Float']['input']>;
  minPrice?: InputMaybe<Scalars['Float']['input']>;
  offset?: Scalars['Int']['input'];
  ownerId?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  searchFields?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  species?: InputMaybe<Scalars['String']['input']>;
  speciesId?: InputMaybe<Scalars['ID']['input']>;
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  visibility?: InputMaybe<Visibility>;
};

/** A record of character ownership transfer between users */
export type CharacterOwnershipChange = {
  __typename?: 'CharacterOwnershipChange';
  character: Character;
  /** The ID of the character whose ownership was changed */
  characterId: Scalars['ID']['output'];
  /** When the ownership change occurred */
  createdAt: Scalars['DateTime']['output'];
  fromUser: Maybe<User>;
  /** The ID of the previous owner (null for initial character creation) */
  fromUserId: Maybe<Scalars['ID']['output']>;
  /** Unique identifier for the ownership change record */
  id: Scalars['ID']['output'];
  toUser: User;
  /** The ID of the new owner */
  toUserId: Scalars['ID']['output'];
};

/** Paginated list of character ownership changes with connection metadata */
export type CharacterOwnershipChangeConnection = {
  __typename?: 'CharacterOwnershipChangeConnection';
  /** Whether there are more character ownership changes after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are character ownership changes before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The character ownership changes in this page */
  nodes: Array<CharacterOwnershipChange>;
  /** Total count of character ownership changes matching the query */
  totalCount: Scalars['Float']['output'];
};

export type CharacterTag = {
  __typename?: 'CharacterTag';
  character: Character;
  tag: Tag;
};

/** A trait value assigned to a character */
export type CharacterTraitValue = {
  __typename?: 'CharacterTraitValue';
  /** The ID of the trait this value belongs to */
  traitId: Scalars['ID']['output'];
  /** The value of the trait */
  value: Maybe<Scalars['String']['output']>;
};

/** Input for setting a character trait value */
export type CharacterTraitValueInput = {
  /** The ID of the trait */
  traitId: Scalars['ID']['input'];
  /** The value of the trait */
  value?: InputMaybe<Scalars['String']['input']>;
};

/** Input for claiming an invite code */
export type ClaimInviteCodeInput = {
  /** The ID of the user who is claiming this invite code */
  userId: Scalars['ID']['input'];
};

export type Comment = {
  __typename?: 'Comment';
  author: User;
  authorId: Scalars['ID']['output'];
  character: Maybe<Character>;
  commentableId: Scalars['ID']['output'];
  commentableType: CommentableType;
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  gallery: Maybe<Gallery>;
  id: Scalars['ID']['output'];
  image: Maybe<Image>;
  isHidden: Scalars['Boolean']['output'];
  likesCount: Scalars['Int']['output'];
  parent: Maybe<Comment>;
  parentId: Maybe<Scalars['ID']['output']>;
  replies: Array<Comment>;
  repliesCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: Maybe<User>;
  userHasLiked: Scalars['Boolean']['output'];
};

export type CommentConnection = {
  __typename?: 'CommentConnection';
  comments: Array<Comment>;
  hasMore: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

export type CommentFiltersInput = {
  entityId?: InputMaybe<Scalars['ID']['input']>;
  entityType?: InputMaybe<CommentableType>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

/** Types of entities that can be commented on */
export enum CommentableType {
  Character = 'CHARACTER',
  Gallery = 'GALLERY',
  Image = 'IMAGE',
  User = 'USER'
}

export type Community = {
  __typename?: 'Community';
  /** When the community was created */
  createdAt: Scalars['DateTime']['output'];
  /** Unique identifier for the community */
  id: Scalars['ID']['output'];
  /** Community members with optional search filtering */
  members: Array<User>;
  /** Name of the community */
  name: Scalars['String']['output'];
  /** When the community was last updated */
  updatedAt: Scalars['DateTime']['output'];
};


export type CommunityMembersArgs = {
  limit?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};

export type CommunityConnection = {
  __typename?: 'CommunityConnection';
  /** Whether there are more communities after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more communities before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of communities in this connection */
  nodes: Array<Community>;
  /** Total number of communities available */
  totalCount: Scalars['Float']['output'];
};

/** An invitation for a user to join a community with a specific role */
export type CommunityInvitation = {
  __typename?: 'CommunityInvitation';
  /** Whether the invitation has been accepted */
  accepted: Scalars['Boolean']['output'];
  /** When the invitation was accepted */
  acceptedAt: Maybe<Scalars['DateTime']['output']>;
  community: Maybe<Community>;
  /** The ID of the community the invitation is for */
  communityId: Scalars['ID']['output'];
  /** When the invitation was created */
  createdAt: Scalars['DateTime']['output'];
  /** Whether the invitation has been declined */
  declined: Scalars['Boolean']['output'];
  /** When the invitation was declined */
  declinedAt: Maybe<Scalars['DateTime']['output']>;
  /** Unique identifier for the community invitation */
  id: Scalars['ID']['output'];
  invitee: Maybe<User>;
  /** The ID of the user being invited */
  inviteeId: Scalars['ID']['output'];
  inviter: Maybe<User>;
  /** The ID of the user who created the invitation */
  inviterId: Scalars['ID']['output'];
  /** Whether the invitation is still pending */
  pending: Scalars['Boolean']['output'];
  role: Maybe<Role>;
  /** The ID of the role to grant when the invitation is accepted */
  roleId: Scalars['ID']['output'];
};

/** Paginated list of community invitations with connection metadata */
export type CommunityInvitationConnection = {
  __typename?: 'CommunityInvitationConnection';
  /** Whether there are more community invitations after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are community invitations before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The community invitations in this page */
  nodes: Array<CommunityInvitation>;
  /** Total count of community invitations matching the query */
  totalCount: Scalars['Float']['output'];
};

/** A membership record linking a user to a community role */
export type CommunityMember = {
  __typename?: 'CommunityMember';
  /** When the membership was created */
  createdAt: Scalars['DateTime']['output'];
  /** Unique identifier for the community member record */
  id: Scalars['ID']['output'];
  /** The role this member has */
  role: Role;
  /** The ID of the role this member has */
  roleId: Scalars['ID']['output'];
  /** When the membership was last updated */
  updatedAt: Scalars['DateTime']['output'];
  /** The user who is the member */
  user: User;
  /** The ID of the user who is the member */
  userId: Scalars['ID']['output'];
};

/** Paginated list of community members with connection metadata */
export type CommunityMemberConnection = {
  __typename?: 'CommunityMemberConnection';
  /** Whether there are more community members after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are community members before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The community members in this page */
  nodes: Array<CommunityMember>;
  /** Total count of community members matching the query */
  totalCount: Scalars['Float']['output'];
};

export type CreateCharacterInput = {
  age?: InputMaybe<Scalars['String']['input']>;
  customFields?: InputMaybe<Scalars['String']['input']>;
  details?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  isSellable?: Scalars['Boolean']['input'];
  isTradeable?: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Float']['input']>;
  speciesId?: InputMaybe<Scalars['ID']['input']>;
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
  tags?: Array<Scalars['String']['input']>;
  /** Trait values for the character */
  traitValues?: Array<CharacterTraitValueInput>;
  visibility?: Visibility;
};

/** Input for creating a new character ownership change record */
export type CreateCharacterOwnershipChangeInput = {
  /** The ID of the character whose ownership is being changed */
  characterId: Scalars['ID']['input'];
  /** The ID of the previous owner (null for initial character creation) */
  fromUserId?: InputMaybe<Scalars['ID']['input']>;
  /** The ID of the new owner */
  toUserId: Scalars['ID']['input'];
};

export type CreateCommentInput = {
  content: Scalars['String']['input'];
  entityId: Scalars['ID']['input'];
  entityType: CommentableType;
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateCommunityInput = {
  /** Name of the community */
  name: Scalars['String']['input'];
};

/** Input for creating a new community invitation */
export type CreateCommunityInvitationInput = {
  /** The ID of the community the invitation is for */
  communityId: Scalars['ID']['input'];
  /** The ID of the user being invited */
  inviteeId: Scalars['ID']['input'];
  /** The ID of the user who is creating the invitation */
  inviterId: Scalars['ID']['input'];
  /** The ID of the role to grant when the invitation is accepted */
  roleId: Scalars['ID']['input'];
};

/** Input for creating a new community membership */
export type CreateCommunityMemberInput = {
  /** The ID of the role to assign to the member */
  roleId: Scalars['ID']['input'];
  /** The ID of the user to make a member */
  userId: Scalars['ID']['input'];
};

export type CreateEnumValueInput = {
  /** Name/display text of this enum value */
  name: Scalars['String']['input'];
  /** Display order within the trait's enum values */
  order?: InputMaybe<Scalars['Int']['input']>;
  /** ID of the trait this enum value belongs to */
  traitId: Scalars['ID']['input'];
};

export type CreateEnumValueSettingInput = {
  /** ID of the enum value this setting allows */
  enumValueId: Scalars['ID']['input'];
  /** ID of the species variant this setting belongs to */
  speciesVariantId: Scalars['ID']['input'];
};

export type CreateGalleryInput = {
  characterId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  sortOrder?: Scalars['Int']['input'];
  visibility?: Visibility;
};

/** Input for creating a new invite code */
export type CreateInviteCodeInput = {
  /** The ID of the user who is creating this invite code */
  creatorId: Scalars['ID']['input'];
  /** The invite code string (alphanumeric and hyphens only) */
  id: Scalars['String']['input'];
  /** Maximum number of times this invite code can be claimed */
  maxClaims: Scalars['Int']['input'];
  /** The ID of the role to grant when this invite code is used */
  roleId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateItemTypeInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  communityId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isConsumable?: Scalars['Boolean']['input'];
  isStackable?: Scalars['Boolean']['input'];
  isTradeable?: Scalars['Boolean']['input'];
  maxStackSize?: InputMaybe<Scalars['Int']['input']>;
  metadata?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** Input for creating a new role */
export type CreateRoleInput = {
  /** Whether members with this role can create new characters */
  canCreateCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can create invite codes */
  canCreateInviteCode?: Scalars['Boolean']['input'];
  /** Whether members with this role can create new roles */
  canCreateRole?: Scalars['Boolean']['input'];
  /** Whether members with this role can create new species */
  canCreateSpecies?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit characters */
  canEditCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit their own characters */
  canEditOwnCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit existing roles */
  canEditRole?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit species */
  canEditSpecies?: Scalars['Boolean']['input'];
  /** Whether members with this role can grant items to community members */
  canGrantItems?: Scalars['Boolean']['input'];
  /** Whether members with this role can list invite codes */
  canListInviteCodes?: Scalars['Boolean']['input'];
  /** Whether members with this role can create, edit, and delete item types */
  canManageItems?: Scalars['Boolean']['input'];
  /** Whether members with this role can change other members' roles */
  canManageMemberRoles?: Scalars['Boolean']['input'];
  /** Whether members with this role can remove community members */
  canRemoveCommunityMember?: Scalars['Boolean']['input'];
  /** The ID of the community this role belongs to */
  communityId: Scalars['ID']['input'];
  /** The name of the role */
  name: Scalars['String']['input'];
};

export type CreateSpeciesInput = {
  /** ID of the community that owns this species */
  communityId: Scalars['ID']['input'];
  /** Whether this species has an associated image */
  hasImage?: InputMaybe<Scalars['Boolean']['input']>;
  /** Name of the species */
  name: Scalars['String']['input'];
};

export type CreateSpeciesVariantInput = {
  /** Name of the species variant */
  name: Scalars['String']['input'];
  /** ID of the species this variant belongs to */
  speciesId: Scalars['ID']['input'];
};

/** Input type for creating new text media */
export type CreateTextMediaInput = {
  /** Optional character to associate with this media */
  characterId?: InputMaybe<Scalars['ID']['input']>;
  /** The actual text content */
  content: Scalars['String']['input'];
  /** Optional description for the text media */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Text formatting type (plaintext or markdown) */
  formatting?: TextFormatting;
  /** Optional gallery to add this media to */
  galleryId?: InputMaybe<Scalars['ID']['input']>;
  /** Optional tags to associate with this media */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Title for the text media */
  title: Scalars['String']['input'];
  /** Visibility setting for the media */
  visibility?: Visibility;
};

export type CreateTraitInput = {
  /** Name of the trait */
  name: Scalars['String']['input'];
  /** ID of the species this trait belongs to */
  speciesId: Scalars['ID']['input'];
  /** Type of values this trait can store */
  valueType: TraitValueType;
};

export type CreateTraitListEntryInput = {
  /** Default integer value for this trait */
  defaultValueInt?: InputMaybe<Scalars['Int']['input']>;
  /** Default string value for this trait */
  defaultValueString?: InputMaybe<Scalars['String']['input']>;
  /** Default timestamp value for this trait */
  defaultValueTimestamp?: InputMaybe<Scalars['DateTime']['input']>;
  /** Display order of this trait in the variant's trait list */
  order: Scalars['Int']['input'];
  /** Whether this trait is required for critters using this variant */
  required: Scalars['Boolean']['input'];
  /** ID of the species variant this entry belongs to */
  speciesVariantId: Scalars['ID']['input'];
  /** ID of the trait this entry configures */
  traitId: Scalars['ID']['input'];
  /** Type of values this trait stores */
  valueType: TraitValueType;
};

export type EnumValue = {
  __typename?: 'EnumValue';
  /** When the enum value was created */
  createdAt: Scalars['DateTime']['output'];
  /** Unique identifier for the enum value */
  id: Scalars['ID']['output'];
  /** Name/display text of this enum value */
  name: Scalars['String']['output'];
  /** Display order within the trait's enum values */
  order: Scalars['Int']['output'];
  /** The trait this enum value belongs to */
  trait: Trait;
  /** ID of the trait this enum value belongs to */
  traitId: Scalars['ID']['output'];
  /** When the enum value was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

export type EnumValueConnection = {
  __typename?: 'EnumValueConnection';
  /** Whether there are more enum values after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more enum values before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of enum values in this connection */
  nodes: Array<EnumValue>;
  /** Total number of enum values available */
  totalCount: Scalars['Float']['output'];
};

export type EnumValueSetting = {
  __typename?: 'EnumValueSetting';
  /** When the enum value setting was created */
  createdAt: Scalars['DateTime']['output'];
  /** The enum value this setting allows */
  enumValue: EnumValue;
  /** ID of the enum value this setting allows */
  enumValueId: Scalars['ID']['output'];
  /** Unique identifier for the enum value setting */
  id: Scalars['ID']['output'];
  /** The species variant this setting belongs to */
  speciesVariant: SpeciesVariant;
  /** ID of the species variant this setting belongs to */
  speciesVariantId: Scalars['ID']['output'];
  /** When the enum value setting was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

export type EnumValueSettingConnection = {
  __typename?: 'EnumValueSettingConnection';
  /** Whether there are more enum value settings after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more enum value settings before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of enum value settings in this connection */
  nodes: Array<EnumValueSetting>;
  /** Total number of enum value settings available */
  totalCount: Scalars['Float']['output'];
};

export type ExternalAccount = {
  __typename?: 'ExternalAccount';
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  provider: ExternalAccountProvider;
  providerAccountId: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

/** External account providers supported for account linking */
export enum ExternalAccountProvider {
  Deviantart = 'DEVIANTART'
}

export type FollowListResult = {
  __typename?: 'FollowListResult';
  followers: Array<User>;
  following: Array<User>;
  user: User;
};

export type FollowResult = {
  __typename?: 'FollowResult';
  followersCount: Scalars['Float']['output'];
  followingCount: Scalars['Float']['output'];
  isFollowing: Scalars['Boolean']['output'];
  targetUserId: Scalars['ID']['output'];
};

export type FollowStatus = {
  __typename?: 'FollowStatus';
  followersCount: Scalars['Float']['output'];
  followingCount: Scalars['Float']['output'];
  isFollowing: Scalars['Boolean']['output'];
};

export type Gallery = {
  __typename?: 'Gallery';
  _count: GalleryCount;
  character: Maybe<Character>;
  characterId: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  likesCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  owner: User;
  ownerId: Scalars['ID']['output'];
  sortOrder: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userHasLiked: Scalars['Boolean']['output'];
  visibility: Visibility;
};

export type GalleryConnection = {
  __typename?: 'GalleryConnection';
  galleries: Array<Gallery>;
  hasMore: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

export type GalleryCount = {
  __typename?: 'GalleryCount';
  media: Scalars['Int']['output'];
};

export type GalleryFiltersInput = {
  characterId?: InputMaybe<Scalars['ID']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  ownerId?: InputMaybe<Scalars['ID']['input']>;
  visibility?: InputMaybe<Visibility>;
};

export type GrantItemInput = {
  itemTypeId: Scalars['ID']['input'];
  metadata?: InputMaybe<Scalars['String']['input']>;
  quantity?: Scalars['Int']['input'];
  userId: Scalars['ID']['input'];
};

export type Image = {
  __typename?: 'Image';
  altText: Maybe<Scalars['String']['output']>;
  artist: Maybe<User>;
  artistId: Maybe<Scalars['ID']['output']>;
  artistName: Maybe<Scalars['String']['output']>;
  artistUrl: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  fileSize: Scalars['Int']['output'];
  filename: Scalars['String']['output'];
  height: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isNsfw: Scalars['Boolean']['output'];
  likesCount: Scalars['Int']['output'];
  mimeType: Scalars['String']['output'];
  originalFilename: Scalars['String']['output'];
  sensitiveContentDescription: Maybe<Scalars['String']['output']>;
  source: Maybe<Scalars['String']['output']>;
  tags_rel: Maybe<Array<ImageTag>>;
  thumbnailUrl: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  uploader: User;
  uploaderId: Scalars['ID']['output'];
  url: Scalars['String']['output'];
  userHasLiked: Scalars['Boolean']['output'];
  width: Scalars['Int']['output'];
};

export type ImageConnection = {
  __typename?: 'ImageConnection';
  hasMore: Scalars['Boolean']['output'];
  images: Array<Image>;
  total: Scalars['Int']['output'];
};

export type ImageFiltersInput = {
  artistId?: InputMaybe<Scalars['ID']['input']>;
  isNsfw?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  uploaderId?: InputMaybe<Scalars['ID']['input']>;
};

export type ImageTag = {
  __typename?: 'ImageTag';
  image: Image;
  tag: Tag;
};

export type Inventory = {
  __typename?: 'Inventory';
  communityId: Scalars['ID']['output'];
  items: Array<Item>;
  totalItems: Scalars['Float']['output'];
};

/** An invite code that can be used to join a community with an optional role */
export type InviteCode = {
  __typename?: 'InviteCode';
  /** Number of times this invite code has been claimed */
  claimCount: Scalars['Int']['output'];
  /** When the invite code was created */
  createdAt: Scalars['DateTime']['output'];
  /** The user who created this invite code */
  creator: User;
  /** The ID of the user who created this invite code */
  creatorId: Scalars['ID']['output'];
  /** The unique invite code string */
  id: Scalars['ID']['output'];
  /** Whether this invite code is still available for use */
  isAvailable: Scalars['Boolean']['output'];
  /** Maximum number of times this invite code can be claimed */
  maxClaims: Scalars['Int']['output'];
  /** Number of remaining uses for this invite code */
  remainingClaims: Scalars['Int']['output'];
  /** The role to grant when this invite code is used */
  role: Maybe<Role>;
  /** The ID of the role to grant when this invite code is used */
  roleId: Maybe<Scalars['ID']['output']>;
  /** When the invite code was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

/** Paginated list of invite codes with connection metadata */
export type InviteCodeConnection = {
  __typename?: 'InviteCodeConnection';
  /** Whether there are more invite codes after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are invite codes before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The invite codes in this page */
  nodes: Array<InviteCode>;
  /** Total count of invite codes matching the query */
  totalCount: Scalars['Float']['output'];
};

export type Item = {
  __typename?: 'Item';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  itemType: ItemType;
  itemTypeId: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  owner: User;
  ownerId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ItemType = {
  __typename?: 'ItemType';
  category: Maybe<Scalars['String']['output']>;
  color: Maybe<Scalars['String']['output']>;
  community: Maybe<Community>;
  communityId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  iconUrl: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl: Maybe<Scalars['String']['output']>;
  isConsumable: Scalars['Boolean']['output'];
  isStackable: Scalars['Boolean']['output'];
  isTradeable: Scalars['Boolean']['output'];
  itemType: ItemType;
  maxStackSize: Maybe<Scalars['Int']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  owner: User;
  updatedAt: Scalars['DateTime']['output'];
};

export type ItemTypeConnection = {
  __typename?: 'ItemTypeConnection';
  hasMore: Scalars['Boolean']['output'];
  itemTypes: Array<ItemType>;
  total: Scalars['Int']['output'];
};

export type ItemTypeFiltersInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  communityId?: InputMaybe<Scalars['ID']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};

export type LikeResult = {
  __typename?: 'LikeResult';
  entityId: Scalars['ID']['output'];
  entityType: LikeableType;
  isLiked: Scalars['Boolean']['output'];
  likesCount: Scalars['Float']['output'];
};

export type LikeStatus = {
  __typename?: 'LikeStatus';
  isLiked: Scalars['Boolean']['output'];
  likesCount: Scalars['Float']['output'];
};

/** Types of entities that can be liked */
export enum LikeableType {
  Character = 'CHARACTER',
  Comment = 'COMMENT',
  Gallery = 'GALLERY',
  Image = 'IMAGE',
  Media = 'MEDIA'
}

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

/** Input type for managing media tags */
export type ManageMediaTagsInput = {
  /** Array of tag names to add or remove */
  tagNames: Array<Scalars['String']['input']>;
};

export type ManageTagsInput = {
  tagNames: Array<Scalars['String']['input']>;
};

/** Polymorphic media that can represent both images and text content */
export type Media = {
  __typename?: 'Media';
  /** The character this media is associated with, if any */
  character: Maybe<Character>;
  /** Number of characters this media is associated with */
  characterCount: Scalars['Int']['output'];
  /** Optional ID of the character this media is associated with */
  characterId: Maybe<Scalars['ID']['output']>;
  /** When the media was created */
  createdAt: Scalars['DateTime']['output'];
  /** Optional description for the media */
  description: Maybe<Scalars['String']['output']>;
  /** The gallery this media belongs to, if any */
  gallery: Maybe<Gallery>;
  /** Number of galleries this media appears in */
  galleryCount: Scalars['Int']['output'];
  /** Optional ID of the gallery this media belongs to */
  galleryId: Maybe<Scalars['ID']['output']>;
  /** Unique identifier for the media */
  id: Scalars['ID']['output'];
  /** Image content (populated for image media) */
  image: Maybe<Image>;
  /** Foreign key to image content (null for text media) */
  imageId: Maybe<Scalars['ID']['output']>;
  likesCount: Scalars['Int']['output'];
  /** The user who owns this media */
  owner: User;
  /** ID of the user who owns this media */
  ownerId: Scalars['ID']['output'];
  /** Tag relationships for this media */
  tags_rel: Maybe<Array<MediaTag>>;
  /** Text content (populated for text media) */
  textContent: Maybe<TextContent>;
  /** Foreign key to text content (null for image media) */
  textContentId: Maybe<Scalars['ID']['output']>;
  /** User-provided title for the media */
  title: Scalars['String']['output'];
  /** When the media was last updated */
  updatedAt: Scalars['DateTime']['output'];
  userHasLiked: Scalars['Boolean']['output'];
  /** Visibility setting for the media */
  visibility: Visibility;
};

/** Paginated connection result for media queries */
export type MediaConnection = {
  __typename?: 'MediaConnection';
  /** Whether there are more items available after this page */
  hasMore: Scalars['Boolean']['output'];
  /** Total number of image media items in the full result set */
  imageCount: Scalars['Float']['output'];
  /** Array of media items for this page */
  media: Array<Media>;
  /** Total number of text media items in the full result set */
  textCount: Scalars['Float']['output'];
  /** Total number of media items matching the query */
  total: Scalars['Float']['output'];
};

/** Input type for filtering and paginating media queries */
export type MediaFiltersInput = {
  /** Filter by associated character ID */
  characterId?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by gallery ID */
  galleryId?: InputMaybe<Scalars['ID']['input']>;
  /** Maximum number of results to return */
  limit?: InputMaybe<Scalars['Float']['input']>;
  /** Filter by media type (image or text) */
  mediaType?: InputMaybe<MediaType>;
  /** Number of results to skip for pagination */
  offset?: InputMaybe<Scalars['Float']['input']>;
  /** Filter by owner user ID */
  ownerId?: InputMaybe<Scalars['ID']['input']>;
  /** Search term to filter by title and description */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter by visibility level */
  visibility?: InputMaybe<Visibility>;
};

/** Junction entity for media-tag relationships */
export type MediaTag = {
  __typename?: 'MediaTag';
  /** The media this tag is associated with */
  media: Maybe<Media>;
  /** The tag applied to the media */
  tag: Tag;
};

/** The type of media content for filtering */
export enum MediaType {
  Image = 'IMAGE',
  Text = 'TEXT'
}

export type Mutation = {
  __typename?: 'Mutation';
  addCharacterTags: Character;
  /** Adds tags to a media item */
  addMediaTags: Media;
  /** Claim an invite code to join a community */
  claimInviteCode: InviteCode;
  createCharacter: Character;
  /** Create a new character ownership change record */
  createCharacterOwnershipChange: CharacterOwnershipChange;
  createComment: Comment;
  /** Create a new community */
  createCommunity: Community;
  /** Create a new community invitation */
  createCommunityInvitation: CommunityInvitation;
  /** Create a new community membership */
  createCommunityMember: CommunityMember;
  /** Create a new enum value */
  createEnumValue: EnumValue;
  /** Create a new enum value setting */
  createEnumValueSetting: EnumValueSetting;
  createGallery: Gallery;
  /** Create a new invite code */
  createInviteCode: InviteCode;
  createItemType: ItemType;
  /** Create a new role */
  createRole: Role;
  /** Create a new species */
  createSpecies: Species;
  /** Create a new species variant */
  createSpeciesVariant: SpeciesVariant;
  /** Creates a new text media item */
  createTextMedia: Media;
  /** Create a new trait */
  createTrait: Trait;
  /** Create a new trait list entry */
  createTraitListEntry: TraitListEntry;
  deleteAccount: RemovalResponse;
  deleteCharacter: Scalars['Boolean']['output'];
  deleteComment: Scalars['Boolean']['output'];
  deleteGallery: RemovalResponse;
  deleteImage: Scalars['Boolean']['output'];
  /** Delete an item (admin only) */
  deleteItem: Scalars['Boolean']['output'];
  deleteItemType: Scalars['Boolean']['output'];
  /** Deletes a media item and its associated content */
  deleteMedia: Scalars['Boolean']['output'];
  /** Grant an item to a user (admin only) */
  grantItem: Item;
  login: AuthPayload;
  refreshToken: Scalars['String']['output'];
  /** Remove a character ownership change record */
  removeCharacterOwnershipChange: RemovalResponse;
  removeCharacterTags: Character;
  /** Remove a community */
  removeCommunity: RemovalResponse;
  /** Remove a community invitation */
  removeCommunityInvitation: CommunityInvitation;
  /** Remove a community membership (leave community OR remove member with permission) */
  removeCommunityMember: CommunityMember;
  /** Remove an enum value */
  removeEnumValue: RemovalResponse;
  /** Remove an enum value setting */
  removeEnumValueSetting: RemovalResponse;
  /** Remove an invite code */
  removeInviteCode: RemovalResponse;
  /** Removes tags from a media item */
  removeMediaTags: Media;
  /** Remove a role */
  removeRole: RemovalResponse;
  /** Remove a species */
  removeSpecies: RemovalResponse;
  /** Remove a species variant */
  removeSpeciesVariant: RemovalResponse;
  /** Remove a trait */
  removeTrait: RemovalResponse;
  /** Remove a trait list entry */
  removeTraitListEntry: RemovalResponse;
  reorderGalleries: Array<Gallery>;
  /** Respond to a community invitation (accept or decline) */
  respondToCommunityInvitation: CommunityInvitation;
  /** Sets or clears the main media for a character */
  setCharacterMainMedia: Character;
  signup: AuthPayload;
  toggleFollow: FollowResult;
  toggleLike: LikeResult;
  transferCharacter: Character;
  /** Unlink an external account from the current user */
  unlinkExternalAccount: Scalars['Boolean']['output'];
  updateCharacter: Character;
  /** Update character trait values */
  updateCharacterTraits: Character;
  updateComment: Comment;
  /** Update a community */
  updateCommunity: Community;
  /** Update a community membership (change role) */
  updateCommunityMember: CommunityMember;
  /** Update an enum value */
  updateEnumValue: EnumValue;
  /** Update an enum value setting */
  updateEnumValueSetting: EnumValueSetting;
  updateGallery: Gallery;
  updateImage: Image;
  /** Update an invite code */
  updateInviteCode: InviteCode;
  /** Update an item (admin only) */
  updateItem: Item;
  updateItemType: ItemType;
  /** Updates media metadata (title, description, etc.) */
  updateMedia: Media;
  updateProfile: User;
  /** Update a role */
  updateRole: Role;
  /** Update a species */
  updateSpecies: Species;
  /** Update a species variant */
  updateSpeciesVariant: SpeciesVariant;
  /** Updates the text content of a text media item */
  updateTextContent: Media;
  /** Update a trait */
  updateTrait: Trait;
  /** Update a trait list entry */
  updateTraitListEntry: TraitListEntry;
  /** Batch update trait display orders for a species variant */
  updateTraitOrders: Array<TraitListEntry>;
};


export type MutationAddCharacterTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
};


export type MutationAddMediaTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageMediaTagsInput;
};


export type MutationClaimInviteCodeArgs = {
  claimInviteCodeInput: ClaimInviteCodeInput;
  id: Scalars['ID']['input'];
};


export type MutationCreateCharacterArgs = {
  input: CreateCharacterInput;
};


export type MutationCreateCharacterOwnershipChangeArgs = {
  createCharacterOwnershipChangeInput: CreateCharacterOwnershipChangeInput;
};


export type MutationCreateCommentArgs = {
  input: CreateCommentInput;
};


export type MutationCreateCommunityArgs = {
  createCommunityInput: CreateCommunityInput;
};


export type MutationCreateCommunityInvitationArgs = {
  createCommunityInvitationInput: CreateCommunityInvitationInput;
};


export type MutationCreateCommunityMemberArgs = {
  createCommunityMemberInput: CreateCommunityMemberInput;
};


export type MutationCreateEnumValueArgs = {
  createEnumValueInput: CreateEnumValueInput;
};


export type MutationCreateEnumValueSettingArgs = {
  createEnumValueSettingInput: CreateEnumValueSettingInput;
};


export type MutationCreateGalleryArgs = {
  input: CreateGalleryInput;
};


export type MutationCreateInviteCodeArgs = {
  createInviteCodeInput: CreateInviteCodeInput;
};


export type MutationCreateItemTypeArgs = {
  input: CreateItemTypeInput;
};


export type MutationCreateRoleArgs = {
  createRoleInput: CreateRoleInput;
};


export type MutationCreateSpeciesArgs = {
  createSpeciesInput: CreateSpeciesInput;
};


export type MutationCreateSpeciesVariantArgs = {
  createSpeciesVariantInput: CreateSpeciesVariantInput;
};


export type MutationCreateTextMediaArgs = {
  input: CreateTextMediaInput;
};


export type MutationCreateTraitArgs = {
  createTraitInput: CreateTraitInput;
};


export type MutationCreateTraitListEntryArgs = {
  createTraitListEntryInput: CreateTraitListEntryInput;
};


export type MutationDeleteCharacterArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteGalleryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteImageArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteItemTypeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMediaArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGrantItemArgs = {
  input: GrantItemInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationRefreshTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationRemoveCharacterOwnershipChangeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveCharacterTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
};


export type MutationRemoveCommunityArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveCommunityInvitationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveCommunityMemberArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveEnumValueArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveEnumValueSettingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveInviteCodeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveMediaTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageMediaTagsInput;
};


export type MutationRemoveRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveSpeciesArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveSpeciesVariantArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTraitArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTraitListEntryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationReorderGalleriesArgs = {
  input: ReorderGalleriesInput;
};


export type MutationRespondToCommunityInvitationArgs = {
  id: Scalars['ID']['input'];
  respondToCommunityInvitationInput: RespondToCommunityInvitationInput;
};


export type MutationSetCharacterMainMediaArgs = {
  id: Scalars['ID']['input'];
  input: SetMainMediaInput;
};


export type MutationSignupArgs = {
  input: SignupInput;
};


export type MutationToggleFollowArgs = {
  input: ToggleFollowInput;
};


export type MutationToggleLikeArgs = {
  input: ToggleLikeInput;
};


export type MutationTransferCharacterArgs = {
  id: Scalars['ID']['input'];
  input: TransferCharacterInput;
};


export type MutationUnlinkExternalAccountArgs = {
  input: UnlinkExternalAccountInput;
};


export type MutationUpdateCharacterArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCharacterInput;
};


export type MutationUpdateCharacterTraitsArgs = {
  id: Scalars['ID']['input'];
  updateCharacterTraitsInput: UpdateCharacterTraitsInput;
};


export type MutationUpdateCommentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCommentInput;
};


export type MutationUpdateCommunityArgs = {
  id: Scalars['ID']['input'];
  updateCommunityInput: UpdateCommunityInput;
};


export type MutationUpdateCommunityMemberArgs = {
  id: Scalars['ID']['input'];
  updateCommunityMemberInput: UpdateCommunityMemberInput;
};


export type MutationUpdateEnumValueArgs = {
  id: Scalars['ID']['input'];
  updateEnumValueInput: UpdateEnumValueInput;
};


export type MutationUpdateEnumValueSettingArgs = {
  id: Scalars['ID']['input'];
  updateEnumValueSettingInput: UpdateEnumValueSettingInput;
};


export type MutationUpdateGalleryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGalleryInput;
};


export type MutationUpdateImageArgs = {
  id: Scalars['ID']['input'];
  input: UpdateImageInput;
};


export type MutationUpdateInviteCodeArgs = {
  id: Scalars['ID']['input'];
  updateInviteCodeInput: UpdateInviteCodeInput;
};


export type MutationUpdateItemArgs = {
  id: Scalars['ID']['input'];
  input: UpdateItemInput;
};


export type MutationUpdateItemTypeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateItemTypeInput;
};


export type MutationUpdateMediaArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMediaInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateUserInput;
};


export type MutationUpdateRoleArgs = {
  id: Scalars['ID']['input'];
  updateRoleInput: UpdateRoleInput;
};


export type MutationUpdateSpeciesArgs = {
  id: Scalars['ID']['input'];
  updateSpeciesInput: UpdateSpeciesInput;
};


export type MutationUpdateSpeciesVariantArgs = {
  id: Scalars['ID']['input'];
  updateSpeciesVariantInput: UpdateSpeciesVariantInput;
};


export type MutationUpdateTextContentArgs = {
  input: UpdateTextContentInput;
  mediaId: Scalars['ID']['input'];
};


export type MutationUpdateTraitArgs = {
  id: Scalars['ID']['input'];
  updateTraitInput: UpdateTraitInput;
};


export type MutationUpdateTraitListEntryArgs = {
  id: Scalars['ID']['input'];
  updateTraitListEntryInput: UpdateTraitListEntryInput;
};


export type MutationUpdateTraitOrdersArgs = {
  input: UpdateTraitOrdersInput;
};

export type Query = {
  __typename?: 'Query';
  activityFeed: Array<ActivityItem>;
  character: Character;
  characterGalleries: GalleryConnection;
  characterImages: ImageConnection;
  /** Retrieves media associated with a specific character */
  characterMedia: MediaConnection;
  /** Get a character ownership change by ID */
  characterOwnershipChangeById: CharacterOwnershipChange;
  /** Get all character ownership changes with pagination */
  characterOwnershipChanges: CharacterOwnershipChangeConnection;
  /** Get character ownership changes by character ID with pagination */
  characterOwnershipChangesByCharacter: CharacterOwnershipChangeConnection;
  /** Get character ownership changes by user ID with pagination */
  characterOwnershipChangesByUser: CharacterOwnershipChangeConnection;
  characters: CharacterConnection;
  comment: Comment;
  comments: CommentConnection;
  /** Get all communities with pagination */
  communities: CommunityConnection;
  /** Get a community by ID */
  community: Community;
  /** Get a community invitation by ID */
  communityInvitationById: CommunityInvitation;
  /** Get all community invitations with pagination */
  communityInvitations: CommunityInvitationConnection;
  /** Get community invitations by community ID with pagination */
  communityInvitationsByCommunity: CommunityInvitationConnection;
  /** Get community invitations by invitee ID with pagination */
  communityInvitationsByInvitee: CommunityInvitationConnection;
  /** Get a community member by ID */
  communityMemberById: CommunityMember;
  /** Get all community members with pagination */
  communityMembers: CommunityMemberConnection;
  /** Get community members by community ID with pagination */
  communityMembersByCommunity: CommunityMemberConnection;
  /** Get community members by user ID with pagination */
  communityMembersByUser: CommunityMemberConnection;
  /** Get an enum value by ID */
  enumValueById: EnumValue;
  /** Get an enum value setting by ID */
  enumValueSettingById: EnumValueSetting;
  /** Get all enum value settings with pagination */
  enumValueSettings: EnumValueSettingConnection;
  /** Get enum value settings by enum value ID with pagination */
  enumValueSettingsByEnumValue: EnumValueSettingConnection;
  /** Get enum value settings by species variant ID with pagination */
  enumValueSettingsBySpeciesVariant: EnumValueSettingConnection;
  /** Get all enum values with pagination */
  enumValues: EnumValueConnection;
  /** Get enum values by trait ID with pagination */
  enumValuesByTrait: EnumValueConnection;
  followStatus: FollowStatus;
  galleries: GalleryConnection;
  gallery: Gallery;
  galleryImages: ImageConnection;
  /** Retrieves media from a specific gallery */
  galleryMedia: MediaConnection;
  getFollowers: FollowListResult;
  getFollowing: FollowListResult;
  image: Image;
  images: ImageConnection;
  /** Get an invite code by ID */
  inviteCodeById: InviteCode;
  /** Get all invite codes with pagination */
  inviteCodes: InviteCodeConnection;
  /** Get invite codes by creator ID with pagination */
  inviteCodesByCreator: InviteCodeConnection;
  /** Get invite codes by role ID with pagination */
  inviteCodesByRole: InviteCodeConnection;
  itemType: ItemType;
  itemTypes: ItemTypeConnection;
  likeStatus: LikeStatus;
  likedCharacters: Array<Character>;
  likedGalleries: Array<Gallery>;
  likedImages: Array<Image>;
  likedMedia: MediaConnection;
  me: User;
  /** Retrieves paginated media with filtering and visibility controls */
  media: MediaConnection;
  /** Retrieves a single media item by ID */
  mediaItem: Media;
  myCharacters: CharacterConnection;
  /** Get all external accounts linked to the current user */
  myExternalAccounts: Array<ExternalAccount>;
  myGalleries: GalleryConnection;
  myImages: ImageConnection;
  /** Retrieves media owned by the current authenticated user */
  myMedia: MediaConnection;
  /** Get a role by ID */
  roleById: Role;
  /** Get all roles with pagination */
  roles: RoleConnection;
  /** Get roles by community ID with pagination */
  rolesByCommunity: RoleConnection;
  /** Search for tags by name or get popular suggestions */
  searchTags: Array<Tag>;
  /** Get all species with pagination */
  species: SpeciesConnection;
  /** Get species by community ID with pagination */
  speciesByCommunity: SpeciesConnection;
  /** Get a species by ID */
  speciesById: Species;
  /** Get a species variant by ID */
  speciesVariantById: SpeciesVariant;
  /** Get all species variants with pagination */
  speciesVariants: SpeciesVariantConnection;
  /** Get species variants by species ID with pagination */
  speciesVariantsBySpecies: SpeciesVariantConnection;
  /** Get a trait by ID */
  traitById: Trait;
  /** Get all trait list entries with pagination */
  traitListEntries: TraitListEntryConnection;
  /** Get trait list entries by species variant ID with pagination */
  traitListEntriesBySpeciesVariant: TraitListEntryConnection;
  /** Get trait list entries by trait ID with pagination */
  traitListEntriesByTrait: TraitListEntryConnection;
  /** Get a trait list entry by ID */
  traitListEntryById: TraitListEntry;
  /** Get all traits with pagination */
  traits: TraitConnection;
  /** Get traits by species ID with pagination, optionally ordered by variant-specific order */
  traitsBySpecies: TraitConnection;
  user: Maybe<User>;
  userCharacters: CharacterConnection;
  userGalleries: GalleryConnection;
  userImages: ImageConnection;
  /** Retrieves media owned by a specific user */
  userMedia: MediaConnection;
  userProfile: Maybe<UserProfile>;
  userStats: UserStats;
  users: UserConnection;
};


export type QueryActivityFeedArgs = {
  input?: InputMaybe<ActivityFeedInput>;
};


export type QueryCharacterArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCharacterGalleriesArgs = {
  characterId: Scalars['ID']['input'];
  filters?: InputMaybe<GalleryFiltersInput>;
};


export type QueryCharacterImagesArgs = {
  characterId: Scalars['ID']['input'];
  filters?: InputMaybe<ImageFiltersInput>;
};


export type QueryCharacterMediaArgs = {
  characterId: Scalars['ID']['input'];
  filters?: InputMaybe<MediaFiltersInput>;
};


export type QueryCharacterOwnershipChangeByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCharacterOwnershipChangesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCharacterOwnershipChangesByCharacterArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  characterId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCharacterOwnershipChangesByUserArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
};


export type QueryCharactersArgs = {
  filters?: InputMaybe<CharacterFiltersInput>;
};


export type QueryCommentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommentsArgs = {
  filters: CommentFiltersInput;
};


export type QueryCommunitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCommunityArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommunityInvitationByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommunityInvitationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCommunityInvitationsByCommunityArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  communityId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCommunityInvitationsByInviteeArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  inviteeId: Scalars['ID']['input'];
};


export type QueryCommunityMemberByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommunityMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCommunityMembersByCommunityArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  communityId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCommunityMembersByUserArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
};


export type QueryEnumValueByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEnumValueSettingByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEnumValueSettingsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEnumValueSettingsByEnumValueArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  enumValueId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEnumValueSettingsBySpeciesVariantArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  speciesVariantId: Scalars['ID']['input'];
};


export type QueryEnumValuesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEnumValuesByTraitArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  traitId: Scalars['ID']['input'];
};


export type QueryFollowStatusArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGalleriesArgs = {
  filters?: InputMaybe<GalleryFiltersInput>;
};


export type QueryGalleryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGalleryImagesArgs = {
  filters?: InputMaybe<ImageFiltersInput>;
  galleryId: Scalars['ID']['input'];
};


export type QueryGalleryMediaArgs = {
  filters?: InputMaybe<MediaFiltersInput>;
  galleryId: Scalars['ID']['input'];
};


export type QueryGetFollowersArgs = {
  username: Scalars['String']['input'];
};


export type QueryGetFollowingArgs = {
  username: Scalars['String']['input'];
};


export type QueryImageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryImagesArgs = {
  filters?: InputMaybe<ImageFiltersInput>;
};


export type QueryInviteCodeByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInviteCodesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  communityId?: InputMaybe<Scalars['ID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryInviteCodesByCreatorArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  creatorId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryInviteCodesByRoleArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  roleId: Scalars['ID']['input'];
};


export type QueryItemTypeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryItemTypesArgs = {
  filters?: InputMaybe<ItemTypeFiltersInput>;
};


export type QueryLikeStatusArgs = {
  entityId: Scalars['ID']['input'];
  entityType: LikeableType;
};


export type QueryLikedMediaArgs = {
  filters?: InputMaybe<MediaFiltersInput>;
};


export type QueryMediaArgs = {
  filters?: InputMaybe<MediaFiltersInput>;
};


export type QueryMediaItemArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMyCharactersArgs = {
  filters?: InputMaybe<CharacterFiltersInput>;
};


export type QueryMyGalleriesArgs = {
  filters?: InputMaybe<GalleryFiltersInput>;
};


export type QueryMyImagesArgs = {
  filters?: InputMaybe<ImageFiltersInput>;
};


export type QueryMyMediaArgs = {
  filters?: InputMaybe<MediaFiltersInput>;
};


export type QueryRoleByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRolesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRolesByCommunityArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  communityId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySearchTagsArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySpeciesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySpeciesByCommunityArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  communityId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySpeciesByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySpeciesVariantByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySpeciesVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySpeciesVariantsBySpeciesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  speciesId: Scalars['ID']['input'];
};


export type QueryTraitByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTraitListEntriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTraitListEntriesBySpeciesVariantArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  speciesVariantId: Scalars['ID']['input'];
};


export type QueryTraitListEntriesByTraitArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  traitId: Scalars['ID']['input'];
};


export type QueryTraitListEntryByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTraitsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTraitsBySpeciesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  speciesId: Scalars['ID']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryUserArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserCharactersArgs = {
  filters?: InputMaybe<CharacterFiltersInput>;
  userId: Scalars['ID']['input'];
};


export type QueryUserGalleriesArgs = {
  filters?: InputMaybe<GalleryFiltersInput>;
  userId: Scalars['ID']['input'];
};


export type QueryUserImagesArgs = {
  filters?: InputMaybe<ImageFiltersInput>;
  userId: Scalars['ID']['input'];
};


export type QueryUserMediaArgs = {
  filters?: InputMaybe<MediaFiltersInput>;
  userId: Scalars['ID']['input'];
};


export type QueryUserProfileArgs = {
  username: Scalars['String']['input'];
};


export type QueryUserStatsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};

/** Response confirming successful removal of an entity */
export type RemovalResponse = {
  __typename?: 'RemovalResponse';
  /** Optional message about the removal */
  message: Maybe<Scalars['String']['output']>;
  /** Whether the entity was successfully removed */
  removed: Scalars['Boolean']['output'];
};

export type ReorderGalleriesInput = {
  galleryIds: Array<Scalars['ID']['input']>;
};

/** Input for responding to a community invitation */
export type RespondToCommunityInvitationInput = {
  /** Whether to accept (true) or decline (false) the invitation */
  accept: Scalars['Boolean']['input'];
};

/** A role within a community that defines permissions for members */
export type Role = {
  __typename?: 'Role';
  /** Whether members with this role can create new characters */
  canCreateCharacter: Scalars['Boolean']['output'];
  /** Whether members with this role can create invite codes */
  canCreateInviteCode: Scalars['Boolean']['output'];
  /** Whether members with this role can create new roles */
  canCreateRole: Scalars['Boolean']['output'];
  /** Whether members with this role can create new species */
  canCreateSpecies: Scalars['Boolean']['output'];
  /** Whether members with this role can edit characters */
  canEditCharacter: Scalars['Boolean']['output'];
  /** Whether members with this role can edit their own characters */
  canEditOwnCharacter: Scalars['Boolean']['output'];
  /** Whether members with this role can edit existing roles */
  canEditRole: Scalars['Boolean']['output'];
  /** Whether members with this role can edit species */
  canEditSpecies: Scalars['Boolean']['output'];
  /** Whether members with this role can grant items to community members */
  canGrantItems: Scalars['Boolean']['output'];
  /** Whether members with this role can list invite codes */
  canListInviteCodes: Scalars['Boolean']['output'];
  /** Whether members with this role can create, edit, and delete item types */
  canManageItems: Scalars['Boolean']['output'];
  /** Whether members with this role can change other members' roles */
  canManageMemberRoles: Scalars['Boolean']['output'];
  /** Whether members with this role can remove community members */
  canRemoveCommunityMember: Scalars['Boolean']['output'];
  /** The community this role belongs to */
  community: Community;
  /** The ID of the community this role belongs to */
  communityId: Scalars['ID']['output'];
  /** When the role was created */
  createdAt: Scalars['DateTime']['output'];
  /** Unique identifier for the role */
  id: Scalars['ID']['output'];
  /** The name of the role */
  name: Scalars['String']['output'];
  /** When the role was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

/** Paginated list of roles with connection metadata */
export type RoleConnection = {
  __typename?: 'RoleConnection';
  /** Whether there are more roles after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are roles before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The roles in this page */
  nodes: Array<Role>;
  /** Total count of roles matching the query */
  totalCount: Scalars['Float']['output'];
};

export type SetMainMediaInput = {
  mediaId?: InputMaybe<Scalars['ID']['input']>;
};

export type SignupInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  inviteCode: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Species = {
  __typename?: 'Species';
  /** The community that owns this species */
  community: Community;
  /** ID of the community that owns this species */
  communityId: Scalars['ID']['output'];
  /** When the species was created */
  createdAt: Scalars['DateTime']['output'];
  /** Whether this species has an associated image */
  hasImage: Scalars['Boolean']['output'];
  /** Unique identifier for the species */
  id: Scalars['ID']['output'];
  /** Name of the species */
  name: Scalars['String']['output'];
  /** Traits associated with this species */
  traits: Array<Trait>;
  /** When the species was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

export type SpeciesConnection = {
  __typename?: 'SpeciesConnection';
  /** Whether there are more species after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more species before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of species in this connection */
  nodes: Array<Species>;
  /** Total number of species available */
  totalCount: Scalars['Float']['output'];
};

export type SpeciesVariant = {
  __typename?: 'SpeciesVariant';
  /** When the species variant was created */
  createdAt: Scalars['DateTime']['output'];
  /** Enum value settings for this species variant */
  enumValueSettings: Array<EnumValueSetting>;
  /** Unique identifier for the species variant */
  id: Scalars['ID']['output'];
  /** Name of the species variant */
  name: Scalars['String']['output'];
  /** The species this variant belongs to */
  species: Species;
  /** ID of the species this variant belongs to */
  speciesId: Scalars['ID']['output'];
  /** When the species variant was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

export type SpeciesVariantConnection = {
  __typename?: 'SpeciesVariantConnection';
  /** Whether there are more species variants after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more species variants before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of species variants in this connection */
  nodes: Array<SpeciesVariant>;
  /** Total number of species variants available */
  totalCount: Scalars['Float']['output'];
};

export type Tag = {
  __typename?: 'Tag';
  category: Maybe<Scalars['String']['output']>;
  color: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Text content with formatting and word count information */
export type TextContent = {
  __typename?: 'TextContent';
  /** The actual text content */
  content: Scalars['String']['output'];
  /** Text formatting type (plaintext or markdown) */
  formatting: TextFormatting;
  /** Unique identifier for the text content */
  id: Scalars['ID']['output'];
  /** Automatically calculated word count */
  wordCount: Scalars['Float']['output'];
};

/** The formatting type for text content */
export enum TextFormatting {
  Markdown = 'MARKDOWN',
  Plaintext = 'PLAINTEXT'
}

export type ToggleFollowInput = {
  targetUserId: Scalars['ID']['input'];
};

export type ToggleLikeInput = {
  entityId: Scalars['ID']['input'];
  entityType: LikeableType;
};

export type Trait = {
  __typename?: 'Trait';
  /** When the trait was created */
  createdAt: Scalars['DateTime']['output'];
  /** Enum values for this trait (only populated for ENUM traits) */
  enumValues: Array<EnumValue>;
  /** Unique identifier for the trait */
  id: Scalars['ID']['output'];
  /** Name of the trait */
  name: Scalars['String']['output'];
  /** The species this trait belongs to */
  species: Species;
  /** ID of the species this trait belongs to */
  speciesId: Scalars['ID']['output'];
  /** When the trait was last updated */
  updatedAt: Scalars['DateTime']['output'];
  /** Type of values this trait can store */
  valueType: TraitValueType;
};

export type TraitConnection = {
  __typename?: 'TraitConnection';
  /** Whether there are more traits after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more traits before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of traits in this connection */
  nodes: Array<Trait>;
  /** Total number of traits available */
  totalCount: Scalars['Float']['output'];
};

export type TraitListEntry = {
  __typename?: 'TraitListEntry';
  /** When the trait list entry was created */
  createdAt: Scalars['DateTime']['output'];
  /** Display value for the default value based on type */
  defaultDisplayValue: Maybe<Scalars['String']['output']>;
  /** Default integer value for this trait */
  defaultValueInt: Maybe<Scalars['Int']['output']>;
  /** Default string value for this trait */
  defaultValueString: Maybe<Scalars['String']['output']>;
  /** Default timestamp value for this trait */
  defaultValueTimestamp: Maybe<Scalars['DateTime']['output']>;
  /** Unique identifier for the trait list entry */
  id: Scalars['ID']['output'];
  /** Display order of this trait in the variant's trait list */
  order: Scalars['Int']['output'];
  /** Whether this trait is required for critters using this variant */
  required: Scalars['Boolean']['output'];
  /** The species variant this entry belongs to */
  speciesVariant: SpeciesVariant;
  /** ID of the species variant this entry belongs to */
  speciesVariantId: Scalars['ID']['output'];
  /** The trait this entry configures */
  trait: Trait;
  /** ID of the trait this entry configures */
  traitId: Scalars['ID']['output'];
  /** When the trait list entry was last updated */
  updatedAt: Scalars['DateTime']['output'];
  /** Type of values this trait stores */
  valueType: TraitValueType;
};

export type TraitListEntryConnection = {
  __typename?: 'TraitListEntryConnection';
  /** Whether there are more trait list entries after this page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more trait list entries before this page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of trait list entries in this connection */
  nodes: Array<TraitListEntry>;
  /** Total number of trait list entries available */
  totalCount: Scalars['Float']['output'];
};

export type TraitOrderInput = {
  /** New display order for this trait */
  order: Scalars['Int']['input'];
  /** ID of the trait */
  traitId: Scalars['ID']['input'];
};

/** Types of values that traits can store */
export enum TraitValueType {
  /** Enumerated value from predefined list */
  Enum = 'ENUM',
  /** Integer/numeric value */
  Integer = 'INTEGER',
  /** String/text value */
  String = 'STRING',
  /** Timestamp/date value */
  Timestamp = 'TIMESTAMP'
}

export type TransferCharacterInput = {
  newOwnerId: Scalars['ID']['input'];
};

export type UnlinkExternalAccountInput = {
  provider: ExternalAccountProvider;
};

export type UpdateCharacterInput = {
  age?: InputMaybe<Scalars['String']['input']>;
  customFields?: InputMaybe<Scalars['String']['input']>;
  details?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  isSellable?: InputMaybe<Scalars['Boolean']['input']>;
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
  mainMediaId?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  speciesId?: InputMaybe<Scalars['ID']['input']>;
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Trait values for the character */
  traitValues?: InputMaybe<Array<CharacterTraitValueInput>>;
  visibility?: InputMaybe<Visibility>;
};

/** Input for updating character trait values */
export type UpdateCharacterTraitsInput = {
  /** Array of trait values to set for the character */
  traitValues: Array<CharacterTraitValueInput>;
};

export type UpdateCommentInput = {
  content: Scalars['String']['input'];
};

export type UpdateCommunityInput = {
  /** Name of the community */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an existing community membership */
export type UpdateCommunityMemberInput = {
  /** The ID of the role to assign to the member */
  roleId: Scalars['ID']['input'];
};

export type UpdateEnumValueInput = {
  /** Name/display text of this enum value */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Display order within the trait's enum values */
  order?: InputMaybe<Scalars['Int']['input']>;
  /** ID of the trait this enum value belongs to */
  traitId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateEnumValueSettingInput = {
  /** ID of the enum value this setting allows */
  enumValueId?: InputMaybe<Scalars['ID']['input']>;
  /** ID of the species variant this setting belongs to */
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateGalleryInput = {
  characterId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  visibility?: InputMaybe<Visibility>;
};

export type UpdateImageInput = {
  altText?: InputMaybe<Scalars['String']['input']>;
  artistId?: InputMaybe<Scalars['ID']['input']>;
  artistName?: InputMaybe<Scalars['String']['input']>;
  artistUrl?: InputMaybe<Scalars['String']['input']>;
  isNsfw?: InputMaybe<Scalars['Boolean']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an existing invite code */
export type UpdateInviteCodeInput = {
  /** Maximum number of times this invite code can be claimed */
  maxClaims?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the role to grant when this invite code is used */
  roleId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateItemInput = {
  metadata?: InputMaybe<Scalars['String']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateItemTypeInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isConsumable?: InputMaybe<Scalars['Boolean']['input']>;
  isStackable?: InputMaybe<Scalars['Boolean']['input']>;
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
  maxStackSize?: InputMaybe<Scalars['Int']['input']>;
  metadata?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input type for updating media metadata */
export type UpdateMediaInput = {
  /** Updated character association */
  characterId?: InputMaybe<Scalars['ID']['input']>;
  /** Updated description for the media */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Updated gallery association */
  galleryId?: InputMaybe<Scalars['ID']['input']>;
  /** Updated tags */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Updated title for the media */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Updated visibility setting */
  visibility?: InputMaybe<Visibility>;
};

/** Input for updating an existing role */
export type UpdateRoleInput = {
  /** Whether members with this role can create new characters */
  canCreateCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create invite codes */
  canCreateInviteCode?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create new roles */
  canCreateRole?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create new species */
  canCreateSpecies?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit characters */
  canEditCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit their own characters */
  canEditOwnCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit existing roles */
  canEditRole?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit species */
  canEditSpecies?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can grant items to community members */
  canGrantItems?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can list invite codes */
  canListInviteCodes?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create, edit, and delete item types */
  canManageItems?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can change other members' roles */
  canManageMemberRoles?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can remove community members */
  canRemoveCommunityMember?: InputMaybe<Scalars['Boolean']['input']>;
  /** The name of the role */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSpeciesInput = {
  /** ID of the community that owns this species */
  communityId?: InputMaybe<Scalars['ID']['input']>;
  /** Whether this species has an associated image */
  hasImage?: InputMaybe<Scalars['Boolean']['input']>;
  /** Name of the species */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSpeciesVariantInput = {
  /** Name of the species variant */
  name?: InputMaybe<Scalars['String']['input']>;
  /** ID of the species this variant belongs to */
  speciesId?: InputMaybe<Scalars['ID']['input']>;
};

/** Input type for updating text content specifically */
export type UpdateTextContentInput = {
  /** Updated text content */
  content?: InputMaybe<Scalars['String']['input']>;
  /** Updated text formatting type */
  formatting?: InputMaybe<TextFormatting>;
};

export type UpdateTraitInput = {
  /** Name of the trait */
  name?: InputMaybe<Scalars['String']['input']>;
  /** ID of the species this trait belongs to */
  speciesId?: InputMaybe<Scalars['ID']['input']>;
  /** Type of values this trait can store */
  valueType?: InputMaybe<TraitValueType>;
};

export type UpdateTraitListEntryInput = {
  /** Default integer value for this trait */
  defaultValueInt?: InputMaybe<Scalars['Int']['input']>;
  /** Default string value for this trait */
  defaultValueString?: InputMaybe<Scalars['String']['input']>;
  /** Default timestamp value for this trait */
  defaultValueTimestamp?: InputMaybe<Scalars['DateTime']['input']>;
  /** Display order of this trait in the variant's trait list */
  order?: InputMaybe<Scalars['Int']['input']>;
  /** Whether this trait is required for critters using this variant */
  required?: InputMaybe<Scalars['Boolean']['input']>;
  /** ID of the species variant this entry belongs to */
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
  /** ID of the trait this entry configures */
  traitId?: InputMaybe<Scalars['ID']['input']>;
  /** Type of values this trait stores */
  valueType?: InputMaybe<TraitValueType>;
};

export type UpdateTraitOrdersInput = {
  /** Array of trait order updates */
  traitOrders: Array<TraitOrderInput>;
  /** ID of the species variant */
  variantId: Scalars['ID']['input'];
};

export type UpdateUserInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  privacySettings?: InputMaybe<Scalars['JSON']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  avatarUrl: Maybe<Scalars['String']['output']>;
  bio: Maybe<Scalars['String']['output']>;
  canCreateCommunity: Scalars['Boolean']['output'];
  canCreateInviteCode: Scalars['Boolean']['output'];
  canGrantGlobalPermissions: Scalars['Boolean']['output'];
  canListInviteCodes: Scalars['Boolean']['output'];
  canListUsers: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  dateOfBirth: Maybe<Scalars['DateTime']['output']>;
  displayName: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  externalAccounts: Array<ExternalAccount>;
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** User's inventories across different communities */
  inventories: Array<Inventory>;
  isAdmin: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  location: Maybe<Scalars['String']['output']>;
  privacySettings: Scalars['JSON']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userIsFollowing: Scalars['Boolean']['output'];
  username: Scalars['String']['output'];
  website: Maybe<Scalars['String']['output']>;
};


export type UserInventoriesArgs = {
  communityId?: InputMaybe<Scalars['ID']['input']>;
};

export type UserConnection = {
  __typename?: 'UserConnection';
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  nodes: Array<User>;
  totalCount: Scalars['Float']['output'];
};

export type UserProfile = {
  __typename?: 'UserProfile';
  canViewPrivateContent: Scalars['Boolean']['output'];
  /** Characters featured or highlighted by this user */
  featuredCharacters: Array<Character>;
  isOwnProfile: Scalars['Boolean']['output'];
  /** Recently created or updated characters by this user */
  recentCharacters: Array<Character>;
  /** Recently created or updated galleries by this user */
  recentGalleries: Array<Gallery>;
  /** Recently uploaded media (images and text) by this user */
  recentMedia: Array<Media>;
  /** User statistics including counts and engagement metrics */
  stats: UserStats;
  user: User;
};

export type UserStats = {
  __typename?: 'UserStats';
  /** Total number of characters owned by this user */
  charactersCount: Scalars['Int']['output'];
  /** Number of users following this user */
  followersCount: Scalars['Int']['output'];
  /** Number of users this user is following */
  followingCount: Scalars['Int']['output'];
  /** Total number of galleries created by this user */
  galleriesCount: Scalars['Int']['output'];
  /** Total number of images uploaded by this user */
  imagesCount: Scalars['Int']['output'];
  /** Total number of likes received across all user's content */
  totalLikes: Scalars['Int']['output'];
  /** Total number of views across all user's content */
  totalViews: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

/** Visibility levels for content */
export enum Visibility {
  Private = 'PRIVATE',
  Public = 'PUBLIC',
  Unlisted = 'UNLISTED'
}

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string } };

export type SignupMutationVariables = Exact<{
  input: SignupInput;
}>;


export type SignupMutation = { __typename?: 'Mutation', signup: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string } };

export type RefreshTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type RefreshTokenMutation = { __typename?: 'Mutation', refreshToken: string };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, username: string, email: string, displayName: string | null, bio: string | null, avatarUrl: string | null, location: string | null, website: string | null, dateOfBirth: string | null, isVerified: boolean, isAdmin: boolean, canCreateInviteCode: boolean, canListInviteCodes: boolean, canCreateCommunity: boolean, canGrantGlobalPermissions: boolean, canListUsers: boolean, privacySettings: any, createdAt: string, updatedAt: string } };

export type GetCharactersQueryVariables = Exact<{
  filters?: InputMaybe<CharacterFiltersInput>;
}>;


export type GetCharactersQuery = { __typename?: 'Query', characters: { __typename?: 'CharacterConnection', total: number, hasMore: boolean, characters: Array<{ __typename?: 'Character', id: string, name: string, age: string | null, gender: string | null, details: string | null, ownerId: string, creatorId: string | null, mainMediaId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null, _count: { __typename?: 'CharacterCount', media: number } }> } };

export type GetCharacterQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCharacterQuery = { __typename?: 'Query', character: { __typename?: 'Character', id: string, name: string, speciesId: string | null, speciesVariantId: string | null, age: string | null, gender: string | null, details: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, mainMediaId: string | null, species: { __typename?: 'Species', id: string, name: string, communityId: string, community: { __typename?: 'Community', id: string, name: string } } | null, speciesVariant: { __typename?: 'SpeciesVariant', id: string, name: string } | null, traitValues: Array<{ __typename?: 'CharacterTraitValue', traitId: string, value: string | null }>, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number }, tags_rel: Array<{ __typename?: 'CharacterTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }>, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null } };

export type GetMyCharactersQueryVariables = Exact<{
  filters?: InputMaybe<CharacterFiltersInput>;
}>;


export type GetMyCharactersQuery = { __typename?: 'Query', myCharacters: { __typename?: 'CharacterConnection', total: number, hasMore: boolean, characters: Array<{ __typename?: 'Character', id: string, name: string, age: string | null, gender: string | null, details: string | null, ownerId: string, creatorId: string | null, mainMediaId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null, _count: { __typename?: 'CharacterCount', media: number } }> } };

export type CreateCharacterMutationVariables = Exact<{
  input: CreateCharacterInput;
}>;


export type CreateCharacterMutation = { __typename?: 'Mutation', createCharacter: { __typename?: 'Character', id: string, name: string, age: string | null, gender: string | null, details: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number } } };

export type UpdateCharacterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCharacterInput;
}>;


export type UpdateCharacterMutation = { __typename?: 'Mutation', updateCharacter: { __typename?: 'Character', id: string, name: string, age: string | null, gender: string | null, details: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number } } };

export type DeleteCharacterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCharacterMutation = { __typename?: 'Mutation', deleteCharacter: boolean };

export type TransferCharacterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: TransferCharacterInput;
}>;


export type TransferCharacterMutation = { __typename?: 'Mutation', transferCharacter: { __typename?: 'Character', id: string, name: string, age: string | null, gender: string | null, details: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number } } };

export type AddCharacterTagsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
}>;


export type AddCharacterTagsMutation = { __typename?: 'Mutation', addCharacterTags: { __typename?: 'Character', id: string, name: string, tags: Array<string>, tags_rel: Array<{ __typename?: 'CharacterTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> } };

export type RemoveCharacterTagsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
}>;


export type RemoveCharacterTagsMutation = { __typename?: 'Mutation', removeCharacterTags: { __typename?: 'Character', id: string, name: string, tags: Array<string>, tags_rel: Array<{ __typename?: 'CharacterTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> } };

export type SetCharacterMainMediaMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: SetMainMediaInput;
}>;


export type SetCharacterMainMediaMutation = { __typename?: 'Mutation', setCharacterMainMedia: { __typename?: 'Character', id: string, name: string, mainMediaId: string | null, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null } };

export type UpdateCharacterTraitsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateCharacterTraitsInput: UpdateCharacterTraitsInput;
}>;


export type UpdateCharacterTraitsMutation = { __typename?: 'Mutation', updateCharacterTraits: { __typename?: 'Character', id: string, name: string, traitValues: Array<{ __typename?: 'CharacterTraitValue', traitId: string, value: string | null }> } };

export type GetLikedCharactersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLikedCharactersQuery = { __typename?: 'Query', likedCharacters: Array<{ __typename?: 'Character', id: string, name: string, age: string | null, gender: string | null, visibility: Visibility, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, _count: { __typename?: 'CharacterCount', media: number } }> };

export type CommunityMemberUserFragment = { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null };

export type CommunitiesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type CommunitiesQuery = { __typename?: 'Query', communities: { __typename?: 'CommunityConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'Community', id: string, name: string, createdAt: string, updatedAt: string }> } };

export type CommunityByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CommunityByIdQuery = { __typename?: 'Query', community: { __typename?: 'Community', id: string, name: string, createdAt: string, updatedAt: string } };

export type GetCommunityMembersQueryVariables = Exact<{
  communityId: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCommunityMembersQuery = { __typename?: 'Query', community: { __typename?: 'Community', id: string, members: Array<{ __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }> } };

export type CreateCommunityMutationVariables = Exact<{
  createCommunityInput: CreateCommunityInput;
}>;


export type CreateCommunityMutation = { __typename?: 'Mutation', createCommunity: { __typename?: 'Community', id: string, name: string, createdAt: string, updatedAt: string } };

export type UpdateCommunityMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateCommunityInput: UpdateCommunityInput;
}>;


export type UpdateCommunityMutation = { __typename?: 'Mutation', updateCommunity: { __typename?: 'Community', id: string, name: string, createdAt: string, updatedAt: string } };

export type RemoveCommunityMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveCommunityMutation = { __typename?: 'Mutation', removeCommunity: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type CommunityMembersByUserQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type CommunityMembersByUserQuery = { __typename?: 'Query', communityMembersByUser: { __typename?: 'CommunityMemberConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'CommunityMember', id: string, createdAt: string, updatedAt: string, role: { __typename?: 'Role', id: string, name: string, canCreateCharacter: boolean, canCreateInviteCode: boolean, canCreateRole: boolean, canEditCharacter: boolean, canCreateSpecies: boolean, canEditSpecies: boolean, canEditRole: boolean, canEditOwnCharacter: boolean, canListInviteCodes: boolean, canRemoveCommunityMember: boolean, canManageMemberRoles: boolean, community: { __typename?: 'Community', id: string, name: string, createdAt: string, updatedAt: string } }, user: { __typename?: 'User', id: string, username: string, displayName: string | null } }> } };

export type SpeciesWithTraitsAndEnumValuesQueryVariables = Exact<{
  speciesId: Scalars['ID']['input'];
}>;


export type SpeciesWithTraitsAndEnumValuesQuery = { __typename?: 'Query', speciesById: { __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string, community: { __typename?: 'Community', id: string, name: string }, traits: Array<{ __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, speciesId: string, createdAt: string, updatedAt: string, enumValues: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string, createdAt: string, updatedAt: string }> }> } };

export type SpeciesVariantWithEnumValueSettingsQueryVariables = Exact<{
  variantId: Scalars['ID']['input'];
}>;


export type SpeciesVariantWithEnumValueSettingsQuery = { __typename?: 'Query', speciesVariantById: { __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string, communityId: string, traits: Array<{ __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, enumValues: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number }> }> }, enumValueSettings: Array<{ __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string, enumValue: { __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string } }> } };

export type EnumValueSettingDetailsFragment = { __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string };

export type EnumValueSettingConnectionDetailsFragment = { __typename?: 'EnumValueSettingConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string }> };

export type EnumValueSettingsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnumValueSettingsQuery = { __typename?: 'Query', enumValueSettings: { __typename?: 'EnumValueSettingConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string }> } };

export type EnumValueSettingsBySpeciesVariantQueryVariables = Exact<{
  speciesVariantId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnumValueSettingsBySpeciesVariantQuery = { __typename?: 'Query', enumValueSettingsBySpeciesVariant: { __typename?: 'EnumValueSettingConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string }> } };

export type EnumValueSettingsByEnumValueQueryVariables = Exact<{
  enumValueId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnumValueSettingsByEnumValueQuery = { __typename?: 'Query', enumValueSettingsByEnumValue: { __typename?: 'EnumValueSettingConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string }> } };

export type EnumValueSettingByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type EnumValueSettingByIdQuery = { __typename?: 'Query', enumValueSettingById: { __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string } };

export type CreateEnumValueSettingMutationVariables = Exact<{
  createEnumValueSettingInput: CreateEnumValueSettingInput;
}>;


export type CreateEnumValueSettingMutation = { __typename?: 'Mutation', createEnumValueSetting: { __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string } };

export type UpdateEnumValueSettingMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateEnumValueSettingInput: UpdateEnumValueSettingInput;
}>;


export type UpdateEnumValueSettingMutation = { __typename?: 'Mutation', updateEnumValueSetting: { __typename?: 'EnumValueSetting', id: string, enumValueId: string, speciesVariantId: string, createdAt: string, updatedAt: string } };

export type DeleteEnumValueSettingMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteEnumValueSettingMutation = { __typename?: 'Mutation', removeEnumValueSetting: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type EnumValueDetailsFragment = { __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string, createdAt: string, updatedAt: string };

export type EnumValueConnectionDetailsFragment = { __typename?: 'EnumValueConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string, createdAt: string, updatedAt: string }> };

export type EnumValuesByTraitQueryVariables = Exact<{
  traitId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnumValuesByTraitQuery = { __typename?: 'Query', enumValuesByTrait: { __typename?: 'EnumValueConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string, createdAt: string, updatedAt: string }> } };

export type EnumValueByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type EnumValueByIdQuery = { __typename?: 'Query', enumValueById: { __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string, createdAt: string, updatedAt: string, trait: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, species: { __typename?: 'Species', id: string, name: string, communityId: string } } } };

export type CreateEnumValueMutationVariables = Exact<{
  createEnumValueInput: CreateEnumValueInput;
}>;


export type CreateEnumValueMutation = { __typename?: 'Mutation', createEnumValue: { __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string, createdAt: string, updatedAt: string } };

export type UpdateEnumValueMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateEnumValueInput: UpdateEnumValueInput;
}>;


export type UpdateEnumValueMutation = { __typename?: 'Mutation', updateEnumValue: { __typename?: 'EnumValue', id: string, name: string, order: number, traitId: string, createdAt: string, updatedAt: string } };

export type DeleteEnumValueMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteEnumValueMutation = { __typename?: 'Mutation', removeEnumValue: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type MyExternalAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyExternalAccountsQuery = { __typename?: 'Query', myExternalAccounts: Array<{ __typename?: 'ExternalAccount', id: string, provider: ExternalAccountProvider, providerAccountId: string, displayName: string, createdAt: string, updatedAt: string }> };

export type UnlinkExternalAccountMutationVariables = Exact<{
  input: UnlinkExternalAccountInput;
}>;


export type UnlinkExternalAccountMutation = { __typename?: 'Mutation', unlinkExternalAccount: boolean };

export type GetGalleriesQueryVariables = Exact<{
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetGalleriesQuery = { __typename?: 'Query', galleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: { __typename?: 'Species', id: string, name: string } | null } | null, _count: { __typename?: 'GalleryCount', media: number } }> } };

export type GetGalleryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetGalleryQuery = { __typename?: 'Query', gallery: { __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: { __typename?: 'Species', id: string, name: string } | null } | null, _count: { __typename?: 'GalleryCount', media: number } } };

export type GetMyGalleriesQueryVariables = Exact<{
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetMyGalleriesQuery = { __typename?: 'Query', myGalleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: { __typename?: 'Species', id: string, name: string } | null } | null, _count: { __typename?: 'GalleryCount', media: number } }> } };

export type GetUserGalleriesQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetUserGalleriesQuery = { __typename?: 'Query', userGalleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: { __typename?: 'Species', id: string, name: string } | null } | null, _count: { __typename?: 'GalleryCount', media: number } }> } };

export type GetCharacterGalleriesQueryVariables = Exact<{
  characterId: Scalars['ID']['input'];
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetCharacterGalleriesQuery = { __typename?: 'Query', characterGalleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: { __typename?: 'Species', id: string, name: string } | null } | null, _count: { __typename?: 'GalleryCount', media: number } }> } };

export type CreateGalleryMutationVariables = Exact<{
  input: CreateGalleryInput;
}>;


export type CreateGalleryMutation = { __typename?: 'Mutation', createGallery: { __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: { __typename?: 'Species', id: string, name: string } | null } | null, _count: { __typename?: 'GalleryCount', media: number } } };

export type UpdateGalleryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateGalleryInput;
}>;


export type UpdateGalleryMutation = { __typename?: 'Mutation', updateGallery: { __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: { __typename?: 'Species', id: string, name: string } | null } | null, _count: { __typename?: 'GalleryCount', media: number } } };

export type DeleteGalleryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGalleryMutation = { __typename?: 'Mutation', deleteGallery: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type ReorderGalleriesMutationVariables = Exact<{
  input: ReorderGalleriesInput;
}>;


export type ReorderGalleriesMutation = { __typename?: 'Mutation', reorderGalleries: Array<{ __typename?: 'Gallery', id: string, name: string, sortOrder: number, likesCount: number, userHasLiked: boolean, _count: { __typename?: 'GalleryCount', media: number } }> };

export type GetLikedGalleriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLikedGalleriesQuery = { __typename?: 'Query', likedGalleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, visibility: Visibility, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null, _count: { __typename?: 'GalleryCount', media: number } }> };

export type GetLikedImagesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLikedImagesQuery = { __typename?: 'Query', likedImages: Array<{ __typename?: 'Image', id: string, filename: string, originalFilename: string, url: string, thumbnailUrl: string | null, altText: string | null, width: number, height: number, fileSize: number, mimeType: string, isNsfw: boolean, sensitiveContentDescription: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, uploader: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, artist: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null }> };

export type InviteCodesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  communityId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type InviteCodesQuery = { __typename?: 'Query', inviteCodes: { __typename?: 'InviteCodeConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'InviteCode', id: string, claimCount: number, maxClaims: number, isAvailable: boolean, remainingClaims: number, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, username: string, displayName: string | null }, role: { __typename?: 'Role', id: string, name: string, community: { __typename?: 'Community', id: string, name: string } } | null }> } };

export type InviteCodeByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type InviteCodeByIdQuery = { __typename?: 'Query', inviteCodeById: { __typename?: 'InviteCode', id: string, claimCount: number, maxClaims: number, isAvailable: boolean, remainingClaims: number, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, username: string, displayName: string | null }, role: { __typename?: 'Role', id: string, name: string, community: { __typename?: 'Community', id: string, name: string } } | null } };

export type CreateInviteCodeMutationVariables = Exact<{
  createInviteCodeInput: CreateInviteCodeInput;
}>;


export type CreateInviteCodeMutation = { __typename?: 'Mutation', createInviteCode: { __typename?: 'InviteCode', id: string, claimCount: number, maxClaims: number, isAvailable: boolean, remainingClaims: number, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, username: string, displayName: string | null }, role: { __typename?: 'Role', id: string, name: string, community: { __typename?: 'Community', id: string, name: string } } | null } };

export type UpdateInviteCodeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateInviteCodeInput: UpdateInviteCodeInput;
}>;


export type UpdateInviteCodeMutation = { __typename?: 'Mutation', updateInviteCode: { __typename?: 'InviteCode', id: string, claimCount: number, maxClaims: number, isAvailable: boolean, remainingClaims: number, createdAt: string, updatedAt: string, creator: { __typename?: 'User', id: string, username: string, displayName: string | null }, role: { __typename?: 'Role', id: string, name: string, community: { __typename?: 'Community', id: string, name: string } } | null } };

export type RemoveInviteCodeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveInviteCodeMutation = { __typename?: 'Mutation', removeInviteCode: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type ClaimInviteCodeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  claimInviteCodeInput: ClaimInviteCodeInput;
}>;


export type ClaimInviteCodeMutation = { __typename?: 'Mutation', claimInviteCode: { __typename?: 'InviteCode', id: string, claimCount: number, maxClaims: number, isAvailable: boolean, remainingClaims: number, creator: { __typename?: 'User', id: string, username: string, displayName: string | null }, role: { __typename?: 'Role', id: string, name: string, community: { __typename?: 'Community', id: string, name: string } } | null } };

export type RolesByCommunityQueryVariables = Exact<{
  communityId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type RolesByCommunityQuery = { __typename?: 'Query', rolesByCommunity: { __typename?: 'RoleConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'Role', id: string, name: string, canCreateInviteCode: boolean, community: { __typename?: 'Community', id: string, name: string } }> } };

export type ItemTypeFieldsFragment = { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string };

export type ItemFieldsFragment = { __typename?: 'Item', id: string, itemTypeId: string, ownerId: string, quantity: number, metadata: any | null, createdAt: string, updatedAt: string, itemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string }, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } };

export type GetItemTypesQueryVariables = Exact<{
  filters?: InputMaybe<ItemTypeFiltersInput>;
}>;


export type GetItemTypesQuery = { __typename?: 'Query', itemTypes: { __typename?: 'ItemTypeConnection', total: number, hasMore: boolean, itemTypes: Array<{ __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string }> } };

export type GetItemTypeQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetItemTypeQuery = { __typename?: 'Query', itemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string, community: { __typename?: 'Community', id: string, name: string } | null } };

export type CreateItemTypeMutationVariables = Exact<{
  input: CreateItemTypeInput;
}>;


export type CreateItemTypeMutation = { __typename?: 'Mutation', createItemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string } };

export type UpdateItemTypeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateItemTypeInput;
}>;


export type UpdateItemTypeMutation = { __typename?: 'Mutation', updateItemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string } };

export type DeleteItemTypeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteItemTypeMutation = { __typename?: 'Mutation', deleteItemType: boolean };

export type InventoryFieldsFragment = { __typename?: 'Inventory', communityId: string, totalItems: number, items: Array<{ __typename?: 'Item', id: string, itemTypeId: string, ownerId: string, quantity: number, metadata: any | null, createdAt: string, updatedAt: string, itemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string }, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }> };

export type GetMyInventoryQueryVariables = Exact<{
  communityId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type GetMyInventoryQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, username: string, inventories: Array<{ __typename?: 'Inventory', communityId: string, totalItems: number, items: Array<{ __typename?: 'Item', id: string, itemTypeId: string, ownerId: string, quantity: number, metadata: any | null, createdAt: string, updatedAt: string, itemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string }, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }> }> } };

export type GrantItemMutationVariables = Exact<{
  input: GrantItemInput;
}>;


export type GrantItemMutation = { __typename?: 'Mutation', grantItem: { __typename?: 'Item', id: string, itemTypeId: string, ownerId: string, quantity: number, metadata: any | null, createdAt: string, updatedAt: string, itemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string }, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } } };

export type UpdateItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateItemInput;
}>;


export type UpdateItemMutation = { __typename?: 'Mutation', updateItem: { __typename?: 'Item', id: string, itemTypeId: string, ownerId: string, quantity: number, metadata: any | null, createdAt: string, updatedAt: string, itemType: { __typename?: 'ItemType', id: string, name: string, description: string | null, communityId: string, category: string | null, isStackable: boolean, maxStackSize: number | null, isTradeable: boolean, isConsumable: boolean, imageUrl: string | null, iconUrl: string | null, color: string | null, metadata: any | null, createdAt: string, updatedAt: string }, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } } };

export type DeleteItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteItemMutation = { __typename?: 'Mutation', deleteItem: boolean };

export type GetMediaQueryVariables = Exact<{
  filters?: InputMaybe<MediaFiltersInput>;
}>;


export type GetMediaQuery = { __typename?: 'Query', media: { __typename?: 'MediaConnection', total: number, hasMore: boolean, media: Array<{ __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null, gallery: { __typename?: 'Gallery', id: string, name: string } | null, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null, tags_rel: Array<{ __typename?: 'MediaTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null }> } };

export type GetMediaItemQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetMediaItemQuery = { __typename?: 'Query', mediaItem: { __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null, gallery: { __typename?: 'Gallery', id: string, name: string } | null, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean, artistName: string | null, artistUrl: string | null, source: string | null, width: number, height: number, fileSize: number, mimeType: string } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null, tags_rel: Array<{ __typename?: 'MediaTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null } };

export type GetCharacterMediaQueryVariables = Exact<{
  characterId: Scalars['ID']['input'];
  filters?: InputMaybe<MediaFiltersInput>;
}>;


export type GetCharacterMediaQuery = { __typename?: 'Query', characterMedia: { __typename?: 'MediaConnection', total: number, imageCount: number, textCount: number, hasMore: boolean, media: Array<{ __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null }> } };

export type GetMyMediaQueryVariables = Exact<{
  filters?: InputMaybe<MediaFiltersInput>;
}>;


export type GetMyMediaQuery = { __typename?: 'Query', myMedia: { __typename?: 'MediaConnection', total: number, hasMore: boolean, media: Array<{ __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, character: { __typename?: 'Character', id: string, name: string } | null, gallery: { __typename?: 'Gallery', id: string, name: string } | null, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null, tags_rel: Array<{ __typename?: 'MediaTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null }> } };

export type GetLikedMediaQueryVariables = Exact<{
  filters?: InputMaybe<MediaFiltersInput>;
}>;


export type GetLikedMediaQuery = { __typename?: 'Query', likedMedia: { __typename?: 'MediaConnection', total: number, hasMore: boolean, media: Array<{ __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null, gallery: { __typename?: 'Gallery', id: string, name: string } | null, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean, width: number, height: number, fileSize: number, mimeType: string, uploader: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, artist: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null, tags_rel: Array<{ __typename?: 'MediaTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null }> } };

export type CreateTextMediaMutationVariables = Exact<{
  input: CreateTextMediaInput;
}>;


export type CreateTextMediaMutation = { __typename?: 'Mutation', createTextMedia: { __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null } };

export type UpdateMediaMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateMediaInput;
}>;


export type UpdateMediaMutation = { __typename?: 'Mutation', updateMedia: { __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null, gallery: { __typename?: 'Gallery', id: string, name: string } | null, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null, tags_rel: Array<{ __typename?: 'MediaTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null } };

export type UpdateTextContentMutationVariables = Exact<{
  mediaId: Scalars['ID']['input'];
  input: UpdateTextContentInput;
}>;


export type UpdateTextContentMutation = { __typename?: 'Mutation', updateTextContent: { __typename?: 'Media', id: string, title: string, description: string | null, updatedAt: string, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null } };

export type UpdateImageMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateImageInput;
}>;


export type UpdateImageMutation = { __typename?: 'Mutation', updateImage: { __typename?: 'Image', id: string, altText: string | null, isNsfw: boolean, artistId: string | null, artistName: string | null, artistUrl: string | null, source: string | null, updatedAt: string } };

export type DeleteMediaMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMediaMutation = { __typename?: 'Mutation', deleteMedia: boolean };

export type AddMediaTagsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ManageMediaTagsInput;
}>;


export type AddMediaTagsMutation = { __typename?: 'Mutation', addMediaTags: { __typename?: 'Media', id: string, tags_rel: Array<{ __typename?: 'MediaTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null } };

export type RemoveMediaTagsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ManageMediaTagsInput;
}>;


export type RemoveMediaTagsMutation = { __typename?: 'Mutation', removeMediaTags: { __typename?: 'Media', id: string, tags_rel: Array<{ __typename?: 'MediaTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null } };

export type RolesByCommunityDetailedQueryVariables = Exact<{
  communityId: Scalars['ID']['input'];
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type RolesByCommunityDetailedQuery = { __typename?: 'Query', rolesByCommunity: { __typename?: 'RoleConnection', totalCount: number, hasNextPage: boolean, hasPreviousPage: boolean, nodes: Array<{ __typename?: 'Role', id: string, name: string, communityId: string, canCreateSpecies: boolean, canCreateCharacter: boolean, canEditCharacter: boolean, canEditOwnCharacter: boolean, canEditSpecies: boolean, canManageItems: boolean, canGrantItems: boolean, canCreateInviteCode: boolean, canListInviteCodes: boolean, canCreateRole: boolean, canEditRole: boolean, canRemoveCommunityMember: boolean, canManageMemberRoles: boolean, createdAt: string, updatedAt: string, community: { __typename?: 'Community', id: string, name: string } }> } };

export type CreateRoleMutationVariables = Exact<{
  input: CreateRoleInput;
}>;


export type CreateRoleMutation = { __typename?: 'Mutation', createRole: { __typename?: 'Role', id: string, name: string, communityId: string, canCreateSpecies: boolean, canCreateCharacter: boolean, canEditCharacter: boolean, canEditOwnCharacter: boolean, canEditSpecies: boolean, canCreateInviteCode: boolean, canListInviteCodes: boolean, canCreateRole: boolean, canEditRole: boolean, canRemoveCommunityMember: boolean, canManageMemberRoles: boolean, createdAt: string, updatedAt: string, community: { __typename?: 'Community', id: string, name: string } } };

export type UpdateRoleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
}>;


export type UpdateRoleMutation = { __typename?: 'Mutation', updateRole: { __typename?: 'Role', id: string, name: string, communityId: string, canCreateSpecies: boolean, canCreateCharacter: boolean, canEditCharacter: boolean, canEditOwnCharacter: boolean, canEditSpecies: boolean, canCreateInviteCode: boolean, canListInviteCodes: boolean, canCreateRole: boolean, canEditRole: boolean, canRemoveCommunityMember: boolean, canManageMemberRoles: boolean, createdAt: string, updatedAt: string, community: { __typename?: 'Community', id: string, name: string } } };

export type CommunityMembersWithRolesQueryVariables = Exact<{
  communityId: Scalars['ID']['input'];
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type CommunityMembersWithRolesQuery = { __typename?: 'Query', communityMembersByCommunity: { __typename?: 'CommunityMemberConnection', totalCount: number, hasNextPage: boolean, hasPreviousPage: boolean, nodes: Array<{ __typename?: 'CommunityMember', id: string, userId: string, roleId: string, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, email: string, displayName: string | null }, role: { __typename?: 'Role', id: string, name: string, canCreateSpecies: boolean, canCreateCharacter: boolean, canEditCharacter: boolean, canEditOwnCharacter: boolean, canEditSpecies: boolean, canManageItems: boolean, canGrantItems: boolean, canCreateInviteCode: boolean, canListInviteCodes: boolean, canCreateRole: boolean, canEditRole: boolean, canRemoveCommunityMember: boolean, canManageMemberRoles: boolean } }> } };

export type UpdateCommunityMemberMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCommunityMemberInput;
}>;


export type UpdateCommunityMemberMutation = { __typename?: 'Mutation', updateCommunityMember: { __typename?: 'CommunityMember', id: string, userId: string, roleId: string, createdAt: string, updatedAt: string, user: { __typename?: 'User', id: string, username: string, email: string, displayName: string | null }, role: { __typename?: 'Role', id: string, name: string, canCreateSpecies: boolean, canCreateCharacter: boolean, canEditCharacter: boolean, canEditOwnCharacter: boolean, canEditSpecies: boolean, canManageItems: boolean, canGrantItems: boolean, canCreateInviteCode: boolean, canListInviteCodes: boolean, canCreateRole: boolean, canEditRole: boolean, canRemoveCommunityMember: boolean, canManageMemberRoles: boolean } } };

export type ToggleLikeMutationVariables = Exact<{
  input: ToggleLikeInput;
}>;


export type ToggleLikeMutation = { __typename?: 'Mutation', toggleLike: { __typename?: 'LikeResult', isLiked: boolean, likesCount: number, entityType: LikeableType, entityId: string } };

export type GetLikeStatusQueryVariables = Exact<{
  entityType: LikeableType;
  entityId: Scalars['ID']['input'];
}>;


export type GetLikeStatusQuery = { __typename?: 'Query', likeStatus: { __typename?: 'LikeStatus', isLiked: boolean, likesCount: number } };

export type ToggleFollowMutationVariables = Exact<{
  input: ToggleFollowInput;
}>;


export type ToggleFollowMutation = { __typename?: 'Mutation', toggleFollow: { __typename?: 'FollowResult', isFollowing: boolean, followersCount: number, followingCount: number, targetUserId: string } };

export type GetFollowStatusQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type GetFollowStatusQuery = { __typename?: 'Query', followStatus: { __typename?: 'FollowStatus', isFollowing: boolean, followersCount: number, followingCount: number } };

export type CreateCommentMutationVariables = Exact<{
  input: CreateCommentInput;
}>;


export type CreateCommentMutation = { __typename?: 'Mutation', createComment: { __typename?: 'Comment', id: string, content: string, createdAt: string, authorId: string, commentableId: string, commentableType: CommentableType, parentId: string | null, isHidden: boolean, likesCount: number, author: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, replies: Array<{ __typename?: 'Comment', id: string, content: string, createdAt: string, authorId: string, parentId: string | null, isHidden: boolean, likesCount: number, author: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }> } };

export type UpdateCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCommentInput;
}>;


export type UpdateCommentMutation = { __typename?: 'Mutation', updateComment: { __typename?: 'Comment', id: string, content: string, createdAt: string, authorId: string, commentableId: string, commentableType: CommentableType, parentId: string | null, isHidden: boolean, likesCount: number, author: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } } };

export type DeleteCommentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCommentMutation = { __typename?: 'Mutation', deleteComment: boolean };

export type GetCommentsQueryVariables = Exact<{
  filters: CommentFiltersInput;
}>;


export type GetCommentsQuery = { __typename?: 'Query', comments: { __typename?: 'CommentConnection', total: number, comments: Array<{ __typename?: 'Comment', id: string, content: string, createdAt: string, authorId: string, commentableId: string, commentableType: CommentableType, parentId: string | null, isHidden: boolean, likesCount: number, author: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, replies: Array<{ __typename?: 'Comment', id: string, content: string, createdAt: string, authorId: string, parentId: string | null, isHidden: boolean, likesCount: number, author: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }> }> } };

export type GetFollowersQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type GetFollowersQuery = { __typename?: 'Query', getFollowers: { __typename?: 'FollowListResult', user: { __typename?: 'User', id: string, username: string, displayName: string | null }, followers: Array<{ __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null, bio: string | null }> } };

export type GetFollowingQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type GetFollowingQuery = { __typename?: 'Query', getFollowing: { __typename?: 'FollowListResult', user: { __typename?: 'User', id: string, username: string, displayName: string | null }, following: Array<{ __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null, bio: string | null }> } };

export type GetActivityFeedQueryVariables = Exact<{
  input?: InputMaybe<ActivityFeedInput>;
}>;


export type GetActivityFeedQuery = { __typename?: 'Query', activityFeed: Array<{ __typename?: 'ActivityItem', id: string, type: string, entityId: string, createdAt: string, user: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, content: { __typename?: 'ActivityContent', name: string | null, title: string | null, description: string | null } | null }> };

export type SpeciesDetailsFragment = { __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string };

export type SpeciesConnectionDetailsFragment = { __typename?: 'SpeciesConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string }> };

export type SpeciesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type SpeciesQuery = { __typename?: 'Query', species: { __typename?: 'SpeciesConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string }> } };

export type SpeciesByCommunityQueryVariables = Exact<{
  communityId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type SpeciesByCommunityQuery = { __typename?: 'Query', speciesByCommunity: { __typename?: 'SpeciesConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string }> } };

export type SpeciesByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SpeciesByIdQuery = { __typename?: 'Query', speciesById: { __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string, community: { __typename?: 'Community', id: string, name: string } } };

export type CreateSpeciesMutationVariables = Exact<{
  createSpeciesInput: CreateSpeciesInput;
}>;


export type CreateSpeciesMutation = { __typename?: 'Mutation', createSpecies: { __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string } };

export type UpdateSpeciesMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateSpeciesInput: UpdateSpeciesInput;
}>;


export type UpdateSpeciesMutation = { __typename?: 'Mutation', updateSpecies: { __typename?: 'Species', id: string, name: string, communityId: string, hasImage: boolean, createdAt: string, updatedAt: string } };

export type DeleteSpeciesMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSpeciesMutation = { __typename?: 'Mutation', removeSpecies: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type SpeciesVariantDetailsFragment = { __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string };

export type SpeciesVariantConnectionDetailsFragment = { __typename?: 'SpeciesVariantConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string }> };

export type SpeciesVariantsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type SpeciesVariantsQuery = { __typename?: 'Query', speciesVariants: { __typename?: 'SpeciesVariantConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string }> } };

export type SpeciesVariantsBySpeciesQueryVariables = Exact<{
  speciesId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type SpeciesVariantsBySpeciesQuery = { __typename?: 'Query', speciesVariantsBySpecies: { __typename?: 'SpeciesVariantConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string }> } };

export type SpeciesVariantByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SpeciesVariantByIdQuery = { __typename?: 'Query', speciesVariantById: { __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string, communityId: string } } };

export type CreateSpeciesVariantMutationVariables = Exact<{
  createSpeciesVariantInput: CreateSpeciesVariantInput;
}>;


export type CreateSpeciesVariantMutation = { __typename?: 'Mutation', createSpeciesVariant: { __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string } };

export type UpdateSpeciesVariantMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateSpeciesVariantInput: UpdateSpeciesVariantInput;
}>;


export type UpdateSpeciesVariantMutation = { __typename?: 'Mutation', updateSpeciesVariant: { __typename?: 'SpeciesVariant', id: string, name: string, speciesId: string, createdAt: string, updatedAt: string } };

export type DeleteSpeciesVariantMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSpeciesVariantMutation = { __typename?: 'Mutation', removeSpeciesVariant: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type TraitDetailsFragment = { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, speciesId: string, createdAt: string, updatedAt: string };

export type TraitConnectionDetailsFragment = { __typename?: 'TraitConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, speciesId: string, createdAt: string, updatedAt: string }> };

export type TraitsBySpeciesQueryVariables = Exact<{
  speciesId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type TraitsBySpeciesQuery = { __typename?: 'Query', traitsBySpecies: { __typename?: 'TraitConnection', hasNextPage: boolean, hasPreviousPage: boolean, totalCount: number, nodes: Array<{ __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, speciesId: string, createdAt: string, updatedAt: string }> } };

export type TraitByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type TraitByIdQuery = { __typename?: 'Query', traitById: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, speciesId: string, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string, communityId: string } } };

export type CreateTraitMutationVariables = Exact<{
  createTraitInput: CreateTraitInput;
}>;


export type CreateTraitMutation = { __typename?: 'Mutation', createTrait: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, speciesId: string, createdAt: string, updatedAt: string } };

export type UpdateTraitMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  updateTraitInput: UpdateTraitInput;
}>;


export type UpdateTraitMutation = { __typename?: 'Mutation', updateTrait: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, speciesId: string, createdAt: string, updatedAt: string } };

export type DeleteTraitMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTraitMutation = { __typename?: 'Mutation', removeTrait: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type SearchTagsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
}>;


export type SearchTagsQuery = { __typename?: 'Query', searchTags: Array<{ __typename?: 'Tag', id: string, name: string, displayName: string, category: string | null, color: string | null, createdAt: string }> };

export type TraitListEntryDetailsFragment = { __typename?: 'TraitListEntry', id: string, order: number, required: boolean, valueType: TraitValueType, defaultValueString: string | null, defaultValueInt: number | null, defaultValueTimestamp: string | null, traitId: string, speciesVariantId: string, createdAt: string, updatedAt: string, trait: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, enumValues: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number }> } };

export type TraitListEntriesByVariantQueryVariables = Exact<{
  variantId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type TraitListEntriesByVariantQuery = { __typename?: 'Query', traitListEntriesBySpeciesVariant: { __typename?: 'TraitListEntryConnection', totalCount: number, hasNextPage: boolean, nodes: Array<{ __typename?: 'TraitListEntry', id: string, order: number, required: boolean, valueType: TraitValueType, defaultValueString: string | null, defaultValueInt: number | null, defaultValueTimestamp: string | null, traitId: string, speciesVariantId: string, createdAt: string, updatedAt: string, trait: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, enumValues: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number }> } }> } };

export type UpdateTraitOrdersMutationVariables = Exact<{
  input: UpdateTraitOrdersInput;
}>;


export type UpdateTraitOrdersMutation = { __typename?: 'Mutation', updateTraitOrders: Array<{ __typename?: 'TraitListEntry', id: string, order: number, trait: { __typename?: 'Trait', id: string, name: string } }> };

export type CreateTraitListEntryMutationVariables = Exact<{
  input: CreateTraitListEntryInput;
}>;


export type CreateTraitListEntryMutation = { __typename?: 'Mutation', createTraitListEntry: { __typename?: 'TraitListEntry', id: string, order: number, required: boolean, valueType: TraitValueType, defaultValueString: string | null, defaultValueInt: number | null, defaultValueTimestamp: string | null, traitId: string, speciesVariantId: string, createdAt: string, updatedAt: string, trait: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, enumValues: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number }> } } };

export type UpdateTraitListEntryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTraitListEntryInput;
}>;


export type UpdateTraitListEntryMutation = { __typename?: 'Mutation', updateTraitListEntry: { __typename?: 'TraitListEntry', id: string, order: number, required: boolean, valueType: TraitValueType, defaultValueString: string | null, defaultValueInt: number | null, defaultValueTimestamp: string | null, traitId: string, speciesVariantId: string, createdAt: string, updatedAt: string, trait: { __typename?: 'Trait', id: string, name: string, valueType: TraitValueType, enumValues: Array<{ __typename?: 'EnumValue', id: string, name: string, order: number }> } } };

export type RemoveTraitListEntryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveTraitListEntryMutation = { __typename?: 'Mutation', removeTraitListEntry: { __typename?: 'RemovalResponse', removed: boolean, message: string | null } };

export type GetUserProfileQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type GetUserProfileQuery = { __typename?: 'Query', userProfile: { __typename?: 'UserProfile', isOwnProfile: boolean, canViewPrivateContent: boolean, user: { __typename?: 'User', id: string, username: string, displayName: string | null, bio: string | null, avatarUrl: string | null, location: string | null, website: string | null, isVerified: boolean, createdAt: string }, stats: { __typename?: 'UserStats', charactersCount: number, galleriesCount: number, imagesCount: number, totalViews: number, totalLikes: number, followersCount: number, followingCount: number }, recentCharacters: Array<{ __typename?: 'Character', id: string, name: string, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }>, recentGalleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null }>, recentMedia: Array<{ __typename?: 'Media', id: string, title: string, description: string | null, createdAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, image: { __typename?: 'Image', id: string, filename: string, url: string, thumbnailUrl: string | null } | null }>, featuredCharacters: Array<{ __typename?: 'Character', id: string, name: string, createdAt: string, updatedAt: string, species: { __typename?: 'Species', id: string, name: string } | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }> } | null };

export type GetUserStatsQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type GetUserStatsQuery = { __typename?: 'Query', userStats: { __typename?: 'UserStats', charactersCount: number, galleriesCount: number, imagesCount: number, totalViews: number, totalLikes: number, followersCount: number, followingCount: number } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateUserInput;
}>;


export type UpdateProfileMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'User', id: string, username: string, displayName: string | null, bio: string | null, avatarUrl: string | null, location: string | null, website: string | null, dateOfBirth: string | null, isVerified: boolean, createdAt: string, updatedAt: string } };

export const CommunityMemberUserFragmentDoc = gql`
    fragment CommunityMemberUser on User {
  id
  username
  displayName
  avatarUrl
}
    `;
export const EnumValueSettingDetailsFragmentDoc = gql`
    fragment EnumValueSettingDetails on EnumValueSetting {
  id
  enumValueId
  speciesVariantId
  createdAt
  updatedAt
}
    `;
export const EnumValueSettingConnectionDetailsFragmentDoc = gql`
    fragment EnumValueSettingConnectionDetails on EnumValueSettingConnection {
  nodes {
    ...EnumValueSettingDetails
  }
  hasNextPage
  hasPreviousPage
  totalCount
}
    ${EnumValueSettingDetailsFragmentDoc}`;
export const EnumValueDetailsFragmentDoc = gql`
    fragment EnumValueDetails on EnumValue {
  id
  name
  order
  traitId
  createdAt
  updatedAt
}
    `;
export const EnumValueConnectionDetailsFragmentDoc = gql`
    fragment EnumValueConnectionDetails on EnumValueConnection {
  nodes {
    ...EnumValueDetails
  }
  hasNextPage
  hasPreviousPage
  totalCount
}
    ${EnumValueDetailsFragmentDoc}`;
export const ItemTypeFieldsFragmentDoc = gql`
    fragment ItemTypeFields on ItemType {
  id
  name
  description
  communityId
  category
  isStackable
  maxStackSize
  isTradeable
  isConsumable
  imageUrl
  iconUrl
  color
  metadata
  createdAt
  updatedAt
}
    `;
export const ItemFieldsFragmentDoc = gql`
    fragment ItemFields on Item {
  id
  itemTypeId
  ownerId
  quantity
  metadata
  createdAt
  updatedAt
  itemType {
    ...ItemTypeFields
  }
  owner {
    id
    username
    displayName
    avatarUrl
  }
}
    ${ItemTypeFieldsFragmentDoc}`;
export const InventoryFieldsFragmentDoc = gql`
    fragment InventoryFields on Inventory {
  communityId
  totalItems
  items {
    ...ItemFields
  }
}
    ${ItemFieldsFragmentDoc}`;
export const SpeciesDetailsFragmentDoc = gql`
    fragment SpeciesDetails on Species {
  id
  name
  communityId
  hasImage
  createdAt
  updatedAt
}
    `;
export const SpeciesConnectionDetailsFragmentDoc = gql`
    fragment SpeciesConnectionDetails on SpeciesConnection {
  nodes {
    ...SpeciesDetails
  }
  hasNextPage
  hasPreviousPage
  totalCount
}
    ${SpeciesDetailsFragmentDoc}`;
export const SpeciesVariantDetailsFragmentDoc = gql`
    fragment SpeciesVariantDetails on SpeciesVariant {
  id
  name
  speciesId
  createdAt
  updatedAt
}
    `;
export const SpeciesVariantConnectionDetailsFragmentDoc = gql`
    fragment SpeciesVariantConnectionDetails on SpeciesVariantConnection {
  nodes {
    ...SpeciesVariantDetails
  }
  hasNextPage
  hasPreviousPage
  totalCount
}
    ${SpeciesVariantDetailsFragmentDoc}`;
export const TraitDetailsFragmentDoc = gql`
    fragment TraitDetails on Trait {
  id
  name
  valueType
  speciesId
  createdAt
  updatedAt
}
    `;
export const TraitConnectionDetailsFragmentDoc = gql`
    fragment TraitConnectionDetails on TraitConnection {
  nodes {
    ...TraitDetails
  }
  hasNextPage
  hasPreviousPage
  totalCount
}
    ${TraitDetailsFragmentDoc}`;
export const TraitListEntryDetailsFragmentDoc = gql`
    fragment TraitListEntryDetails on TraitListEntry {
  id
  order
  required
  valueType
  defaultValueString
  defaultValueInt
  defaultValueTimestamp
  traitId
  speciesVariantId
  createdAt
  updatedAt
  trait {
    id
    name
    valueType
    enumValues {
      id
      name
      order
    }
  }
}
    `;
export const LoginDocument = gql`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
  }
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const SignupDocument = gql`
    mutation Signup($input: SignupInput!) {
  signup(input: $input) {
    accessToken
    refreshToken
  }
}
    `;
export type SignupMutationFn = Apollo.MutationFunction<SignupMutation, SignupMutationVariables>;

/**
 * __useSignupMutation__
 *
 * To run a mutation, you first call `useSignupMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignupMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signupMutation, { data, loading, error }] = useSignupMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSignupMutation(baseOptions?: Apollo.MutationHookOptions<SignupMutation, SignupMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignupMutation, SignupMutationVariables>(SignupDocument, options);
      }
export type SignupMutationHookResult = ReturnType<typeof useSignupMutation>;
export type SignupMutationResult = Apollo.MutationResult<SignupMutation>;
export type SignupMutationOptions = Apollo.BaseMutationOptions<SignupMutation, SignupMutationVariables>;
export const RefreshTokenDocument = gql`
    mutation RefreshToken($token: String!) {
  refreshToken(token: $token)
}
    `;
export type RefreshTokenMutationFn = Apollo.MutationFunction<RefreshTokenMutation, RefreshTokenMutationVariables>;

/**
 * __useRefreshTokenMutation__
 *
 * To run a mutation, you first call `useRefreshTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshTokenMutation, { data, loading, error }] = useRefreshTokenMutation({
 *   variables: {
 *      token: // value for 'token'
 *   },
 * });
 */
export function useRefreshTokenMutation(baseOptions?: Apollo.MutationHookOptions<RefreshTokenMutation, RefreshTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RefreshTokenMutation, RefreshTokenMutationVariables>(RefreshTokenDocument, options);
      }
export type RefreshTokenMutationHookResult = ReturnType<typeof useRefreshTokenMutation>;
export type RefreshTokenMutationResult = Apollo.MutationResult<RefreshTokenMutation>;
export type RefreshTokenMutationOptions = Apollo.BaseMutationOptions<RefreshTokenMutation, RefreshTokenMutationVariables>;
export const MeDocument = gql`
    query Me {
  me {
    id
    username
    email
    displayName
    bio
    avatarUrl
    location
    website
    dateOfBirth
    isVerified
    isAdmin
    canCreateInviteCode
    canListInviteCodes
    canCreateCommunity
    canGrantGlobalPermissions
    canListUsers
    privacySettings
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const GetCharactersDocument = gql`
    query GetCharacters($filters: CharacterFiltersInput) {
  characters(filters: $filters) {
    characters {
      id
      name
      species {
        id
        name
      }
      age
      gender
      details
      ownerId
      creatorId
      mainMediaId
      visibility
      isSellable
      isTradeable
      price
      tags
      customFields
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      creator {
        id
        username
        displayName
        avatarUrl
      }
      mainMedia {
        id
        title
        image {
          id
          url
          thumbnailUrl
          altText
          isNsfw
        }
      }
      _count {
        media
      }
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetCharactersQuery__
 *
 * To run a query within a React component, call `useGetCharactersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCharactersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCharactersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetCharactersQuery(baseOptions?: Apollo.QueryHookOptions<GetCharactersQuery, GetCharactersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCharactersQuery, GetCharactersQueryVariables>(GetCharactersDocument, options);
      }
export function useGetCharactersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCharactersQuery, GetCharactersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCharactersQuery, GetCharactersQueryVariables>(GetCharactersDocument, options);
        }
export function useGetCharactersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCharactersQuery, GetCharactersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCharactersQuery, GetCharactersQueryVariables>(GetCharactersDocument, options);
        }
export type GetCharactersQueryHookResult = ReturnType<typeof useGetCharactersQuery>;
export type GetCharactersLazyQueryHookResult = ReturnType<typeof useGetCharactersLazyQuery>;
export type GetCharactersSuspenseQueryHookResult = ReturnType<typeof useGetCharactersSuspenseQuery>;
export type GetCharactersQueryResult = Apollo.QueryResult<GetCharactersQuery, GetCharactersQueryVariables>;
export const GetCharacterDocument = gql`
    query GetCharacter($id: ID!) {
  character(id: $id) {
    id
    name
    speciesId
    speciesVariantId
    species {
      id
      name
      communityId
      community {
        id
        name
      }
    }
    speciesVariant {
      id
      name
    }
    traitValues {
      traitId
      value
    }
    age
    gender
    details
    ownerId
    creatorId
    visibility
    isSellable
    isTradeable
    price
    tags
    customFields
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    creator {
      id
      username
      displayName
      avatarUrl
    }
    _count {
      media
    }
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
    mainMediaId
    mainMedia {
      id
      title
      image {
        id
        url
        thumbnailUrl
        altText
        isNsfw
      }
    }
  }
}
    `;

/**
 * __useGetCharacterQuery__
 *
 * To run a query within a React component, call `useGetCharacterQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCharacterQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCharacterQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCharacterQuery(baseOptions: Apollo.QueryHookOptions<GetCharacterQuery, GetCharacterQueryVariables> & ({ variables: GetCharacterQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCharacterQuery, GetCharacterQueryVariables>(GetCharacterDocument, options);
      }
export function useGetCharacterLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCharacterQuery, GetCharacterQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCharacterQuery, GetCharacterQueryVariables>(GetCharacterDocument, options);
        }
export function useGetCharacterSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCharacterQuery, GetCharacterQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCharacterQuery, GetCharacterQueryVariables>(GetCharacterDocument, options);
        }
export type GetCharacterQueryHookResult = ReturnType<typeof useGetCharacterQuery>;
export type GetCharacterLazyQueryHookResult = ReturnType<typeof useGetCharacterLazyQuery>;
export type GetCharacterSuspenseQueryHookResult = ReturnType<typeof useGetCharacterSuspenseQuery>;
export type GetCharacterQueryResult = Apollo.QueryResult<GetCharacterQuery, GetCharacterQueryVariables>;
export const GetMyCharactersDocument = gql`
    query GetMyCharacters($filters: CharacterFiltersInput) {
  myCharacters(filters: $filters) {
    characters {
      id
      name
      species {
        id
        name
      }
      age
      gender
      details
      ownerId
      creatorId
      mainMediaId
      visibility
      isSellable
      isTradeable
      price
      tags
      customFields
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      creator {
        id
        username
        displayName
        avatarUrl
      }
      mainMedia {
        id
        title
        image {
          id
          url
          thumbnailUrl
          altText
          isNsfw
        }
      }
      _count {
        media
      }
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetMyCharactersQuery__
 *
 * To run a query within a React component, call `useGetMyCharactersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyCharactersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyCharactersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetMyCharactersQuery(baseOptions?: Apollo.QueryHookOptions<GetMyCharactersQuery, GetMyCharactersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyCharactersQuery, GetMyCharactersQueryVariables>(GetMyCharactersDocument, options);
      }
export function useGetMyCharactersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyCharactersQuery, GetMyCharactersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyCharactersQuery, GetMyCharactersQueryVariables>(GetMyCharactersDocument, options);
        }
export function useGetMyCharactersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyCharactersQuery, GetMyCharactersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyCharactersQuery, GetMyCharactersQueryVariables>(GetMyCharactersDocument, options);
        }
export type GetMyCharactersQueryHookResult = ReturnType<typeof useGetMyCharactersQuery>;
export type GetMyCharactersLazyQueryHookResult = ReturnType<typeof useGetMyCharactersLazyQuery>;
export type GetMyCharactersSuspenseQueryHookResult = ReturnType<typeof useGetMyCharactersSuspenseQuery>;
export type GetMyCharactersQueryResult = Apollo.QueryResult<GetMyCharactersQuery, GetMyCharactersQueryVariables>;
export const CreateCharacterDocument = gql`
    mutation CreateCharacter($input: CreateCharacterInput!) {
  createCharacter(input: $input) {
    id
    name
    species {
      id
      name
    }
    age
    gender
    details
    ownerId
    creatorId
    visibility
    isSellable
    isTradeable
    price
    tags
    customFields
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    creator {
      id
      username
      displayName
      avatarUrl
    }
    _count {
      media
    }
  }
}
    `;
export type CreateCharacterMutationFn = Apollo.MutationFunction<CreateCharacterMutation, CreateCharacterMutationVariables>;

/**
 * __useCreateCharacterMutation__
 *
 * To run a mutation, you first call `useCreateCharacterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCharacterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCharacterMutation, { data, loading, error }] = useCreateCharacterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCharacterMutation(baseOptions?: Apollo.MutationHookOptions<CreateCharacterMutation, CreateCharacterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCharacterMutation, CreateCharacterMutationVariables>(CreateCharacterDocument, options);
      }
export type CreateCharacterMutationHookResult = ReturnType<typeof useCreateCharacterMutation>;
export type CreateCharacterMutationResult = Apollo.MutationResult<CreateCharacterMutation>;
export type CreateCharacterMutationOptions = Apollo.BaseMutationOptions<CreateCharacterMutation, CreateCharacterMutationVariables>;
export const UpdateCharacterDocument = gql`
    mutation UpdateCharacter($id: ID!, $input: UpdateCharacterInput!) {
  updateCharacter(id: $id, input: $input) {
    id
    name
    species {
      id
      name
    }
    age
    gender
    details
    ownerId
    creatorId
    visibility
    isSellable
    isTradeable
    price
    tags
    customFields
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    creator {
      id
      username
      displayName
      avatarUrl
    }
    _count {
      media
    }
  }
}
    `;
export type UpdateCharacterMutationFn = Apollo.MutationFunction<UpdateCharacterMutation, UpdateCharacterMutationVariables>;

/**
 * __useUpdateCharacterMutation__
 *
 * To run a mutation, you first call `useUpdateCharacterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCharacterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCharacterMutation, { data, loading, error }] = useUpdateCharacterMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCharacterMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCharacterMutation, UpdateCharacterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCharacterMutation, UpdateCharacterMutationVariables>(UpdateCharacterDocument, options);
      }
export type UpdateCharacterMutationHookResult = ReturnType<typeof useUpdateCharacterMutation>;
export type UpdateCharacterMutationResult = Apollo.MutationResult<UpdateCharacterMutation>;
export type UpdateCharacterMutationOptions = Apollo.BaseMutationOptions<UpdateCharacterMutation, UpdateCharacterMutationVariables>;
export const DeleteCharacterDocument = gql`
    mutation DeleteCharacter($id: ID!) {
  deleteCharacter(id: $id)
}
    `;
export type DeleteCharacterMutationFn = Apollo.MutationFunction<DeleteCharacterMutation, DeleteCharacterMutationVariables>;

/**
 * __useDeleteCharacterMutation__
 *
 * To run a mutation, you first call `useDeleteCharacterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCharacterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCharacterMutation, { data, loading, error }] = useDeleteCharacterMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCharacterMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCharacterMutation, DeleteCharacterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCharacterMutation, DeleteCharacterMutationVariables>(DeleteCharacterDocument, options);
      }
export type DeleteCharacterMutationHookResult = ReturnType<typeof useDeleteCharacterMutation>;
export type DeleteCharacterMutationResult = Apollo.MutationResult<DeleteCharacterMutation>;
export type DeleteCharacterMutationOptions = Apollo.BaseMutationOptions<DeleteCharacterMutation, DeleteCharacterMutationVariables>;
export const TransferCharacterDocument = gql`
    mutation TransferCharacter($id: ID!, $input: TransferCharacterInput!) {
  transferCharacter(id: $id, input: $input) {
    id
    name
    species {
      id
      name
    }
    age
    gender
    details
    ownerId
    creatorId
    visibility
    isSellable
    isTradeable
    price
    tags
    customFields
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    creator {
      id
      username
      displayName
      avatarUrl
    }
    _count {
      media
    }
  }
}
    `;
export type TransferCharacterMutationFn = Apollo.MutationFunction<TransferCharacterMutation, TransferCharacterMutationVariables>;

/**
 * __useTransferCharacterMutation__
 *
 * To run a mutation, you first call `useTransferCharacterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTransferCharacterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [transferCharacterMutation, { data, loading, error }] = useTransferCharacterMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useTransferCharacterMutation(baseOptions?: Apollo.MutationHookOptions<TransferCharacterMutation, TransferCharacterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TransferCharacterMutation, TransferCharacterMutationVariables>(TransferCharacterDocument, options);
      }
export type TransferCharacterMutationHookResult = ReturnType<typeof useTransferCharacterMutation>;
export type TransferCharacterMutationResult = Apollo.MutationResult<TransferCharacterMutation>;
export type TransferCharacterMutationOptions = Apollo.BaseMutationOptions<TransferCharacterMutation, TransferCharacterMutationVariables>;
export const AddCharacterTagsDocument = gql`
    mutation AddCharacterTags($id: ID!, $input: ManageTagsInput!) {
  addCharacterTags(id: $id, input: $input) {
    id
    name
    tags
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
  }
}
    `;
export type AddCharacterTagsMutationFn = Apollo.MutationFunction<AddCharacterTagsMutation, AddCharacterTagsMutationVariables>;

/**
 * __useAddCharacterTagsMutation__
 *
 * To run a mutation, you first call `useAddCharacterTagsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddCharacterTagsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addCharacterTagsMutation, { data, loading, error }] = useAddCharacterTagsMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddCharacterTagsMutation(baseOptions?: Apollo.MutationHookOptions<AddCharacterTagsMutation, AddCharacterTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddCharacterTagsMutation, AddCharacterTagsMutationVariables>(AddCharacterTagsDocument, options);
      }
export type AddCharacterTagsMutationHookResult = ReturnType<typeof useAddCharacterTagsMutation>;
export type AddCharacterTagsMutationResult = Apollo.MutationResult<AddCharacterTagsMutation>;
export type AddCharacterTagsMutationOptions = Apollo.BaseMutationOptions<AddCharacterTagsMutation, AddCharacterTagsMutationVariables>;
export const RemoveCharacterTagsDocument = gql`
    mutation RemoveCharacterTags($id: ID!, $input: ManageTagsInput!) {
  removeCharacterTags(id: $id, input: $input) {
    id
    name
    tags
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
  }
}
    `;
export type RemoveCharacterTagsMutationFn = Apollo.MutationFunction<RemoveCharacterTagsMutation, RemoveCharacterTagsMutationVariables>;

/**
 * __useRemoveCharacterTagsMutation__
 *
 * To run a mutation, you first call `useRemoveCharacterTagsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveCharacterTagsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeCharacterTagsMutation, { data, loading, error }] = useRemoveCharacterTagsMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRemoveCharacterTagsMutation(baseOptions?: Apollo.MutationHookOptions<RemoveCharacterTagsMutation, RemoveCharacterTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveCharacterTagsMutation, RemoveCharacterTagsMutationVariables>(RemoveCharacterTagsDocument, options);
      }
export type RemoveCharacterTagsMutationHookResult = ReturnType<typeof useRemoveCharacterTagsMutation>;
export type RemoveCharacterTagsMutationResult = Apollo.MutationResult<RemoveCharacterTagsMutation>;
export type RemoveCharacterTagsMutationOptions = Apollo.BaseMutationOptions<RemoveCharacterTagsMutation, RemoveCharacterTagsMutationVariables>;
export const SetCharacterMainMediaDocument = gql`
    mutation SetCharacterMainMedia($id: ID!, $input: SetMainMediaInput!) {
  setCharacterMainMedia(id: $id, input: $input) {
    id
    name
    mainMediaId
    mainMedia {
      id
      title
      image {
        id
        url
        thumbnailUrl
        altText
        isNsfw
      }
    }
  }
}
    `;
export type SetCharacterMainMediaMutationFn = Apollo.MutationFunction<SetCharacterMainMediaMutation, SetCharacterMainMediaMutationVariables>;

/**
 * __useSetCharacterMainMediaMutation__
 *
 * To run a mutation, you first call `useSetCharacterMainMediaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetCharacterMainMediaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setCharacterMainMediaMutation, { data, loading, error }] = useSetCharacterMainMediaMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetCharacterMainMediaMutation(baseOptions?: Apollo.MutationHookOptions<SetCharacterMainMediaMutation, SetCharacterMainMediaMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetCharacterMainMediaMutation, SetCharacterMainMediaMutationVariables>(SetCharacterMainMediaDocument, options);
      }
export type SetCharacterMainMediaMutationHookResult = ReturnType<typeof useSetCharacterMainMediaMutation>;
export type SetCharacterMainMediaMutationResult = Apollo.MutationResult<SetCharacterMainMediaMutation>;
export type SetCharacterMainMediaMutationOptions = Apollo.BaseMutationOptions<SetCharacterMainMediaMutation, SetCharacterMainMediaMutationVariables>;
export const UpdateCharacterTraitsDocument = gql`
    mutation UpdateCharacterTraits($id: ID!, $updateCharacterTraitsInput: UpdateCharacterTraitsInput!) {
  updateCharacterTraits(
    id: $id
    updateCharacterTraitsInput: $updateCharacterTraitsInput
  ) {
    id
    name
    traitValues {
      traitId
      value
    }
  }
}
    `;
export type UpdateCharacterTraitsMutationFn = Apollo.MutationFunction<UpdateCharacterTraitsMutation, UpdateCharacterTraitsMutationVariables>;

/**
 * __useUpdateCharacterTraitsMutation__
 *
 * To run a mutation, you first call `useUpdateCharacterTraitsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCharacterTraitsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCharacterTraitsMutation, { data, loading, error }] = useUpdateCharacterTraitsMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateCharacterTraitsInput: // value for 'updateCharacterTraitsInput'
 *   },
 * });
 */
export function useUpdateCharacterTraitsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCharacterTraitsMutation, UpdateCharacterTraitsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCharacterTraitsMutation, UpdateCharacterTraitsMutationVariables>(UpdateCharacterTraitsDocument, options);
      }
export type UpdateCharacterTraitsMutationHookResult = ReturnType<typeof useUpdateCharacterTraitsMutation>;
export type UpdateCharacterTraitsMutationResult = Apollo.MutationResult<UpdateCharacterTraitsMutation>;
export type UpdateCharacterTraitsMutationOptions = Apollo.BaseMutationOptions<UpdateCharacterTraitsMutation, UpdateCharacterTraitsMutationVariables>;
export const GetLikedCharactersDocument = gql`
    query GetLikedCharacters {
  likedCharacters {
    id
    name
    species {
      id
      name
    }
    age
    gender
    visibility
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    _count {
      media
    }
    likesCount
    userHasLiked
  }
}
    `;

/**
 * __useGetLikedCharactersQuery__
 *
 * To run a query within a React component, call `useGetLikedCharactersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLikedCharactersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLikedCharactersQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetLikedCharactersQuery(baseOptions?: Apollo.QueryHookOptions<GetLikedCharactersQuery, GetLikedCharactersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLikedCharactersQuery, GetLikedCharactersQueryVariables>(GetLikedCharactersDocument, options);
      }
export function useGetLikedCharactersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLikedCharactersQuery, GetLikedCharactersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLikedCharactersQuery, GetLikedCharactersQueryVariables>(GetLikedCharactersDocument, options);
        }
export function useGetLikedCharactersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLikedCharactersQuery, GetLikedCharactersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLikedCharactersQuery, GetLikedCharactersQueryVariables>(GetLikedCharactersDocument, options);
        }
export type GetLikedCharactersQueryHookResult = ReturnType<typeof useGetLikedCharactersQuery>;
export type GetLikedCharactersLazyQueryHookResult = ReturnType<typeof useGetLikedCharactersLazyQuery>;
export type GetLikedCharactersSuspenseQueryHookResult = ReturnType<typeof useGetLikedCharactersSuspenseQuery>;
export type GetLikedCharactersQueryResult = Apollo.QueryResult<GetLikedCharactersQuery, GetLikedCharactersQueryVariables>;
export const CommunitiesDocument = gql`
    query Communities($first: Int, $after: String) {
  communities(first: $first, after: $after) {
    nodes {
      id
      name
      createdAt
      updatedAt
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
}
    `;

/**
 * __useCommunitiesQuery__
 *
 * To run a query within a React component, call `useCommunitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommunitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommunitiesQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useCommunitiesQuery(baseOptions?: Apollo.QueryHookOptions<CommunitiesQuery, CommunitiesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommunitiesQuery, CommunitiesQueryVariables>(CommunitiesDocument, options);
      }
export function useCommunitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommunitiesQuery, CommunitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommunitiesQuery, CommunitiesQueryVariables>(CommunitiesDocument, options);
        }
export function useCommunitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CommunitiesQuery, CommunitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CommunitiesQuery, CommunitiesQueryVariables>(CommunitiesDocument, options);
        }
export type CommunitiesQueryHookResult = ReturnType<typeof useCommunitiesQuery>;
export type CommunitiesLazyQueryHookResult = ReturnType<typeof useCommunitiesLazyQuery>;
export type CommunitiesSuspenseQueryHookResult = ReturnType<typeof useCommunitiesSuspenseQuery>;
export type CommunitiesQueryResult = Apollo.QueryResult<CommunitiesQuery, CommunitiesQueryVariables>;
export const CommunityByIdDocument = gql`
    query CommunityById($id: ID!) {
  community(id: $id) {
    id
    name
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useCommunityByIdQuery__
 *
 * To run a query within a React component, call `useCommunityByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommunityByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommunityByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCommunityByIdQuery(baseOptions: Apollo.QueryHookOptions<CommunityByIdQuery, CommunityByIdQueryVariables> & ({ variables: CommunityByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommunityByIdQuery, CommunityByIdQueryVariables>(CommunityByIdDocument, options);
      }
export function useCommunityByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommunityByIdQuery, CommunityByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommunityByIdQuery, CommunityByIdQueryVariables>(CommunityByIdDocument, options);
        }
export function useCommunityByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CommunityByIdQuery, CommunityByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CommunityByIdQuery, CommunityByIdQueryVariables>(CommunityByIdDocument, options);
        }
export type CommunityByIdQueryHookResult = ReturnType<typeof useCommunityByIdQuery>;
export type CommunityByIdLazyQueryHookResult = ReturnType<typeof useCommunityByIdLazyQuery>;
export type CommunityByIdSuspenseQueryHookResult = ReturnType<typeof useCommunityByIdSuspenseQuery>;
export type CommunityByIdQueryResult = Apollo.QueryResult<CommunityByIdQuery, CommunityByIdQueryVariables>;
export const GetCommunityMembersDocument = gql`
    query GetCommunityMembers($communityId: ID!, $search: String, $limit: Int) {
  community(id: $communityId) {
    id
    members(search: $search, limit: $limit) {
      ...CommunityMemberUser
    }
  }
}
    ${CommunityMemberUserFragmentDoc}`;

/**
 * __useGetCommunityMembersQuery__
 *
 * To run a query within a React component, call `useGetCommunityMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCommunityMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCommunityMembersQuery({
 *   variables: {
 *      communityId: // value for 'communityId'
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetCommunityMembersQuery(baseOptions: Apollo.QueryHookOptions<GetCommunityMembersQuery, GetCommunityMembersQueryVariables> & ({ variables: GetCommunityMembersQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCommunityMembersQuery, GetCommunityMembersQueryVariables>(GetCommunityMembersDocument, options);
      }
export function useGetCommunityMembersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCommunityMembersQuery, GetCommunityMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCommunityMembersQuery, GetCommunityMembersQueryVariables>(GetCommunityMembersDocument, options);
        }
export function useGetCommunityMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCommunityMembersQuery, GetCommunityMembersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCommunityMembersQuery, GetCommunityMembersQueryVariables>(GetCommunityMembersDocument, options);
        }
export type GetCommunityMembersQueryHookResult = ReturnType<typeof useGetCommunityMembersQuery>;
export type GetCommunityMembersLazyQueryHookResult = ReturnType<typeof useGetCommunityMembersLazyQuery>;
export type GetCommunityMembersSuspenseQueryHookResult = ReturnType<typeof useGetCommunityMembersSuspenseQuery>;
export type GetCommunityMembersQueryResult = Apollo.QueryResult<GetCommunityMembersQuery, GetCommunityMembersQueryVariables>;
export const CreateCommunityDocument = gql`
    mutation CreateCommunity($createCommunityInput: CreateCommunityInput!) {
  createCommunity(createCommunityInput: $createCommunityInput) {
    id
    name
    createdAt
    updatedAt
  }
}
    `;
export type CreateCommunityMutationFn = Apollo.MutationFunction<CreateCommunityMutation, CreateCommunityMutationVariables>;

/**
 * __useCreateCommunityMutation__
 *
 * To run a mutation, you first call `useCreateCommunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCommunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCommunityMutation, { data, loading, error }] = useCreateCommunityMutation({
 *   variables: {
 *      createCommunityInput: // value for 'createCommunityInput'
 *   },
 * });
 */
export function useCreateCommunityMutation(baseOptions?: Apollo.MutationHookOptions<CreateCommunityMutation, CreateCommunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCommunityMutation, CreateCommunityMutationVariables>(CreateCommunityDocument, options);
      }
export type CreateCommunityMutationHookResult = ReturnType<typeof useCreateCommunityMutation>;
export type CreateCommunityMutationResult = Apollo.MutationResult<CreateCommunityMutation>;
export type CreateCommunityMutationOptions = Apollo.BaseMutationOptions<CreateCommunityMutation, CreateCommunityMutationVariables>;
export const UpdateCommunityDocument = gql`
    mutation UpdateCommunity($id: ID!, $updateCommunityInput: UpdateCommunityInput!) {
  updateCommunity(id: $id, updateCommunityInput: $updateCommunityInput) {
    id
    name
    createdAt
    updatedAt
  }
}
    `;
export type UpdateCommunityMutationFn = Apollo.MutationFunction<UpdateCommunityMutation, UpdateCommunityMutationVariables>;

/**
 * __useUpdateCommunityMutation__
 *
 * To run a mutation, you first call `useUpdateCommunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCommunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCommunityMutation, { data, loading, error }] = useUpdateCommunityMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateCommunityInput: // value for 'updateCommunityInput'
 *   },
 * });
 */
export function useUpdateCommunityMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCommunityMutation, UpdateCommunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCommunityMutation, UpdateCommunityMutationVariables>(UpdateCommunityDocument, options);
      }
export type UpdateCommunityMutationHookResult = ReturnType<typeof useUpdateCommunityMutation>;
export type UpdateCommunityMutationResult = Apollo.MutationResult<UpdateCommunityMutation>;
export type UpdateCommunityMutationOptions = Apollo.BaseMutationOptions<UpdateCommunityMutation, UpdateCommunityMutationVariables>;
export const RemoveCommunityDocument = gql`
    mutation RemoveCommunity($id: ID!) {
  removeCommunity(id: $id) {
    removed
    message
  }
}
    `;
export type RemoveCommunityMutationFn = Apollo.MutationFunction<RemoveCommunityMutation, RemoveCommunityMutationVariables>;

/**
 * __useRemoveCommunityMutation__
 *
 * To run a mutation, you first call `useRemoveCommunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveCommunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeCommunityMutation, { data, loading, error }] = useRemoveCommunityMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveCommunityMutation(baseOptions?: Apollo.MutationHookOptions<RemoveCommunityMutation, RemoveCommunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveCommunityMutation, RemoveCommunityMutationVariables>(RemoveCommunityDocument, options);
      }
export type RemoveCommunityMutationHookResult = ReturnType<typeof useRemoveCommunityMutation>;
export type RemoveCommunityMutationResult = Apollo.MutationResult<RemoveCommunityMutation>;
export type RemoveCommunityMutationOptions = Apollo.BaseMutationOptions<RemoveCommunityMutation, RemoveCommunityMutationVariables>;
export const CommunityMembersByUserDocument = gql`
    query CommunityMembersByUser($userId: ID!, $first: Int, $after: String) {
  communityMembersByUser(userId: $userId, first: $first, after: $after) {
    nodes {
      id
      createdAt
      updatedAt
      role {
        id
        name
        community {
          id
          name
          createdAt
          updatedAt
        }
        canCreateCharacter
        canCreateInviteCode
        canCreateRole
        canEditCharacter
        canCreateSpecies
        canEditSpecies
        canEditRole
        canEditCharacter
        canEditOwnCharacter
        canListInviteCodes
        canRemoveCommunityMember
        canManageMemberRoles
      }
      user {
        id
        username
        displayName
      }
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
}
    `;

/**
 * __useCommunityMembersByUserQuery__
 *
 * To run a query within a React component, call `useCommunityMembersByUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommunityMembersByUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommunityMembersByUserQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useCommunityMembersByUserQuery(baseOptions: Apollo.QueryHookOptions<CommunityMembersByUserQuery, CommunityMembersByUserQueryVariables> & ({ variables: CommunityMembersByUserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommunityMembersByUserQuery, CommunityMembersByUserQueryVariables>(CommunityMembersByUserDocument, options);
      }
export function useCommunityMembersByUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommunityMembersByUserQuery, CommunityMembersByUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommunityMembersByUserQuery, CommunityMembersByUserQueryVariables>(CommunityMembersByUserDocument, options);
        }
export function useCommunityMembersByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CommunityMembersByUserQuery, CommunityMembersByUserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CommunityMembersByUserQuery, CommunityMembersByUserQueryVariables>(CommunityMembersByUserDocument, options);
        }
export type CommunityMembersByUserQueryHookResult = ReturnType<typeof useCommunityMembersByUserQuery>;
export type CommunityMembersByUserLazyQueryHookResult = ReturnType<typeof useCommunityMembersByUserLazyQuery>;
export type CommunityMembersByUserSuspenseQueryHookResult = ReturnType<typeof useCommunityMembersByUserSuspenseQuery>;
export type CommunityMembersByUserQueryResult = Apollo.QueryResult<CommunityMembersByUserQuery, CommunityMembersByUserQueryVariables>;
export const SpeciesWithTraitsAndEnumValuesDocument = gql`
    query SpeciesWithTraitsAndEnumValues($speciesId: ID!) {
  speciesById(id: $speciesId) {
    id
    name
    communityId
    hasImage
    createdAt
    updatedAt
    community {
      id
      name
    }
    traits {
      id
      name
      valueType
      speciesId
      createdAt
      updatedAt
      enumValues {
        id
        name
        order
        traitId
        createdAt
        updatedAt
      }
    }
  }
}
    `;

/**
 * __useSpeciesWithTraitsAndEnumValuesQuery__
 *
 * To run a query within a React component, call `useSpeciesWithTraitsAndEnumValuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesWithTraitsAndEnumValuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesWithTraitsAndEnumValuesQuery({
 *   variables: {
 *      speciesId: // value for 'speciesId'
 *   },
 * });
 */
export function useSpeciesWithTraitsAndEnumValuesQuery(baseOptions: Apollo.QueryHookOptions<SpeciesWithTraitsAndEnumValuesQuery, SpeciesWithTraitsAndEnumValuesQueryVariables> & ({ variables: SpeciesWithTraitsAndEnumValuesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesWithTraitsAndEnumValuesQuery, SpeciesWithTraitsAndEnumValuesQueryVariables>(SpeciesWithTraitsAndEnumValuesDocument, options);
      }
export function useSpeciesWithTraitsAndEnumValuesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesWithTraitsAndEnumValuesQuery, SpeciesWithTraitsAndEnumValuesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesWithTraitsAndEnumValuesQuery, SpeciesWithTraitsAndEnumValuesQueryVariables>(SpeciesWithTraitsAndEnumValuesDocument, options);
        }
export function useSpeciesWithTraitsAndEnumValuesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesWithTraitsAndEnumValuesQuery, SpeciesWithTraitsAndEnumValuesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesWithTraitsAndEnumValuesQuery, SpeciesWithTraitsAndEnumValuesQueryVariables>(SpeciesWithTraitsAndEnumValuesDocument, options);
        }
export type SpeciesWithTraitsAndEnumValuesQueryHookResult = ReturnType<typeof useSpeciesWithTraitsAndEnumValuesQuery>;
export type SpeciesWithTraitsAndEnumValuesLazyQueryHookResult = ReturnType<typeof useSpeciesWithTraitsAndEnumValuesLazyQuery>;
export type SpeciesWithTraitsAndEnumValuesSuspenseQueryHookResult = ReturnType<typeof useSpeciesWithTraitsAndEnumValuesSuspenseQuery>;
export type SpeciesWithTraitsAndEnumValuesQueryResult = Apollo.QueryResult<SpeciesWithTraitsAndEnumValuesQuery, SpeciesWithTraitsAndEnumValuesQueryVariables>;
export const SpeciesVariantWithEnumValueSettingsDocument = gql`
    query SpeciesVariantWithEnumValueSettings($variantId: ID!) {
  speciesVariantById(id: $variantId) {
    id
    name
    speciesId
    createdAt
    updatedAt
    species {
      id
      name
      communityId
      traits {
        id
        name
        valueType
        enumValues {
          id
          name
          order
        }
      }
    }
    enumValueSettings {
      id
      enumValueId
      speciesVariantId
      createdAt
      updatedAt
      enumValue {
        id
        name
        order
        traitId
      }
    }
  }
}
    `;

/**
 * __useSpeciesVariantWithEnumValueSettingsQuery__
 *
 * To run a query within a React component, call `useSpeciesVariantWithEnumValueSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesVariantWithEnumValueSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesVariantWithEnumValueSettingsQuery({
 *   variables: {
 *      variantId: // value for 'variantId'
 *   },
 * });
 */
export function useSpeciesVariantWithEnumValueSettingsQuery(baseOptions: Apollo.QueryHookOptions<SpeciesVariantWithEnumValueSettingsQuery, SpeciesVariantWithEnumValueSettingsQueryVariables> & ({ variables: SpeciesVariantWithEnumValueSettingsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesVariantWithEnumValueSettingsQuery, SpeciesVariantWithEnumValueSettingsQueryVariables>(SpeciesVariantWithEnumValueSettingsDocument, options);
      }
export function useSpeciesVariantWithEnumValueSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesVariantWithEnumValueSettingsQuery, SpeciesVariantWithEnumValueSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesVariantWithEnumValueSettingsQuery, SpeciesVariantWithEnumValueSettingsQueryVariables>(SpeciesVariantWithEnumValueSettingsDocument, options);
        }
export function useSpeciesVariantWithEnumValueSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesVariantWithEnumValueSettingsQuery, SpeciesVariantWithEnumValueSettingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesVariantWithEnumValueSettingsQuery, SpeciesVariantWithEnumValueSettingsQueryVariables>(SpeciesVariantWithEnumValueSettingsDocument, options);
        }
export type SpeciesVariantWithEnumValueSettingsQueryHookResult = ReturnType<typeof useSpeciesVariantWithEnumValueSettingsQuery>;
export type SpeciesVariantWithEnumValueSettingsLazyQueryHookResult = ReturnType<typeof useSpeciesVariantWithEnumValueSettingsLazyQuery>;
export type SpeciesVariantWithEnumValueSettingsSuspenseQueryHookResult = ReturnType<typeof useSpeciesVariantWithEnumValueSettingsSuspenseQuery>;
export type SpeciesVariantWithEnumValueSettingsQueryResult = Apollo.QueryResult<SpeciesVariantWithEnumValueSettingsQuery, SpeciesVariantWithEnumValueSettingsQueryVariables>;
export const EnumValueSettingsDocument = gql`
    query EnumValueSettings($first: Int, $after: String) {
  enumValueSettings(first: $first, after: $after) {
    ...EnumValueSettingConnectionDetails
  }
}
    ${EnumValueSettingConnectionDetailsFragmentDoc}`;

/**
 * __useEnumValueSettingsQuery__
 *
 * To run a query within a React component, call `useEnumValueSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useEnumValueSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEnumValueSettingsQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useEnumValueSettingsQuery(baseOptions?: Apollo.QueryHookOptions<EnumValueSettingsQuery, EnumValueSettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EnumValueSettingsQuery, EnumValueSettingsQueryVariables>(EnumValueSettingsDocument, options);
      }
export function useEnumValueSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EnumValueSettingsQuery, EnumValueSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EnumValueSettingsQuery, EnumValueSettingsQueryVariables>(EnumValueSettingsDocument, options);
        }
export function useEnumValueSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EnumValueSettingsQuery, EnumValueSettingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EnumValueSettingsQuery, EnumValueSettingsQueryVariables>(EnumValueSettingsDocument, options);
        }
export type EnumValueSettingsQueryHookResult = ReturnType<typeof useEnumValueSettingsQuery>;
export type EnumValueSettingsLazyQueryHookResult = ReturnType<typeof useEnumValueSettingsLazyQuery>;
export type EnumValueSettingsSuspenseQueryHookResult = ReturnType<typeof useEnumValueSettingsSuspenseQuery>;
export type EnumValueSettingsQueryResult = Apollo.QueryResult<EnumValueSettingsQuery, EnumValueSettingsQueryVariables>;
export const EnumValueSettingsBySpeciesVariantDocument = gql`
    query EnumValueSettingsBySpeciesVariant($speciesVariantId: ID!, $first: Int, $after: String) {
  enumValueSettingsBySpeciesVariant(
    speciesVariantId: $speciesVariantId
    first: $first
    after: $after
  ) {
    ...EnumValueSettingConnectionDetails
  }
}
    ${EnumValueSettingConnectionDetailsFragmentDoc}`;

/**
 * __useEnumValueSettingsBySpeciesVariantQuery__
 *
 * To run a query within a React component, call `useEnumValueSettingsBySpeciesVariantQuery` and pass it any options that fit your needs.
 * When your component renders, `useEnumValueSettingsBySpeciesVariantQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEnumValueSettingsBySpeciesVariantQuery({
 *   variables: {
 *      speciesVariantId: // value for 'speciesVariantId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useEnumValueSettingsBySpeciesVariantQuery(baseOptions: Apollo.QueryHookOptions<EnumValueSettingsBySpeciesVariantQuery, EnumValueSettingsBySpeciesVariantQueryVariables> & ({ variables: EnumValueSettingsBySpeciesVariantQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EnumValueSettingsBySpeciesVariantQuery, EnumValueSettingsBySpeciesVariantQueryVariables>(EnumValueSettingsBySpeciesVariantDocument, options);
      }
export function useEnumValueSettingsBySpeciesVariantLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EnumValueSettingsBySpeciesVariantQuery, EnumValueSettingsBySpeciesVariantQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EnumValueSettingsBySpeciesVariantQuery, EnumValueSettingsBySpeciesVariantQueryVariables>(EnumValueSettingsBySpeciesVariantDocument, options);
        }
export function useEnumValueSettingsBySpeciesVariantSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EnumValueSettingsBySpeciesVariantQuery, EnumValueSettingsBySpeciesVariantQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EnumValueSettingsBySpeciesVariantQuery, EnumValueSettingsBySpeciesVariantQueryVariables>(EnumValueSettingsBySpeciesVariantDocument, options);
        }
export type EnumValueSettingsBySpeciesVariantQueryHookResult = ReturnType<typeof useEnumValueSettingsBySpeciesVariantQuery>;
export type EnumValueSettingsBySpeciesVariantLazyQueryHookResult = ReturnType<typeof useEnumValueSettingsBySpeciesVariantLazyQuery>;
export type EnumValueSettingsBySpeciesVariantSuspenseQueryHookResult = ReturnType<typeof useEnumValueSettingsBySpeciesVariantSuspenseQuery>;
export type EnumValueSettingsBySpeciesVariantQueryResult = Apollo.QueryResult<EnumValueSettingsBySpeciesVariantQuery, EnumValueSettingsBySpeciesVariantQueryVariables>;
export const EnumValueSettingsByEnumValueDocument = gql`
    query EnumValueSettingsByEnumValue($enumValueId: ID!, $first: Int, $after: String) {
  enumValueSettingsByEnumValue(
    enumValueId: $enumValueId
    first: $first
    after: $after
  ) {
    ...EnumValueSettingConnectionDetails
  }
}
    ${EnumValueSettingConnectionDetailsFragmentDoc}`;

/**
 * __useEnumValueSettingsByEnumValueQuery__
 *
 * To run a query within a React component, call `useEnumValueSettingsByEnumValueQuery` and pass it any options that fit your needs.
 * When your component renders, `useEnumValueSettingsByEnumValueQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEnumValueSettingsByEnumValueQuery({
 *   variables: {
 *      enumValueId: // value for 'enumValueId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useEnumValueSettingsByEnumValueQuery(baseOptions: Apollo.QueryHookOptions<EnumValueSettingsByEnumValueQuery, EnumValueSettingsByEnumValueQueryVariables> & ({ variables: EnumValueSettingsByEnumValueQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EnumValueSettingsByEnumValueQuery, EnumValueSettingsByEnumValueQueryVariables>(EnumValueSettingsByEnumValueDocument, options);
      }
export function useEnumValueSettingsByEnumValueLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EnumValueSettingsByEnumValueQuery, EnumValueSettingsByEnumValueQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EnumValueSettingsByEnumValueQuery, EnumValueSettingsByEnumValueQueryVariables>(EnumValueSettingsByEnumValueDocument, options);
        }
export function useEnumValueSettingsByEnumValueSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EnumValueSettingsByEnumValueQuery, EnumValueSettingsByEnumValueQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EnumValueSettingsByEnumValueQuery, EnumValueSettingsByEnumValueQueryVariables>(EnumValueSettingsByEnumValueDocument, options);
        }
export type EnumValueSettingsByEnumValueQueryHookResult = ReturnType<typeof useEnumValueSettingsByEnumValueQuery>;
export type EnumValueSettingsByEnumValueLazyQueryHookResult = ReturnType<typeof useEnumValueSettingsByEnumValueLazyQuery>;
export type EnumValueSettingsByEnumValueSuspenseQueryHookResult = ReturnType<typeof useEnumValueSettingsByEnumValueSuspenseQuery>;
export type EnumValueSettingsByEnumValueQueryResult = Apollo.QueryResult<EnumValueSettingsByEnumValueQuery, EnumValueSettingsByEnumValueQueryVariables>;
export const EnumValueSettingByIdDocument = gql`
    query EnumValueSettingById($id: ID!) {
  enumValueSettingById(id: $id) {
    ...EnumValueSettingDetails
  }
}
    ${EnumValueSettingDetailsFragmentDoc}`;

/**
 * __useEnumValueSettingByIdQuery__
 *
 * To run a query within a React component, call `useEnumValueSettingByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useEnumValueSettingByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEnumValueSettingByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEnumValueSettingByIdQuery(baseOptions: Apollo.QueryHookOptions<EnumValueSettingByIdQuery, EnumValueSettingByIdQueryVariables> & ({ variables: EnumValueSettingByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EnumValueSettingByIdQuery, EnumValueSettingByIdQueryVariables>(EnumValueSettingByIdDocument, options);
      }
export function useEnumValueSettingByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EnumValueSettingByIdQuery, EnumValueSettingByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EnumValueSettingByIdQuery, EnumValueSettingByIdQueryVariables>(EnumValueSettingByIdDocument, options);
        }
export function useEnumValueSettingByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EnumValueSettingByIdQuery, EnumValueSettingByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EnumValueSettingByIdQuery, EnumValueSettingByIdQueryVariables>(EnumValueSettingByIdDocument, options);
        }
export type EnumValueSettingByIdQueryHookResult = ReturnType<typeof useEnumValueSettingByIdQuery>;
export type EnumValueSettingByIdLazyQueryHookResult = ReturnType<typeof useEnumValueSettingByIdLazyQuery>;
export type EnumValueSettingByIdSuspenseQueryHookResult = ReturnType<typeof useEnumValueSettingByIdSuspenseQuery>;
export type EnumValueSettingByIdQueryResult = Apollo.QueryResult<EnumValueSettingByIdQuery, EnumValueSettingByIdQueryVariables>;
export const CreateEnumValueSettingDocument = gql`
    mutation CreateEnumValueSetting($createEnumValueSettingInput: CreateEnumValueSettingInput!) {
  createEnumValueSetting(
    createEnumValueSettingInput: $createEnumValueSettingInput
  ) {
    ...EnumValueSettingDetails
  }
}
    ${EnumValueSettingDetailsFragmentDoc}`;
export type CreateEnumValueSettingMutationFn = Apollo.MutationFunction<CreateEnumValueSettingMutation, CreateEnumValueSettingMutationVariables>;

/**
 * __useCreateEnumValueSettingMutation__
 *
 * To run a mutation, you first call `useCreateEnumValueSettingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateEnumValueSettingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createEnumValueSettingMutation, { data, loading, error }] = useCreateEnumValueSettingMutation({
 *   variables: {
 *      createEnumValueSettingInput: // value for 'createEnumValueSettingInput'
 *   },
 * });
 */
export function useCreateEnumValueSettingMutation(baseOptions?: Apollo.MutationHookOptions<CreateEnumValueSettingMutation, CreateEnumValueSettingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateEnumValueSettingMutation, CreateEnumValueSettingMutationVariables>(CreateEnumValueSettingDocument, options);
      }
export type CreateEnumValueSettingMutationHookResult = ReturnType<typeof useCreateEnumValueSettingMutation>;
export type CreateEnumValueSettingMutationResult = Apollo.MutationResult<CreateEnumValueSettingMutation>;
export type CreateEnumValueSettingMutationOptions = Apollo.BaseMutationOptions<CreateEnumValueSettingMutation, CreateEnumValueSettingMutationVariables>;
export const UpdateEnumValueSettingDocument = gql`
    mutation UpdateEnumValueSetting($id: ID!, $updateEnumValueSettingInput: UpdateEnumValueSettingInput!) {
  updateEnumValueSetting(
    id: $id
    updateEnumValueSettingInput: $updateEnumValueSettingInput
  ) {
    ...EnumValueSettingDetails
  }
}
    ${EnumValueSettingDetailsFragmentDoc}`;
export type UpdateEnumValueSettingMutationFn = Apollo.MutationFunction<UpdateEnumValueSettingMutation, UpdateEnumValueSettingMutationVariables>;

/**
 * __useUpdateEnumValueSettingMutation__
 *
 * To run a mutation, you first call `useUpdateEnumValueSettingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateEnumValueSettingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateEnumValueSettingMutation, { data, loading, error }] = useUpdateEnumValueSettingMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateEnumValueSettingInput: // value for 'updateEnumValueSettingInput'
 *   },
 * });
 */
export function useUpdateEnumValueSettingMutation(baseOptions?: Apollo.MutationHookOptions<UpdateEnumValueSettingMutation, UpdateEnumValueSettingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateEnumValueSettingMutation, UpdateEnumValueSettingMutationVariables>(UpdateEnumValueSettingDocument, options);
      }
export type UpdateEnumValueSettingMutationHookResult = ReturnType<typeof useUpdateEnumValueSettingMutation>;
export type UpdateEnumValueSettingMutationResult = Apollo.MutationResult<UpdateEnumValueSettingMutation>;
export type UpdateEnumValueSettingMutationOptions = Apollo.BaseMutationOptions<UpdateEnumValueSettingMutation, UpdateEnumValueSettingMutationVariables>;
export const DeleteEnumValueSettingDocument = gql`
    mutation DeleteEnumValueSetting($id: ID!) {
  removeEnumValueSetting(id: $id) {
    removed
    message
  }
}
    `;
export type DeleteEnumValueSettingMutationFn = Apollo.MutationFunction<DeleteEnumValueSettingMutation, DeleteEnumValueSettingMutationVariables>;

/**
 * __useDeleteEnumValueSettingMutation__
 *
 * To run a mutation, you first call `useDeleteEnumValueSettingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteEnumValueSettingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteEnumValueSettingMutation, { data, loading, error }] = useDeleteEnumValueSettingMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteEnumValueSettingMutation(baseOptions?: Apollo.MutationHookOptions<DeleteEnumValueSettingMutation, DeleteEnumValueSettingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteEnumValueSettingMutation, DeleteEnumValueSettingMutationVariables>(DeleteEnumValueSettingDocument, options);
      }
export type DeleteEnumValueSettingMutationHookResult = ReturnType<typeof useDeleteEnumValueSettingMutation>;
export type DeleteEnumValueSettingMutationResult = Apollo.MutationResult<DeleteEnumValueSettingMutation>;
export type DeleteEnumValueSettingMutationOptions = Apollo.BaseMutationOptions<DeleteEnumValueSettingMutation, DeleteEnumValueSettingMutationVariables>;
export const EnumValuesByTraitDocument = gql`
    query EnumValuesByTrait($traitId: ID!, $first: Int, $after: String) {
  enumValuesByTrait(traitId: $traitId, first: $first, after: $after) {
    ...EnumValueConnectionDetails
  }
}
    ${EnumValueConnectionDetailsFragmentDoc}`;

/**
 * __useEnumValuesByTraitQuery__
 *
 * To run a query within a React component, call `useEnumValuesByTraitQuery` and pass it any options that fit your needs.
 * When your component renders, `useEnumValuesByTraitQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEnumValuesByTraitQuery({
 *   variables: {
 *      traitId: // value for 'traitId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useEnumValuesByTraitQuery(baseOptions: Apollo.QueryHookOptions<EnumValuesByTraitQuery, EnumValuesByTraitQueryVariables> & ({ variables: EnumValuesByTraitQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EnumValuesByTraitQuery, EnumValuesByTraitQueryVariables>(EnumValuesByTraitDocument, options);
      }
export function useEnumValuesByTraitLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EnumValuesByTraitQuery, EnumValuesByTraitQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EnumValuesByTraitQuery, EnumValuesByTraitQueryVariables>(EnumValuesByTraitDocument, options);
        }
export function useEnumValuesByTraitSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EnumValuesByTraitQuery, EnumValuesByTraitQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EnumValuesByTraitQuery, EnumValuesByTraitQueryVariables>(EnumValuesByTraitDocument, options);
        }
export type EnumValuesByTraitQueryHookResult = ReturnType<typeof useEnumValuesByTraitQuery>;
export type EnumValuesByTraitLazyQueryHookResult = ReturnType<typeof useEnumValuesByTraitLazyQuery>;
export type EnumValuesByTraitSuspenseQueryHookResult = ReturnType<typeof useEnumValuesByTraitSuspenseQuery>;
export type EnumValuesByTraitQueryResult = Apollo.QueryResult<EnumValuesByTraitQuery, EnumValuesByTraitQueryVariables>;
export const EnumValueByIdDocument = gql`
    query EnumValueById($id: ID!) {
  enumValueById(id: $id) {
    ...EnumValueDetails
    trait {
      id
      name
      valueType
      species {
        id
        name
        communityId
      }
    }
  }
}
    ${EnumValueDetailsFragmentDoc}`;

/**
 * __useEnumValueByIdQuery__
 *
 * To run a query within a React component, call `useEnumValueByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useEnumValueByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEnumValueByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEnumValueByIdQuery(baseOptions: Apollo.QueryHookOptions<EnumValueByIdQuery, EnumValueByIdQueryVariables> & ({ variables: EnumValueByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EnumValueByIdQuery, EnumValueByIdQueryVariables>(EnumValueByIdDocument, options);
      }
export function useEnumValueByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EnumValueByIdQuery, EnumValueByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EnumValueByIdQuery, EnumValueByIdQueryVariables>(EnumValueByIdDocument, options);
        }
export function useEnumValueByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EnumValueByIdQuery, EnumValueByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EnumValueByIdQuery, EnumValueByIdQueryVariables>(EnumValueByIdDocument, options);
        }
export type EnumValueByIdQueryHookResult = ReturnType<typeof useEnumValueByIdQuery>;
export type EnumValueByIdLazyQueryHookResult = ReturnType<typeof useEnumValueByIdLazyQuery>;
export type EnumValueByIdSuspenseQueryHookResult = ReturnType<typeof useEnumValueByIdSuspenseQuery>;
export type EnumValueByIdQueryResult = Apollo.QueryResult<EnumValueByIdQuery, EnumValueByIdQueryVariables>;
export const CreateEnumValueDocument = gql`
    mutation CreateEnumValue($createEnumValueInput: CreateEnumValueInput!) {
  createEnumValue(createEnumValueInput: $createEnumValueInput) {
    ...EnumValueDetails
  }
}
    ${EnumValueDetailsFragmentDoc}`;
export type CreateEnumValueMutationFn = Apollo.MutationFunction<CreateEnumValueMutation, CreateEnumValueMutationVariables>;

/**
 * __useCreateEnumValueMutation__
 *
 * To run a mutation, you first call `useCreateEnumValueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateEnumValueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createEnumValueMutation, { data, loading, error }] = useCreateEnumValueMutation({
 *   variables: {
 *      createEnumValueInput: // value for 'createEnumValueInput'
 *   },
 * });
 */
export function useCreateEnumValueMutation(baseOptions?: Apollo.MutationHookOptions<CreateEnumValueMutation, CreateEnumValueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateEnumValueMutation, CreateEnumValueMutationVariables>(CreateEnumValueDocument, options);
      }
export type CreateEnumValueMutationHookResult = ReturnType<typeof useCreateEnumValueMutation>;
export type CreateEnumValueMutationResult = Apollo.MutationResult<CreateEnumValueMutation>;
export type CreateEnumValueMutationOptions = Apollo.BaseMutationOptions<CreateEnumValueMutation, CreateEnumValueMutationVariables>;
export const UpdateEnumValueDocument = gql`
    mutation UpdateEnumValue($id: ID!, $updateEnumValueInput: UpdateEnumValueInput!) {
  updateEnumValue(id: $id, updateEnumValueInput: $updateEnumValueInput) {
    ...EnumValueDetails
  }
}
    ${EnumValueDetailsFragmentDoc}`;
export type UpdateEnumValueMutationFn = Apollo.MutationFunction<UpdateEnumValueMutation, UpdateEnumValueMutationVariables>;

/**
 * __useUpdateEnumValueMutation__
 *
 * To run a mutation, you first call `useUpdateEnumValueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateEnumValueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateEnumValueMutation, { data, loading, error }] = useUpdateEnumValueMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateEnumValueInput: // value for 'updateEnumValueInput'
 *   },
 * });
 */
export function useUpdateEnumValueMutation(baseOptions?: Apollo.MutationHookOptions<UpdateEnumValueMutation, UpdateEnumValueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateEnumValueMutation, UpdateEnumValueMutationVariables>(UpdateEnumValueDocument, options);
      }
export type UpdateEnumValueMutationHookResult = ReturnType<typeof useUpdateEnumValueMutation>;
export type UpdateEnumValueMutationResult = Apollo.MutationResult<UpdateEnumValueMutation>;
export type UpdateEnumValueMutationOptions = Apollo.BaseMutationOptions<UpdateEnumValueMutation, UpdateEnumValueMutationVariables>;
export const DeleteEnumValueDocument = gql`
    mutation DeleteEnumValue($id: ID!) {
  removeEnumValue(id: $id) {
    removed
    message
  }
}
    `;
export type DeleteEnumValueMutationFn = Apollo.MutationFunction<DeleteEnumValueMutation, DeleteEnumValueMutationVariables>;

/**
 * __useDeleteEnumValueMutation__
 *
 * To run a mutation, you first call `useDeleteEnumValueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteEnumValueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteEnumValueMutation, { data, loading, error }] = useDeleteEnumValueMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteEnumValueMutation(baseOptions?: Apollo.MutationHookOptions<DeleteEnumValueMutation, DeleteEnumValueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteEnumValueMutation, DeleteEnumValueMutationVariables>(DeleteEnumValueDocument, options);
      }
export type DeleteEnumValueMutationHookResult = ReturnType<typeof useDeleteEnumValueMutation>;
export type DeleteEnumValueMutationResult = Apollo.MutationResult<DeleteEnumValueMutation>;
export type DeleteEnumValueMutationOptions = Apollo.BaseMutationOptions<DeleteEnumValueMutation, DeleteEnumValueMutationVariables>;
export const MyExternalAccountsDocument = gql`
    query MyExternalAccounts {
  myExternalAccounts {
    id
    provider
    providerAccountId
    displayName
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useMyExternalAccountsQuery__
 *
 * To run a query within a React component, call `useMyExternalAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyExternalAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyExternalAccountsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyExternalAccountsQuery(baseOptions?: Apollo.QueryHookOptions<MyExternalAccountsQuery, MyExternalAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyExternalAccountsQuery, MyExternalAccountsQueryVariables>(MyExternalAccountsDocument, options);
      }
export function useMyExternalAccountsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyExternalAccountsQuery, MyExternalAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyExternalAccountsQuery, MyExternalAccountsQueryVariables>(MyExternalAccountsDocument, options);
        }
export function useMyExternalAccountsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyExternalAccountsQuery, MyExternalAccountsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyExternalAccountsQuery, MyExternalAccountsQueryVariables>(MyExternalAccountsDocument, options);
        }
export type MyExternalAccountsQueryHookResult = ReturnType<typeof useMyExternalAccountsQuery>;
export type MyExternalAccountsLazyQueryHookResult = ReturnType<typeof useMyExternalAccountsLazyQuery>;
export type MyExternalAccountsSuspenseQueryHookResult = ReturnType<typeof useMyExternalAccountsSuspenseQuery>;
export type MyExternalAccountsQueryResult = Apollo.QueryResult<MyExternalAccountsQuery, MyExternalAccountsQueryVariables>;
export const UnlinkExternalAccountDocument = gql`
    mutation UnlinkExternalAccount($input: UnlinkExternalAccountInput!) {
  unlinkExternalAccount(input: $input)
}
    `;
export type UnlinkExternalAccountMutationFn = Apollo.MutationFunction<UnlinkExternalAccountMutation, UnlinkExternalAccountMutationVariables>;

/**
 * __useUnlinkExternalAccountMutation__
 *
 * To run a mutation, you first call `useUnlinkExternalAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkExternalAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkExternalAccountMutation, { data, loading, error }] = useUnlinkExternalAccountMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUnlinkExternalAccountMutation(baseOptions?: Apollo.MutationHookOptions<UnlinkExternalAccountMutation, UnlinkExternalAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlinkExternalAccountMutation, UnlinkExternalAccountMutationVariables>(UnlinkExternalAccountDocument, options);
      }
export type UnlinkExternalAccountMutationHookResult = ReturnType<typeof useUnlinkExternalAccountMutation>;
export type UnlinkExternalAccountMutationResult = Apollo.MutationResult<UnlinkExternalAccountMutation>;
export type UnlinkExternalAccountMutationOptions = Apollo.BaseMutationOptions<UnlinkExternalAccountMutation, UnlinkExternalAccountMutationVariables>;
export const GetGalleriesDocument = gql`
    query GetGalleries($filters: GalleryFiltersInput) {
  galleries(filters: $filters) {
    galleries {
      id
      name
      description
      ownerId
      characterId
      visibility
      sortOrder
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
        species {
          id
          name
        }
      }
      _count {
        media
      }
      likesCount
      userHasLiked
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetGalleriesQuery__
 *
 * To run a query within a React component, call `useGetGalleriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGalleriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGalleriesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetGalleriesQuery(baseOptions?: Apollo.QueryHookOptions<GetGalleriesQuery, GetGalleriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGalleriesQuery, GetGalleriesQueryVariables>(GetGalleriesDocument, options);
      }
export function useGetGalleriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGalleriesQuery, GetGalleriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGalleriesQuery, GetGalleriesQueryVariables>(GetGalleriesDocument, options);
        }
export function useGetGalleriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGalleriesQuery, GetGalleriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGalleriesQuery, GetGalleriesQueryVariables>(GetGalleriesDocument, options);
        }
export type GetGalleriesQueryHookResult = ReturnType<typeof useGetGalleriesQuery>;
export type GetGalleriesLazyQueryHookResult = ReturnType<typeof useGetGalleriesLazyQuery>;
export type GetGalleriesSuspenseQueryHookResult = ReturnType<typeof useGetGalleriesSuspenseQuery>;
export type GetGalleriesQueryResult = Apollo.QueryResult<GetGalleriesQuery, GetGalleriesQueryVariables>;
export const GetGalleryDocument = gql`
    query GetGallery($id: ID!) {
  gallery(id: $id) {
    id
    name
    description
    ownerId
    characterId
    visibility
    sortOrder
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    character {
      id
      name
      species {
        id
        name
      }
    }
    _count {
      media
    }
    likesCount
    userHasLiked
  }
}
    `;

/**
 * __useGetGalleryQuery__
 *
 * To run a query within a React component, call `useGetGalleryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGalleryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGalleryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetGalleryQuery(baseOptions: Apollo.QueryHookOptions<GetGalleryQuery, GetGalleryQueryVariables> & ({ variables: GetGalleryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGalleryQuery, GetGalleryQueryVariables>(GetGalleryDocument, options);
      }
export function useGetGalleryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGalleryQuery, GetGalleryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGalleryQuery, GetGalleryQueryVariables>(GetGalleryDocument, options);
        }
export function useGetGallerySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGalleryQuery, GetGalleryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGalleryQuery, GetGalleryQueryVariables>(GetGalleryDocument, options);
        }
export type GetGalleryQueryHookResult = ReturnType<typeof useGetGalleryQuery>;
export type GetGalleryLazyQueryHookResult = ReturnType<typeof useGetGalleryLazyQuery>;
export type GetGallerySuspenseQueryHookResult = ReturnType<typeof useGetGallerySuspenseQuery>;
export type GetGalleryQueryResult = Apollo.QueryResult<GetGalleryQuery, GetGalleryQueryVariables>;
export const GetMyGalleriesDocument = gql`
    query GetMyGalleries($filters: GalleryFiltersInput) {
  myGalleries(filters: $filters) {
    galleries {
      id
      name
      description
      ownerId
      characterId
      visibility
      sortOrder
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
        species {
          id
          name
        }
      }
      _count {
        media
      }
      likesCount
      userHasLiked
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetMyGalleriesQuery__
 *
 * To run a query within a React component, call `useGetMyGalleriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyGalleriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyGalleriesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetMyGalleriesQuery(baseOptions?: Apollo.QueryHookOptions<GetMyGalleriesQuery, GetMyGalleriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyGalleriesQuery, GetMyGalleriesQueryVariables>(GetMyGalleriesDocument, options);
      }
export function useGetMyGalleriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyGalleriesQuery, GetMyGalleriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyGalleriesQuery, GetMyGalleriesQueryVariables>(GetMyGalleriesDocument, options);
        }
export function useGetMyGalleriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyGalleriesQuery, GetMyGalleriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyGalleriesQuery, GetMyGalleriesQueryVariables>(GetMyGalleriesDocument, options);
        }
export type GetMyGalleriesQueryHookResult = ReturnType<typeof useGetMyGalleriesQuery>;
export type GetMyGalleriesLazyQueryHookResult = ReturnType<typeof useGetMyGalleriesLazyQuery>;
export type GetMyGalleriesSuspenseQueryHookResult = ReturnType<typeof useGetMyGalleriesSuspenseQuery>;
export type GetMyGalleriesQueryResult = Apollo.QueryResult<GetMyGalleriesQuery, GetMyGalleriesQueryVariables>;
export const GetUserGalleriesDocument = gql`
    query GetUserGalleries($userId: ID!, $filters: GalleryFiltersInput) {
  userGalleries(userId: $userId, filters: $filters) {
    galleries {
      id
      name
      description
      ownerId
      characterId
      visibility
      sortOrder
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
        species {
          id
          name
        }
      }
      _count {
        media
      }
      likesCount
      userHasLiked
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetUserGalleriesQuery__
 *
 * To run a query within a React component, call `useGetUserGalleriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserGalleriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserGalleriesQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetUserGalleriesQuery(baseOptions: Apollo.QueryHookOptions<GetUserGalleriesQuery, GetUserGalleriesQueryVariables> & ({ variables: GetUserGalleriesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserGalleriesQuery, GetUserGalleriesQueryVariables>(GetUserGalleriesDocument, options);
      }
export function useGetUserGalleriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserGalleriesQuery, GetUserGalleriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserGalleriesQuery, GetUserGalleriesQueryVariables>(GetUserGalleriesDocument, options);
        }
export function useGetUserGalleriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserGalleriesQuery, GetUserGalleriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserGalleriesQuery, GetUserGalleriesQueryVariables>(GetUserGalleriesDocument, options);
        }
export type GetUserGalleriesQueryHookResult = ReturnType<typeof useGetUserGalleriesQuery>;
export type GetUserGalleriesLazyQueryHookResult = ReturnType<typeof useGetUserGalleriesLazyQuery>;
export type GetUserGalleriesSuspenseQueryHookResult = ReturnType<typeof useGetUserGalleriesSuspenseQuery>;
export type GetUserGalleriesQueryResult = Apollo.QueryResult<GetUserGalleriesQuery, GetUserGalleriesQueryVariables>;
export const GetCharacterGalleriesDocument = gql`
    query GetCharacterGalleries($characterId: ID!, $filters: GalleryFiltersInput) {
  characterGalleries(characterId: $characterId, filters: $filters) {
    galleries {
      id
      name
      description
      ownerId
      characterId
      visibility
      sortOrder
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
        species {
          id
          name
        }
      }
      _count {
        media
      }
      likesCount
      userHasLiked
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetCharacterGalleriesQuery__
 *
 * To run a query within a React component, call `useGetCharacterGalleriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCharacterGalleriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCharacterGalleriesQuery({
 *   variables: {
 *      characterId: // value for 'characterId'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetCharacterGalleriesQuery(baseOptions: Apollo.QueryHookOptions<GetCharacterGalleriesQuery, GetCharacterGalleriesQueryVariables> & ({ variables: GetCharacterGalleriesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCharacterGalleriesQuery, GetCharacterGalleriesQueryVariables>(GetCharacterGalleriesDocument, options);
      }
export function useGetCharacterGalleriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCharacterGalleriesQuery, GetCharacterGalleriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCharacterGalleriesQuery, GetCharacterGalleriesQueryVariables>(GetCharacterGalleriesDocument, options);
        }
export function useGetCharacterGalleriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCharacterGalleriesQuery, GetCharacterGalleriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCharacterGalleriesQuery, GetCharacterGalleriesQueryVariables>(GetCharacterGalleriesDocument, options);
        }
export type GetCharacterGalleriesQueryHookResult = ReturnType<typeof useGetCharacterGalleriesQuery>;
export type GetCharacterGalleriesLazyQueryHookResult = ReturnType<typeof useGetCharacterGalleriesLazyQuery>;
export type GetCharacterGalleriesSuspenseQueryHookResult = ReturnType<typeof useGetCharacterGalleriesSuspenseQuery>;
export type GetCharacterGalleriesQueryResult = Apollo.QueryResult<GetCharacterGalleriesQuery, GetCharacterGalleriesQueryVariables>;
export const CreateGalleryDocument = gql`
    mutation CreateGallery($input: CreateGalleryInput!) {
  createGallery(input: $input) {
    id
    name
    description
    ownerId
    characterId
    visibility
    sortOrder
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    character {
      id
      name
      species {
        id
        name
      }
    }
    _count {
      media
    }
    likesCount
    userHasLiked
  }
}
    `;
export type CreateGalleryMutationFn = Apollo.MutationFunction<CreateGalleryMutation, CreateGalleryMutationVariables>;

/**
 * __useCreateGalleryMutation__
 *
 * To run a mutation, you first call `useCreateGalleryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGalleryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGalleryMutation, { data, loading, error }] = useCreateGalleryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateGalleryMutation(baseOptions?: Apollo.MutationHookOptions<CreateGalleryMutation, CreateGalleryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateGalleryMutation, CreateGalleryMutationVariables>(CreateGalleryDocument, options);
      }
export type CreateGalleryMutationHookResult = ReturnType<typeof useCreateGalleryMutation>;
export type CreateGalleryMutationResult = Apollo.MutationResult<CreateGalleryMutation>;
export type CreateGalleryMutationOptions = Apollo.BaseMutationOptions<CreateGalleryMutation, CreateGalleryMutationVariables>;
export const UpdateGalleryDocument = gql`
    mutation UpdateGallery($id: ID!, $input: UpdateGalleryInput!) {
  updateGallery(id: $id, input: $input) {
    id
    name
    description
    ownerId
    characterId
    visibility
    sortOrder
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    character {
      id
      name
      species {
        id
        name
      }
    }
    _count {
      media
    }
    likesCount
    userHasLiked
  }
}
    `;
export type UpdateGalleryMutationFn = Apollo.MutationFunction<UpdateGalleryMutation, UpdateGalleryMutationVariables>;

/**
 * __useUpdateGalleryMutation__
 *
 * To run a mutation, you first call `useUpdateGalleryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateGalleryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateGalleryMutation, { data, loading, error }] = useUpdateGalleryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateGalleryMutation(baseOptions?: Apollo.MutationHookOptions<UpdateGalleryMutation, UpdateGalleryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateGalleryMutation, UpdateGalleryMutationVariables>(UpdateGalleryDocument, options);
      }
export type UpdateGalleryMutationHookResult = ReturnType<typeof useUpdateGalleryMutation>;
export type UpdateGalleryMutationResult = Apollo.MutationResult<UpdateGalleryMutation>;
export type UpdateGalleryMutationOptions = Apollo.BaseMutationOptions<UpdateGalleryMutation, UpdateGalleryMutationVariables>;
export const DeleteGalleryDocument = gql`
    mutation DeleteGallery($id: ID!) {
  deleteGallery(id: $id) {
    removed
    message
  }
}
    `;
export type DeleteGalleryMutationFn = Apollo.MutationFunction<DeleteGalleryMutation, DeleteGalleryMutationVariables>;

/**
 * __useDeleteGalleryMutation__
 *
 * To run a mutation, you first call `useDeleteGalleryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteGalleryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteGalleryMutation, { data, loading, error }] = useDeleteGalleryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteGalleryMutation(baseOptions?: Apollo.MutationHookOptions<DeleteGalleryMutation, DeleteGalleryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteGalleryMutation, DeleteGalleryMutationVariables>(DeleteGalleryDocument, options);
      }
export type DeleteGalleryMutationHookResult = ReturnType<typeof useDeleteGalleryMutation>;
export type DeleteGalleryMutationResult = Apollo.MutationResult<DeleteGalleryMutation>;
export type DeleteGalleryMutationOptions = Apollo.BaseMutationOptions<DeleteGalleryMutation, DeleteGalleryMutationVariables>;
export const ReorderGalleriesDocument = gql`
    mutation ReorderGalleries($input: ReorderGalleriesInput!) {
  reorderGalleries(input: $input) {
    id
    name
    sortOrder
    _count {
      media
    }
    likesCount
    userHasLiked
  }
}
    `;
export type ReorderGalleriesMutationFn = Apollo.MutationFunction<ReorderGalleriesMutation, ReorderGalleriesMutationVariables>;

/**
 * __useReorderGalleriesMutation__
 *
 * To run a mutation, you first call `useReorderGalleriesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReorderGalleriesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reorderGalleriesMutation, { data, loading, error }] = useReorderGalleriesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useReorderGalleriesMutation(baseOptions?: Apollo.MutationHookOptions<ReorderGalleriesMutation, ReorderGalleriesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReorderGalleriesMutation, ReorderGalleriesMutationVariables>(ReorderGalleriesDocument, options);
      }
export type ReorderGalleriesMutationHookResult = ReturnType<typeof useReorderGalleriesMutation>;
export type ReorderGalleriesMutationResult = Apollo.MutationResult<ReorderGalleriesMutation>;
export type ReorderGalleriesMutationOptions = Apollo.BaseMutationOptions<ReorderGalleriesMutation, ReorderGalleriesMutationVariables>;
export const GetLikedGalleriesDocument = gql`
    query GetLikedGalleries {
  likedGalleries {
    id
    name
    description
    visibility
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    character {
      id
      name
    }
    _count {
      media
    }
    likesCount
    userHasLiked
  }
}
    `;

/**
 * __useGetLikedGalleriesQuery__
 *
 * To run a query within a React component, call `useGetLikedGalleriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLikedGalleriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLikedGalleriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetLikedGalleriesQuery(baseOptions?: Apollo.QueryHookOptions<GetLikedGalleriesQuery, GetLikedGalleriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLikedGalleriesQuery, GetLikedGalleriesQueryVariables>(GetLikedGalleriesDocument, options);
      }
export function useGetLikedGalleriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLikedGalleriesQuery, GetLikedGalleriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLikedGalleriesQuery, GetLikedGalleriesQueryVariables>(GetLikedGalleriesDocument, options);
        }
export function useGetLikedGalleriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLikedGalleriesQuery, GetLikedGalleriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLikedGalleriesQuery, GetLikedGalleriesQueryVariables>(GetLikedGalleriesDocument, options);
        }
export type GetLikedGalleriesQueryHookResult = ReturnType<typeof useGetLikedGalleriesQuery>;
export type GetLikedGalleriesLazyQueryHookResult = ReturnType<typeof useGetLikedGalleriesLazyQuery>;
export type GetLikedGalleriesSuspenseQueryHookResult = ReturnType<typeof useGetLikedGalleriesSuspenseQuery>;
export type GetLikedGalleriesQueryResult = Apollo.QueryResult<GetLikedGalleriesQuery, GetLikedGalleriesQueryVariables>;
export const GetLikedImagesDocument = gql`
    query GetLikedImages {
  likedImages {
    id
    filename
    originalFilename
    url
    thumbnailUrl
    altText
    width
    height
    fileSize
    mimeType
    isNsfw
    sensitiveContentDescription
    createdAt
    updatedAt
    uploader {
      id
      username
      displayName
      avatarUrl
    }
    artist {
      id
      username
      displayName
      avatarUrl
    }
    likesCount
    userHasLiked
  }
}
    `;

/**
 * __useGetLikedImagesQuery__
 *
 * To run a query within a React component, call `useGetLikedImagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLikedImagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLikedImagesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetLikedImagesQuery(baseOptions?: Apollo.QueryHookOptions<GetLikedImagesQuery, GetLikedImagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLikedImagesQuery, GetLikedImagesQueryVariables>(GetLikedImagesDocument, options);
      }
export function useGetLikedImagesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLikedImagesQuery, GetLikedImagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLikedImagesQuery, GetLikedImagesQueryVariables>(GetLikedImagesDocument, options);
        }
export function useGetLikedImagesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLikedImagesQuery, GetLikedImagesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLikedImagesQuery, GetLikedImagesQueryVariables>(GetLikedImagesDocument, options);
        }
export type GetLikedImagesQueryHookResult = ReturnType<typeof useGetLikedImagesQuery>;
export type GetLikedImagesLazyQueryHookResult = ReturnType<typeof useGetLikedImagesLazyQuery>;
export type GetLikedImagesSuspenseQueryHookResult = ReturnType<typeof useGetLikedImagesSuspenseQuery>;
export type GetLikedImagesQueryResult = Apollo.QueryResult<GetLikedImagesQuery, GetLikedImagesQueryVariables>;
export const InviteCodesDocument = gql`
    query InviteCodes($first: Int, $after: String, $communityId: ID) {
  inviteCodes(first: $first, after: $after, communityId: $communityId) {
    nodes {
      id
      claimCount
      maxClaims
      isAvailable
      remainingClaims
      createdAt
      updatedAt
      creator {
        id
        username
        displayName
      }
      role {
        id
        name
        community {
          id
          name
        }
      }
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
}
    `;

/**
 * __useInviteCodesQuery__
 *
 * To run a query within a React component, call `useInviteCodesQuery` and pass it any options that fit your needs.
 * When your component renders, `useInviteCodesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInviteCodesQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      communityId: // value for 'communityId'
 *   },
 * });
 */
export function useInviteCodesQuery(baseOptions?: Apollo.QueryHookOptions<InviteCodesQuery, InviteCodesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InviteCodesQuery, InviteCodesQueryVariables>(InviteCodesDocument, options);
      }
export function useInviteCodesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InviteCodesQuery, InviteCodesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InviteCodesQuery, InviteCodesQueryVariables>(InviteCodesDocument, options);
        }
export function useInviteCodesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InviteCodesQuery, InviteCodesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InviteCodesQuery, InviteCodesQueryVariables>(InviteCodesDocument, options);
        }
export type InviteCodesQueryHookResult = ReturnType<typeof useInviteCodesQuery>;
export type InviteCodesLazyQueryHookResult = ReturnType<typeof useInviteCodesLazyQuery>;
export type InviteCodesSuspenseQueryHookResult = ReturnType<typeof useInviteCodesSuspenseQuery>;
export type InviteCodesQueryResult = Apollo.QueryResult<InviteCodesQuery, InviteCodesQueryVariables>;
export const InviteCodeByIdDocument = gql`
    query InviteCodeById($id: ID!) {
  inviteCodeById(id: $id) {
    id
    claimCount
    maxClaims
    isAvailable
    remainingClaims
    createdAt
    updatedAt
    creator {
      id
      username
      displayName
    }
    role {
      id
      name
      community {
        id
        name
      }
    }
  }
}
    `;

/**
 * __useInviteCodeByIdQuery__
 *
 * To run a query within a React component, call `useInviteCodeByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useInviteCodeByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInviteCodeByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useInviteCodeByIdQuery(baseOptions: Apollo.QueryHookOptions<InviteCodeByIdQuery, InviteCodeByIdQueryVariables> & ({ variables: InviteCodeByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InviteCodeByIdQuery, InviteCodeByIdQueryVariables>(InviteCodeByIdDocument, options);
      }
export function useInviteCodeByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InviteCodeByIdQuery, InviteCodeByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InviteCodeByIdQuery, InviteCodeByIdQueryVariables>(InviteCodeByIdDocument, options);
        }
export function useInviteCodeByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InviteCodeByIdQuery, InviteCodeByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InviteCodeByIdQuery, InviteCodeByIdQueryVariables>(InviteCodeByIdDocument, options);
        }
export type InviteCodeByIdQueryHookResult = ReturnType<typeof useInviteCodeByIdQuery>;
export type InviteCodeByIdLazyQueryHookResult = ReturnType<typeof useInviteCodeByIdLazyQuery>;
export type InviteCodeByIdSuspenseQueryHookResult = ReturnType<typeof useInviteCodeByIdSuspenseQuery>;
export type InviteCodeByIdQueryResult = Apollo.QueryResult<InviteCodeByIdQuery, InviteCodeByIdQueryVariables>;
export const CreateInviteCodeDocument = gql`
    mutation CreateInviteCode($createInviteCodeInput: CreateInviteCodeInput!) {
  createInviteCode(createInviteCodeInput: $createInviteCodeInput) {
    id
    claimCount
    maxClaims
    isAvailable
    remainingClaims
    createdAt
    updatedAt
    creator {
      id
      username
      displayName
    }
    role {
      id
      name
      community {
        id
        name
      }
    }
  }
}
    `;
export type CreateInviteCodeMutationFn = Apollo.MutationFunction<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>;

/**
 * __useCreateInviteCodeMutation__
 *
 * To run a mutation, you first call `useCreateInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createInviteCodeMutation, { data, loading, error }] = useCreateInviteCodeMutation({
 *   variables: {
 *      createInviteCodeInput: // value for 'createInviteCodeInput'
 *   },
 * });
 */
export function useCreateInviteCodeMutation(baseOptions?: Apollo.MutationHookOptions<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>(CreateInviteCodeDocument, options);
      }
export type CreateInviteCodeMutationHookResult = ReturnType<typeof useCreateInviteCodeMutation>;
export type CreateInviteCodeMutationResult = Apollo.MutationResult<CreateInviteCodeMutation>;
export type CreateInviteCodeMutationOptions = Apollo.BaseMutationOptions<CreateInviteCodeMutation, CreateInviteCodeMutationVariables>;
export const UpdateInviteCodeDocument = gql`
    mutation UpdateInviteCode($id: ID!, $updateInviteCodeInput: UpdateInviteCodeInput!) {
  updateInviteCode(id: $id, updateInviteCodeInput: $updateInviteCodeInput) {
    id
    claimCount
    maxClaims
    isAvailable
    remainingClaims
    createdAt
    updatedAt
    creator {
      id
      username
      displayName
    }
    role {
      id
      name
      community {
        id
        name
      }
    }
  }
}
    `;
export type UpdateInviteCodeMutationFn = Apollo.MutationFunction<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>;

/**
 * __useUpdateInviteCodeMutation__
 *
 * To run a mutation, you first call `useUpdateInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateInviteCodeMutation, { data, loading, error }] = useUpdateInviteCodeMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateInviteCodeInput: // value for 'updateInviteCodeInput'
 *   },
 * });
 */
export function useUpdateInviteCodeMutation(baseOptions?: Apollo.MutationHookOptions<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>(UpdateInviteCodeDocument, options);
      }
export type UpdateInviteCodeMutationHookResult = ReturnType<typeof useUpdateInviteCodeMutation>;
export type UpdateInviteCodeMutationResult = Apollo.MutationResult<UpdateInviteCodeMutation>;
export type UpdateInviteCodeMutationOptions = Apollo.BaseMutationOptions<UpdateInviteCodeMutation, UpdateInviteCodeMutationVariables>;
export const RemoveInviteCodeDocument = gql`
    mutation RemoveInviteCode($id: ID!) {
  removeInviteCode(id: $id) {
    removed
    message
  }
}
    `;
export type RemoveInviteCodeMutationFn = Apollo.MutationFunction<RemoveInviteCodeMutation, RemoveInviteCodeMutationVariables>;

/**
 * __useRemoveInviteCodeMutation__
 *
 * To run a mutation, you first call `useRemoveInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeInviteCodeMutation, { data, loading, error }] = useRemoveInviteCodeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveInviteCodeMutation(baseOptions?: Apollo.MutationHookOptions<RemoveInviteCodeMutation, RemoveInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveInviteCodeMutation, RemoveInviteCodeMutationVariables>(RemoveInviteCodeDocument, options);
      }
export type RemoveInviteCodeMutationHookResult = ReturnType<typeof useRemoveInviteCodeMutation>;
export type RemoveInviteCodeMutationResult = Apollo.MutationResult<RemoveInviteCodeMutation>;
export type RemoveInviteCodeMutationOptions = Apollo.BaseMutationOptions<RemoveInviteCodeMutation, RemoveInviteCodeMutationVariables>;
export const ClaimInviteCodeDocument = gql`
    mutation ClaimInviteCode($id: ID!, $claimInviteCodeInput: ClaimInviteCodeInput!) {
  claimInviteCode(id: $id, claimInviteCodeInput: $claimInviteCodeInput) {
    id
    claimCount
    maxClaims
    isAvailable
    remainingClaims
    creator {
      id
      username
      displayName
    }
    role {
      id
      name
      community {
        id
        name
      }
    }
  }
}
    `;
export type ClaimInviteCodeMutationFn = Apollo.MutationFunction<ClaimInviteCodeMutation, ClaimInviteCodeMutationVariables>;

/**
 * __useClaimInviteCodeMutation__
 *
 * To run a mutation, you first call `useClaimInviteCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useClaimInviteCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [claimInviteCodeMutation, { data, loading, error }] = useClaimInviteCodeMutation({
 *   variables: {
 *      id: // value for 'id'
 *      claimInviteCodeInput: // value for 'claimInviteCodeInput'
 *   },
 * });
 */
export function useClaimInviteCodeMutation(baseOptions?: Apollo.MutationHookOptions<ClaimInviteCodeMutation, ClaimInviteCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ClaimInviteCodeMutation, ClaimInviteCodeMutationVariables>(ClaimInviteCodeDocument, options);
      }
export type ClaimInviteCodeMutationHookResult = ReturnType<typeof useClaimInviteCodeMutation>;
export type ClaimInviteCodeMutationResult = Apollo.MutationResult<ClaimInviteCodeMutation>;
export type ClaimInviteCodeMutationOptions = Apollo.BaseMutationOptions<ClaimInviteCodeMutation, ClaimInviteCodeMutationVariables>;
export const RolesByCommunityDocument = gql`
    query RolesByCommunity($communityId: ID!, $first: Int, $after: String) {
  rolesByCommunity(communityId: $communityId, first: $first, after: $after) {
    nodes {
      id
      name
      canCreateInviteCode
      community {
        id
        name
      }
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
}
    `;

/**
 * __useRolesByCommunityQuery__
 *
 * To run a query within a React component, call `useRolesByCommunityQuery` and pass it any options that fit your needs.
 * When your component renders, `useRolesByCommunityQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRolesByCommunityQuery({
 *   variables: {
 *      communityId: // value for 'communityId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useRolesByCommunityQuery(baseOptions: Apollo.QueryHookOptions<RolesByCommunityQuery, RolesByCommunityQueryVariables> & ({ variables: RolesByCommunityQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RolesByCommunityQuery, RolesByCommunityQueryVariables>(RolesByCommunityDocument, options);
      }
export function useRolesByCommunityLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RolesByCommunityQuery, RolesByCommunityQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RolesByCommunityQuery, RolesByCommunityQueryVariables>(RolesByCommunityDocument, options);
        }
export function useRolesByCommunitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RolesByCommunityQuery, RolesByCommunityQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RolesByCommunityQuery, RolesByCommunityQueryVariables>(RolesByCommunityDocument, options);
        }
export type RolesByCommunityQueryHookResult = ReturnType<typeof useRolesByCommunityQuery>;
export type RolesByCommunityLazyQueryHookResult = ReturnType<typeof useRolesByCommunityLazyQuery>;
export type RolesByCommunitySuspenseQueryHookResult = ReturnType<typeof useRolesByCommunitySuspenseQuery>;
export type RolesByCommunityQueryResult = Apollo.QueryResult<RolesByCommunityQuery, RolesByCommunityQueryVariables>;
export const GetItemTypesDocument = gql`
    query GetItemTypes($filters: ItemTypeFiltersInput) {
  itemTypes(filters: $filters) {
    itemTypes {
      ...ItemTypeFields
    }
    total
    hasMore
  }
}
    ${ItemTypeFieldsFragmentDoc}`;

/**
 * __useGetItemTypesQuery__
 *
 * To run a query within a React component, call `useGetItemTypesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetItemTypesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetItemTypesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetItemTypesQuery(baseOptions?: Apollo.QueryHookOptions<GetItemTypesQuery, GetItemTypesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetItemTypesQuery, GetItemTypesQueryVariables>(GetItemTypesDocument, options);
      }
export function useGetItemTypesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetItemTypesQuery, GetItemTypesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetItemTypesQuery, GetItemTypesQueryVariables>(GetItemTypesDocument, options);
        }
export function useGetItemTypesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetItemTypesQuery, GetItemTypesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetItemTypesQuery, GetItemTypesQueryVariables>(GetItemTypesDocument, options);
        }
export type GetItemTypesQueryHookResult = ReturnType<typeof useGetItemTypesQuery>;
export type GetItemTypesLazyQueryHookResult = ReturnType<typeof useGetItemTypesLazyQuery>;
export type GetItemTypesSuspenseQueryHookResult = ReturnType<typeof useGetItemTypesSuspenseQuery>;
export type GetItemTypesQueryResult = Apollo.QueryResult<GetItemTypesQuery, GetItemTypesQueryVariables>;
export const GetItemTypeDocument = gql`
    query GetItemType($id: ID!) {
  itemType(id: $id) {
    ...ItemTypeFields
    community {
      id
      name
    }
  }
}
    ${ItemTypeFieldsFragmentDoc}`;

/**
 * __useGetItemTypeQuery__
 *
 * To run a query within a React component, call `useGetItemTypeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetItemTypeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetItemTypeQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetItemTypeQuery(baseOptions: Apollo.QueryHookOptions<GetItemTypeQuery, GetItemTypeQueryVariables> & ({ variables: GetItemTypeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetItemTypeQuery, GetItemTypeQueryVariables>(GetItemTypeDocument, options);
      }
export function useGetItemTypeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetItemTypeQuery, GetItemTypeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetItemTypeQuery, GetItemTypeQueryVariables>(GetItemTypeDocument, options);
        }
export function useGetItemTypeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetItemTypeQuery, GetItemTypeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetItemTypeQuery, GetItemTypeQueryVariables>(GetItemTypeDocument, options);
        }
export type GetItemTypeQueryHookResult = ReturnType<typeof useGetItemTypeQuery>;
export type GetItemTypeLazyQueryHookResult = ReturnType<typeof useGetItemTypeLazyQuery>;
export type GetItemTypeSuspenseQueryHookResult = ReturnType<typeof useGetItemTypeSuspenseQuery>;
export type GetItemTypeQueryResult = Apollo.QueryResult<GetItemTypeQuery, GetItemTypeQueryVariables>;
export const CreateItemTypeDocument = gql`
    mutation CreateItemType($input: CreateItemTypeInput!) {
  createItemType(input: $input) {
    ...ItemTypeFields
  }
}
    ${ItemTypeFieldsFragmentDoc}`;
export type CreateItemTypeMutationFn = Apollo.MutationFunction<CreateItemTypeMutation, CreateItemTypeMutationVariables>;

/**
 * __useCreateItemTypeMutation__
 *
 * To run a mutation, you first call `useCreateItemTypeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateItemTypeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createItemTypeMutation, { data, loading, error }] = useCreateItemTypeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateItemTypeMutation(baseOptions?: Apollo.MutationHookOptions<CreateItemTypeMutation, CreateItemTypeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateItemTypeMutation, CreateItemTypeMutationVariables>(CreateItemTypeDocument, options);
      }
export type CreateItemTypeMutationHookResult = ReturnType<typeof useCreateItemTypeMutation>;
export type CreateItemTypeMutationResult = Apollo.MutationResult<CreateItemTypeMutation>;
export type CreateItemTypeMutationOptions = Apollo.BaseMutationOptions<CreateItemTypeMutation, CreateItemTypeMutationVariables>;
export const UpdateItemTypeDocument = gql`
    mutation UpdateItemType($id: ID!, $input: UpdateItemTypeInput!) {
  updateItemType(id: $id, input: $input) {
    ...ItemTypeFields
  }
}
    ${ItemTypeFieldsFragmentDoc}`;
export type UpdateItemTypeMutationFn = Apollo.MutationFunction<UpdateItemTypeMutation, UpdateItemTypeMutationVariables>;

/**
 * __useUpdateItemTypeMutation__
 *
 * To run a mutation, you first call `useUpdateItemTypeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateItemTypeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateItemTypeMutation, { data, loading, error }] = useUpdateItemTypeMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateItemTypeMutation(baseOptions?: Apollo.MutationHookOptions<UpdateItemTypeMutation, UpdateItemTypeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateItemTypeMutation, UpdateItemTypeMutationVariables>(UpdateItemTypeDocument, options);
      }
export type UpdateItemTypeMutationHookResult = ReturnType<typeof useUpdateItemTypeMutation>;
export type UpdateItemTypeMutationResult = Apollo.MutationResult<UpdateItemTypeMutation>;
export type UpdateItemTypeMutationOptions = Apollo.BaseMutationOptions<UpdateItemTypeMutation, UpdateItemTypeMutationVariables>;
export const DeleteItemTypeDocument = gql`
    mutation DeleteItemType($id: ID!) {
  deleteItemType(id: $id)
}
    `;
export type DeleteItemTypeMutationFn = Apollo.MutationFunction<DeleteItemTypeMutation, DeleteItemTypeMutationVariables>;

/**
 * __useDeleteItemTypeMutation__
 *
 * To run a mutation, you first call `useDeleteItemTypeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteItemTypeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteItemTypeMutation, { data, loading, error }] = useDeleteItemTypeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteItemTypeMutation(baseOptions?: Apollo.MutationHookOptions<DeleteItemTypeMutation, DeleteItemTypeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteItemTypeMutation, DeleteItemTypeMutationVariables>(DeleteItemTypeDocument, options);
      }
export type DeleteItemTypeMutationHookResult = ReturnType<typeof useDeleteItemTypeMutation>;
export type DeleteItemTypeMutationResult = Apollo.MutationResult<DeleteItemTypeMutation>;
export type DeleteItemTypeMutationOptions = Apollo.BaseMutationOptions<DeleteItemTypeMutation, DeleteItemTypeMutationVariables>;
export const GetMyInventoryDocument = gql`
    query GetMyInventory($communityId: ID) {
  me {
    id
    username
    inventories(communityId: $communityId) {
      ...InventoryFields
    }
  }
}
    ${InventoryFieldsFragmentDoc}`;

/**
 * __useGetMyInventoryQuery__
 *
 * To run a query within a React component, call `useGetMyInventoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyInventoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyInventoryQuery({
 *   variables: {
 *      communityId: // value for 'communityId'
 *   },
 * });
 */
export function useGetMyInventoryQuery(baseOptions?: Apollo.QueryHookOptions<GetMyInventoryQuery, GetMyInventoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyInventoryQuery, GetMyInventoryQueryVariables>(GetMyInventoryDocument, options);
      }
export function useGetMyInventoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyInventoryQuery, GetMyInventoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyInventoryQuery, GetMyInventoryQueryVariables>(GetMyInventoryDocument, options);
        }
export function useGetMyInventorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyInventoryQuery, GetMyInventoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyInventoryQuery, GetMyInventoryQueryVariables>(GetMyInventoryDocument, options);
        }
export type GetMyInventoryQueryHookResult = ReturnType<typeof useGetMyInventoryQuery>;
export type GetMyInventoryLazyQueryHookResult = ReturnType<typeof useGetMyInventoryLazyQuery>;
export type GetMyInventorySuspenseQueryHookResult = ReturnType<typeof useGetMyInventorySuspenseQuery>;
export type GetMyInventoryQueryResult = Apollo.QueryResult<GetMyInventoryQuery, GetMyInventoryQueryVariables>;
export const GrantItemDocument = gql`
    mutation GrantItem($input: GrantItemInput!) {
  grantItem(input: $input) {
    ...ItemFields
  }
}
    ${ItemFieldsFragmentDoc}`;
export type GrantItemMutationFn = Apollo.MutationFunction<GrantItemMutation, GrantItemMutationVariables>;

/**
 * __useGrantItemMutation__
 *
 * To run a mutation, you first call `useGrantItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGrantItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [grantItemMutation, { data, loading, error }] = useGrantItemMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGrantItemMutation(baseOptions?: Apollo.MutationHookOptions<GrantItemMutation, GrantItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GrantItemMutation, GrantItemMutationVariables>(GrantItemDocument, options);
      }
export type GrantItemMutationHookResult = ReturnType<typeof useGrantItemMutation>;
export type GrantItemMutationResult = Apollo.MutationResult<GrantItemMutation>;
export type GrantItemMutationOptions = Apollo.BaseMutationOptions<GrantItemMutation, GrantItemMutationVariables>;
export const UpdateItemDocument = gql`
    mutation UpdateItem($id: ID!, $input: UpdateItemInput!) {
  updateItem(id: $id, input: $input) {
    ...ItemFields
  }
}
    ${ItemFieldsFragmentDoc}`;
export type UpdateItemMutationFn = Apollo.MutationFunction<UpdateItemMutation, UpdateItemMutationVariables>;

/**
 * __useUpdateItemMutation__
 *
 * To run a mutation, you first call `useUpdateItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateItemMutation, { data, loading, error }] = useUpdateItemMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateItemMutation(baseOptions?: Apollo.MutationHookOptions<UpdateItemMutation, UpdateItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateItemMutation, UpdateItemMutationVariables>(UpdateItemDocument, options);
      }
export type UpdateItemMutationHookResult = ReturnType<typeof useUpdateItemMutation>;
export type UpdateItemMutationResult = Apollo.MutationResult<UpdateItemMutation>;
export type UpdateItemMutationOptions = Apollo.BaseMutationOptions<UpdateItemMutation, UpdateItemMutationVariables>;
export const DeleteItemDocument = gql`
    mutation DeleteItem($id: ID!) {
  deleteItem(id: $id)
}
    `;
export type DeleteItemMutationFn = Apollo.MutationFunction<DeleteItemMutation, DeleteItemMutationVariables>;

/**
 * __useDeleteItemMutation__
 *
 * To run a mutation, you first call `useDeleteItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteItemMutation, { data, loading, error }] = useDeleteItemMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteItemMutation(baseOptions?: Apollo.MutationHookOptions<DeleteItemMutation, DeleteItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteItemMutation, DeleteItemMutationVariables>(DeleteItemDocument, options);
      }
export type DeleteItemMutationHookResult = ReturnType<typeof useDeleteItemMutation>;
export type DeleteItemMutationResult = Apollo.MutationResult<DeleteItemMutation>;
export type DeleteItemMutationOptions = Apollo.BaseMutationOptions<DeleteItemMutation, DeleteItemMutationVariables>;
export const GetMediaDocument = gql`
    query GetMedia($filters: MediaFiltersInput) {
  media(filters: $filters) {
    media {
      id
      title
      description
      ownerId
      characterId
      galleryId
      visibility
      imageId
      textContentId
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
      }
      gallery {
        id
        name
      }
      image {
        id
        url
        thumbnailUrl
        altText
        isNsfw
      }
      textContent {
        id
        content
        wordCount
        formatting
      }
      likesCount
      userHasLiked
      tags_rel {
        tag {
          id
          name
          category
          color
        }
      }
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetMediaQuery__
 *
 * To run a query within a React component, call `useGetMediaQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMediaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMediaQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetMediaQuery(baseOptions?: Apollo.QueryHookOptions<GetMediaQuery, GetMediaQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMediaQuery, GetMediaQueryVariables>(GetMediaDocument, options);
      }
export function useGetMediaLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMediaQuery, GetMediaQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMediaQuery, GetMediaQueryVariables>(GetMediaDocument, options);
        }
export function useGetMediaSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMediaQuery, GetMediaQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMediaQuery, GetMediaQueryVariables>(GetMediaDocument, options);
        }
export type GetMediaQueryHookResult = ReturnType<typeof useGetMediaQuery>;
export type GetMediaLazyQueryHookResult = ReturnType<typeof useGetMediaLazyQuery>;
export type GetMediaSuspenseQueryHookResult = ReturnType<typeof useGetMediaSuspenseQuery>;
export type GetMediaQueryResult = Apollo.QueryResult<GetMediaQuery, GetMediaQueryVariables>;
export const GetMediaItemDocument = gql`
    query GetMediaItem($id: ID!) {
  mediaItem(id: $id) {
    id
    title
    description
    ownerId
    characterId
    galleryId
    visibility
    imageId
    textContentId
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    character {
      id
      name
    }
    gallery {
      id
      name
    }
    image {
      id
      url
      thumbnailUrl
      altText
      isNsfw
      artistName
      artistUrl
      source
      width
      height
      fileSize
      mimeType
    }
    textContent {
      id
      content
      wordCount
      formatting
    }
    likesCount
    userHasLiked
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
  }
}
    `;

/**
 * __useGetMediaItemQuery__
 *
 * To run a query within a React component, call `useGetMediaItemQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMediaItemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMediaItemQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetMediaItemQuery(baseOptions: Apollo.QueryHookOptions<GetMediaItemQuery, GetMediaItemQueryVariables> & ({ variables: GetMediaItemQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMediaItemQuery, GetMediaItemQueryVariables>(GetMediaItemDocument, options);
      }
export function useGetMediaItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMediaItemQuery, GetMediaItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMediaItemQuery, GetMediaItemQueryVariables>(GetMediaItemDocument, options);
        }
export function useGetMediaItemSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMediaItemQuery, GetMediaItemQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMediaItemQuery, GetMediaItemQueryVariables>(GetMediaItemDocument, options);
        }
export type GetMediaItemQueryHookResult = ReturnType<typeof useGetMediaItemQuery>;
export type GetMediaItemLazyQueryHookResult = ReturnType<typeof useGetMediaItemLazyQuery>;
export type GetMediaItemSuspenseQueryHookResult = ReturnType<typeof useGetMediaItemSuspenseQuery>;
export type GetMediaItemQueryResult = Apollo.QueryResult<GetMediaItemQuery, GetMediaItemQueryVariables>;
export const GetCharacterMediaDocument = gql`
    query GetCharacterMedia($characterId: ID!, $filters: MediaFiltersInput) {
  characterMedia(characterId: $characterId, filters: $filters) {
    media {
      id
      title
      description
      ownerId
      characterId
      galleryId
      visibility
      imageId
      textContentId
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      image {
        id
        url
        thumbnailUrl
        altText
        isNsfw
      }
      textContent {
        id
        content
        wordCount
        formatting
      }
      likesCount
      userHasLiked
    }
    total
    imageCount
    textCount
    hasMore
  }
}
    `;

/**
 * __useGetCharacterMediaQuery__
 *
 * To run a query within a React component, call `useGetCharacterMediaQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCharacterMediaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCharacterMediaQuery({
 *   variables: {
 *      characterId: // value for 'characterId'
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetCharacterMediaQuery(baseOptions: Apollo.QueryHookOptions<GetCharacterMediaQuery, GetCharacterMediaQueryVariables> & ({ variables: GetCharacterMediaQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCharacterMediaQuery, GetCharacterMediaQueryVariables>(GetCharacterMediaDocument, options);
      }
export function useGetCharacterMediaLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCharacterMediaQuery, GetCharacterMediaQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCharacterMediaQuery, GetCharacterMediaQueryVariables>(GetCharacterMediaDocument, options);
        }
export function useGetCharacterMediaSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCharacterMediaQuery, GetCharacterMediaQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCharacterMediaQuery, GetCharacterMediaQueryVariables>(GetCharacterMediaDocument, options);
        }
export type GetCharacterMediaQueryHookResult = ReturnType<typeof useGetCharacterMediaQuery>;
export type GetCharacterMediaLazyQueryHookResult = ReturnType<typeof useGetCharacterMediaLazyQuery>;
export type GetCharacterMediaSuspenseQueryHookResult = ReturnType<typeof useGetCharacterMediaSuspenseQuery>;
export type GetCharacterMediaQueryResult = Apollo.QueryResult<GetCharacterMediaQuery, GetCharacterMediaQueryVariables>;
export const GetMyMediaDocument = gql`
    query GetMyMedia($filters: MediaFiltersInput) {
  myMedia(filters: $filters) {
    media {
      id
      title
      description
      ownerId
      characterId
      galleryId
      visibility
      imageId
      textContentId
      createdAt
      updatedAt
      character {
        id
        name
      }
      gallery {
        id
        name
      }
      image {
        id
        url
        thumbnailUrl
        altText
        isNsfw
      }
      textContent {
        id
        content
        wordCount
        formatting
      }
      likesCount
      userHasLiked
      tags_rel {
        tag {
          id
          name
          category
          color
        }
      }
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetMyMediaQuery__
 *
 * To run a query within a React component, call `useGetMyMediaQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyMediaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyMediaQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetMyMediaQuery(baseOptions?: Apollo.QueryHookOptions<GetMyMediaQuery, GetMyMediaQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyMediaQuery, GetMyMediaQueryVariables>(GetMyMediaDocument, options);
      }
export function useGetMyMediaLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyMediaQuery, GetMyMediaQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyMediaQuery, GetMyMediaQueryVariables>(GetMyMediaDocument, options);
        }
export function useGetMyMediaSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyMediaQuery, GetMyMediaQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyMediaQuery, GetMyMediaQueryVariables>(GetMyMediaDocument, options);
        }
export type GetMyMediaQueryHookResult = ReturnType<typeof useGetMyMediaQuery>;
export type GetMyMediaLazyQueryHookResult = ReturnType<typeof useGetMyMediaLazyQuery>;
export type GetMyMediaSuspenseQueryHookResult = ReturnType<typeof useGetMyMediaSuspenseQuery>;
export type GetMyMediaQueryResult = Apollo.QueryResult<GetMyMediaQuery, GetMyMediaQueryVariables>;
export const GetLikedMediaDocument = gql`
    query GetLikedMedia($filters: MediaFiltersInput) {
  likedMedia(filters: $filters) {
    media {
      id
      title
      description
      ownerId
      characterId
      galleryId
      visibility
      imageId
      textContentId
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
      }
      gallery {
        id
        name
      }
      image {
        id
        url
        thumbnailUrl
        altText
        isNsfw
        width
        height
        fileSize
        mimeType
        uploader {
          id
          username
          displayName
          avatarUrl
        }
        artist {
          id
          username
          displayName
          avatarUrl
        }
      }
      textContent {
        id
        content
        wordCount
        formatting
      }
      likesCount
      userHasLiked
      tags_rel {
        tag {
          id
          name
          category
          color
        }
      }
    }
    total
    hasMore
  }
}
    `;

/**
 * __useGetLikedMediaQuery__
 *
 * To run a query within a React component, call `useGetLikedMediaQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLikedMediaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLikedMediaQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetLikedMediaQuery(baseOptions?: Apollo.QueryHookOptions<GetLikedMediaQuery, GetLikedMediaQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLikedMediaQuery, GetLikedMediaQueryVariables>(GetLikedMediaDocument, options);
      }
export function useGetLikedMediaLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLikedMediaQuery, GetLikedMediaQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLikedMediaQuery, GetLikedMediaQueryVariables>(GetLikedMediaDocument, options);
        }
export function useGetLikedMediaSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLikedMediaQuery, GetLikedMediaQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLikedMediaQuery, GetLikedMediaQueryVariables>(GetLikedMediaDocument, options);
        }
export type GetLikedMediaQueryHookResult = ReturnType<typeof useGetLikedMediaQuery>;
export type GetLikedMediaLazyQueryHookResult = ReturnType<typeof useGetLikedMediaLazyQuery>;
export type GetLikedMediaSuspenseQueryHookResult = ReturnType<typeof useGetLikedMediaSuspenseQuery>;
export type GetLikedMediaQueryResult = Apollo.QueryResult<GetLikedMediaQuery, GetLikedMediaQueryVariables>;
export const CreateTextMediaDocument = gql`
    mutation CreateTextMedia($input: CreateTextMediaInput!) {
  createTextMedia(input: $input) {
    id
    title
    description
    ownerId
    characterId
    galleryId
    visibility
    imageId
    textContentId
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    character {
      id
      name
    }
    textContent {
      id
      content
      wordCount
      formatting
    }
    likesCount
    userHasLiked
  }
}
    `;
export type CreateTextMediaMutationFn = Apollo.MutationFunction<CreateTextMediaMutation, CreateTextMediaMutationVariables>;

/**
 * __useCreateTextMediaMutation__
 *
 * To run a mutation, you first call `useCreateTextMediaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTextMediaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTextMediaMutation, { data, loading, error }] = useCreateTextMediaMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTextMediaMutation(baseOptions?: Apollo.MutationHookOptions<CreateTextMediaMutation, CreateTextMediaMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTextMediaMutation, CreateTextMediaMutationVariables>(CreateTextMediaDocument, options);
      }
export type CreateTextMediaMutationHookResult = ReturnType<typeof useCreateTextMediaMutation>;
export type CreateTextMediaMutationResult = Apollo.MutationResult<CreateTextMediaMutation>;
export type CreateTextMediaMutationOptions = Apollo.BaseMutationOptions<CreateTextMediaMutation, CreateTextMediaMutationVariables>;
export const UpdateMediaDocument = gql`
    mutation UpdateMedia($id: ID!, $input: UpdateMediaInput!) {
  updateMedia(id: $id, input: $input) {
    id
    title
    description
    ownerId
    characterId
    galleryId
    visibility
    imageId
    textContentId
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
      avatarUrl
    }
    character {
      id
      name
    }
    gallery {
      id
      name
    }
    image {
      id
      url
      thumbnailUrl
      altText
      isNsfw
    }
    textContent {
      id
      content
      wordCount
      formatting
    }
    likesCount
    userHasLiked
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
  }
}
    `;
export type UpdateMediaMutationFn = Apollo.MutationFunction<UpdateMediaMutation, UpdateMediaMutationVariables>;

/**
 * __useUpdateMediaMutation__
 *
 * To run a mutation, you first call `useUpdateMediaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMediaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMediaMutation, { data, loading, error }] = useUpdateMediaMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMediaMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMediaMutation, UpdateMediaMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMediaMutation, UpdateMediaMutationVariables>(UpdateMediaDocument, options);
      }
export type UpdateMediaMutationHookResult = ReturnType<typeof useUpdateMediaMutation>;
export type UpdateMediaMutationResult = Apollo.MutationResult<UpdateMediaMutation>;
export type UpdateMediaMutationOptions = Apollo.BaseMutationOptions<UpdateMediaMutation, UpdateMediaMutationVariables>;
export const UpdateTextContentDocument = gql`
    mutation UpdateTextContent($mediaId: ID!, $input: UpdateTextContentInput!) {
  updateTextContent(mediaId: $mediaId, input: $input) {
    id
    title
    description
    textContent {
      id
      content
      wordCount
      formatting
    }
    updatedAt
  }
}
    `;
export type UpdateTextContentMutationFn = Apollo.MutationFunction<UpdateTextContentMutation, UpdateTextContentMutationVariables>;

/**
 * __useUpdateTextContentMutation__
 *
 * To run a mutation, you first call `useUpdateTextContentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTextContentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTextContentMutation, { data, loading, error }] = useUpdateTextContentMutation({
 *   variables: {
 *      mediaId: // value for 'mediaId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTextContentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTextContentMutation, UpdateTextContentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTextContentMutation, UpdateTextContentMutationVariables>(UpdateTextContentDocument, options);
      }
export type UpdateTextContentMutationHookResult = ReturnType<typeof useUpdateTextContentMutation>;
export type UpdateTextContentMutationResult = Apollo.MutationResult<UpdateTextContentMutation>;
export type UpdateTextContentMutationOptions = Apollo.BaseMutationOptions<UpdateTextContentMutation, UpdateTextContentMutationVariables>;
export const UpdateImageDocument = gql`
    mutation UpdateImage($id: ID!, $input: UpdateImageInput!) {
  updateImage(id: $id, input: $input) {
    id
    altText
    isNsfw
    artistId
    artistName
    artistUrl
    source
    updatedAt
  }
}
    `;
export type UpdateImageMutationFn = Apollo.MutationFunction<UpdateImageMutation, UpdateImageMutationVariables>;

/**
 * __useUpdateImageMutation__
 *
 * To run a mutation, you first call `useUpdateImageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateImageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateImageMutation, { data, loading, error }] = useUpdateImageMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateImageMutation(baseOptions?: Apollo.MutationHookOptions<UpdateImageMutation, UpdateImageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateImageMutation, UpdateImageMutationVariables>(UpdateImageDocument, options);
      }
export type UpdateImageMutationHookResult = ReturnType<typeof useUpdateImageMutation>;
export type UpdateImageMutationResult = Apollo.MutationResult<UpdateImageMutation>;
export type UpdateImageMutationOptions = Apollo.BaseMutationOptions<UpdateImageMutation, UpdateImageMutationVariables>;
export const DeleteMediaDocument = gql`
    mutation DeleteMedia($id: ID!) {
  deleteMedia(id: $id)
}
    `;
export type DeleteMediaMutationFn = Apollo.MutationFunction<DeleteMediaMutation, DeleteMediaMutationVariables>;

/**
 * __useDeleteMediaMutation__
 *
 * To run a mutation, you first call `useDeleteMediaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMediaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMediaMutation, { data, loading, error }] = useDeleteMediaMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteMediaMutation(baseOptions?: Apollo.MutationHookOptions<DeleteMediaMutation, DeleteMediaMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteMediaMutation, DeleteMediaMutationVariables>(DeleteMediaDocument, options);
      }
export type DeleteMediaMutationHookResult = ReturnType<typeof useDeleteMediaMutation>;
export type DeleteMediaMutationResult = Apollo.MutationResult<DeleteMediaMutation>;
export type DeleteMediaMutationOptions = Apollo.BaseMutationOptions<DeleteMediaMutation, DeleteMediaMutationVariables>;
export const AddMediaTagsDocument = gql`
    mutation AddMediaTags($id: ID!, $input: ManageMediaTagsInput!) {
  addMediaTags(id: $id, input: $input) {
    id
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
  }
}
    `;
export type AddMediaTagsMutationFn = Apollo.MutationFunction<AddMediaTagsMutation, AddMediaTagsMutationVariables>;

/**
 * __useAddMediaTagsMutation__
 *
 * To run a mutation, you first call `useAddMediaTagsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddMediaTagsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addMediaTagsMutation, { data, loading, error }] = useAddMediaTagsMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddMediaTagsMutation(baseOptions?: Apollo.MutationHookOptions<AddMediaTagsMutation, AddMediaTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddMediaTagsMutation, AddMediaTagsMutationVariables>(AddMediaTagsDocument, options);
      }
export type AddMediaTagsMutationHookResult = ReturnType<typeof useAddMediaTagsMutation>;
export type AddMediaTagsMutationResult = Apollo.MutationResult<AddMediaTagsMutation>;
export type AddMediaTagsMutationOptions = Apollo.BaseMutationOptions<AddMediaTagsMutation, AddMediaTagsMutationVariables>;
export const RemoveMediaTagsDocument = gql`
    mutation RemoveMediaTags($id: ID!, $input: ManageMediaTagsInput!) {
  removeMediaTags(id: $id, input: $input) {
    id
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
  }
}
    `;
export type RemoveMediaTagsMutationFn = Apollo.MutationFunction<RemoveMediaTagsMutation, RemoveMediaTagsMutationVariables>;

/**
 * __useRemoveMediaTagsMutation__
 *
 * To run a mutation, you first call `useRemoveMediaTagsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveMediaTagsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeMediaTagsMutation, { data, loading, error }] = useRemoveMediaTagsMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRemoveMediaTagsMutation(baseOptions?: Apollo.MutationHookOptions<RemoveMediaTagsMutation, RemoveMediaTagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveMediaTagsMutation, RemoveMediaTagsMutationVariables>(RemoveMediaTagsDocument, options);
      }
export type RemoveMediaTagsMutationHookResult = ReturnType<typeof useRemoveMediaTagsMutation>;
export type RemoveMediaTagsMutationResult = Apollo.MutationResult<RemoveMediaTagsMutation>;
export type RemoveMediaTagsMutationOptions = Apollo.BaseMutationOptions<RemoveMediaTagsMutation, RemoveMediaTagsMutationVariables>;
export const RolesByCommunityDetailedDocument = gql`
    query RolesByCommunityDetailed($communityId: ID!, $first: Int!, $after: String) {
  rolesByCommunity(communityId: $communityId, first: $first, after: $after) {
    nodes {
      id
      name
      communityId
      canCreateSpecies
      canCreateCharacter
      canEditCharacter
      canEditOwnCharacter
      canEditSpecies
      canManageItems
      canGrantItems
      canCreateInviteCode
      canListInviteCodes
      canCreateRole
      canEditRole
      canRemoveCommunityMember
      canManageMemberRoles
      createdAt
      updatedAt
      community {
        id
        name
      }
    }
    totalCount
    hasNextPage
    hasPreviousPage
  }
}
    `;

/**
 * __useRolesByCommunityDetailedQuery__
 *
 * To run a query within a React component, call `useRolesByCommunityDetailedQuery` and pass it any options that fit your needs.
 * When your component renders, `useRolesByCommunityDetailedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRolesByCommunityDetailedQuery({
 *   variables: {
 *      communityId: // value for 'communityId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useRolesByCommunityDetailedQuery(baseOptions: Apollo.QueryHookOptions<RolesByCommunityDetailedQuery, RolesByCommunityDetailedQueryVariables> & ({ variables: RolesByCommunityDetailedQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RolesByCommunityDetailedQuery, RolesByCommunityDetailedQueryVariables>(RolesByCommunityDetailedDocument, options);
      }
export function useRolesByCommunityDetailedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RolesByCommunityDetailedQuery, RolesByCommunityDetailedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RolesByCommunityDetailedQuery, RolesByCommunityDetailedQueryVariables>(RolesByCommunityDetailedDocument, options);
        }
export function useRolesByCommunityDetailedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RolesByCommunityDetailedQuery, RolesByCommunityDetailedQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RolesByCommunityDetailedQuery, RolesByCommunityDetailedQueryVariables>(RolesByCommunityDetailedDocument, options);
        }
export type RolesByCommunityDetailedQueryHookResult = ReturnType<typeof useRolesByCommunityDetailedQuery>;
export type RolesByCommunityDetailedLazyQueryHookResult = ReturnType<typeof useRolesByCommunityDetailedLazyQuery>;
export type RolesByCommunityDetailedSuspenseQueryHookResult = ReturnType<typeof useRolesByCommunityDetailedSuspenseQuery>;
export type RolesByCommunityDetailedQueryResult = Apollo.QueryResult<RolesByCommunityDetailedQuery, RolesByCommunityDetailedQueryVariables>;
export const CreateRoleDocument = gql`
    mutation CreateRole($input: CreateRoleInput!) {
  createRole(createRoleInput: $input) {
    id
    name
    communityId
    canCreateSpecies
    canCreateCharacter
    canEditCharacter
    canEditOwnCharacter
    canEditSpecies
    canCreateInviteCode
    canListInviteCodes
    canCreateRole
    canEditRole
    canRemoveCommunityMember
    canManageMemberRoles
    createdAt
    updatedAt
    community {
      id
      name
    }
  }
}
    `;
export type CreateRoleMutationFn = Apollo.MutationFunction<CreateRoleMutation, CreateRoleMutationVariables>;

/**
 * __useCreateRoleMutation__
 *
 * To run a mutation, you first call `useCreateRoleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRoleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRoleMutation, { data, loading, error }] = useCreateRoleMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateRoleMutation(baseOptions?: Apollo.MutationHookOptions<CreateRoleMutation, CreateRoleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateRoleMutation, CreateRoleMutationVariables>(CreateRoleDocument, options);
      }
export type CreateRoleMutationHookResult = ReturnType<typeof useCreateRoleMutation>;
export type CreateRoleMutationResult = Apollo.MutationResult<CreateRoleMutation>;
export type CreateRoleMutationOptions = Apollo.BaseMutationOptions<CreateRoleMutation, CreateRoleMutationVariables>;
export const UpdateRoleDocument = gql`
    mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
  updateRole(id: $id, updateRoleInput: $input) {
    id
    name
    communityId
    canCreateSpecies
    canCreateCharacter
    canEditCharacter
    canEditOwnCharacter
    canEditSpecies
    canCreateInviteCode
    canListInviteCodes
    canCreateRole
    canEditRole
    canRemoveCommunityMember
    canManageMemberRoles
    createdAt
    updatedAt
    community {
      id
      name
    }
  }
}
    `;
export type UpdateRoleMutationFn = Apollo.MutationFunction<UpdateRoleMutation, UpdateRoleMutationVariables>;

/**
 * __useUpdateRoleMutation__
 *
 * To run a mutation, you first call `useUpdateRoleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateRoleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateRoleMutation, { data, loading, error }] = useUpdateRoleMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateRoleMutation(baseOptions?: Apollo.MutationHookOptions<UpdateRoleMutation, UpdateRoleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateRoleMutation, UpdateRoleMutationVariables>(UpdateRoleDocument, options);
      }
export type UpdateRoleMutationHookResult = ReturnType<typeof useUpdateRoleMutation>;
export type UpdateRoleMutationResult = Apollo.MutationResult<UpdateRoleMutation>;
export type UpdateRoleMutationOptions = Apollo.BaseMutationOptions<UpdateRoleMutation, UpdateRoleMutationVariables>;
export const CommunityMembersWithRolesDocument = gql`
    query CommunityMembersWithRoles($communityId: ID!, $first: Int!, $after: String) {
  communityMembersByCommunity(
    communityId: $communityId
    first: $first
    after: $after
  ) {
    nodes {
      id
      userId
      roleId
      createdAt
      updatedAt
      user {
        id
        username
        email
        displayName
      }
      role {
        id
        name
        canCreateSpecies
        canCreateCharacter
        canEditCharacter
        canEditOwnCharacter
        canEditSpecies
        canManageItems
        canGrantItems
        canCreateInviteCode
        canListInviteCodes
        canCreateRole
        canEditRole
        canRemoveCommunityMember
        canManageMemberRoles
      }
    }
    totalCount
    hasNextPage
    hasPreviousPage
  }
}
    `;

/**
 * __useCommunityMembersWithRolesQuery__
 *
 * To run a query within a React component, call `useCommunityMembersWithRolesQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommunityMembersWithRolesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommunityMembersWithRolesQuery({
 *   variables: {
 *      communityId: // value for 'communityId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useCommunityMembersWithRolesQuery(baseOptions: Apollo.QueryHookOptions<CommunityMembersWithRolesQuery, CommunityMembersWithRolesQueryVariables> & ({ variables: CommunityMembersWithRolesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommunityMembersWithRolesQuery, CommunityMembersWithRolesQueryVariables>(CommunityMembersWithRolesDocument, options);
      }
export function useCommunityMembersWithRolesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommunityMembersWithRolesQuery, CommunityMembersWithRolesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommunityMembersWithRolesQuery, CommunityMembersWithRolesQueryVariables>(CommunityMembersWithRolesDocument, options);
        }
export function useCommunityMembersWithRolesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CommunityMembersWithRolesQuery, CommunityMembersWithRolesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CommunityMembersWithRolesQuery, CommunityMembersWithRolesQueryVariables>(CommunityMembersWithRolesDocument, options);
        }
export type CommunityMembersWithRolesQueryHookResult = ReturnType<typeof useCommunityMembersWithRolesQuery>;
export type CommunityMembersWithRolesLazyQueryHookResult = ReturnType<typeof useCommunityMembersWithRolesLazyQuery>;
export type CommunityMembersWithRolesSuspenseQueryHookResult = ReturnType<typeof useCommunityMembersWithRolesSuspenseQuery>;
export type CommunityMembersWithRolesQueryResult = Apollo.QueryResult<CommunityMembersWithRolesQuery, CommunityMembersWithRolesQueryVariables>;
export const UpdateCommunityMemberDocument = gql`
    mutation UpdateCommunityMember($id: ID!, $input: UpdateCommunityMemberInput!) {
  updateCommunityMember(id: $id, updateCommunityMemberInput: $input) {
    id
    userId
    roleId
    createdAt
    updatedAt
    user {
      id
      username
      email
      displayName
    }
    role {
      id
      name
      canCreateSpecies
      canCreateCharacter
      canEditCharacter
      canEditOwnCharacter
      canEditSpecies
      canManageItems
      canGrantItems
      canCreateInviteCode
      canListInviteCodes
      canCreateRole
      canEditRole
      canRemoveCommunityMember
      canManageMemberRoles
    }
  }
}
    `;
export type UpdateCommunityMemberMutationFn = Apollo.MutationFunction<UpdateCommunityMemberMutation, UpdateCommunityMemberMutationVariables>;

/**
 * __useUpdateCommunityMemberMutation__
 *
 * To run a mutation, you first call `useUpdateCommunityMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCommunityMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCommunityMemberMutation, { data, loading, error }] = useUpdateCommunityMemberMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCommunityMemberMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCommunityMemberMutation, UpdateCommunityMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCommunityMemberMutation, UpdateCommunityMemberMutationVariables>(UpdateCommunityMemberDocument, options);
      }
export type UpdateCommunityMemberMutationHookResult = ReturnType<typeof useUpdateCommunityMemberMutation>;
export type UpdateCommunityMemberMutationResult = Apollo.MutationResult<UpdateCommunityMemberMutation>;
export type UpdateCommunityMemberMutationOptions = Apollo.BaseMutationOptions<UpdateCommunityMemberMutation, UpdateCommunityMemberMutationVariables>;
export const ToggleLikeDocument = gql`
    mutation ToggleLike($input: ToggleLikeInput!) {
  toggleLike(input: $input) {
    isLiked
    likesCount
    entityType
    entityId
  }
}
    `;
export type ToggleLikeMutationFn = Apollo.MutationFunction<ToggleLikeMutation, ToggleLikeMutationVariables>;

/**
 * __useToggleLikeMutation__
 *
 * To run a mutation, you first call `useToggleLikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleLikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleLikeMutation, { data, loading, error }] = useToggleLikeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useToggleLikeMutation(baseOptions?: Apollo.MutationHookOptions<ToggleLikeMutation, ToggleLikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleLikeMutation, ToggleLikeMutationVariables>(ToggleLikeDocument, options);
      }
export type ToggleLikeMutationHookResult = ReturnType<typeof useToggleLikeMutation>;
export type ToggleLikeMutationResult = Apollo.MutationResult<ToggleLikeMutation>;
export type ToggleLikeMutationOptions = Apollo.BaseMutationOptions<ToggleLikeMutation, ToggleLikeMutationVariables>;
export const GetLikeStatusDocument = gql`
    query GetLikeStatus($entityType: LikeableType!, $entityId: ID!) {
  likeStatus(entityType: $entityType, entityId: $entityId) {
    isLiked
    likesCount
  }
}
    `;

/**
 * __useGetLikeStatusQuery__
 *
 * To run a query within a React component, call `useGetLikeStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLikeStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLikeStatusQuery({
 *   variables: {
 *      entityType: // value for 'entityType'
 *      entityId: // value for 'entityId'
 *   },
 * });
 */
export function useGetLikeStatusQuery(baseOptions: Apollo.QueryHookOptions<GetLikeStatusQuery, GetLikeStatusQueryVariables> & ({ variables: GetLikeStatusQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLikeStatusQuery, GetLikeStatusQueryVariables>(GetLikeStatusDocument, options);
      }
export function useGetLikeStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLikeStatusQuery, GetLikeStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLikeStatusQuery, GetLikeStatusQueryVariables>(GetLikeStatusDocument, options);
        }
export function useGetLikeStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLikeStatusQuery, GetLikeStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLikeStatusQuery, GetLikeStatusQueryVariables>(GetLikeStatusDocument, options);
        }
export type GetLikeStatusQueryHookResult = ReturnType<typeof useGetLikeStatusQuery>;
export type GetLikeStatusLazyQueryHookResult = ReturnType<typeof useGetLikeStatusLazyQuery>;
export type GetLikeStatusSuspenseQueryHookResult = ReturnType<typeof useGetLikeStatusSuspenseQuery>;
export type GetLikeStatusQueryResult = Apollo.QueryResult<GetLikeStatusQuery, GetLikeStatusQueryVariables>;
export const ToggleFollowDocument = gql`
    mutation ToggleFollow($input: ToggleFollowInput!) {
  toggleFollow(input: $input) {
    isFollowing
    followersCount
    followingCount
    targetUserId
  }
}
    `;
export type ToggleFollowMutationFn = Apollo.MutationFunction<ToggleFollowMutation, ToggleFollowMutationVariables>;

/**
 * __useToggleFollowMutation__
 *
 * To run a mutation, you first call `useToggleFollowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleFollowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleFollowMutation, { data, loading, error }] = useToggleFollowMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useToggleFollowMutation(baseOptions?: Apollo.MutationHookOptions<ToggleFollowMutation, ToggleFollowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleFollowMutation, ToggleFollowMutationVariables>(ToggleFollowDocument, options);
      }
export type ToggleFollowMutationHookResult = ReturnType<typeof useToggleFollowMutation>;
export type ToggleFollowMutationResult = Apollo.MutationResult<ToggleFollowMutation>;
export type ToggleFollowMutationOptions = Apollo.BaseMutationOptions<ToggleFollowMutation, ToggleFollowMutationVariables>;
export const GetFollowStatusDocument = gql`
    query GetFollowStatus($userId: ID!) {
  followStatus(userId: $userId) {
    isFollowing
    followersCount
    followingCount
  }
}
    `;

/**
 * __useGetFollowStatusQuery__
 *
 * To run a query within a React component, call `useGetFollowStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFollowStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFollowStatusQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetFollowStatusQuery(baseOptions: Apollo.QueryHookOptions<GetFollowStatusQuery, GetFollowStatusQueryVariables> & ({ variables: GetFollowStatusQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFollowStatusQuery, GetFollowStatusQueryVariables>(GetFollowStatusDocument, options);
      }
export function useGetFollowStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFollowStatusQuery, GetFollowStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFollowStatusQuery, GetFollowStatusQueryVariables>(GetFollowStatusDocument, options);
        }
export function useGetFollowStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFollowStatusQuery, GetFollowStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFollowStatusQuery, GetFollowStatusQueryVariables>(GetFollowStatusDocument, options);
        }
export type GetFollowStatusQueryHookResult = ReturnType<typeof useGetFollowStatusQuery>;
export type GetFollowStatusLazyQueryHookResult = ReturnType<typeof useGetFollowStatusLazyQuery>;
export type GetFollowStatusSuspenseQueryHookResult = ReturnType<typeof useGetFollowStatusSuspenseQuery>;
export type GetFollowStatusQueryResult = Apollo.QueryResult<GetFollowStatusQuery, GetFollowStatusQueryVariables>;
export const CreateCommentDocument = gql`
    mutation CreateComment($input: CreateCommentInput!) {
  createComment(input: $input) {
    id
    content
    createdAt
    authorId
    commentableId
    commentableType
    parentId
    isHidden
    likesCount
    author {
      id
      username
      displayName
      avatarUrl
    }
    replies {
      id
      content
      createdAt
      authorId
      parentId
      isHidden
      likesCount
      author {
        id
        username
        displayName
        avatarUrl
      }
    }
  }
}
    `;
export type CreateCommentMutationFn = Apollo.MutationFunction<CreateCommentMutation, CreateCommentMutationVariables>;

/**
 * __useCreateCommentMutation__
 *
 * To run a mutation, you first call `useCreateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCommentMutation, { data, loading, error }] = useCreateCommentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCommentMutation(baseOptions?: Apollo.MutationHookOptions<CreateCommentMutation, CreateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCommentMutation, CreateCommentMutationVariables>(CreateCommentDocument, options);
      }
export type CreateCommentMutationHookResult = ReturnType<typeof useCreateCommentMutation>;
export type CreateCommentMutationResult = Apollo.MutationResult<CreateCommentMutation>;
export type CreateCommentMutationOptions = Apollo.BaseMutationOptions<CreateCommentMutation, CreateCommentMutationVariables>;
export const UpdateCommentDocument = gql`
    mutation UpdateComment($id: ID!, $input: UpdateCommentInput!) {
  updateComment(id: $id, input: $input) {
    id
    content
    createdAt
    authorId
    commentableId
    commentableType
    parentId
    isHidden
    likesCount
    author {
      id
      username
      displayName
      avatarUrl
    }
  }
}
    `;
export type UpdateCommentMutationFn = Apollo.MutationFunction<UpdateCommentMutation, UpdateCommentMutationVariables>;

/**
 * __useUpdateCommentMutation__
 *
 * To run a mutation, you first call `useUpdateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCommentMutation, { data, loading, error }] = useUpdateCommentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCommentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCommentMutation, UpdateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCommentMutation, UpdateCommentMutationVariables>(UpdateCommentDocument, options);
      }
export type UpdateCommentMutationHookResult = ReturnType<typeof useUpdateCommentMutation>;
export type UpdateCommentMutationResult = Apollo.MutationResult<UpdateCommentMutation>;
export type UpdateCommentMutationOptions = Apollo.BaseMutationOptions<UpdateCommentMutation, UpdateCommentMutationVariables>;
export const DeleteCommentDocument = gql`
    mutation DeleteComment($id: ID!) {
  deleteComment(id: $id)
}
    `;
export type DeleteCommentMutationFn = Apollo.MutationFunction<DeleteCommentMutation, DeleteCommentMutationVariables>;

/**
 * __useDeleteCommentMutation__
 *
 * To run a mutation, you first call `useDeleteCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCommentMutation, { data, loading, error }] = useDeleteCommentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCommentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCommentMutation, DeleteCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCommentMutation, DeleteCommentMutationVariables>(DeleteCommentDocument, options);
      }
export type DeleteCommentMutationHookResult = ReturnType<typeof useDeleteCommentMutation>;
export type DeleteCommentMutationResult = Apollo.MutationResult<DeleteCommentMutation>;
export type DeleteCommentMutationOptions = Apollo.BaseMutationOptions<DeleteCommentMutation, DeleteCommentMutationVariables>;
export const GetCommentsDocument = gql`
    query GetComments($filters: CommentFiltersInput!) {
  comments(filters: $filters) {
    comments {
      id
      content
      createdAt
      authorId
      commentableId
      commentableType
      parentId
      isHidden
      likesCount
      author {
        id
        username
        displayName
        avatarUrl
      }
      replies {
        id
        content
        createdAt
        authorId
        parentId
        isHidden
        likesCount
        author {
          id
          username
          displayName
          avatarUrl
        }
      }
    }
    total
  }
}
    `;

/**
 * __useGetCommentsQuery__
 *
 * To run a query within a React component, call `useGetCommentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCommentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCommentsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useGetCommentsQuery(baseOptions: Apollo.QueryHookOptions<GetCommentsQuery, GetCommentsQueryVariables> & ({ variables: GetCommentsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCommentsQuery, GetCommentsQueryVariables>(GetCommentsDocument, options);
      }
export function useGetCommentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCommentsQuery, GetCommentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCommentsQuery, GetCommentsQueryVariables>(GetCommentsDocument, options);
        }
export function useGetCommentsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCommentsQuery, GetCommentsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCommentsQuery, GetCommentsQueryVariables>(GetCommentsDocument, options);
        }
export type GetCommentsQueryHookResult = ReturnType<typeof useGetCommentsQuery>;
export type GetCommentsLazyQueryHookResult = ReturnType<typeof useGetCommentsLazyQuery>;
export type GetCommentsSuspenseQueryHookResult = ReturnType<typeof useGetCommentsSuspenseQuery>;
export type GetCommentsQueryResult = Apollo.QueryResult<GetCommentsQuery, GetCommentsQueryVariables>;
export const GetFollowersDocument = gql`
    query GetFollowers($username: String!) {
  getFollowers(username: $username) {
    user {
      id
      username
      displayName
    }
    followers {
      id
      username
      displayName
      avatarUrl
      bio
    }
  }
}
    `;

/**
 * __useGetFollowersQuery__
 *
 * To run a query within a React component, call `useGetFollowersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFollowersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFollowersQuery({
 *   variables: {
 *      username: // value for 'username'
 *   },
 * });
 */
export function useGetFollowersQuery(baseOptions: Apollo.QueryHookOptions<GetFollowersQuery, GetFollowersQueryVariables> & ({ variables: GetFollowersQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFollowersQuery, GetFollowersQueryVariables>(GetFollowersDocument, options);
      }
export function useGetFollowersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFollowersQuery, GetFollowersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFollowersQuery, GetFollowersQueryVariables>(GetFollowersDocument, options);
        }
export function useGetFollowersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFollowersQuery, GetFollowersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFollowersQuery, GetFollowersQueryVariables>(GetFollowersDocument, options);
        }
export type GetFollowersQueryHookResult = ReturnType<typeof useGetFollowersQuery>;
export type GetFollowersLazyQueryHookResult = ReturnType<typeof useGetFollowersLazyQuery>;
export type GetFollowersSuspenseQueryHookResult = ReturnType<typeof useGetFollowersSuspenseQuery>;
export type GetFollowersQueryResult = Apollo.QueryResult<GetFollowersQuery, GetFollowersQueryVariables>;
export const GetFollowingDocument = gql`
    query GetFollowing($username: String!) {
  getFollowing(username: $username) {
    user {
      id
      username
      displayName
    }
    following {
      id
      username
      displayName
      avatarUrl
      bio
    }
  }
}
    `;

/**
 * __useGetFollowingQuery__
 *
 * To run a query within a React component, call `useGetFollowingQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFollowingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFollowingQuery({
 *   variables: {
 *      username: // value for 'username'
 *   },
 * });
 */
export function useGetFollowingQuery(baseOptions: Apollo.QueryHookOptions<GetFollowingQuery, GetFollowingQueryVariables> & ({ variables: GetFollowingQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFollowingQuery, GetFollowingQueryVariables>(GetFollowingDocument, options);
      }
export function useGetFollowingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFollowingQuery, GetFollowingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFollowingQuery, GetFollowingQueryVariables>(GetFollowingDocument, options);
        }
export function useGetFollowingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFollowingQuery, GetFollowingQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFollowingQuery, GetFollowingQueryVariables>(GetFollowingDocument, options);
        }
export type GetFollowingQueryHookResult = ReturnType<typeof useGetFollowingQuery>;
export type GetFollowingLazyQueryHookResult = ReturnType<typeof useGetFollowingLazyQuery>;
export type GetFollowingSuspenseQueryHookResult = ReturnType<typeof useGetFollowingSuspenseQuery>;
export type GetFollowingQueryResult = Apollo.QueryResult<GetFollowingQuery, GetFollowingQueryVariables>;
export const GetActivityFeedDocument = gql`
    query GetActivityFeed($input: ActivityFeedInput) {
  activityFeed(input: $input) {
    id
    type
    entityId
    createdAt
    user {
      id
      username
      displayName
      avatarUrl
    }
    content {
      name
      title
      description
    }
  }
}
    `;

/**
 * __useGetActivityFeedQuery__
 *
 * To run a query within a React component, call `useGetActivityFeedQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetActivityFeedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetActivityFeedQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetActivityFeedQuery(baseOptions?: Apollo.QueryHookOptions<GetActivityFeedQuery, GetActivityFeedQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetActivityFeedQuery, GetActivityFeedQueryVariables>(GetActivityFeedDocument, options);
      }
export function useGetActivityFeedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetActivityFeedQuery, GetActivityFeedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetActivityFeedQuery, GetActivityFeedQueryVariables>(GetActivityFeedDocument, options);
        }
export function useGetActivityFeedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetActivityFeedQuery, GetActivityFeedQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetActivityFeedQuery, GetActivityFeedQueryVariables>(GetActivityFeedDocument, options);
        }
export type GetActivityFeedQueryHookResult = ReturnType<typeof useGetActivityFeedQuery>;
export type GetActivityFeedLazyQueryHookResult = ReturnType<typeof useGetActivityFeedLazyQuery>;
export type GetActivityFeedSuspenseQueryHookResult = ReturnType<typeof useGetActivityFeedSuspenseQuery>;
export type GetActivityFeedQueryResult = Apollo.QueryResult<GetActivityFeedQuery, GetActivityFeedQueryVariables>;
export const SpeciesDocument = gql`
    query Species($first: Int, $after: String) {
  species(first: $first, after: $after) {
    ...SpeciesConnectionDetails
  }
}
    ${SpeciesConnectionDetailsFragmentDoc}`;

/**
 * __useSpeciesQuery__
 *
 * To run a query within a React component, call `useSpeciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useSpeciesQuery(baseOptions?: Apollo.QueryHookOptions<SpeciesQuery, SpeciesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesQuery, SpeciesQueryVariables>(SpeciesDocument, options);
      }
export function useSpeciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesQuery, SpeciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesQuery, SpeciesQueryVariables>(SpeciesDocument, options);
        }
export function useSpeciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesQuery, SpeciesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesQuery, SpeciesQueryVariables>(SpeciesDocument, options);
        }
export type SpeciesQueryHookResult = ReturnType<typeof useSpeciesQuery>;
export type SpeciesLazyQueryHookResult = ReturnType<typeof useSpeciesLazyQuery>;
export type SpeciesSuspenseQueryHookResult = ReturnType<typeof useSpeciesSuspenseQuery>;
export type SpeciesQueryResult = Apollo.QueryResult<SpeciesQuery, SpeciesQueryVariables>;
export const SpeciesByCommunityDocument = gql`
    query SpeciesByCommunity($communityId: ID!, $first: Int, $after: String) {
  speciesByCommunity(communityId: $communityId, first: $first, after: $after) {
    ...SpeciesConnectionDetails
  }
}
    ${SpeciesConnectionDetailsFragmentDoc}`;

/**
 * __useSpeciesByCommunityQuery__
 *
 * To run a query within a React component, call `useSpeciesByCommunityQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesByCommunityQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesByCommunityQuery({
 *   variables: {
 *      communityId: // value for 'communityId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useSpeciesByCommunityQuery(baseOptions: Apollo.QueryHookOptions<SpeciesByCommunityQuery, SpeciesByCommunityQueryVariables> & ({ variables: SpeciesByCommunityQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesByCommunityQuery, SpeciesByCommunityQueryVariables>(SpeciesByCommunityDocument, options);
      }
export function useSpeciesByCommunityLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesByCommunityQuery, SpeciesByCommunityQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesByCommunityQuery, SpeciesByCommunityQueryVariables>(SpeciesByCommunityDocument, options);
        }
export function useSpeciesByCommunitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesByCommunityQuery, SpeciesByCommunityQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesByCommunityQuery, SpeciesByCommunityQueryVariables>(SpeciesByCommunityDocument, options);
        }
export type SpeciesByCommunityQueryHookResult = ReturnType<typeof useSpeciesByCommunityQuery>;
export type SpeciesByCommunityLazyQueryHookResult = ReturnType<typeof useSpeciesByCommunityLazyQuery>;
export type SpeciesByCommunitySuspenseQueryHookResult = ReturnType<typeof useSpeciesByCommunitySuspenseQuery>;
export type SpeciesByCommunityQueryResult = Apollo.QueryResult<SpeciesByCommunityQuery, SpeciesByCommunityQueryVariables>;
export const SpeciesByIdDocument = gql`
    query SpeciesById($id: ID!) {
  speciesById(id: $id) {
    ...SpeciesDetails
    community {
      id
      name
    }
  }
}
    ${SpeciesDetailsFragmentDoc}`;

/**
 * __useSpeciesByIdQuery__
 *
 * To run a query within a React component, call `useSpeciesByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSpeciesByIdQuery(baseOptions: Apollo.QueryHookOptions<SpeciesByIdQuery, SpeciesByIdQueryVariables> & ({ variables: SpeciesByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesByIdQuery, SpeciesByIdQueryVariables>(SpeciesByIdDocument, options);
      }
export function useSpeciesByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesByIdQuery, SpeciesByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesByIdQuery, SpeciesByIdQueryVariables>(SpeciesByIdDocument, options);
        }
export function useSpeciesByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesByIdQuery, SpeciesByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesByIdQuery, SpeciesByIdQueryVariables>(SpeciesByIdDocument, options);
        }
export type SpeciesByIdQueryHookResult = ReturnType<typeof useSpeciesByIdQuery>;
export type SpeciesByIdLazyQueryHookResult = ReturnType<typeof useSpeciesByIdLazyQuery>;
export type SpeciesByIdSuspenseQueryHookResult = ReturnType<typeof useSpeciesByIdSuspenseQuery>;
export type SpeciesByIdQueryResult = Apollo.QueryResult<SpeciesByIdQuery, SpeciesByIdQueryVariables>;
export const CreateSpeciesDocument = gql`
    mutation CreateSpecies($createSpeciesInput: CreateSpeciesInput!) {
  createSpecies(createSpeciesInput: $createSpeciesInput) {
    ...SpeciesDetails
  }
}
    ${SpeciesDetailsFragmentDoc}`;
export type CreateSpeciesMutationFn = Apollo.MutationFunction<CreateSpeciesMutation, CreateSpeciesMutationVariables>;

/**
 * __useCreateSpeciesMutation__
 *
 * To run a mutation, you first call `useCreateSpeciesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSpeciesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSpeciesMutation, { data, loading, error }] = useCreateSpeciesMutation({
 *   variables: {
 *      createSpeciesInput: // value for 'createSpeciesInput'
 *   },
 * });
 */
export function useCreateSpeciesMutation(baseOptions?: Apollo.MutationHookOptions<CreateSpeciesMutation, CreateSpeciesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSpeciesMutation, CreateSpeciesMutationVariables>(CreateSpeciesDocument, options);
      }
export type CreateSpeciesMutationHookResult = ReturnType<typeof useCreateSpeciesMutation>;
export type CreateSpeciesMutationResult = Apollo.MutationResult<CreateSpeciesMutation>;
export type CreateSpeciesMutationOptions = Apollo.BaseMutationOptions<CreateSpeciesMutation, CreateSpeciesMutationVariables>;
export const UpdateSpeciesDocument = gql`
    mutation UpdateSpecies($id: ID!, $updateSpeciesInput: UpdateSpeciesInput!) {
  updateSpecies(id: $id, updateSpeciesInput: $updateSpeciesInput) {
    ...SpeciesDetails
  }
}
    ${SpeciesDetailsFragmentDoc}`;
export type UpdateSpeciesMutationFn = Apollo.MutationFunction<UpdateSpeciesMutation, UpdateSpeciesMutationVariables>;

/**
 * __useUpdateSpeciesMutation__
 *
 * To run a mutation, you first call `useUpdateSpeciesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSpeciesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSpeciesMutation, { data, loading, error }] = useUpdateSpeciesMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateSpeciesInput: // value for 'updateSpeciesInput'
 *   },
 * });
 */
export function useUpdateSpeciesMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSpeciesMutation, UpdateSpeciesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSpeciesMutation, UpdateSpeciesMutationVariables>(UpdateSpeciesDocument, options);
      }
export type UpdateSpeciesMutationHookResult = ReturnType<typeof useUpdateSpeciesMutation>;
export type UpdateSpeciesMutationResult = Apollo.MutationResult<UpdateSpeciesMutation>;
export type UpdateSpeciesMutationOptions = Apollo.BaseMutationOptions<UpdateSpeciesMutation, UpdateSpeciesMutationVariables>;
export const DeleteSpeciesDocument = gql`
    mutation DeleteSpecies($id: ID!) {
  removeSpecies(id: $id) {
    removed
    message
  }
}
    `;
export type DeleteSpeciesMutationFn = Apollo.MutationFunction<DeleteSpeciesMutation, DeleteSpeciesMutationVariables>;

/**
 * __useDeleteSpeciesMutation__
 *
 * To run a mutation, you first call `useDeleteSpeciesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSpeciesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSpeciesMutation, { data, loading, error }] = useDeleteSpeciesMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteSpeciesMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSpeciesMutation, DeleteSpeciesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSpeciesMutation, DeleteSpeciesMutationVariables>(DeleteSpeciesDocument, options);
      }
export type DeleteSpeciesMutationHookResult = ReturnType<typeof useDeleteSpeciesMutation>;
export type DeleteSpeciesMutationResult = Apollo.MutationResult<DeleteSpeciesMutation>;
export type DeleteSpeciesMutationOptions = Apollo.BaseMutationOptions<DeleteSpeciesMutation, DeleteSpeciesMutationVariables>;
export const SpeciesVariantsDocument = gql`
    query SpeciesVariants($first: Int, $after: String) {
  speciesVariants(first: $first, after: $after) {
    ...SpeciesVariantConnectionDetails
  }
}
    ${SpeciesVariantConnectionDetailsFragmentDoc}`;

/**
 * __useSpeciesVariantsQuery__
 *
 * To run a query within a React component, call `useSpeciesVariantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesVariantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesVariantsQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useSpeciesVariantsQuery(baseOptions?: Apollo.QueryHookOptions<SpeciesVariantsQuery, SpeciesVariantsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesVariantsQuery, SpeciesVariantsQueryVariables>(SpeciesVariantsDocument, options);
      }
export function useSpeciesVariantsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesVariantsQuery, SpeciesVariantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesVariantsQuery, SpeciesVariantsQueryVariables>(SpeciesVariantsDocument, options);
        }
export function useSpeciesVariantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesVariantsQuery, SpeciesVariantsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesVariantsQuery, SpeciesVariantsQueryVariables>(SpeciesVariantsDocument, options);
        }
export type SpeciesVariantsQueryHookResult = ReturnType<typeof useSpeciesVariantsQuery>;
export type SpeciesVariantsLazyQueryHookResult = ReturnType<typeof useSpeciesVariantsLazyQuery>;
export type SpeciesVariantsSuspenseQueryHookResult = ReturnType<typeof useSpeciesVariantsSuspenseQuery>;
export type SpeciesVariantsQueryResult = Apollo.QueryResult<SpeciesVariantsQuery, SpeciesVariantsQueryVariables>;
export const SpeciesVariantsBySpeciesDocument = gql`
    query SpeciesVariantsBySpecies($speciesId: ID!, $first: Int, $after: String) {
  speciesVariantsBySpecies(speciesId: $speciesId, first: $first, after: $after) {
    ...SpeciesVariantConnectionDetails
  }
}
    ${SpeciesVariantConnectionDetailsFragmentDoc}`;

/**
 * __useSpeciesVariantsBySpeciesQuery__
 *
 * To run a query within a React component, call `useSpeciesVariantsBySpeciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesVariantsBySpeciesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesVariantsBySpeciesQuery({
 *   variables: {
 *      speciesId: // value for 'speciesId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useSpeciesVariantsBySpeciesQuery(baseOptions: Apollo.QueryHookOptions<SpeciesVariantsBySpeciesQuery, SpeciesVariantsBySpeciesQueryVariables> & ({ variables: SpeciesVariantsBySpeciesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesVariantsBySpeciesQuery, SpeciesVariantsBySpeciesQueryVariables>(SpeciesVariantsBySpeciesDocument, options);
      }
export function useSpeciesVariantsBySpeciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesVariantsBySpeciesQuery, SpeciesVariantsBySpeciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesVariantsBySpeciesQuery, SpeciesVariantsBySpeciesQueryVariables>(SpeciesVariantsBySpeciesDocument, options);
        }
export function useSpeciesVariantsBySpeciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesVariantsBySpeciesQuery, SpeciesVariantsBySpeciesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesVariantsBySpeciesQuery, SpeciesVariantsBySpeciesQueryVariables>(SpeciesVariantsBySpeciesDocument, options);
        }
export type SpeciesVariantsBySpeciesQueryHookResult = ReturnType<typeof useSpeciesVariantsBySpeciesQuery>;
export type SpeciesVariantsBySpeciesLazyQueryHookResult = ReturnType<typeof useSpeciesVariantsBySpeciesLazyQuery>;
export type SpeciesVariantsBySpeciesSuspenseQueryHookResult = ReturnType<typeof useSpeciesVariantsBySpeciesSuspenseQuery>;
export type SpeciesVariantsBySpeciesQueryResult = Apollo.QueryResult<SpeciesVariantsBySpeciesQuery, SpeciesVariantsBySpeciesQueryVariables>;
export const SpeciesVariantByIdDocument = gql`
    query SpeciesVariantById($id: ID!) {
  speciesVariantById(id: $id) {
    ...SpeciesVariantDetails
    species {
      id
      name
      communityId
    }
  }
}
    ${SpeciesVariantDetailsFragmentDoc}`;

/**
 * __useSpeciesVariantByIdQuery__
 *
 * To run a query within a React component, call `useSpeciesVariantByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpeciesVariantByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpeciesVariantByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSpeciesVariantByIdQuery(baseOptions: Apollo.QueryHookOptions<SpeciesVariantByIdQuery, SpeciesVariantByIdQueryVariables> & ({ variables: SpeciesVariantByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SpeciesVariantByIdQuery, SpeciesVariantByIdQueryVariables>(SpeciesVariantByIdDocument, options);
      }
export function useSpeciesVariantByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SpeciesVariantByIdQuery, SpeciesVariantByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SpeciesVariantByIdQuery, SpeciesVariantByIdQueryVariables>(SpeciesVariantByIdDocument, options);
        }
export function useSpeciesVariantByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SpeciesVariantByIdQuery, SpeciesVariantByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SpeciesVariantByIdQuery, SpeciesVariantByIdQueryVariables>(SpeciesVariantByIdDocument, options);
        }
export type SpeciesVariantByIdQueryHookResult = ReturnType<typeof useSpeciesVariantByIdQuery>;
export type SpeciesVariantByIdLazyQueryHookResult = ReturnType<typeof useSpeciesVariantByIdLazyQuery>;
export type SpeciesVariantByIdSuspenseQueryHookResult = ReturnType<typeof useSpeciesVariantByIdSuspenseQuery>;
export type SpeciesVariantByIdQueryResult = Apollo.QueryResult<SpeciesVariantByIdQuery, SpeciesVariantByIdQueryVariables>;
export const CreateSpeciesVariantDocument = gql`
    mutation CreateSpeciesVariant($createSpeciesVariantInput: CreateSpeciesVariantInput!) {
  createSpeciesVariant(createSpeciesVariantInput: $createSpeciesVariantInput) {
    ...SpeciesVariantDetails
  }
}
    ${SpeciesVariantDetailsFragmentDoc}`;
export type CreateSpeciesVariantMutationFn = Apollo.MutationFunction<CreateSpeciesVariantMutation, CreateSpeciesVariantMutationVariables>;

/**
 * __useCreateSpeciesVariantMutation__
 *
 * To run a mutation, you first call `useCreateSpeciesVariantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSpeciesVariantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSpeciesVariantMutation, { data, loading, error }] = useCreateSpeciesVariantMutation({
 *   variables: {
 *      createSpeciesVariantInput: // value for 'createSpeciesVariantInput'
 *   },
 * });
 */
export function useCreateSpeciesVariantMutation(baseOptions?: Apollo.MutationHookOptions<CreateSpeciesVariantMutation, CreateSpeciesVariantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSpeciesVariantMutation, CreateSpeciesVariantMutationVariables>(CreateSpeciesVariantDocument, options);
      }
export type CreateSpeciesVariantMutationHookResult = ReturnType<typeof useCreateSpeciesVariantMutation>;
export type CreateSpeciesVariantMutationResult = Apollo.MutationResult<CreateSpeciesVariantMutation>;
export type CreateSpeciesVariantMutationOptions = Apollo.BaseMutationOptions<CreateSpeciesVariantMutation, CreateSpeciesVariantMutationVariables>;
export const UpdateSpeciesVariantDocument = gql`
    mutation UpdateSpeciesVariant($id: ID!, $updateSpeciesVariantInput: UpdateSpeciesVariantInput!) {
  updateSpeciesVariant(
    id: $id
    updateSpeciesVariantInput: $updateSpeciesVariantInput
  ) {
    ...SpeciesVariantDetails
  }
}
    ${SpeciesVariantDetailsFragmentDoc}`;
export type UpdateSpeciesVariantMutationFn = Apollo.MutationFunction<UpdateSpeciesVariantMutation, UpdateSpeciesVariantMutationVariables>;

/**
 * __useUpdateSpeciesVariantMutation__
 *
 * To run a mutation, you first call `useUpdateSpeciesVariantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSpeciesVariantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSpeciesVariantMutation, { data, loading, error }] = useUpdateSpeciesVariantMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateSpeciesVariantInput: // value for 'updateSpeciesVariantInput'
 *   },
 * });
 */
export function useUpdateSpeciesVariantMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSpeciesVariantMutation, UpdateSpeciesVariantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSpeciesVariantMutation, UpdateSpeciesVariantMutationVariables>(UpdateSpeciesVariantDocument, options);
      }
export type UpdateSpeciesVariantMutationHookResult = ReturnType<typeof useUpdateSpeciesVariantMutation>;
export type UpdateSpeciesVariantMutationResult = Apollo.MutationResult<UpdateSpeciesVariantMutation>;
export type UpdateSpeciesVariantMutationOptions = Apollo.BaseMutationOptions<UpdateSpeciesVariantMutation, UpdateSpeciesVariantMutationVariables>;
export const DeleteSpeciesVariantDocument = gql`
    mutation DeleteSpeciesVariant($id: ID!) {
  removeSpeciesVariant(id: $id) {
    removed
    message
  }
}
    `;
export type DeleteSpeciesVariantMutationFn = Apollo.MutationFunction<DeleteSpeciesVariantMutation, DeleteSpeciesVariantMutationVariables>;

/**
 * __useDeleteSpeciesVariantMutation__
 *
 * To run a mutation, you first call `useDeleteSpeciesVariantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSpeciesVariantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSpeciesVariantMutation, { data, loading, error }] = useDeleteSpeciesVariantMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteSpeciesVariantMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSpeciesVariantMutation, DeleteSpeciesVariantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSpeciesVariantMutation, DeleteSpeciesVariantMutationVariables>(DeleteSpeciesVariantDocument, options);
      }
export type DeleteSpeciesVariantMutationHookResult = ReturnType<typeof useDeleteSpeciesVariantMutation>;
export type DeleteSpeciesVariantMutationResult = Apollo.MutationResult<DeleteSpeciesVariantMutation>;
export type DeleteSpeciesVariantMutationOptions = Apollo.BaseMutationOptions<DeleteSpeciesVariantMutation, DeleteSpeciesVariantMutationVariables>;
export const TraitsBySpeciesDocument = gql`
    query TraitsBySpecies($speciesId: ID!, $first: Int, $after: String, $variantId: ID) {
  traitsBySpecies(
    speciesId: $speciesId
    first: $first
    after: $after
    variantId: $variantId
  ) {
    ...TraitConnectionDetails
  }
}
    ${TraitConnectionDetailsFragmentDoc}`;

/**
 * __useTraitsBySpeciesQuery__
 *
 * To run a query within a React component, call `useTraitsBySpeciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useTraitsBySpeciesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTraitsBySpeciesQuery({
 *   variables: {
 *      speciesId: // value for 'speciesId'
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      variantId: // value for 'variantId'
 *   },
 * });
 */
export function useTraitsBySpeciesQuery(baseOptions: Apollo.QueryHookOptions<TraitsBySpeciesQuery, TraitsBySpeciesQueryVariables> & ({ variables: TraitsBySpeciesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TraitsBySpeciesQuery, TraitsBySpeciesQueryVariables>(TraitsBySpeciesDocument, options);
      }
export function useTraitsBySpeciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TraitsBySpeciesQuery, TraitsBySpeciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TraitsBySpeciesQuery, TraitsBySpeciesQueryVariables>(TraitsBySpeciesDocument, options);
        }
export function useTraitsBySpeciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TraitsBySpeciesQuery, TraitsBySpeciesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TraitsBySpeciesQuery, TraitsBySpeciesQueryVariables>(TraitsBySpeciesDocument, options);
        }
export type TraitsBySpeciesQueryHookResult = ReturnType<typeof useTraitsBySpeciesQuery>;
export type TraitsBySpeciesLazyQueryHookResult = ReturnType<typeof useTraitsBySpeciesLazyQuery>;
export type TraitsBySpeciesSuspenseQueryHookResult = ReturnType<typeof useTraitsBySpeciesSuspenseQuery>;
export type TraitsBySpeciesQueryResult = Apollo.QueryResult<TraitsBySpeciesQuery, TraitsBySpeciesQueryVariables>;
export const TraitByIdDocument = gql`
    query TraitById($id: ID!) {
  traitById(id: $id) {
    ...TraitDetails
    species {
      id
      name
      communityId
    }
  }
}
    ${TraitDetailsFragmentDoc}`;

/**
 * __useTraitByIdQuery__
 *
 * To run a query within a React component, call `useTraitByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useTraitByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTraitByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTraitByIdQuery(baseOptions: Apollo.QueryHookOptions<TraitByIdQuery, TraitByIdQueryVariables> & ({ variables: TraitByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TraitByIdQuery, TraitByIdQueryVariables>(TraitByIdDocument, options);
      }
export function useTraitByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TraitByIdQuery, TraitByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TraitByIdQuery, TraitByIdQueryVariables>(TraitByIdDocument, options);
        }
export function useTraitByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TraitByIdQuery, TraitByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TraitByIdQuery, TraitByIdQueryVariables>(TraitByIdDocument, options);
        }
export type TraitByIdQueryHookResult = ReturnType<typeof useTraitByIdQuery>;
export type TraitByIdLazyQueryHookResult = ReturnType<typeof useTraitByIdLazyQuery>;
export type TraitByIdSuspenseQueryHookResult = ReturnType<typeof useTraitByIdSuspenseQuery>;
export type TraitByIdQueryResult = Apollo.QueryResult<TraitByIdQuery, TraitByIdQueryVariables>;
export const CreateTraitDocument = gql`
    mutation CreateTrait($createTraitInput: CreateTraitInput!) {
  createTrait(createTraitInput: $createTraitInput) {
    ...TraitDetails
  }
}
    ${TraitDetailsFragmentDoc}`;
export type CreateTraitMutationFn = Apollo.MutationFunction<CreateTraitMutation, CreateTraitMutationVariables>;

/**
 * __useCreateTraitMutation__
 *
 * To run a mutation, you first call `useCreateTraitMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTraitMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTraitMutation, { data, loading, error }] = useCreateTraitMutation({
 *   variables: {
 *      createTraitInput: // value for 'createTraitInput'
 *   },
 * });
 */
export function useCreateTraitMutation(baseOptions?: Apollo.MutationHookOptions<CreateTraitMutation, CreateTraitMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTraitMutation, CreateTraitMutationVariables>(CreateTraitDocument, options);
      }
export type CreateTraitMutationHookResult = ReturnType<typeof useCreateTraitMutation>;
export type CreateTraitMutationResult = Apollo.MutationResult<CreateTraitMutation>;
export type CreateTraitMutationOptions = Apollo.BaseMutationOptions<CreateTraitMutation, CreateTraitMutationVariables>;
export const UpdateTraitDocument = gql`
    mutation UpdateTrait($id: ID!, $updateTraitInput: UpdateTraitInput!) {
  updateTrait(id: $id, updateTraitInput: $updateTraitInput) {
    ...TraitDetails
  }
}
    ${TraitDetailsFragmentDoc}`;
export type UpdateTraitMutationFn = Apollo.MutationFunction<UpdateTraitMutation, UpdateTraitMutationVariables>;

/**
 * __useUpdateTraitMutation__
 *
 * To run a mutation, you first call `useUpdateTraitMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTraitMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTraitMutation, { data, loading, error }] = useUpdateTraitMutation({
 *   variables: {
 *      id: // value for 'id'
 *      updateTraitInput: // value for 'updateTraitInput'
 *   },
 * });
 */
export function useUpdateTraitMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTraitMutation, UpdateTraitMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTraitMutation, UpdateTraitMutationVariables>(UpdateTraitDocument, options);
      }
export type UpdateTraitMutationHookResult = ReturnType<typeof useUpdateTraitMutation>;
export type UpdateTraitMutationResult = Apollo.MutationResult<UpdateTraitMutation>;
export type UpdateTraitMutationOptions = Apollo.BaseMutationOptions<UpdateTraitMutation, UpdateTraitMutationVariables>;
export const DeleteTraitDocument = gql`
    mutation DeleteTrait($id: ID!) {
  removeTrait(id: $id) {
    removed
    message
  }
}
    `;
export type DeleteTraitMutationFn = Apollo.MutationFunction<DeleteTraitMutation, DeleteTraitMutationVariables>;

/**
 * __useDeleteTraitMutation__
 *
 * To run a mutation, you first call `useDeleteTraitMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTraitMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTraitMutation, { data, loading, error }] = useDeleteTraitMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTraitMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTraitMutation, DeleteTraitMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTraitMutation, DeleteTraitMutationVariables>(DeleteTraitDocument, options);
      }
export type DeleteTraitMutationHookResult = ReturnType<typeof useDeleteTraitMutation>;
export type DeleteTraitMutationResult = Apollo.MutationResult<DeleteTraitMutation>;
export type DeleteTraitMutationOptions = Apollo.BaseMutationOptions<DeleteTraitMutation, DeleteTraitMutationVariables>;
export const SearchTagsDocument = gql`
    query SearchTags($search: String, $limit: Float) {
  searchTags(search: $search, limit: $limit) {
    id
    name
    displayName
    category
    color
    createdAt
  }
}
    `;

/**
 * __useSearchTagsQuery__
 *
 * To run a query within a React component, call `useSearchTagsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchTagsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchTagsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useSearchTagsQuery(baseOptions?: Apollo.QueryHookOptions<SearchTagsQuery, SearchTagsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchTagsQuery, SearchTagsQueryVariables>(SearchTagsDocument, options);
      }
export function useSearchTagsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchTagsQuery, SearchTagsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchTagsQuery, SearchTagsQueryVariables>(SearchTagsDocument, options);
        }
export function useSearchTagsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchTagsQuery, SearchTagsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchTagsQuery, SearchTagsQueryVariables>(SearchTagsDocument, options);
        }
export type SearchTagsQueryHookResult = ReturnType<typeof useSearchTagsQuery>;
export type SearchTagsLazyQueryHookResult = ReturnType<typeof useSearchTagsLazyQuery>;
export type SearchTagsSuspenseQueryHookResult = ReturnType<typeof useSearchTagsSuspenseQuery>;
export type SearchTagsQueryResult = Apollo.QueryResult<SearchTagsQuery, SearchTagsQueryVariables>;
export const TraitListEntriesByVariantDocument = gql`
    query TraitListEntriesByVariant($variantId: ID!, $first: Int) {
  traitListEntriesBySpeciesVariant(speciesVariantId: $variantId, first: $first) {
    nodes {
      ...TraitListEntryDetails
    }
    totalCount
    hasNextPage
  }
}
    ${TraitListEntryDetailsFragmentDoc}`;

/**
 * __useTraitListEntriesByVariantQuery__
 *
 * To run a query within a React component, call `useTraitListEntriesByVariantQuery` and pass it any options that fit your needs.
 * When your component renders, `useTraitListEntriesByVariantQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTraitListEntriesByVariantQuery({
 *   variables: {
 *      variantId: // value for 'variantId'
 *      first: // value for 'first'
 *   },
 * });
 */
export function useTraitListEntriesByVariantQuery(baseOptions: Apollo.QueryHookOptions<TraitListEntriesByVariantQuery, TraitListEntriesByVariantQueryVariables> & ({ variables: TraitListEntriesByVariantQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TraitListEntriesByVariantQuery, TraitListEntriesByVariantQueryVariables>(TraitListEntriesByVariantDocument, options);
      }
export function useTraitListEntriesByVariantLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TraitListEntriesByVariantQuery, TraitListEntriesByVariantQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TraitListEntriesByVariantQuery, TraitListEntriesByVariantQueryVariables>(TraitListEntriesByVariantDocument, options);
        }
export function useTraitListEntriesByVariantSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TraitListEntriesByVariantQuery, TraitListEntriesByVariantQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TraitListEntriesByVariantQuery, TraitListEntriesByVariantQueryVariables>(TraitListEntriesByVariantDocument, options);
        }
export type TraitListEntriesByVariantQueryHookResult = ReturnType<typeof useTraitListEntriesByVariantQuery>;
export type TraitListEntriesByVariantLazyQueryHookResult = ReturnType<typeof useTraitListEntriesByVariantLazyQuery>;
export type TraitListEntriesByVariantSuspenseQueryHookResult = ReturnType<typeof useTraitListEntriesByVariantSuspenseQuery>;
export type TraitListEntriesByVariantQueryResult = Apollo.QueryResult<TraitListEntriesByVariantQuery, TraitListEntriesByVariantQueryVariables>;
export const UpdateTraitOrdersDocument = gql`
    mutation UpdateTraitOrders($input: UpdateTraitOrdersInput!) {
  updateTraitOrders(input: $input) {
    id
    order
    trait {
      id
      name
    }
  }
}
    `;
export type UpdateTraitOrdersMutationFn = Apollo.MutationFunction<UpdateTraitOrdersMutation, UpdateTraitOrdersMutationVariables>;

/**
 * __useUpdateTraitOrdersMutation__
 *
 * To run a mutation, you first call `useUpdateTraitOrdersMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTraitOrdersMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTraitOrdersMutation, { data, loading, error }] = useUpdateTraitOrdersMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTraitOrdersMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTraitOrdersMutation, UpdateTraitOrdersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTraitOrdersMutation, UpdateTraitOrdersMutationVariables>(UpdateTraitOrdersDocument, options);
      }
export type UpdateTraitOrdersMutationHookResult = ReturnType<typeof useUpdateTraitOrdersMutation>;
export type UpdateTraitOrdersMutationResult = Apollo.MutationResult<UpdateTraitOrdersMutation>;
export type UpdateTraitOrdersMutationOptions = Apollo.BaseMutationOptions<UpdateTraitOrdersMutation, UpdateTraitOrdersMutationVariables>;
export const CreateTraitListEntryDocument = gql`
    mutation CreateTraitListEntry($input: CreateTraitListEntryInput!) {
  createTraitListEntry(createTraitListEntryInput: $input) {
    ...TraitListEntryDetails
  }
}
    ${TraitListEntryDetailsFragmentDoc}`;
export type CreateTraitListEntryMutationFn = Apollo.MutationFunction<CreateTraitListEntryMutation, CreateTraitListEntryMutationVariables>;

/**
 * __useCreateTraitListEntryMutation__
 *
 * To run a mutation, you first call `useCreateTraitListEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTraitListEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTraitListEntryMutation, { data, loading, error }] = useCreateTraitListEntryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTraitListEntryMutation(baseOptions?: Apollo.MutationHookOptions<CreateTraitListEntryMutation, CreateTraitListEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTraitListEntryMutation, CreateTraitListEntryMutationVariables>(CreateTraitListEntryDocument, options);
      }
export type CreateTraitListEntryMutationHookResult = ReturnType<typeof useCreateTraitListEntryMutation>;
export type CreateTraitListEntryMutationResult = Apollo.MutationResult<CreateTraitListEntryMutation>;
export type CreateTraitListEntryMutationOptions = Apollo.BaseMutationOptions<CreateTraitListEntryMutation, CreateTraitListEntryMutationVariables>;
export const UpdateTraitListEntryDocument = gql`
    mutation UpdateTraitListEntry($id: ID!, $input: UpdateTraitListEntryInput!) {
  updateTraitListEntry(id: $id, updateTraitListEntryInput: $input) {
    ...TraitListEntryDetails
  }
}
    ${TraitListEntryDetailsFragmentDoc}`;
export type UpdateTraitListEntryMutationFn = Apollo.MutationFunction<UpdateTraitListEntryMutation, UpdateTraitListEntryMutationVariables>;

/**
 * __useUpdateTraitListEntryMutation__
 *
 * To run a mutation, you first call `useUpdateTraitListEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTraitListEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTraitListEntryMutation, { data, loading, error }] = useUpdateTraitListEntryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTraitListEntryMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTraitListEntryMutation, UpdateTraitListEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTraitListEntryMutation, UpdateTraitListEntryMutationVariables>(UpdateTraitListEntryDocument, options);
      }
export type UpdateTraitListEntryMutationHookResult = ReturnType<typeof useUpdateTraitListEntryMutation>;
export type UpdateTraitListEntryMutationResult = Apollo.MutationResult<UpdateTraitListEntryMutation>;
export type UpdateTraitListEntryMutationOptions = Apollo.BaseMutationOptions<UpdateTraitListEntryMutation, UpdateTraitListEntryMutationVariables>;
export const RemoveTraitListEntryDocument = gql`
    mutation RemoveTraitListEntry($id: ID!) {
  removeTraitListEntry(id: $id) {
    removed
    message
  }
}
    `;
export type RemoveTraitListEntryMutationFn = Apollo.MutationFunction<RemoveTraitListEntryMutation, RemoveTraitListEntryMutationVariables>;

/**
 * __useRemoveTraitListEntryMutation__
 *
 * To run a mutation, you first call `useRemoveTraitListEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveTraitListEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeTraitListEntryMutation, { data, loading, error }] = useRemoveTraitListEntryMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveTraitListEntryMutation(baseOptions?: Apollo.MutationHookOptions<RemoveTraitListEntryMutation, RemoveTraitListEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveTraitListEntryMutation, RemoveTraitListEntryMutationVariables>(RemoveTraitListEntryDocument, options);
      }
export type RemoveTraitListEntryMutationHookResult = ReturnType<typeof useRemoveTraitListEntryMutation>;
export type RemoveTraitListEntryMutationResult = Apollo.MutationResult<RemoveTraitListEntryMutation>;
export type RemoveTraitListEntryMutationOptions = Apollo.BaseMutationOptions<RemoveTraitListEntryMutation, RemoveTraitListEntryMutationVariables>;
export const GetUserProfileDocument = gql`
    query GetUserProfile($username: String!) {
  userProfile(username: $username) {
    user {
      id
      username
      displayName
      bio
      avatarUrl
      location
      website
      isVerified
      createdAt
    }
    stats {
      charactersCount
      galleriesCount
      imagesCount
      totalViews
      totalLikes
      followersCount
      followingCount
    }
    recentCharacters {
      id
      name
      species {
        id
        name
      }
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
    }
    recentGalleries {
      id
      name
      description
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
      }
    }
    recentMedia {
      id
      title
      description
      createdAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      image {
        id
        filename
        url
        thumbnailUrl
      }
    }
    featuredCharacters {
      id
      name
      species {
        id
        name
      }
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
    }
    isOwnProfile
    canViewPrivateContent
  }
}
    `;

/**
 * __useGetUserProfileQuery__
 *
 * To run a query within a React component, call `useGetUserProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserProfileQuery({
 *   variables: {
 *      username: // value for 'username'
 *   },
 * });
 */
export function useGetUserProfileQuery(baseOptions: Apollo.QueryHookOptions<GetUserProfileQuery, GetUserProfileQueryVariables> & ({ variables: GetUserProfileQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserProfileQuery, GetUserProfileQueryVariables>(GetUserProfileDocument, options);
      }
export function useGetUserProfileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserProfileQuery, GetUserProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserProfileQuery, GetUserProfileQueryVariables>(GetUserProfileDocument, options);
        }
export function useGetUserProfileSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserProfileQuery, GetUserProfileQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserProfileQuery, GetUserProfileQueryVariables>(GetUserProfileDocument, options);
        }
export type GetUserProfileQueryHookResult = ReturnType<typeof useGetUserProfileQuery>;
export type GetUserProfileLazyQueryHookResult = ReturnType<typeof useGetUserProfileLazyQuery>;
export type GetUserProfileSuspenseQueryHookResult = ReturnType<typeof useGetUserProfileSuspenseQuery>;
export type GetUserProfileQueryResult = Apollo.QueryResult<GetUserProfileQuery, GetUserProfileQueryVariables>;
export const GetUserStatsDocument = gql`
    query GetUserStats($userId: ID!) {
  userStats(userId: $userId) {
    charactersCount
    galleriesCount
    imagesCount
    totalViews
    totalLikes
    followersCount
    followingCount
  }
}
    `;

/**
 * __useGetUserStatsQuery__
 *
 * To run a query within a React component, call `useGetUserStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserStatsQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetUserStatsQuery(baseOptions: Apollo.QueryHookOptions<GetUserStatsQuery, GetUserStatsQueryVariables> & ({ variables: GetUserStatsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserStatsQuery, GetUserStatsQueryVariables>(GetUserStatsDocument, options);
      }
export function useGetUserStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserStatsQuery, GetUserStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserStatsQuery, GetUserStatsQueryVariables>(GetUserStatsDocument, options);
        }
export function useGetUserStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserStatsQuery, GetUserStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserStatsQuery, GetUserStatsQueryVariables>(GetUserStatsDocument, options);
        }
export type GetUserStatsQueryHookResult = ReturnType<typeof useGetUserStatsQuery>;
export type GetUserStatsLazyQueryHookResult = ReturnType<typeof useGetUserStatsLazyQuery>;
export type GetUserStatsSuspenseQueryHookResult = ReturnType<typeof useGetUserStatsSuspenseQuery>;
export type GetUserStatsQueryResult = Apollo.QueryResult<GetUserStatsQuery, GetUserStatsQueryVariables>;
export const UpdateProfileDocument = gql`
    mutation UpdateProfile($input: UpdateUserInput!) {
  updateProfile(input: $input) {
    id
    username
    displayName
    bio
    avatarUrl
    location
    website
    dateOfBirth
    isVerified
    createdAt
    updatedAt
  }
}
    `;
export type UpdateProfileMutationFn = Apollo.MutationFunction<UpdateProfileMutation, UpdateProfileMutationVariables>;

/**
 * __useUpdateProfileMutation__
 *
 * To run a mutation, you first call `useUpdateProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfileMutation, { data, loading, error }] = useUpdateProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfileMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProfileMutation, UpdateProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProfileMutation, UpdateProfileMutationVariables>(UpdateProfileDocument, options);
      }
export type UpdateProfileMutationHookResult = ReturnType<typeof useUpdateProfileMutation>;
export type UpdateProfileMutationResult = Apollo.MutationResult<UpdateProfileMutation>;
export type UpdateProfileMutationOptions = Apollo.BaseMutationOptions<UpdateProfileMutation, UpdateProfileMutationVariables>;