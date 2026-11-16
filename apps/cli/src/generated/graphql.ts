import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
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
  JSON: { input: unknown; output: unknown; }
};

export type ActivityFeedInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type ApproveImageInput = {
  /** Who to pay and how much. Requires canGrantItems; recipients who are not members of the community are skipped rather than refused. */
  awards?: InputMaybe<Array<ImageAwardInput>>;
  /** Required when awards are given. Must belong to this community. */
  currencyId?: InputMaybe<Scalars['ID']['input']>;
  /** The ID of the image to approve */
  imageId: Scalars['ID']['input'];
  /** Staff-only note recorded on the reward's ledger rows. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

export type ApproveTraitReviewInput = {
  /** The ID of the review to approve */
  reviewId: Scalars['ID']['input'];
};

export type AssignCharacterSpeciesInput = {
  /** The character's initial forms */
  forms?: InputMaybe<Array<NewCharacterFormInput>>;
  /** Official registry identifier for this character within its species */
  registryId?: InputMaybe<Scalars['String']['input']>;
  /** Species ID to assign to the character */
  speciesId: Scalars['ID']['input'];
  /** Species variant ID */
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
};

export type BurnCurrencyInput = {
  /** How much to remove, as a positive number. */
  amount: Scalars['Int']['input'];
  currencyId: Scalars['ID']['input'];
  /** Member-facing. Required, because it is public. */
  reason: Scalars['String']['input'];
  staffNote?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};

export type ChangeCharacterVariantWithItemInput = {
  /** The character to move. Must be yours. */
  characterId: Scalars['ID']['input'];
  /** The forms to add, change or remove. What the character ends up with must be valid for the variant the item moves it to, which is not necessarily the one it is valid for now. */
  forms: CharacterFormsChangeInput;
  /** The item to redeem. */
  itemId: Scalars['ID']['input'];
};

/** A way an owner has said they are open to being asked about a character. All are advertisements except TRADE_CHARACTERS, which the trade system enforces. */
export enum CharacterAvailability {
  ForSale = 'FOR_SALE',
  ForSaleCoin = 'FOR_SALE_COIN',
  Freebie = 'FREEBIE',
  Offers = 'OFFERS',
  TradeArt = 'TRADE_ART',
  TradeCharacters = 'TRADE_CHARACTERS'
}

export type CharacterFiltersInput = {
  /** Any of these, not all -- a row of checkboxes. An empty or omitted list is no filter rather than one matching nothing. */
  availability?: InputMaybe<Array<CharacterAvailability>>;
  communityId?: InputMaybe<Scalars['ID']['input']>;
  /** Characters filed directly in this folder. Sub-folders are not included -- opening a folder shows what is in it, the way a file browser does. A private folder answers only to its owner. */
  folderId?: InputMaybe<Scalars['ID']['input']>;
  /** @deprecated Use `availability: [TRADE_CHARACTERS]`. Kept because it is the only one of these that can also ask for the negative. */
  isSellable?: InputMaybe<Scalars['Boolean']['input']>;
  /** @deprecated Use `availability: [TRADE_CHARACTERS]`. Kept because it is the only one of these that can also ask for the negative. */
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
  /** Characters in no folder at all: the root of your workspace, and the pile that empties as you file. Yours only -- it describes how you have organised things, which is not a question anyone else can ask. */
  unfiled?: InputMaybe<Scalars['Boolean']['input']>;
  visibility?: InputMaybe<Visibility>;
};

/** Changes to a character's forms */
export type CharacterFormsChangeInput = {
  newForms?: InputMaybe<Array<NewCharacterFormInput>>;
  /** Forms to delete. A character must keep at least one, so removing them all is refused. */
  removeForms?: InputMaybe<Array<Scalars['ID']['input']>>;
  updateForms?: InputMaybe<Array<UpdateCharacterFormInput>>;
};

/** Input for setting a character trait value */
export type CharacterTraitValueInput = {
  /** Optional free-text clarifier displayed parenthetically with the value */
  clarifier?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the trait */
  traitId: Scalars['ID']['input'];
  /** The value of the trait */
  value?: InputMaybe<Scalars['String']['input']>;
};

export type CheckoutInput = {
  communityId: Scalars['ID']['input'];
  /** The cart. Prices are re-read server-side; this only says which option was picked, never what it costs. */
  lines: Array<CheckoutLineInputDto>;
};

