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
  user: User;
};

export type Character = {
  __typename?: 'Character';
  _count: Maybe<CharacterCount>;
  age: Maybe<Scalars['String']['output']>;
  backstory: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  creator: Maybe<User>;
  creatorId: Maybe<Scalars['ID']['output']>;
  customFields: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
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
  personality: Maybe<Scalars['String']['output']>;
  price: Maybe<Scalars['Float']['output']>;
  species: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  tags_rel: Maybe<Array<CharacterTag>>;
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
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  visibility?: InputMaybe<Visibility>;
};

export type CharacterTag = {
  __typename?: 'CharacterTag';
  character: Character;
  tag: Tag;
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

export type CreateCharacterInput = {
  age?: InputMaybe<Scalars['String']['input']>;
  backstory?: InputMaybe<Scalars['String']['input']>;
  customFields?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  isSellable?: Scalars['Boolean']['input'];
  isTradeable?: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  personality?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  species?: InputMaybe<Scalars['String']['input']>;
  tags?: Array<Scalars['String']['input']>;
  visibility?: Visibility;
};

export type CreateCommentInput = {
  content: Scalars['String']['input'];
  entityId: Scalars['ID']['input'];
  entityType: CommentableType;
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateGalleryInput = {
  characterId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  sortOrder?: Scalars['Int']['input'];
  visibility?: Visibility;
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
  /** Title for the text media */
  title: Scalars['String']['input'];
  /** Visibility setting for the media */
  visibility?: Visibility;
};

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
  _count: Maybe<GalleryCount>;
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
  /** Optional ID of the character this media is associated with */
  characterId: Maybe<Scalars['ID']['output']>;
  /** When the media was created */
  createdAt: Scalars['DateTime']['output'];
  /** Optional description for the media */
  description: Maybe<Scalars['String']['output']>;
  /** The gallery this media belongs to, if any */
  gallery: Maybe<Gallery>;
  /** Optional ID of the gallery this media belongs to */
  galleryId: Maybe<Scalars['ID']['output']>;
  /** Unique identifier for the media */
  id: Scalars['ID']['output'];
  /** Image content (populated for image media) */
  image: Maybe<Image>;
  /** Foreign key to image content (null for text media) */
  imageId: Maybe<Scalars['ID']['output']>;
  /** Number of likes this media has received */
  likesCount: Scalars['Float']['output'];
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
  /** Whether the current user has liked this media */
  userHasLiked: Scalars['Boolean']['output'];
  /** Visibility setting for the media */
  visibility: Visibility;
};

/** Paginated connection result for media queries */
export type MediaConnection = {
  __typename?: 'MediaConnection';
  /** Whether there are more items available after this page */
  hasMore: Scalars['Boolean']['output'];
  /** Array of media items for this page */
  media: Array<Media>;
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
  createCharacter: Character;
  createComment: Comment;
  createGallery: Gallery;
  /** Creates a new text media item */
  createTextMedia: Media;
  deleteAccount: Scalars['Boolean']['output'];
  deleteCharacter: Scalars['Boolean']['output'];
  deleteComment: Scalars['Boolean']['output'];
  deleteGallery: Scalars['Boolean']['output'];
  deleteImage: Scalars['Boolean']['output'];
  /** Deletes a media item and its associated content */
  deleteMedia: Scalars['Boolean']['output'];
  login: AuthPayload;
  refreshToken: Scalars['String']['output'];
  removeCharacterTags: Character;
  /** Removes tags from a media item */
  removeMediaTags: Media;
  reorderGalleries: Array<Gallery>;
  /** Sets or clears the main media for a character */
  setCharacterMainMedia: Character;
  signup: AuthPayload;
  toggleFollow: FollowResult;
  toggleLike: LikeResult;
  transferCharacter: Character;
  updateCharacter: Character;
  updateComment: Comment;
  updateGallery: Gallery;
  updateImage: Image;
  /** Updates media metadata (title, description, etc.) */
  updateMedia: Media;
  updateProfile: User;
  /** Updates the text content of a text media item */
  updateTextContent: Media;
};


export type MutationAddCharacterTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
};


