import {
  CreateCommunityInput,
  UpdateCommunityInput,
} from "../dto/community.dto";
import { Community, CommunityConnection } from "../entities/community.entity";
import {
  CreateCommunityServiceInput,
  UpdateCommunityServiceInput,
} from "../communities.service";
import { Prisma } from "@chardb/database";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateCommunityInput to service input format
 */
export function mapCreateCommunityInputToService(
  input: CreateCommunityInput,
  creatorId: string,
): CreateCommunityServiceInput {
  return {
    name: input.name,
    slug: input.slug,
    creatorId: creatorId,
  };
}

/**
 * Maps UpdateCommunityInput to service input format
 */
export function mapUpdateCommunityInputToService(
  input: UpdateCommunityInput,
): UpdateCommunityServiceInput {
  const result: UpdateCommunityServiceInput = {};

  if (input.name !== undefined) result.name = input.name;

  return result;
}

// eslint-disable-next-line @typescript-eslint/ban-types -- `GetPayload` takes
// an args object, and the empty one is how you ask for the scalar fields alone.
type PrismaCommunity = Prisma.CommunityGetPayload<{}>;

/**
 * Maps Prisma Community result to GraphQL Community entity
 * Since Community has no relations or computed fields, this is a direct mapping
 */
export function mapPrismaCommunityToGraphQL(
  prismaCommunity: PrismaCommunity,
): Community {
  return {
    id: prismaCommunity.id,
    name: prismaCommunity.name,
    slug: prismaCommunity.slug,
    discordGuildId: prismaCommunity.discordGuildId,
    discordGuildName: prismaCommunity.discordGuildName,
    createdAt: prismaCommunity.createdAt,
    updatedAt: prismaCommunity.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaCommunityConnectionToGraphQL(serviceResult: {
  nodes: PrismaCommunity[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): CommunityConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaCommunityToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