export type CheckoutLineInputDto = {
  /** At most ten. The same limit applies across lines. */
  quantity: Scalars['Int']['input'];
  shopItemId: Scalars['ID']['input'];
  /** Which price option was chosen. */
  shopPriceId: Scalars['ID']['input'];
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

export type CreateCharacterFolderInput = {
  /** Hide it, and everything under it, from everyone else. */
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Folder name, as it should be displayed. */
  name: Scalars['String']['input'];
  /** Folder to nest inside. Omit for a folder at the root. */
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateCharacterInput = {
  /** Whether to assign ownership to the creator. Set to false to create an orphaned character. */
  assignToSelf?: Scalars['Boolean']['input'];
  customFields?: InputMaybe<Scalars['String']['input']>;
  details?: InputMaybe<Scalars['String']['input']>;
  /** The character's forms. Omit for a character with one form named Base and no traits. */
  forms?: Array<NewCharacterFormInput>;
  isFreebie?: Scalars['Boolean']['input'];
  isOpenToOffers?: Scalars['Boolean']['input'];
  isSellable?: Scalars['Boolean']['input'];
  isSellableForCoin?: Scalars['Boolean']['input'];
  isTradeable?: Scalars['Boolean']['input'];
  isTradeableForArt?: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  /** Create the character owned by this member of the species' community rather than by its creator. Requires canCreateOrphanedCharacter, and cannot be combined with pendingOwner or assignToSelf: false. */
  ownerId?: InputMaybe<Scalars['ID']['input']>;
  /** Create character with pending ownership for an external account */
  pendingOwner?: InputMaybe<PendingOwnerInput>;
  price?: InputMaybe<Scalars['Float']['input']>;
  /** Official registry identifier for this character within its species */
  registryId?: InputMaybe<Scalars['String']['input']>;
  speciesId?: InputMaybe<Scalars['ID']['input']>;
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
  tags?: Array<Scalars['String']['input']>;
  /** Source for the trait review. Defaults to CREATION. */
  traitReviewSource?: InputMaybe<TraitReviewSource>;
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

export type CreateCommunityColorInput = {
  communityId: Scalars['ID']['input'];
  hexCode: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateCommunityInput = {
  /** Name of the community */
  name: Scalars['String']['input'];
  /** Subdomain label for the community -- `cloverse` in `cloverse.chardb.cc`. Permanent once set. */
  slug: Scalars['String']['input'];
};

/** Input for creating a new community invitation */
export type CreateCommunityInvitationInput = {
  /** The ID of the community the invitation is for */
  communityId: Scalars['ID']['input'];
  /** The ID of the user being invited */
  inviteeId: Scalars['ID']['input'];
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

export type CreateCurrencyInput = {
  /** Short display code, unique within the community. Letters and digits only, stored uppercase. */
  code: Scalars['String']['input'];
  colorId?: InputMaybe<Scalars['ID']['input']>;
  communityId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  /** Whether members may hand this to each other. Defaults to true, which is what a currency normally is. */
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  symbol?: InputMaybe<Scalars['String']['input']>;
};

export type CreateEnumValueInput = {
  /** ID of the color for this enum value */
  colorId?: InputMaybe<Scalars['ID']['input']>;
  /** Name/display text of this enum value */
  name: Scalars['String']['input'];
  /** Display order within the trait's enum values. Left out, the value goes after the trait's existing ones. */
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

export type CreateHalloweenPrizeInput = {
  characterId?: InputMaybe<Scalars['String']['input']>;
  /** Short name for the prize, e.g. myo-common */
  id: Scalars['String']['input'];
  /** For a prize staff hand over themselves only */
  image?: InputMaybe<Scalars['String']['input']>;
  itemTypeId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  stock: Scalars['Int']['input'];
  weight?: InputMaybe<Scalars['Int']['input']>;
};

/** Input for creating a new invite code */
export type CreateInviteCodeInput = {
  /** The invite code string (alphanumeric and hyphens only) */
  id: Scalars['String']['input'];
  /** Maximum number of times this invite code can be claimed */
  maxClaims: Scalars['Int']['input'];
  /** The ID of the role to grant when this invite code is used */
  roleId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateItemTypeInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  colorId?: InputMaybe<Scalars['ID']['input']>;
  communityId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  imageId?: InputMaybe<Scalars['ID']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isConsumable?: Scalars['Boolean']['input'];
  isTradeable?: Scalars['Boolean']['input'];
  metadata?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreatePersonalAccessTokenInput = {
  communities: Array<PersonalAccessTokenGrantInput>;
  expiresInDays: Scalars['Int']['input'];
  name: Scalars['String']['input'];
};

/** Input for creating a new role */
export type CreateRoleInput = {
  /** Whether members with this role can create new characters */
  canCreateCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can create invite codes */
  canCreateInviteCode?: Scalars['Boolean']['input'];
  /** Whether members with this role can create orphaned characters */
  canCreateOrphanedCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can create new roles */
  canCreateRole?: Scalars['Boolean']['input'];
  /** Whether members with this role can create new species */
  canCreateSpecies?: Scalars['Boolean']['input'];
  /** Whether members with this role can delete characters in this community */
  canDeleteCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit characters */
  canEditCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit registry fields (variant, traits) on any character */
  canEditCharacterRegistry?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit their own characters */
  canEditOwnCharacter?: Scalars['Boolean']['input'];
  /** Whether members with this role can edit registry fields (variant, traits) on their own characters */
  canEditOwnCharacterRegistry?: Scalars['Boolean']['input'];
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
  /** Whether members with this role can review and approve/reject uploaded images */
  canModerateImages?: Scalars['Boolean']['input'];
  /** Whether members with this role can remove community members */
  canRemoveCommunityMember?: Scalars['Boolean']['input'];
  /** Whether members with this role can upload images to any character */
  canUploadCharacterImages?: Scalars['Boolean']['input'];
  /** Whether members with this role can upload images to their own characters */
  canUploadOwnCharacterImages?: Scalars['Boolean']['input'];
  /** The ID of the community this role belongs to */
  communityId: Scalars['ID']['input'];
  /** The name of the role */
  name: Scalars['String']['input'];
};

export type CreateShopItemInput = {
  communityId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  /** What buying this grants. */
  itemTypeId: Scalars['ID']['input'];
  /** Omit for no cap. */
  maxPerUser?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** At least one, or nobody can buy it. */
  prices: Array<ShopPriceInput>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  /** Omit for unlimited. */
  stock?: InputMaybe<Scalars['Int']['input']>;
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
  /** ID of the color for this species variant */
  colorId?: InputMaybe<Scalars['ID']['input']>;
  /** How many forms a character on this variant may have. One means the variant does not do forms. */
  maxForms?: Scalars['Int']['input'];
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

export type CreateTradeInput = {
  coin?: Array<TradeCoinInput>;
  communityId: Scalars['ID']['input'];
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  offering?: Array<OfferedTradeItemInput>;
  /** Characters the proposer hands over. Each must be theirs, open to trades, and in this community by way of its species. */
  offeringCharacters?: Array<TradeCharacterInput>;
  recipientId: Scalars['ID']['input'];
  requesting?: Array<RequestedTradeItemInput>;
  /** Characters the proposer asks for. Each must be the recipient's, and open to trades -- the flag is the owner's standing answer to being asked, and it is honoured again at settlement. */
  requestingCharacters?: Array<TradeCharacterInput>;
};

export type CreateTraitInput = {
  /** Whether this trait allows an optional free-text clarifier on each value */
  allowsClarifier?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether this trait allows multiple values per character */
  allowsMultipleValues?: InputMaybe<Scalars['Boolean']['input']>;
  /** ID of the color for this trait */
  colorId?: InputMaybe<Scalars['ID']['input']>;
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

export type CurrencyTransactionFiltersInput = {
  /** Required. A statement is always scoped to one community. */
  communityId: Scalars['ID']['input'];
  currencyId?: InputMaybe<Scalars['ID']['input']>;
  /** Match any of these kinds. Omit for all kinds. */
  kinds?: InputMaybe<Array<CurrencyTransactionKind>>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  /** Matches currency name and public reason. Never searches staff notes -- a member must not be able to probe for hidden text. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Matches rows where this user owns the row, is the counterparty, or is the actor. */
  userId?: InputMaybe<Scalars['ID']['input']>;
};

/** How currency moved. */
export enum CurrencyTransactionKind {
  /** Removed from a member's balance by staff, as a correction or a penalty. */
  Burn = 'BURN',
  /** Written by a migration for a balance that predates this ledger. */
  Import = 'IMPORT',
  /** Created into a member's balance by staff. Coin has no other source. */
  Mint = 'MINT',
  /** Spent by the member at a sink. Leaves circulation; there is no treasury. */
  Spend = 'SPEND',
  /** Moved between two members. Writes one row per side, sharing a batch id. */
  Transfer = 'TRANSFER'
}

/** What caused a currency movement. */
export enum CurrencyTransactionSource {
  /** Somebody acted directly, with no other record behind it. */
  Direct = 'DIRECT',
  ItemUse = 'ITEM_USE',
  /** Awarded when uploaded media was approved in moderation. sourceId is the media -- an image is an implementation detail of a media. */
  MediaApproval = 'MEDIA_APPROVAL',
  /** Minted to an external account before it had a user here, and claimed when its person linked it and joined. sourceId is the pending ownership row, which keeps when it was minted. */
  PendingGrant = 'PENDING_GRANT',
  ShopPurchase = 'SHOP_PURCHASE'
}

export type DeferImageInput = {
  /** The ID of the image to send to the back of the queue */
  imageId: Scalars['ID']['input'];
  /** Why this image is being passed on, shown to the next moderator who reaches it */
  note?: InputMaybe<Scalars['String']['input']>;
};

export type DeferTraitReviewInput = {
  /** Why this review is being passed on, shown to the next moderator who reaches it */
  note?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the review to send to the back of the queue */
  reviewId: Scalars['ID']['input'];
};

export type EditAndApproveTraitReviewInput = {
  /** The corrected forms to apply: the character's complete list, in order, not a patch */
  correctedForms: Array<NewCharacterFormInput>;
  /** The ID of the review to edit and approve */
  reviewId: Scalars['ID']['input'];
};

export type EditCharacterTraitsWithKitInput = {
  /** The character to change. Must be yours. */
  characterId: Scalars['ID']['input'];
  /** The forms to add, change or remove. Nothing is applied until staff approve, so this describes what the character would become. */
  forms: CharacterFormsChangeInput;
  /** The kit to spend. */
  itemId: Scalars['ID']['input'];
};

/** Where an offer stands with the clock applied. A PENDING trade past its expiresAt reports EXPIRED and will not settle. */
export enum EffectiveTradeStatus {
  Accepted = 'ACCEPTED',
  Cancelled = 'CANCELLED',
  Declined = 'DECLINED',
  Expired = 'EXPIRED',
  Pending = 'PENDING'
}

/** The external account provider type */
export enum ExternalAccountProvider {
  Deviantart = 'DEVIANTART',
  Discord = 'DISCORD',
  Patreon = 'PATREON',
  Toyhouse = 'TOYHOUSE'
}

export type ForgotPasswordInput = {
  email: Scalars['String']['input'];
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
  /** Create item with pending ownership for an external account */
  pendingOwner?: InputMaybe<PendingOwnerInput>;
  /** How many to create. At most 100. */
  quantity?: Scalars['Int']['input'];
  /** Member-facing note recorded on the ledger. Visible to anyone who can read the community's item history. */
  reason?: InputMaybe<Scalars['String']['input']>;
  /** Staff-only detail recorded on the ledger. Never shown to members. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
  /** User ID to grant item to. Required if pendingOwner is not provided. */
  userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Stick a candy from the tray, or the nameplate, on the board, on top of the pile. Ranges as on HalloweenCandyPlacement. */
export type HalloweenCandyAddInput = {
  /** 0 unless given */
  rotation?: InputMaybe<Scalars['Float']['input']>;
  /** 1 unless given */
  scale?: InputMaybe<Scalars['Float']['input']>;
  sticker: HalloweenStickerInput;
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

/** How to dim and tint your board's background */
export type HalloweenCandyBackgroundEffectsInput = {
  dim: Scalars['Float']['input'];
  saturation: Scalars['Float']['input'];
  tint?: InputMaybe<Scalars['String']['input']>;
  tintStrength: Scalars['Float']['input'];
};

/** One change to your board: exactly one of these */
export type HalloweenCandyBoardAction =
  { add: HalloweenCandyAddInput; backward?: never; edit?: never; forward?: never; lower?: never; raise?: never; remove?: never; }
  |  /** Move a sticker one place down the pile; the bottom one stays where it is */
  { add?: never; backward: HalloweenStickerInput; edit?: never; forward?: never; lower?: never; raise?: never; remove?: never; }
  |  { add?: never; backward?: never; edit: HalloweenCandyEditInput; forward?: never; lower?: never; raise?: never; remove?: never; }
  |  /** Move a sticker one place up the pile; the top one stays where it is */
  { add?: never; backward?: never; edit?: never; forward: HalloweenStickerInput; lower?: never; raise?: never; remove?: never; }
  |  /** Move a sticker on the board to the bottom of the pile */
  { add?: never; backward?: never; edit?: never; forward?: never; lower: HalloweenStickerInput; raise?: never; remove?: never; }
  |  /** Move a sticker on the board to the top of the pile */
  { add?: never; backward?: never; edit?: never; forward?: never; lower?: never; raise: HalloweenStickerInput; remove?: never; }
  |  /** Take a sticker off the board, back to the tray */
  { add?: never; backward?: never; edit?: never; forward?: never; lower?: never; raise?: never; remove: HalloweenStickerInput; };

/** A name for your board, its words from the word lists in @chardb/shared */
export type HalloweenCandyBoardNameInput = {
  first: Scalars['String']['input'];
  joiner?: InputMaybe<Scalars['String']['input']>;
  last: Scalars['String']['input'];
};

/** Change where a sticker on the board sits, its turn or its size. Only the fields given change, and at least one must be. */
export type HalloweenCandyEditInput = {
  rotation?: InputMaybe<Scalars['Float']['input']>;
  scale?: InputMaybe<Scalars['Float']['input']>;
  sticker: HalloweenStickerInput;
  x?: InputMaybe<Scalars['Float']['input']>;
  y?: InputMaybe<Scalars['Float']['input']>;
};

/** Where to put the light over your board */
export type HalloweenCandyLightingInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  colourStrength: Scalars['Float']['input'];
  cone: Scalars['Float']['input'];
  height: Scalars['Float']['input'];
  intensity: Scalars['Float']['input'];
  spotlight: Scalars['Float']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export enum HalloweenCandyOfferStatus {
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
  Filled = 'FILLED',
  Open = 'OPEN'
}

export enum HalloweenDoorClosedReason {
  AlreadyKnocked = 'ALREADY_KNOCKED',
  NotAMember = 'NOT_A_MEMBER',
  NoKnocksLeft = 'NO_KNOCKS_LEFT',
  OwnDoor = 'OWN_DOOR'
}

/** How a Halloween prize reaches its winner */
export enum HalloweenPrizeDelivery {
  ChardbCharacter = 'CHARDB_CHARACTER',
  ChardbItem = 'CHARDB_ITEM',
  Staff = 'STAFF'
}

export type HalloweenSettingsInput = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  knocksPerDay: Scalars['Int']['input'];
  /** Hour of the day, US Central, 0-23 */
  resetTime: Scalars['Int']['input'];
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  /** Discord channel id wins are also announced in */
  winChannel?: InputMaybe<Scalars['String']['input']>;
  /** Chance of a knock winning, 0-1 */
  winRate: Scalars['Float']['input'];
};

/** A sticker on your board: exactly one of a candy, by its id, or the nameplate (true) */
export type HalloweenStickerInput =
  { candy: Scalars['Int']['input']; nameplate?: never; }
  |  { candy?: never; nameplate: Scalars['Boolean']['input']; };

/** Which Halloween wins to list */
export enum HalloweenWinFilter {
  All = 'ALL',
  Delivered = 'DELIVERED',
  NeedsDelivery = 'NEEDS_DELIVERY'
}

export enum HalloweenWinnerKind {
  Anonymous = 'ANONYMOUS',
  Discord = 'DISCORD',
  Member = 'MEMBER'
}

export type ImageAwardInput = {
  /** Positive. Omit the entry to pay nothing. */
  amount: Scalars['Int']['input'];
  userId: Scalars['ID']['input'];
};

/** A thumbnail framing rect, in the original image's pixels after EXIF rotation is applied. Send back what the cropper measured against the rendered image; the server checks it fits before rendering anything. */
export type ImageCropInput = {
  height: Scalars['Int']['input'];
  width: Scalars['Int']['input'];
  x: Scalars['Int']['input'];
  y: Scalars['Int']['input'];
};

export type ImageModerationQueueFiltersInput = {
  /** Filter images uploaded after this date */
  uploadedAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter images uploaded before this date */
  uploadedBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by uploader ID */
  uploaderId?: InputMaybe<Scalars['ID']['input']>;
};

export type ItemTransactionFiltersInput = {
  /** Required. The ledger is always scoped to one community. */
  communityId: Scalars['ID']['input'];
  itemId?: InputMaybe<Scalars['ID']['input']>;
  itemTypeId?: InputMaybe<Scalars['ID']['input']>;
  /** Match any of these kinds. Omit for all kinds. */
  kinds?: InputMaybe<Array<ItemTransactionKind>>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  /** Matches item type name, public reason, and actor label. Never searches staff notes -- a member must not be able to probe for hidden text. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Matches rows where this user is the source, the recipient, or the actor. */
  userId?: InputMaybe<Scalars['ID']['input']>;
};

/** How an item moved. */
export enum ItemTransactionKind {
  /** Released from pending ownership once an external account was linked. */
  Claim = 'CLAIM',
  /** Minted by staff or a bot and given to someone. */
  Grant = 'GRANT',
  Import = 'IMPORT',
  /** Taken back and destroyed. Always a correction. */
  Revoke = 'REVOKE',
  /** Moved between two members. */
  Transfer = 'TRANSFER',
  /** Consumed by its holder. */
  Use = 'USE'
}

export type ItemTypeFiltersInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  communityId?: InputMaybe<Scalars['ID']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};

/** One currency and how much of it using this item pays. Name each currency once; say the total rather than listing it twice. */
export type ItemUsePayoutComponentInput = {
  amount: Scalars['Int']['input'];
  currencyId: Scalars['ID']['input'];
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

/** How a person is connected to a piece of media. */
export enum MediaAwardRelation {
  Artist = 'ARTIST',
  CharacterOwner = 'CHARACTER_OWNER',
  MediaOwner = 'MEDIA_OWNER',
  Uploader = 'UPLOADER'
}

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

/** The type of media content for filtering */
export enum MediaType {
  Image = 'IMAGE',
  Text = 'TEXT'
}

export type MintCurrencyInput = {
  /** How much each named member receives. Positive. */
  amount: Scalars['Int']['input'];
  currencyId: Scalars['ID']['input'];
  /** External accounts who receive it: a Discord id or username, or a DeviantArt handle. An account linked by a member here is paid at once; any other waits on the account until its person links it and joins. */
  pendingOwners?: InputMaybe<Array<PendingOwnerInput>>;
  /** Member-facing. Required, because it is public. */
  reason: Scalars['String']['input'];
  staffNote?: InputMaybe<Scalars['String']['input']>;
  /** Members who receive it. With pendingOwners, at least one recipient in all. */
  userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** The reason for rejecting an image */
export enum ModerationRejectionReason {
  CopyrightIssue = 'COPYRIGHT_ISSUE',
  NsfwNotTagged = 'NSFW_NOT_TAGGED',
  Other = 'OTHER',
  SpamLowQuality = 'SPAM_LOW_QUALITY',
  TosViolation = 'TOS_VIOLATION'
}

/** The moderation status of an image */
export enum ModerationStatus {
  Approved = 'APPROVED',
  Cancelled = 'CANCELLED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

/** Reparent a folder, reorder it among its siblings, or both. One input because dropping a folder in the browser can mean either, and the drop target decides which. */
export type MoveCharacterFolderInput = {
  id: Scalars['ID']['input'];
  /** Where among its new siblings it lands, counting from 0. Omit to put it last. Supplying this fixes the order of that whole sibling group, which until then was alphabetical. */
  index?: InputMaybe<Scalars['Int']['input']>;
  /** The new parent. Null moves the folder to the root; omitting it leaves the parent alone. */
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

/** File characters. With `fromFolderId` this is a move; without one it is an add that leaves existing folders alone. A null `toFolderId` with a `fromFolderId` returns them to the root. */
export type MoveCharactersToFolderInput = {
  /** All must be yours -- the call is refused rather than partly applied if any is not. */
  characterIds: Array<Scalars['ID']['input']>;
  fromFolderId?: InputMaybe<Scalars['ID']['input']>;
  toFolderId?: InputMaybe<Scalars['ID']['input']>;
};

/** A form to add to a character */
export type NewCharacterFormInput = {
  /** What the owner calls this form */
  name: Scalars['String']['input'];
  /** Where this form should sit, from 0. Omit to put it after the character's existing forms. */
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The complete trait set for this form */
  traitValues: Array<CharacterTraitValueInput>;
};

/** How a notification reaches someone. Transactional mail -- password reset and password changed -- is not addressable here: it has no kind, so it has no preference and cannot be switched off. */
export enum NotificationChannel {
  Email = 'EMAIL',
  InApp = 'IN_APP'
}

/** What happened. Determines which of the snapshot fields below are set. */
export enum NotificationKind {
  CharacterAvailabilityChanged = 'CHARACTER_AVAILABILITY_CHANGED',
  CommentReceived = 'COMMENT_RECEIVED',
  CurrencyReceived = 'CURRENCY_RECEIVED',
  FollowReceived = 'FOLLOW_RECEIVED',
  HalloweenCandyTraded = 'HALLOWEEN_CANDY_TRADED',
  HalloweenDoorKnocked = 'HALLOWEEN_DOOR_KNOCKED',
  ImageApproved = 'IMAGE_APPROVED',
  ImageRejected = 'IMAGE_REJECTED',
  ItemGranted = 'ITEM_GRANTED',
  ItemRevoked = 'ITEM_REVOKED',
  TradeAccepted = 'TRADE_ACCEPTED',
  TradeDeclined = 'TRADE_DECLINED',
  TradeOffered = 'TRADE_OFFERED'
}

/** What clicking the notification opens. Paired with subjectId, and null on notifications that link nowhere. */
export enum NotificationSubjectType {
  Character = 'CHARACTER',
  Comment = 'COMMENT',
  Currency = 'CURRENCY',
  Gallery = 'GALLERY',
  HalloweenCandyTrade = 'HALLOWEEN_CANDY_TRADE',
  HalloweenDoorKnock = 'HALLOWEEN_DOOR_KNOCK',
  Image = 'IMAGE',
  Item = 'ITEM',
  Media = 'MEDIA',
  Trade = 'TRADE',
  User = 'USER'
}

/** A row the proposer hands over. Always a specific item: the proposer is at the composer, so they are the giver who gets to choose. */
export type OfferedTradeItemInput = {
  itemId: Scalars['ID']['input'];
};

export type OwnerIdUpdate = {
  /** Set owner ID (null = orphan character) */
  set?: InputMaybe<Scalars['ID']['input']>;
};

export type PendingOwnerInput = {
  /** The external account provider. PATREON is refused: it cannot be a pending owner. */
  provider: ExternalAccountProvider;
  /** The account identifier on the external provider (Discord user ID, DeviantArt username, etc.) */
  providerAccountId: Scalars['String']['input'];
};

export type PendingOwnerUpdate = {
  /** Set pending owner (null = clear pending owner) */
  set?: InputMaybe<PendingOwnerInput>;
};

export type PersonalAccessTokenGrantInput = {
  communityId: Scalars['ID']['input'];
  member: Scalars['Boolean']['input'];
  permissions: Array<Scalars['String']['input']>;
};

export type RedeemMyoTicketInput = {
  /** A JSON document, carried as a string, as elsewhere. */
  customFields?: InputMaybe<Scalars['String']['input']>;
  details?: InputMaybe<Scalars['String']['input']>;
  /** The character's forms. How many are allowed comes from the variant the ticket is being spent on. */
  forms?: Array<NewCharacterFormInput>;
  /** The ticket to spend. */
  itemId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  /** Which of the variants this ticket allows. Checked against the ticket's grant, not merely against the species. */
  speciesVariantId: Scalars['ID']['input'];
  tags?: Array<Scalars['String']['input']>;
  visibility?: Visibility;
};

export type RejectImageInput = {
  /** The ID of the image to reject */
  imageId: Scalars['ID']['input'];
  /** The reason for rejection */
  reason: ModerationRejectionReason;
  /** Additional details about the rejection (required when reason is OTHER) */
  reasonText?: InputMaybe<Scalars['String']['input']>;
};

export type ReorderEnumValuesInput = {
  /** Every one of the trait's values, in their new order */
  enumValueIds: Array<Scalars['ID']['input']>;
  /** The trait whose values are being arranged */
  traitId: Scalars['ID']['input'];
};

export type ReorderGalleriesInput = {
  galleryIds: Array<Scalars['ID']['input']>;
};

export type ReorderSpeciesVariantsInput = {
  /** The species whose variants are being arranged */
  speciesId: Scalars['ID']['input'];
  /** Every one of the species' variants, in their new order */
  variantIds: Array<Scalars['ID']['input']>;
};

/** Something the proposer asks for. Give itemTypeId and quantity for the usual case -- any rows of that type will do, and the recipient chooses which when they accept. Give itemId only when one particular item's history is the point. */
export type RequestedTradeItemInput = {
  itemId?: InputMaybe<Scalars['ID']['input']>;
  itemTypeId?: InputMaybe<Scalars['ID']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
};

export type ResendVerificationEmailInput = {
  email: Scalars['String']['input'];
};

export type ResetPasswordInput = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

/** Input for responding to a community invitation */
export type RespondToCommunityInvitationInput = {
  /** Whether to accept (true) or decline (false) the invitation */
  accept: Scalars['Boolean']['input'];
};

export type RevertTraitReviewInput = {
  /** Reason for rejection */
  reason: Scalars['String']['input'];
  /** The ID of the review to reject */
  reviewId: Scalars['ID']['input'];
};

export type SetCharacterFoldersInput = {
  characterId: Scalars['ID']['input'];
  /** The complete set of folders this character should be in. Anything not listed is removed; an empty list returns it to the root. */
  folderIds: Array<Scalars['ID']['input']>;
};

export type SetItemTypeMyoGrantInput = {
  itemTypeId: Scalars['ID']['input'];
  /** The species a ticket makes. Required unless the variant list is empty, which clears the grant. */
  speciesId?: InputMaybe<Scalars['ID']['input']>;
  /** Replaces the grant wholesale. Empty clears it. */
  speciesVariantIds: Array<Scalars['ID']['input']>;
};

export type SetItemTypeTraitEditGrantInput = {
  itemTypeId: Scalars['ID']['input'];
  /** Replaces the grant wholesale. Empty clears it. */
  species: Array<TraitEditGrantSpeciesInput>;
};

export type SetItemTypeUsePayoutInput = {
  /** Replaces the payout wholesale. Empty clears it. */
  components: Array<ItemUsePayoutComponentInput>;
  itemTypeId: Scalars['ID']['input'];
};

export type SetItemTypeVariantChangeGrantInput = {
  /** Narrow to characters that are one of these variants. Empty covers every variant of the species, and characters with no variant set. Cannot contain the destination. */
  fromVariantIds?: Array<Scalars['ID']['input']>;
  itemTypeId: Scalars['ID']['input'];
  /** What the character becomes. Null clears the grant. Its species is the species the item can be spent on. */
  toVariantId?: InputMaybe<Scalars['ID']['input']>;
};

export type SetMainMediaInput = {
  mediaId?: InputMaybe<Scalars['ID']['input']>;
};

export type ShopPriceComponentInput = {
  amount: Scalars['Int']['input'];
  currencyId: Scalars['ID']['input'];
};

/** One way to pay. Several components means one price asking for several currencies at once, not several alternative prices. */
export type ShopPriceInput = {
  components: Array<ShopPriceComponentInput>;
};

export type ShopPurchaseLineFiltersInput = {
  /** Required. A purchase history is always one community's. */
  communityId: Scalars['ID']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  /** Matches the listing's name, or its item type's name when the listing does not override it -- whichever the buyer actually saw on the card. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Omit for both. */
  status?: InputMaybe<ShopPurchaseLineStatus>;
};

/** Whether a purchase line still stands or has been refunded. */
export enum ShopPurchaseLineStatus {
  Active = 'ACTIVE',
  Refunded = 'REFUNDED'
}

export type SignupInput = {
  communityId?: InputMaybe<Scalars['ID']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  inviteCode?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
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

/** A character on the table. One shape for both directions, unlike items: an item line can ask for any copies of a type, and a character has no copies -- there is one of it, and it is the one you meant. Which side it is on is the field it arrives in. */
export type TradeCharacterInput = {
  characterId: Scalars['ID']['input'];
};

/** Coin on the table, in one direction. */
export type TradeCoinInput = {
  amount: Scalars['Int']['input'];
  currencyId: Scalars['ID']['input'];
  /** True when the proposer pays it, false when they are asking for it. Amounts in the same currency on both sides are netted. */
  fromProposer: Scalars['Boolean']['input'];
};

/** Which of your rows satisfy one by-type line. Optional -- omit it and rows are chosen for you, newest first. Supply it when one particular copy is one you would rather keep. */
export type TradeSelectionInput = {
  /** Exactly as many rows as the line's quantity. */
  itemIds: Array<Scalars['ID']['input']>;
  /** The TradeItem line being satisfied. */
  tradeItemId: Scalars['ID']['input'];
};

export type TraitEditGrantSpeciesInput = {
  speciesId: Scalars['ID']['input'];
  /** Narrow the kit to these variants. Empty covers every variant of the species, and characters with no variant set. */
  speciesVariantIds?: Array<Scalars['ID']['input']>;
};

export type TraitOrderInput = {
  /** New display order for this trait */
  order: Scalars['Int']['input'];
  /** ID of the trait */
  traitId: Scalars['ID']['input'];
};

export type TraitReviewQueueFiltersInput = {
  /** Only this character's reviews */
  characterId?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by source */
  source?: InputMaybe<TraitReviewSource>;
  /** Filter by status */
  status?: InputMaybe<ModerationStatus>;
};

/** The source that triggered a trait review */
export enum TraitReviewSource {
  Creation = 'CREATION',
  Import = 'IMPORT',
  Myo = 'MYO',
  UserEdit = 'USER_EDIT'
}

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

export type TransferCurrencyInput = {
  amount: Scalars['Int']['input'];
  currencyId: Scalars['ID']['input'];
  /** Member-facing note on the transfer. */
  reason?: InputMaybe<Scalars['String']['input']>;
  /** Who receives it. */
  toUserId: Scalars['ID']['input'];
};

export type UnlinkExternalAccountInput = {
  provider: ExternalAccountProvider;
};

export type UpdateCharacterFolderInput = {
  id: Scalars['ID']['input'];
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** A change to one of a character's existing forms */
export type UpdateCharacterFormInput = {
  /** The form to change. Must be this character's. */
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  /** Where this form should sit, from 0. Omit to leave it where it is. */
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The complete trait set this form should end up with, not a patch of it. */
  traitValues?: InputMaybe<Array<CharacterTraitValueInput>>;
};

/** Input for updating character profile fields */
export type UpdateCharacterProfileInput = {
  customFields?: InputMaybe<Scalars['String']['input']>;
  details?: InputMaybe<Scalars['String']['input']>;
  isFreebie?: InputMaybe<Scalars['Boolean']['input']>;
  isOpenToOffers?: InputMaybe<Scalars['Boolean']['input']>;
  isSellable?: InputMaybe<Scalars['Boolean']['input']>;
  isSellableForCoin?: InputMaybe<Scalars['Boolean']['input']>;
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
  isTradeableForArt?: InputMaybe<Scalars['Boolean']['input']>;
  mainMediaId?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** Update character ownership (requires canCreateOrphanedCharacter permission) */
  ownerIdUpdate?: InputMaybe<OwnerIdUpdate>;
  /** Update pending ownership (requires canCreateOrphanedCharacter permission) */
  pendingOwnerUpdate?: InputMaybe<PendingOwnerUpdate>;
  price?: InputMaybe<Scalars['Float']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  visibility?: InputMaybe<Visibility>;
};

/** Input for updating character registry fields */
export type UpdateCharacterRegistryInput = {
  /** Forms to add, change or remove. Omit to leave them alone. */
  forms?: InputMaybe<CharacterFormsChangeInput>;
  /** Official registry identifier for this character within its species */
  registryId?: InputMaybe<Scalars['String']['input']>;
  /** Species variant ID */
  speciesVariantId?: InputMaybe<Scalars['ID']['input']>;
  /** Why the variant changed — 'upgrade ticket #204', say. Recorded on the rarity history and ignored when the variant is not changing. */
  variantChangeReason?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCommentInput = {
  content: Scalars['String']['input'];
};

export type UpdateCommunityColorInput = {
  hexCode?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
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

export type UpdateCurrencyInput = {
  /** Archive or restore. An archived currency takes no new transactions but keeps every balance and statement row readable. */
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  colorId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Whether members may hand this to each other, by trade or by a direct send. Turning it off leaves every existing balance alone and stops only new movement between members. */
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  symbol?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEnumValueInput = {
  /** ID of the color for this enum value */
  colorId?: InputMaybe<Scalars['ID']['input']>;
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

export type UpdateHalloweenPrizeInput = {
  /** How many are left. The starting stock moves by the same amount, so what has been given out stays the same. */
  currentStock?: InputMaybe<Scalars['Int']['input']>;
  /** For a prize staff hand over themselves only */
  image?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  weight?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateImageInput = {
  altText?: InputMaybe<Scalars['String']['input']>;
  artistId?: InputMaybe<Scalars['ID']['input']>;
  artistName?: InputMaybe<Scalars['String']['input']>;
  artistUrl?: InputMaybe<Scalars['String']['input']>;
  isNsfw?: InputMaybe<Scalars['Boolean']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  /** Re-frame the thumbnail, re-rendering it from the original. Explicit null resets it to a centre crop; omitting the field leaves the current framing alone. */
  thumbnailCrop?: InputMaybe<ImageCropInput>;
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
};

export type UpdateItemTypeInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  colorId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  imageId?: InputMaybe<Scalars['ID']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  isConsumable?: InputMaybe<Scalars['Boolean']['input']>;
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
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

/** Sets one channel for one kind, for the caller. */
export type UpdateNotificationPreferenceInput = {
  channel: NotificationChannel;
  /** The new setting. There is no toggle, only a value. */
  enabled: Scalars['Boolean']['input'];
  kind: NotificationKind;
};

/** Input for updating an existing role */
export type UpdateRoleInput = {
  /** Whether members with this role can create new characters */
  canCreateCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create invite codes */
  canCreateInviteCode?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create orphaned characters */
  canCreateOrphanedCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create new roles */
  canCreateRole?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can create new species */
  canCreateSpecies?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can delete characters in this community */
  canDeleteCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit characters */
  canEditCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit registry fields (variant, traits) on any character */
  canEditCharacterRegistry?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit their own characters */
  canEditOwnCharacter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can edit registry fields (variant, traits) on their own characters */
  canEditOwnCharacterRegistry?: InputMaybe<Scalars['Boolean']['input']>;
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
  /** Whether members with this role can review and approve/reject uploaded images */
  canModerateImages?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can remove community members */
  canRemoveCommunityMember?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can upload images to any character */
  canUploadCharacterImages?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether members with this role can upload images to their own characters */
  canUploadOwnCharacterImages?: InputMaybe<Scalars['Boolean']['input']>;
  /** The name of the role */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateShopItemInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  maxPerUser?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** Replaces every option when given. Past purchases keep what they paid, which is copied onto the line rather than read back through here. */
  prices?: InputMaybe<Array<ShopPriceInput>>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  stock?: InputMaybe<Scalars['Int']['input']>;
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
  /** ID of the color for this species variant */
  colorId?: InputMaybe<Scalars['ID']['input']>;
  /** How many forms a character on this variant may have. Lowering it does not touch characters that already have more. */
  maxForms?: InputMaybe<Scalars['Int']['input']>;
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
  /** Whether this trait allows an optional free-text clarifier on each value */
  allowsClarifier?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether this trait allows multiple values per character */
  allowsMultipleValues?: InputMaybe<Scalars['Boolean']['input']>;
  /** ID of the color for this trait */
  colorId?: InputMaybe<Scalars['ID']['input']>;
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
  /** Explicit null removes your avatar; omitting the field leaves it alone. Any other value is refused: an avatar is set by uploading one to POST /images/avatar. */
  avatarImageId?: InputMaybe<Scalars['ID']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  privacySettings?: InputMaybe<Scalars['JSON']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UseItemInput = {
  itemId: Scalars['ID']['input'];
};

export type VerifyEmailInput = {
  token: Scalars['String']['input'];
};

/** Visibility levels for content */
export enum Visibility {
  Private = 'PRIVATE',
  Public = 'PUBLIC',
  Unlisted = 'UNLISTED'
}

export type CurrentAccessTokenQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrentAccessTokenQuery = { __typename?: 'Query', currentAccessToken: { __typename?: 'PersonalAccessToken', id: string, name: string, displayHint: string, expiresAt: string, communities: Array<{ __typename?: 'PersonalAccessTokenGrant', member: boolean, permissions: Array<string>, community: { __typename?: 'PersonalAccessTokenCommunityRef', id: string, name: string, slug: string } }> } | null, me: { __typename?: 'User', id: string, username: string } };

export type CommunityBySlugQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type CommunityBySlugQuery = { __typename?: 'Query', communityBySlug: { __typename?: 'Community', id: string, name: string, slug: string } | null };

export type UserByUsernameQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type UserByUsernameQuery = { __typename?: 'Query', user: { __typename?: 'User', id: string, username: string, displayName: string | null } | null };

export type ItemTypesQueryVariables = Exact<{
  filters: ItemTypeFiltersInput;
}>;


export type ItemTypesQuery = { __typename?: 'Query', itemTypes: { __typename?: 'ItemTypeConnection', total: number, hasMore: boolean, itemTypes: Array<{ __typename?: 'ItemType', id: string, name: string, category: string | null, isConsumable: boolean }> } };

export type GrantItemMutationVariables = Exact<{
  input: GrantItemInput;
}>;


export type GrantItemMutation = { __typename?: 'Mutation', grantItem: Array<{ __typename?: 'Item', id: string, itemTypeId: string, ownerId: string | null }> };


export const CurrentAccessTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentAccessToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"displayHint"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}},{"kind":"Field","name":{"kind":"Name","value":"communities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"community"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"member"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]} as unknown as DocumentNode<CurrentAccessTokenQuery, CurrentAccessTokenQueryVariables>;
export const CommunityBySlugDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommunityBySlug"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"communityBySlug"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CommunityBySlugQuery, CommunityBySlugQueryVariables>;
export const UserByUsernameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserByUsername"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]} as unknown as DocumentNode<UserByUsernameQuery, UserByUsernameQueryVariables>;
export const ItemTypesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ItemTypes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filters"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ItemTypeFiltersInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTypes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filters"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filters"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}},{"kind":"Field","name":{"kind":"Name","value":"itemTypes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"isConsumable"}}]}}]}}]}}]} as unknown as DocumentNode<ItemTypesQuery, ItemTypesQueryVariables>;
export const GrantItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GrantItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GrantItemInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"grantItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"itemTypeId"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}}]}}]}}]} as unknown as DocumentNode<GrantItemMutation, GrantItemMutationVariables>;