export type MutationAddMediaTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageMediaTagsInput;
};


export type MutationCreateCharacterArgs = {
  input: CreateCharacterInput;
};


export type MutationCreateCommentArgs = {
  input: CreateCommentInput;
};


export type MutationCreateGalleryArgs = {
  input: CreateGalleryInput;
};


export type MutationCreateTextMediaArgs = {
  input: CreateTextMediaInput;
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


export type MutationDeleteMediaArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationRefreshTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationRemoveCharacterTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
};


export type MutationRemoveMediaTagsArgs = {
  id: Scalars['ID']['input'];
  input: ManageMediaTagsInput;
};


export type MutationReorderGalleriesArgs = {
  input: ReorderGalleriesInput;
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


export type MutationUpdateCharacterArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCharacterInput;
};


export type MutationUpdateCommentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCommentInput;
};


export type MutationUpdateGalleryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGalleryInput;
};


export type MutationUpdateImageArgs = {
  id: Scalars['ID']['input'];
  input: UpdateImageInput;
};


export type MutationUpdateMediaArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMediaInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateUserInput;
};


export type MutationUpdateTextContentArgs = {
  input: UpdateTextContentInput;
  mediaId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  activityFeed: Array<ActivityItem>;
  character: Character;
  characterGalleries: GalleryConnection;
  characterImages: ImageConnection;
  /** Retrieves media associated with a specific character */
  characterMedia: MediaConnection;
  characters: CharacterConnection;
  comment: Comment;
  comments: CommentConnection;
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
  myGalleries: GalleryConnection;
  myImages: ImageConnection;
  /** Retrieves media owned by the current authenticated user */
  myMedia: MediaConnection;
  /** Search for tags by name or get popular suggestions */
  searchTags: Array<Tag>;
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


export type QueryCharactersArgs = {
  filters?: InputMaybe<CharacterFiltersInput>;
};


export type QueryCommentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCommentsArgs = {
  filters: CommentFiltersInput;
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


export type QuerySearchTagsArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
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

export type ReorderGalleriesInput = {
  galleryIds: Array<Scalars['ID']['input']>;
};

export type SetMainMediaInput = {
  mediaId?: InputMaybe<Scalars['ID']['input']>;
};

export type SignupInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
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

export type TransferCharacterInput = {
  newOwnerId: Scalars['ID']['input'];
};

export type UpdateCharacterInput = {
  age?: InputMaybe<Scalars['String']['input']>;
  backstory?: InputMaybe<Scalars['String']['input']>;
  customFields?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  isSellable?: InputMaybe<Scalars['Boolean']['input']>;
  isTradeable?: InputMaybe<Scalars['Boolean']['input']>;
  mainMediaId?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  personality?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  species?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  visibility?: InputMaybe<Visibility>;
};

export type UpdateCommentInput = {
  content: Scalars['String']['input'];
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

/** Input type for updating media metadata */
export type UpdateMediaInput = {
  /** Updated character association */
  characterId?: InputMaybe<Scalars['ID']['input']>;
  /** Updated description for the media */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Updated gallery association */
  galleryId?: InputMaybe<Scalars['ID']['input']>;
  /** Updated title for the media */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Updated visibility setting */
  visibility?: InputMaybe<Visibility>;
};

/** Input type for updating text content specifically */
export type UpdateTextContentInput = {
  /** Updated text content */
  content?: InputMaybe<Scalars['String']['input']>;
  /** Updated text formatting type */
  formatting?: InputMaybe<TextFormatting>;
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
  createdAt: Scalars['DateTime']['output'];
  dateOfBirth: Maybe<Scalars['DateTime']['output']>;
  displayName: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isAdmin: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  location: Maybe<Scalars['String']['output']>;
  privacySettings: Scalars['JSON']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userIsFollowing: Scalars['Boolean']['output'];
  username: Scalars['String']['output'];
  website: Maybe<Scalars['String']['output']>;
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
  featuredCharacters: Array<Character>;
  isOwnProfile: Scalars['Boolean']['output'];
  recentCharacters: Array<Character>;
  recentGalleries: Array<Gallery>;
  recentMedia: Array<Media>;
  stats: UserStats;
  user: User;
};

export type UserStats = {
  __typename?: 'UserStats';
  charactersCount: Scalars['Int']['output'];
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  galleriesCount: Scalars['Int']['output'];
  imagesCount: Scalars['Int']['output'];
  totalLikes: Scalars['Int']['output'];
  totalViews: Scalars['Int']['output'];
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


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string, user: { __typename?: 'User', id: string, username: string, email: string, displayName: string | null, avatarUrl: string | null, isAdmin: boolean, isVerified: boolean, createdAt: string } } };

export type SignupMutationVariables = Exact<{
  input: SignupInput;
}>;


export type SignupMutation = { __typename?: 'Mutation', signup: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string, user: { __typename?: 'User', id: string, username: string, email: string, displayName: string | null, avatarUrl: string | null, isAdmin: boolean, isVerified: boolean, createdAt: string } } };

export type RefreshTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type RefreshTokenMutation = { __typename?: 'Mutation', refreshToken: string };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, username: string, email: string, displayName: string | null, bio: string | null, avatarUrl: string | null, location: string | null, website: string | null, dateOfBirth: string | null, isVerified: boolean, isAdmin: boolean, privacySettings: any, createdAt: string, updatedAt: string } };

