import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSpeciesInput, UpdateSpeciesInput } from './dto/species.dto';
import { Species, SpeciesConnection } from './entities/species.entity';

@Injectable()
export class SpeciesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new species */
  async create(createSpeciesInput: CreateSpeciesInput): Promise<Species> {
    return this.prisma.species.create({
      data: createSpeciesInput,
      include: {
        community: true,
      },
    });
  }

  /** Find all species with pagination */
  async findAll(first: number = 20, after?: string): Promise<SpeciesConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [species, totalCount] = await Promise.all([
      this.prisma.species.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          community: true,
        },
      }),
      this.prisma.species.count(),
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
  async findByCommunity(communityId: string, first: number = 20, after?: string): Promise<SpeciesConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [species, totalCount] = await Promise.all([
      this.prisma.species.findMany({
        where: { communityId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          community: true,
        },
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
  async findOne(id: string): Promise<Species> {
    const species = await this.prisma.species.findUnique({
      where: { id },
      include: {
        community: true,
      },
    });

    if (!species) {
      throw new NotFoundException(`Species with ID ${id} not found`);
    }

    return species;
  }

  /** Update a species */
  async update(id: string, updateSpeciesInput: UpdateSpeciesInput): Promise<Species> {
    const species = await this.findOne(id); // This will throw if not found

    return this.prisma.species.update({
      where: { id },
      data: updateSpeciesInput,
      include: {
        community: true,
      },
    });
  }

  /** Remove a species */
  async remove(id: string): Promise<Species> {
    const species = await this.findOne(id); // This will throw if not found

    return this.prisma.species.delete({
      where: { id },
      include: {
        community: true,
      },
    });
  }
}