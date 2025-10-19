import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for species operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new species
 */
export interface CreateSpeciesServiceInput {
  /** Name of the species (must be unique) */
  name: string;
  /** ID of the community that owns this species */
  communityId: string;
  /** Whether this species has an associated image */
  hasImage?: boolean;
}

/**
 * Input data for updating a species
 */
export interface UpdateSpeciesServiceInput {
  /** Name of the species (must be unique) */
  name?: string;
  /** ID of the community that owns this species */
  communityId?: string;
  /** Whether this species has an associated image */
  hasImage?: boolean;
}

@Injectable()
export class SpeciesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new species */
  async create(input: CreateSpeciesServiceInput) {
    return this.prisma.species.create({
      data: {
        name: input.name,
        hasImage: input.hasImage ?? false,
        community: {
          connect: { id: input.communityId },
        },
      },
    });
  }

  /** Find all species with pagination */
  async findAll(first: number = 20, after?: string, userId?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    // If userId is provided, filter to only species from communities the user is a member of
    const where: Prisma.SpeciesWhereInput = userId
      ? {
          community: {
            roles: {
              some: {
                communityMembers: {
                  some: {
                    userId,
                  },
                },
              },
            },
          },
        }
      : {};

    const [species, totalCount] = await Promise.all([
      this.prisma.species.findMany({
        where,
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.species.count({ where }),
    ]);

    const hasNextPage = species.length > first;
    const nodes = hasNextPage ? species.slice(0, -1) : species;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find species by community ID with pagination */
  async findByCommunity(
    communityId: string,
    first: number = 20,
    after?: string,
  ) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [species, totalCount] = await Promise.all([
      this.prisma.species.findMany({
        where: { communityId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.species.count({
        where: { communityId },
      }),
    ]);

    const hasNextPage = species.length > first;
    const nodes = hasNextPage ? species.slice(0, -1) : species;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a species by ID */
  async findOne(id: string) {
    const species = await this.prisma.species.findUnique({
      where: { id },
    });

    if (!species) {
      throw new NotFoundException(`Species with ID ${id} not found`);
    }

    return species;
  }

  /** Update a species */
  async update(id: string, input: UpdateSpeciesServiceInput) {
    const species = await this.findOne(id); // This will throw if not found

    const updateData: Prisma.SpeciesUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.hasImage !== undefined) updateData.hasImage = input.hasImage;
    if (input.communityId !== undefined) {
      updateData.community = { connect: { id: input.communityId } };
    }

    return this.prisma.species.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a species */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.species.delete({
      where: { id },
    });
  }
}
