import { Resolver, Query, Mutation, Args, ID, Context, ResolveField, Parent, Int } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CharactersService } from './characters.service';
import { Character as CharacterEntity, CharacterConnection } from './entities/character.entity';
import { Image } from '../images/entities/image.entity';
import { ImagesService } from '../images/images.service';
import type { Prisma } from '@chardb/database';
import {
  CreateCharacterInput,
  UpdateCharacterInput,
  CharacterFiltersInput,
  TransferCharacterInput,
  ManageTagsInput,
  SetMainMediaInput,
} from './dto/character.dto';

// Use Prisma's generated type for Character with tag relations
type CharacterWithTags = Prisma.CharacterGetPayload<{
  include: { tags_rel: { include: { tag: true } } }
}>;

@Resolver(() => CharacterEntity)
export class CharactersResolver {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly imagesService: ImagesService,
  ) {}

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async createCharacter(
    @Args('input') input: CreateCharacterInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.create(user.id, input);
  }

  @Query(() => CharacterConnection)
  @UseGuards(OptionalJwtAuthGuard)
  async characters(
    @Args('filters', { nullable: true }) filters?: CharacterFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.charactersService.findAll(filters, user?.id);
  }

  @Query(() => CharacterEntity)
  @UseGuards(OptionalJwtAuthGuard)
  async character(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.charactersService.findOne(id, user?.id);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async updateCharacter(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCharacterInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.update(id, user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteCharacter(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.charactersService.remove(id, user.id);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async transferCharacter(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: TransferCharacterInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.transfer(id, user.id, input.newOwnerId);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async addCharacterTags(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ManageTagsInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.addTags(id, user.id, input.tagNames);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async removeCharacterTags(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ManageTagsInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.removeTags(id, user.id, input.tagNames);
  }

  @Mutation(() => CharacterEntity, { description: 'Sets or clears the main media for a character' })
  @UseGuards(JwtAuthGuard)
  async setCharacterMainMedia(
    @Args('id', { type: () => ID, description: 'Character ID to update' }) id: string,
    @Args('input', { description: 'Main media setting parameters' }) input: SetMainMediaInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.setMainMedia(id, user.id, input.mediaId);
  }

  // Query for user's own characters
  @Query(() => CharacterConnection)
  @UseGuards(JwtAuthGuard)
  async myCharacters(
    @CurrentUser() user: any,
    @Args('filters', { nullable: true }) filters?: CharacterFiltersInput,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: user.id };
    return this.charactersService.findAll(userFilters, user.id);
  }

  // Query for characters by specific user
  @Query(() => CharacterConnection)
  @UseGuards(OptionalJwtAuthGuard)
  async userCharacters(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('filters', { nullable: true }) filters?: CharacterFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: userId };
    return this.charactersService.findAll(userFilters, user?.id);
  }

  // Field resolver to return displayName values for tags string array
  @ResolveField('tags', () => [String])
  async resolveTagsField(@Parent() character: CharacterWithTags): Promise<string[]> {
    if (!character.tags_rel) {
      return [];
    }
    
    // Return displayName values from the relational tags
    return character.tags_rel.map(ct => ct.tag.displayName);
  }

}