import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for communities operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new community
 */
export interface CreateCommunityServiceInput {
  /** Name of the community (must be unique) */
  name: string;
}

/**
 * Input data for updating a community
 */
export interface UpdateCommunityServiceInput {
  /** Name of the community (must be unique) */
  name?: string;
}

@Injectable()
export class CommunitiesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new community */
  async create(input: CreateCommunityServiceInput) {
    return this.prisma.community.create({
      data: {
        name: input.name,
      },
    });
  }

  /** Find all communities with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [communities, totalCount] = await Promise.all([
      this.prisma.community.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.community.count(),
    ]);

    const hasNextPage = communities.length > first;
    const nodes = hasNextPage ? communities.slice(0, -1) : communities;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a community by ID */
  async findOne(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
    });

    if (!community) {
      throw new NotFoundException(`Community with ID ${id} not found`);
    }

    return community;
  }

  /** Update a community */
  async update(id: string, input: UpdateCommunityServiceInput) {
    const community = await this.findOne(id); // This will throw if not found

    const updateData: Prisma.CommunityUpdateInput = {};
    
    if (input.name !== undefined) updateData.name = input.name;

    return this.prisma.community.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a community */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.community.delete({
      where: { id },
    });
  }
}