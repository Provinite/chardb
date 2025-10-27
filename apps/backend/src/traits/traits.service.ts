import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { TraitValueType } from "../shared/enums/trait-value-type.enum";
import { $Enums, Prisma } from "@chardb/database";

/**
 * Service layer input types for traits operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new trait
 */
export interface CreateTraitServiceInput {
  /** Name of the trait (unique within species) */
  name: string;
  /** Type of values this trait can store */
  valueType: $Enums.TraitValueType;
  /** Whether this trait allows multiple values per character */
  allowsMultipleValues?: boolean;
  /** ID of the species this trait belongs to */
  speciesId: string;
}

/**
 * Input data for updating a trait
 */
export interface UpdateTraitServiceInput {
  /** Name of the trait (unique within species) */
  name?: string;
  /** Type of values this trait can store */
  valueType?: $Enums.TraitValueType;
  /** Whether this trait allows multiple values per character */
  allowsMultipleValues?: boolean;
  /** ID of the species this trait belongs to */
  speciesId?: string;
}

@Injectable()
export class TraitsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new trait */
  async create(input: CreateTraitServiceInput) {
    return this.prisma.trait.create({
      data: {
        name: input.name,
        valueType: input.valueType,
        allowsMultipleValues: input.allowsMultipleValues ?? false,
        species: {
          connect: { id: input.speciesId },
        },
      },
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
        orderBy: { createdAt: "desc" },
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

  /** Find traits by species ID with pagination, optionally ordered by variant-specific order */
  async findBySpecies(
    speciesId: string,
    first: number = 20,
    after?: string,
    variantId?: string,
  ) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    // When variantId is provided, fetch traits with their TraitListEntry order
    if (variantId) {
      const [traitsWithOrder, totalCount] = await Promise.all([
        this.prisma.trait.findMany({
          where: {
            speciesId,
            traitListEntries: {
              some: {
                speciesVariantId: variantId,
              },
            },
          },
          take: first + 1,
          skip,
          cursor,
          include: {
            traitListEntries: {
              where: {
                speciesVariantId: variantId,
              },
              select: {
                order: true,
              },
            },
          },
        }),
        this.prisma.trait.count({
          where: {
            speciesId,
            traitListEntries: {
              some: {
                speciesVariantId: variantId,
              },
            },
          },
        }),
      ]);

      // Sort by TraitListEntry order, then by trait name for ties
      const sortedTraits = traitsWithOrder.sort((a, b) => {
        const orderA = a.traitListEntries[0]?.order ?? 0;
        const orderB = b.traitListEntries[0]?.order ?? 0;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        // Tiebreaker: alphabetical by name
        return a.name.localeCompare(b.name);
      });

      const hasNextPage = sortedTraits.length > first;
      const nodes = hasNextPage ? sortedTraits.slice(0, -1) : sortedTraits;

      // Remove the traitListEntries from response (internal use only)
      const cleanNodes = nodes.map(({ traitListEntries, ...trait }) => trait);

      return {
        nodes: cleanNodes,
        totalCount,
        hasNextPage,
        hasPreviousPage: !!after,
      };
    }

    // Fallback: no variant specified, order alphabetically by name
    const [traits, totalCount] = await Promise.all([
      this.prisma.trait.findMany({
        where: { speciesId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { name: "asc" },
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
  async findOne(id: string) {
    const trait = await this.prisma.trait.findUnique({
      where: { id },
    });

    if (!trait) {
      throw new NotFoundException(`Trait with ID ${id} not found`);
    }

    return trait;
  }

  /** Update a trait */
  async update(id: string, input: UpdateTraitServiceInput) {
    await this.findOne(id); // This will throw if not found

    const updateData: Prisma.TraitUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.valueType !== undefined) updateData.valueType = input.valueType;
    if (input.allowsMultipleValues !== undefined) updateData.allowsMultipleValues = input.allowsMultipleValues;
    if (input.speciesId !== undefined) {
      updateData.species = { connect: { id: input.speciesId } };
    }

    return this.prisma.trait.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a trait */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.trait.delete({
      where: { id },
    });
  }
}
