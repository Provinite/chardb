import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTraitInput, UpdateTraitInput } from './dto/trait.dto';
import { mapCreateTraitInputToPrisma, mapUpdateTraitInputToPrisma } from '../shared/utils/dto-mapper';
import type { Trait } from '@chardb/database';

@Injectable()
export class TraitsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new trait */
  async create(createTraitInput: CreateTraitInput): Promise<Trait> {
    return this.prisma.trait.create({
      data: mapCreateTraitInputToPrisma(createTraitInput),
    });
  }

  /** Find all traits with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traits, totalCount] = await Promise.all([
      this.prisma.trait.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.trait.count(),
    ]);

    const hasNextPage = traits.length > first;
    const nodes = hasNextPage ? traits.slice(0, -1) : traits;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find traits by species ID with pagination */
  async findBySpecies(speciesId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traits, totalCount] = await Promise.all([
      this.prisma.trait.findMany({
        where: { speciesId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.trait.count({
        where: { speciesId },
      }),
    ]);

    const hasNextPage = traits.length > first;
    const nodes = hasNextPage ? traits.slice(0, -1) : traits;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a trait by ID */
  async findOne(id: string): Promise<Trait> {
    const trait = await this.prisma.trait.findUnique({
      where: { id },
    });

    if (!trait) {
      throw new NotFoundException(`Trait with ID ${id} not found`);
    }

    return trait;
  }

  /** Update a trait */
  async update(id: string, updateTraitInput: UpdateTraitInput): Promise<Trait> {
    await this.findOne(id); // This will throw if not found

    return this.prisma.trait.update({
      where: { id },
      data: mapUpdateTraitInputToPrisma(updateTraitInput),
    });
  }

  /** Remove a trait */
  async remove(id: string): Promise<Trait> {
    const trait = await this.findOne(id); // This will throw if not found

    return this.prisma.trait.delete({
      where: { id },
    });
  }
}