import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSpeciesVariantInput, UpdateSpeciesVariantInput } from './dto/species-variant.dto';
import { SpeciesVariant, SpeciesVariantConnection } from './entities/species-variant.entity';

@Injectable()
export class SpeciesVariantsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new species variant */
  async create(createSpeciesVariantInput: CreateSpeciesVariantInput): Promise<SpeciesVariant> {
    return this.prisma.speciesVariant.create({
      data: createSpeciesVariantInput,
      include: {
        species: true,
      },
    });
  }

  /** Find all species variants with pagination */
  async findAll(first: number = 20, after?: string): Promise<SpeciesVariantConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [speciesVariants, totalCount] = await Promise.all([
      this.prisma.speciesVariant.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          species: true,
        },
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
  async findBySpecies(speciesId: string, first: number = 20, after?: string): Promise<SpeciesVariantConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [speciesVariants, totalCount] = await Promise.all([
      this.prisma.speciesVariant.findMany({
        where: { speciesId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          species: true,
        },
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
  async findOne(id: string): Promise<SpeciesVariant> {
    const speciesVariant = await this.prisma.speciesVariant.findUnique({
      where: { id },
      include: {
        species: true,
      },
    });

    if (!speciesVariant) {
      throw new NotFoundException(`SpeciesVariant with ID ${id} not found`);
    }

    return speciesVariant;
  }

  /** Update a species variant */
  async update(id: string, updateSpeciesVariantInput: UpdateSpeciesVariantInput): Promise<SpeciesVariant> {
    const speciesVariant = await this.findOne(id); // This will throw if not found

    return this.prisma.speciesVariant.update({
      where: { id },
      data: updateSpeciesVariantInput,
      include: {
        species: true,
      },
    });
  }

  /** Remove a species variant */
  async remove(id: string): Promise<SpeciesVariant> {
    const speciesVariant = await this.findOne(id); // This will throw if not found

    return this.prisma.speciesVariant.delete({
      where: { id },
      include: {
        species: true,
      },
    });
  }
}