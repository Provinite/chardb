import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCharacterOwnershipChangeInput } from './dto/character-ownership-change.dto';
import type { CharacterOwnershipChange, Prisma } from '@chardb/database';

@Injectable()
export class CharacterOwnershipChangesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new character ownership change record */
  async create(createCharacterOwnershipChangeInput: CreateCharacterOwnershipChangeInput): Promise<CharacterOwnershipChange> {
    return this.prisma.characterOwnershipChange.create({
      data: createCharacterOwnershipChangeInput,
    });
  }

  /** Find all character ownership changes with pagination */
  async findAll(first: number = 20, after?: string) {
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

  /** Find character ownership changes by character ID with pagination */
  async findByCharacter(characterId: string, first: number = 20, after?: string) {
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

  /** Find character ownership changes by user ID (both from and to) with pagination */
  async findByUser(userId: string, first: number = 20, after?: string) {
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

  /** Find a character ownership change by ID */
  async findOne(id: string): Promise<CharacterOwnershipChange> {
    const ownershipChange = await this.prisma.characterOwnershipChange.findUnique({
      where: { id },
      include: {
        character: true,
        fromUser: true,
        toUser: true,
      },
    });

    if (!ownershipChange) {
      throw new NotFoundException(`Character ownership change with ID ${id} not found`);
    }

    return ownershipChange;
  }

  /** Remove a character ownership change record */
  async remove(id: string): Promise<CharacterOwnershipChange> {
    const ownershipChange = await this.findOne(id); // This will throw if not found

    return this.prisma.characterOwnershipChange.delete({
      where: { id },
      include: {
        character: true,
        fromUser: true,
        toUser: true,
      },
    });
  }
}