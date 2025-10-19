import { Prisma } from '@chardb/database';
import { CreateCharacterOwnershipChangeInput } from '../dto/character-ownership-change.dto';
import {
  CharacterOwnershipChange,
  CharacterOwnershipChangeConnection,
} from '../entities/character-ownership-change.entity';
import { CreateCharacterOwnershipChangeServiceInput } from '../character-ownership-changes.service';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateCharacterOwnershipChangeInput to service input format
 */
export function mapCreateCharacterOwnershipChangeInputToService(
  input: CreateCharacterOwnershipChangeInput,
): CreateCharacterOwnershipChangeServiceInput {
  return {
    characterId: input.characterId,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
  };
}

type PrismaCharacterOwnershipChange =
  // eslint-disable-next-line @typescript-eslint/ban-types
  Prisma.CharacterOwnershipChangeGetPayload<{}>;

/**
 * Maps Prisma CharacterOwnershipChange result to GraphQL CharacterOwnershipChange entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaCharacterOwnershipChangeToGraphQL(
  prismaOwnershipChange: PrismaCharacterOwnershipChange,
): CharacterOwnershipChange {
  return {
    id: prismaOwnershipChange.id,
    characterId: prismaOwnershipChange.characterId,
    fromUserId: prismaOwnershipChange.fromUserId,
    toUserId: prismaOwnershipChange.toUserId,
    createdAt: prismaOwnershipChange.createdAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaCharacterOwnershipChangeConnectionToGraphQL(serviceResult: {
  nodes: PrismaCharacterOwnershipChange[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): CharacterOwnershipChangeConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaCharacterOwnershipChangeToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
