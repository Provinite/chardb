import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { CharacterOwnershipChangesService } from './character-ownership-changes.service';
import { CharacterOwnershipChange, CharacterOwnershipChangeConnection } from './entities/character-ownership-change.entity';
import { CreateCharacterOwnershipChangeInput } from './dto/character-ownership-change.dto';

@Resolver(() => CharacterOwnershipChange)
export class CharacterOwnershipChangesResolver {
  constructor(private readonly characterOwnershipChangesService: CharacterOwnershipChangesService) {}

  /** Create a new character ownership change record */
  @Mutation(() => CharacterOwnershipChange, { description: 'Create a new character ownership change record' })
  createCharacterOwnershipChange(
    @Args('createCharacterOwnershipChangeInput', { description: 'Character ownership change creation data' }) 
    createCharacterOwnershipChangeInput: CreateCharacterOwnershipChangeInput,
  ): Promise<CharacterOwnershipChange> {
    return this.characterOwnershipChangesService.create(createCharacterOwnershipChangeInput);
  }

  /** Get all character ownership changes with pagination */
  @Query(() => CharacterOwnershipChangeConnection, { name: 'characterOwnershipChanges', description: 'Get all character ownership changes with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of ownership changes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CharacterOwnershipChangeConnection> {
    return this.characterOwnershipChangesService.findAll(first, after);
  }

  /** Get character ownership changes by character ID with pagination */
  @Query(() => CharacterOwnershipChangeConnection, { name: 'characterOwnershipChangesByCharacter', description: 'Get character ownership changes by character ID with pagination' })
  findByCharacter(
    @Args('characterId', { type: () => ID, description: 'Character ID' })
    characterId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of ownership changes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CharacterOwnershipChangeConnection> {
    return this.characterOwnershipChangesService.findByCharacter(characterId, first, after);
  }

  /** Get character ownership changes by user ID with pagination */
  @Query(() => CharacterOwnershipChangeConnection, { name: 'characterOwnershipChangesByUser', description: 'Get character ownership changes by user ID with pagination' })
  findByUser(
    @Args('userId', { type: () => ID, description: 'User ID (can be from or to user)' })
    userId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of ownership changes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CharacterOwnershipChangeConnection> {
    return this.characterOwnershipChangesService.findByUser(userId, first, after);
  }

  /** Get a character ownership change by ID */
  @Query(() => CharacterOwnershipChange, { name: 'characterOwnershipChangeById', description: 'Get a character ownership change by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Character ownership change ID' }) 
    id: string,
  ): Promise<CharacterOwnershipChange> {
    return this.characterOwnershipChangesService.findOne(id);
  }

  /** Remove a character ownership change record */
  @Mutation(() => CharacterOwnershipChange, { description: 'Remove a character ownership change record' })
  removeCharacterOwnershipChange(
    @Args('id', { type: () => ID, description: 'Character ownership change ID' }) 
    id: string,
  ): Promise<CharacterOwnershipChange> {
    return this.characterOwnershipChangesService.remove(id);
  }
}