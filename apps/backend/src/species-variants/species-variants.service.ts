import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for species variants operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new species variant
 */
export interface CreateSpeciesVariantServiceInput {
  /** Name of the species variant (unique within species) */
  name: string;
  /** ID of the species this variant belongs to */
  speciesId: string;
}

/**
 * Input data for updating a species variant
 */
export interface UpdateSpeciesVariantServiceInput {
  /** Name of the species variant (unique within species) */
  name?: string;
  /** ID of the species this variant belongs to */
  speciesId?: string;
}

@Injectable()
export class SpeciesVariantsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new species variant */
  async create(input: CreateSpeciesVariantServiceInput) {
    return this.prisma.speciesVariant.create({
      data: {
        name: input.name,
        species: {
          connect: { id: input.speciesId }
        }
      },
    });
  }

  /** Find all species variants with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [speciesVariants, totalCount] = await Promise.all([
      this.prisma.speciesVariant.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.speciesVariant.count(),
    ]);

    const hasNextPage = speciesVariants.length > first;
    const nodes = hasNextPage ? speciesVariants.slice(0, -1) : speciesVariants;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find species variants by species ID with pagination */
  async findBySpecies(speciesId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [speciesVariants, totalCount] = await Promise.all([
      this.prisma.speciesVariant.findMany({
        where: { speciesId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.speciesVariant.count({
        where: { speciesId },
      }),
    ]);

    const hasNextPage = speciesVariants.length > first;
    const nodes = hasNextPage ? speciesVariants.slice(0, -1) : speciesVariants;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a species variant by ID */
  async findOne(id: string) {
    const speciesVariant = await this.prisma.speciesVariant.findUnique({
      where: { id },
    });

    if (!speciesVariant) {
      throw new NotFoundException(`SpeciesVariant with ID ${id} not found`);
    }

    return speciesVariant;
  }

  /** Update a species variant */
  async update(id: string, input: UpdateSpeciesVariantServiceInput) {
    const speciesVariant = await this.findOne(id); // This will throw if not found

    const updateData: Prisma.SpeciesVariantUpdateInput = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.speciesId !== undefined) {
      updateData.species = { connect: { id: input.speciesId } };
    }

    return this.prisma.speciesVariant.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a species variant */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.speciesVariant.delete({
      where: { id },
    });
  }
}