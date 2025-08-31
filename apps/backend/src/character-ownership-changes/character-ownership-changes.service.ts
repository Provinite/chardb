import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Prisma } from '@chardb/database';

/**
 * Service layer input types for character ownership change operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of GraphQL relation objects.
 */

/**
 * Input data for creating a new character ownership change
 */
export interface CreateCharacterOwnershipChangeServiceInput {
  characterId: string;
  fromUserId?: string | null;
  toUserId: string;
}

/**
 * Filters for querying character ownership changes with pagination
 */
export interface CharacterOwnershipChangeFiltersServiceInput {
  first?: number;
  after?: string;
  characterId?: string;
  userId?: string;
}

@Injectable()
export class CharacterOwnershipChangesService {
  constructor(private prisma: DatabaseService) {}

  async create(input: CreateCharacterOwnershipChangeServiceInput) {
    return this.prisma.characterOwnershipChange.create({
      data: {
        characterId: input.characterId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
      },
    });
  }

  async findAll(filters: CharacterOwnershipChangeFiltersServiceInput = {}) {
    const { first = 20, after } = filters;
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [ownershipChanges, totalCount] = await Promise.all([
      this.prisma.characterOwnershipChange.findMany({
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.characterOwnershipChange.count(),
    ]);

    const hasNextPage = ownershipChanges.length > first;
    const nodes = hasNextPage ? ownershipChanges.slice(0, -1) : ownershipChanges;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  async findByCharacter(filters: CharacterOwnershipChangeFiltersServiceInput & { characterId: string }) {
    const { characterId, first = 20, after } = filters;
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [ownershipChanges, totalCount] = await Promise.all([
      this.prisma.characterOwnershipChange.findMany({
        where: { characterId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.characterOwnershipChange.count({
        where: { characterId },
      }),
    ]);

    const hasNextPage = ownershipChanges.length > first;
    const nodes = hasNextPage ? ownershipChanges.slice(0, -1) : ownershipChanges;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  async findByUser(filters: CharacterOwnershipChangeFiltersServiceInput & { userId: string }) {
    const { userId, first = 20, after } = filters;
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [ownershipChanges, totalCount] = await Promise.all([
      this.prisma.characterOwnershipChange.findMany({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
        },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.characterOwnershipChange.count({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
        },
      }),
    ]);

    const hasNextPage = ownershipChanges.length > first;
    const nodes = hasNextPage ? ownershipChanges.slice(0, -1) : ownershipChanges;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  async findOne(id: string) {
    const ownershipChange = await this.prisma.characterOwnershipChange.findUnique({
      where: { id },
    });

    if (!ownershipChange) {
      throw new NotFoundException(`Character ownership change with ID ${id} not found`);
    }

    return ownershipChange;
  }

  async remove(id: string) {
    const ownershipChange = await this.findOne(id); // This will throw if not found

    await this.prisma.characterOwnershipChange.delete({
      where: { id },
    });

    return true;
  }
}