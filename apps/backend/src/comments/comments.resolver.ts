import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment, CommentConnection } from './entities/comment.entity';
import { CreateCommentInput, UpdateCommentInput, CommentFiltersInput } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DatabaseService } from '../database/database.service';
import { Character } from '../characters/entities/character.entity';
import { Image } from '../images/entities/image.entity';
import { Gallery } from '../galleries/entities/gallery.entity';

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Args('input') input: CreateCommentInput,
    @CurrentUser() user: any,
  ): Promise<Comment> {
    return this.commentsService.create(user.id, input);
  }

  @Query(() => Comment)
  @UseGuards(OptionalJwtAuthGuard)
  async comment(@Args('id', { type: () => ID }) id: string): Promise<Comment> {
    return this.commentsService.findOne(id);
  }

  @Query(() => CommentConnection)
  @UseGuards(OptionalJwtAuthGuard)
  async comments(
    @Args('filters', { type: () => CommentFiltersInput }) filters: CommentFiltersInput,
  ): Promise<CommentConnection> {
    return this.commentsService.findMany(filters);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCommentInput,
    @CurrentUser() user: any,
  ): Promise<Comment> {
    return this.commentsService.update(id, user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.commentsService.remove(id, user.id, user.isAdmin);
  }

  // Resolve polymorphic relations
  @ResolveField(() => Character, { nullable: true })
  async character(@Parent() comment: Comment): Promise<Character | null> {
    if (comment.commentableType !== 'CHARACTER') {
      return null;
    }

    const character = await this.databaseService.character.findUnique({
      where: { id: comment.commentableId },
      include: {
        owner: true,
        creator: true,
      },
    });

    if (!character) return null;

    return {
      ...character,
      owner: {
        ...character.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      creator: character.creator ? {
        ...character.creator,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      } : undefined,
      price: character.price ? Number(character.price) : null,
      likesCount: 0, // Will be resolved by field resolver
      userHasLiked: false, // Will be resolved by field resolver
    } as Character;
  }

  @ResolveField(() => Image, { nullable: true })
  async image(@Parent() comment: Comment): Promise<Image | null> {
    if (comment.commentableType !== 'IMAGE') {
      return null;
    }

    const image = await this.databaseService.image.findUnique({
      where: { id: comment.commentableId },
      include: {
        uploader: true,
        character: {
          include: {
            owner: true,
            creator: true,
          },
        },
        gallery: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!image) return null;

    return {
      ...image,
      uploader: {
        ...image.uploader,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: image.character ? {
        ...image.character,
        owner: {
          ...image.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        creator: image.character.creator ? {
          ...image.character.creator,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        } : undefined,
        price: image.character.price ? Number(image.character.price) : null,
        likesCount: 0,
        userHasLiked: false,
      } : null,
      gallery: image.gallery ? {
        ...image.gallery,
        owner: {
          ...image.gallery.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        character: null,
        images: [],
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: 0, // Will be resolved by field resolver
      userHasLiked: false, // Will be resolved by field resolver
    } as Image;
  }

  @ResolveField(() => Gallery, { nullable: true })
  async gallery(@Parent() comment: Comment): Promise<Gallery | null> {
    if (comment.commentableType !== 'GALLERY') {
      return null;
    }

    const gallery = await this.databaseService.gallery.findUnique({
      where: { id: comment.commentableId },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
            creator: true,
          },
        },
      },
    });

    if (!gallery) return null;

    return {
      ...gallery,
      owner: {
        ...gallery.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: gallery.character ? {
        ...gallery.character,
        owner: {
          ...gallery.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        creator: gallery.character.creator ? {
          ...gallery.character.creator,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        } : undefined,
        price: gallery.character.price ? Number(gallery.character.price) : null,
        likesCount: 0,
        userHasLiked: false,
      } : null,
      images: [],
      likesCount: 0, // Will be resolved by field resolver
      userHasLiked: false, // Will be resolved by field resolver
    } as Gallery;
  }
}