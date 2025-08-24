import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTraitListEntryInput, UpdateTraitListEntryInput } from './dto/trait-list-entry.dto';
import { TraitListEntry, TraitListEntryConnection } from './entities/trait-list-entry.entity';

@Injectable()
export class TraitListEntriesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new trait list entry */
  async create(createTraitListEntryInput: CreateTraitListEntryInput): Promise<TraitListEntry> {
    return this.prisma.traitListEntry.create({
      data: createTraitListEntryInput,
      include: {
        trait: true,
        speciesVariant: true,
      },
    });
  }

  /** Find all trait list entries with pagination */
  async findAll(first: number = 20, after?: string): Promise<TraitListEntryConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traitListEntries, totalCount] = await Promise.all([
      this.prisma.traitListEntry.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: [
          { speciesVariant: { name: 'asc' } },
          { order: 'asc' },
        ],
        include: {
          trait: true,
          speciesVariant: true,
        },
      }),
      this.prisma.traitListEntry.count(),
    ]);

    const hasNextPage = traitListEntries.length > first;
    const nodes = hasNextPage ? traitListEntries.slice(0, -1) : traitListEntries;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find trait list entries by species variant ID with pagination */
  async findBySpeciesVariant(speciesVariantId: string, first: number = 20, after?: string): Promise<TraitListEntryConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traitListEntries, totalCount] = await Promise.all([
      this.prisma.traitListEntry.findMany({
        where: { speciesVariantId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { order: 'asc' },
        include: {
          trait: true,
          speciesVariant: true,
        },
      }),
      this.prisma.traitListEntry.count({
        where: { speciesVariantId },
      }),
    ]);

    const hasNextPage = traitListEntries.length > first;
    const nodes = hasNextPage ? traitListEntries.slice(0, -1) : traitListEntries;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find trait list entries by trait ID with pagination */
  async findByTrait(traitId: string, first: number = 20, after?: string): Promise<TraitListEntryConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traitListEntries, totalCount] = await Promise.all([
      this.prisma.traitListEntry.findMany({
        where: { traitId },
        take: first + 1,
        skip,
        cursor,
        orderBy: [
          { speciesVariant: { name: 'asc' } },
          { order: 'asc' },
        ],
        include: {
          trait: true,
          speciesVariant: true,
        },
      }),
      this.prisma.traitListEntry.count({
        where: { traitId },
      }),
    ]);

    const hasNextPage = traitListEntries.length > first;
    const nodes = hasNextPage ? traitListEntries.slice(0, -1) : traitListEntries;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a trait list entry by ID */
  async findOne(id: string): Promise<TraitListEntry> {
    const traitListEntry = await this.prisma.traitListEntry.findUnique({
      where: { id },
      include: {
        trait: true,
        speciesVariant: true,
      },
    });

    if (!traitListEntry) {
      throw new NotFoundException(`TraitListEntry with ID ${id} not found`);
    }

    return traitListEntry;
  }

  /** Update a trait list entry */
  async update(id: string, updateTraitListEntryInput: UpdateTraitListEntryInput): Promise<TraitListEntry> {
    const traitListEntry = await this.findOne(id); // This will throw if not found

    return this.prisma.traitListEntry.update({
      where: { id },
      data: updateTraitListEntryInput,
      include: {
        trait: true,
        speciesVariant: true,
      },
    });
  }

  /** Remove a trait list entry */
  async remove(id: string): Promise<TraitListEntry> {
    const traitListEntry = await this.findOne(id); // This will throw if not found

    return this.prisma.traitListEntry.delete({
      where: { id },
      include: {
        trait: true,
        speciesVariant: true,
      },
    });
  }
}