export type GetCharactersQueryVariables = Exact<{
  filters?: InputMaybe<CharacterFiltersInput>;
}>;


export type GetCharactersQuery = { __typename?: 'Query', characters: { __typename?: 'CharacterConnection', total: number, hasMore: boolean, characters: Array<{ __typename?: 'Character', id: string, name: string, species: string | null, age: string | null, gender: string | null, description: string | null, personality: string | null, backstory: string | null, ownerId: string, creatorId: string | null, mainMediaId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null, _count: { __typename?: 'CharacterCount', media: number } | null }> } };

export type GetCharacterQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCharacterQuery = { __typename?: 'Query', character: { __typename?: 'Character', id: string, name: string, species: string | null, age: string | null, gender: string | null, description: string | null, personality: string | null, backstory: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, mainMediaId: string | null, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number } | null, tags_rel: Array<{ __typename?: 'CharacterTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null } };

export type GetMyCharactersQueryVariables = Exact<{
  filters?: InputMaybe<CharacterFiltersInput>;
}>;


export type GetMyCharactersQuery = { __typename?: 'Query', myCharacters: { __typename?: 'CharacterConnection', total: number, hasMore: boolean, characters: Array<{ __typename?: 'Character', id: string, name: string, species: string | null, age: string | null, gender: string | null, description: string | null, personality: string | null, backstory: string | null, ownerId: string, creatorId: string | null, mainMediaId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null, _count: { __typename?: 'CharacterCount', media: number } | null }> } };

export type CreateCharacterMutationVariables = Exact<{
  input: CreateCharacterInput;
}>;


export type CreateCharacterMutation = { __typename?: 'Mutation', createCharacter: { __typename?: 'Character', id: string, name: string, species: string | null, age: string | null, gender: string | null, description: string | null, personality: string | null, backstory: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number } | null } };

export type UpdateCharacterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCharacterInput;
}>;


export type UpdateCharacterMutation = { __typename?: 'Mutation', updateCharacter: { __typename?: 'Character', id: string, name: string, species: string | null, age: string | null, gender: string | null, description: string | null, personality: string | null, backstory: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number } | null } };

export type DeleteCharacterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCharacterMutation = { __typename?: 'Mutation', deleteCharacter: boolean };

export type TransferCharacterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: TransferCharacterInput;
}>;


export type TransferCharacterMutation = { __typename?: 'Mutation', transferCharacter: { __typename?: 'Character', id: string, name: string, species: string | null, age: string | null, gender: string | null, description: string | null, personality: string | null, backstory: string | null, ownerId: string, creatorId: string | null, visibility: Visibility, isSellable: boolean, isTradeable: boolean, price: number | null, tags: Array<string>, customFields: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, creator: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null, _count: { __typename?: 'CharacterCount', media: number } | null } };

