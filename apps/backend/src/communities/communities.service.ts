import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCommunityInput, UpdateCommunityInput } from './dto/community.dto';
import { Community, CommunityConnection } from './entities/community.entity';

@Injectable()
export class CommunitiesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new community */
  async create(createCommunityInput: CreateCommunityInput): Promise<Community> {
    return this.prisma.community.create({
      data: createCommunityInput,
    });
  }

  /** Find all communities with pagination */
  async findAll(first: number = 20, after?: string): Promise<CommunityConnection> {
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
  async findOne(id: string): Promise<Community> {
    const community = await this.prisma.community.findUnique({
      where: { id },
    });

    if (!community) {
      throw new NotFoundException(`Community with ID ${id} not found`);
    }

    return community;
  }

  /** Update a community */
  async update(id: string, updateCommunityInput: UpdateCommunityInput): Promise<Community> {
    const community = await this.findOne(id); // This will throw if not found

    return this.prisma.community.update({
      where: { id },
      data: updateCommunityInput,
    });
  }

  /** Remove a community */
  async remove(id: string): Promise<Community> {
    const community = await this.findOne(id); // This will throw if not found

    return this.prisma.community.delete({
      where: { id },
    });
  }
}