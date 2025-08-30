import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentsService, CommentFiltersServiceInput } from './comments.service';
import { UsersService } from '../users/users.service';
import { CharactersService } from '../characters/characters.service';
import { ImagesService } from '../images/images.service';
import { GalleriesService } from '../galleries/galleries.service';
import { Comment, CommentConnection } from './entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Character } from '../characters/entities/character.entity';
import { Image } from '../images/entities/image.entity';
import { Gallery } from '../galleries/entities/gallery.entity';
import { CreateCommentInput, UpdateCommentInput, CommentFiltersInput } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  mapCreateCommentInputToService,
  mapUpdateCommentInputToService,
  mapCommentFiltersInputToService,
  mapPrismaCommentToGraphQL,
  mapPrismaCommentConnectionToGraphQL,
} from './utils/comments-resolver-mappers';

@Resolver(() => Comment)
export class CommentsResolver {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly usersService: UsersService,
    private readonly charactersService: CharactersService,
    private readonly imagesService: ImagesService,
    private readonly galleriesService: GalleriesService,
  ) {}

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Args('input') input: CreateCommentInput,
    @CurrentUser() user: any,
  ) {
    const serviceInput = mapCreateCommentInputToService(input);
    const comment = await this.commentsService.create(user.id, serviceInput);
    return mapPrismaCommentToGraphQL(comment);
  }

  @Query(() => Comment)
  @UseGuards(OptionalJwtAuthGuard)
  async comment(@Args('id', { type: () => ID }) id: string) {
    const comment = await this.commentsService.findOne(id);
    return mapPrismaCommentToGraphQL(comment);
  }

  @Query(() => CommentConnection)
  @UseGuards(OptionalJwtAuthGuard)
  async comments(
    @Args('filters', { type: () => CommentFiltersInput }) filters: CommentFiltersInput,
  ) {
    const serviceFilters = mapCommentFiltersInputToService(filters);
    const result = await this.commentsService.findMany(serviceFilters);
    return mapPrismaCommentConnectionToGraphQL(result);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCommentInput,
    @CurrentUser() user: any,
  ) {
    const serviceInput = mapUpdateCommentInputToService(input);
    const comment = await this.commentsService.update(id, user.id, serviceInput);
    return mapPrismaCommentToGraphQL(comment);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.remove(id, user.id, user.isAdmin);
  }

  // Field Resolvers

  /**
   * Resolves the author of a comment
   */
  @ResolveField(() => User)
  async author(@Parent() comment: Comment) {
    return this.usersService.findById(comment.authorId);
  }

  /**
   * Resolves the parent comment (for replies)
   */
  @ResolveField(() => Comment, { nullable: true })
  async parent(@Parent() comment: Comment) {
    if (!comment.parentId) return null;
    const parentComment = await this.commentsService.findOne(comment.parentId);
    return mapPrismaCommentToGraphQL(parentComment);
  }

  /**
   * Resolves the replies to a comment
   */
  @ResolveField(() => [Comment])
  async replies(@Parent() comment: Comment) {
    const serviceFilters: CommentFiltersServiceInput = { parentId: comment.id };
    const result = await this.commentsService.findMany(serviceFilters);
    return result.comments.map(mapPrismaCommentToGraphQL);
  }

  /**
   * Resolves the replies count
   */
  @ResolveField(() => Int)
  async repliesCount(@Parent() comment: Comment) {
    const serviceFilters: CommentFiltersServiceInput = { parentId: comment.id };
    const result = await this.commentsService.findMany(serviceFilters);
    return result.total;
  }

  /**
   * Resolves the character this comment is on (if applicable)
   */
  @ResolveField(() => Character, { nullable: true })
  async character(@Parent() comment: Comment) {
    if (comment.commentableType !== 'CHARACTER') return null;
    return this.charactersService.findOne(comment.commentableId);
  }

  /**
   * Resolves the image this comment is on (if applicable)
   */
  @ResolveField(() => Image, { nullable: true })
  async image(@Parent() comment: Comment) {
    if (comment.commentableType !== 'IMAGE') return null;
    return this.imagesService.findOne(comment.commentableId);
  }

  /**
   * Resolves the gallery this comment is on (if applicable)
   */
  @ResolveField(() => Gallery, { nullable: true })
  async gallery(@Parent() comment: Comment) {
    if (comment.commentableType !== 'GALLERY') return null;
    return this.galleriesService.findOne(comment.commentableId);
  }

  /**
   * Resolves the user this comment is on (if applicable)
   */
  @ResolveField(() => User, { nullable: true })
  async user(@Parent() comment: Comment) {
    if (comment.commentableType !== 'USER') return null;
    return this.usersService.findById(comment.commentableId);
  }
}