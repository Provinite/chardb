import type { PendingOwnership as PrismaPendingOwnership } from "@chardb/database";
import { PendingOwnership } from "../entities/pending-ownership.entity";

/**
 * Maps Prisma PendingOwnership result to GraphQL PendingOwnership entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaPendingOwnershipToGraphQL(
  prismaPendingOwnership: PrismaPendingOwnership,
): PendingOwnership {
  return {
    id: prismaPendingOwnership.id,
    characterId: prismaPendingOwnership.characterId ?? undefined,
    itemId: prismaPendingOwnership.itemId ?? undefined,
    provider: prismaPendingOwnership.provider,
    providerAccountId: prismaPendingOwnership.providerAccountId,
    displayIdentifier: prismaPendingOwnership.displayIdentifier,
    displayName: prismaPendingOwnership.displayName,
    createdAt: prismaPendingOwnership.createdAt,
    claimedAt: prismaPendingOwnership.claimedAt ?? undefined,
    claimedByUserId: prismaPendingOwnership.claimedByUserId ?? undefined,
  };
}