export type AddCharacterTagsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
}>;


export type AddCharacterTagsMutation = { __typename?: 'Mutation', addCharacterTags: { __typename?: 'Character', id: string, name: string, tags: Array<string>, tags_rel: Array<{ __typename?: 'CharacterTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null } };

export type RemoveCharacterTagsMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ManageTagsInput;
}>;


export type RemoveCharacterTagsMutation = { __typename?: 'Mutation', removeCharacterTags: { __typename?: 'Character', id: string, name: string, tags: Array<string>, tags_rel: Array<{ __typename?: 'CharacterTag', tag: { __typename?: 'Tag', id: string, name: string, category: string | null, color: string | null } }> | null } };

export type SetCharacterMainMediaMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: SetMainMediaInput;
}>;


export type SetCharacterMainMediaMutation = { __typename?: 'Mutation', setCharacterMainMedia: { __typename?: 'Character', id: string, name: string, mainMediaId: string | null, mainMedia: { __typename?: 'Media', id: string, title: string, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null } | null } };

export type GetLikedCharactersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLikedCharactersQuery = { __typename?: 'Query', likedCharacters: Array<{ __typename?: 'Character', id: string, name: string, species: string | null, age: string | null, gender: string | null, description: string | null, visibility: Visibility, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, _count: { __typename?: 'CharacterCount', media: number } | null }> };

export type GetGalleriesQueryVariables = Exact<{
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetGalleriesQuery = { __typename?: 'Query', galleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: string | null } | null, _count: { __typename?: 'GalleryCount', media: number } | null }> } };

export type GetGalleryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetGalleryQuery = { __typename?: 'Query', gallery: { __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: string | null } | null, _count: { __typename?: 'GalleryCount', media: number } | null } };

export type GetMyGalleriesQueryVariables = Exact<{
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetMyGalleriesQuery = { __typename?: 'Query', myGalleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: string | null } | null, _count: { __typename?: 'GalleryCount', media: number } | null }> } };

export type GetUserGalleriesQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetUserGalleriesQuery = { __typename?: 'Query', userGalleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: string | null } | null, _count: { __typename?: 'GalleryCount', media: number } | null }> } };

export type GetCharacterGalleriesQueryVariables = Exact<{
  characterId: Scalars['ID']['input'];
  filters?: InputMaybe<GalleryFiltersInput>;
}>;


export type GetCharacterGalleriesQuery = { __typename?: 'Query', characterGalleries: { __typename?: 'GalleryConnection', total: number, hasMore: boolean, galleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: string | null } | null, _count: { __typename?: 'GalleryCount', media: number } | null }> } };

export type CreateGalleryMutationVariables = Exact<{
  input: CreateGalleryInput;
}>;


export type CreateGalleryMutation = { __typename?: 'Mutation', createGallery: { __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: string | null } | null, _count: { __typename?: 'GalleryCount', media: number } | null } };

export type UpdateGalleryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateGalleryInput;
}>;


export type UpdateGalleryMutation = { __typename?: 'Mutation', updateGallery: { __typename?: 'Gallery', id: string, name: string, description: string | null, ownerId: string, characterId: string | null, visibility: Visibility, sortOrder: number, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string, species: string | null } | null, _count: { __typename?: 'GalleryCount', media: number } | null } };

export type DeleteGalleryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGalleryMutation = { __typename?: 'Mutation', deleteGallery: boolean };

export type ReorderGalleriesMutationVariables = Exact<{
  input: ReorderGalleriesInput;
}>;


export type ReorderGalleriesMutation = { __typename?: 'Mutation', reorderGalleries: Array<{ __typename?: 'Gallery', id: string, name: string, sortOrder: number, likesCount: number, userHasLiked: boolean, _count: { __typename?: 'GalleryCount', media: number } | null }> };

export type GetLikedGalleriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLikedGalleriesQuery = { __typename?: 'Query', likedGalleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, visibility: Visibility, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null, _count: { __typename?: 'GalleryCount', media: number } | null }> };

export type GetLikedImagesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLikedImagesQuery = { __typename?: 'Query', likedImages: Array<{ __typename?: 'Image', id: string, filename: string, originalFilename: string, url: string, thumbnailUrl: string | null, altText: string | null, width: number, height: number, fileSize: number, mimeType: string, isNsfw: boolean, sensitiveContentDescription: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, uploader: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, artist: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } | null }> };

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


export type GetCharacterMediaQuery = { __typename?: 'Query', characterMedia: { __typename?: 'MediaConnection', total: number, hasMore: boolean, media: Array<{ __typename?: 'Media', id: string, title: string, description: string | null, ownerId: string, characterId: string | null, galleryId: string | null, visibility: Visibility, imageId: string | null, textContentId: string | null, createdAt: string, updatedAt: string, likesCount: number, userHasLiked: boolean, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, image: { __typename?: 'Image', id: string, url: string, thumbnailUrl: string | null, altText: string | null, isNsfw: boolean } | null, textContent: { __typename?: 'TextContent', id: string, content: string, wordCount: number, formatting: TextFormatting } | null }> } };

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

export type SearchTagsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
}>;


export type SearchTagsQuery = { __typename?: 'Query', searchTags: Array<{ __typename?: 'Tag', id: string, name: string, displayName: string, category: string | null, color: string | null, createdAt: string }> };

export type GetUserProfileQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type GetUserProfileQuery = { __typename?: 'Query', userProfile: { __typename?: 'UserProfile', isOwnProfile: boolean, canViewPrivateContent: boolean, user: { __typename?: 'User', id: string, username: string, displayName: string | null, bio: string | null, avatarUrl: string | null, location: string | null, website: string | null, isVerified: boolean, createdAt: string }, stats: { __typename?: 'UserStats', charactersCount: number, galleriesCount: number, imagesCount: number, totalViews: number, totalLikes: number, followersCount: number, followingCount: number }, recentCharacters: Array<{ __typename?: 'Character', id: string, name: string, species: string | null, description: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }>, recentGalleries: Array<{ __typename?: 'Gallery', id: string, name: string, description: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, character: { __typename?: 'Character', id: string, name: string } | null }>, recentMedia: Array<{ __typename?: 'Media', id: string, title: string, description: string | null, createdAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null }, image: { __typename?: 'Image', id: string, filename: string, url: string, thumbnailUrl: string | null } | null }>, featuredCharacters: Array<{ __typename?: 'Character', id: string, name: string, species: string | null, description: string | null, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, username: string, displayName: string | null, avatarUrl: string | null } }> } | null };

export type GetUserStatsQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type GetUserStatsQuery = { __typename?: 'Query', userStats: { __typename?: 'UserStats', charactersCount: number, galleriesCount: number, imagesCount: number, totalViews: number, totalLikes: number, followersCount: number, followingCount: number } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateUserInput;
}>;


export type UpdateProfileMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'User', id: string, username: string, displayName: string | null, bio: string | null, avatarUrl: string | null, location: string | null, website: string | null, dateOfBirth: string | null, isVerified: boolean, createdAt: string, updatedAt: string } };


export const LoginDocument = gql`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    user {
      id
      username
      email
      displayName
      avatarUrl
      isAdmin
      isVerified
      createdAt
    }
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
    user {
      id
      username
      email
      displayName
      avatarUrl
      isAdmin
      isVerified
      createdAt
    }
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
      species
      age
      gender
      description
      personality
      backstory
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
    species
    age
    gender
    description
    personality
    backstory
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
      species
      age
      gender
      description
      personality
      backstory
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
    species
    age
    gender
    description
    personality
    backstory
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
    species
    age
    gender
    description
    personality
    backstory
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
    species
    age
    gender
    description
    personality
    backstory
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
export const GetLikedCharactersDocument = gql`
    query GetLikedCharacters {
  likedCharacters {
    id
    name
    species
    age
    gender
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
        species
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
      species
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
        species
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
        species
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
        species
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
      species
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
      species
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
  deleteGallery(id: $id)
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
      species
      description
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
      species
      description
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