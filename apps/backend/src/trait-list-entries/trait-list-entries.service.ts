import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma, $Enums } from '@chardb/database';

/**
 * Service layer input types for trait list entries operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new trait list entry
 */
interface CreateTraitListEntryServiceInput {
  /** ID of the trait this entry belongs to */
  traitId: string;
  /** ID of the species variant this entry belongs to */
  speciesVariantId: string;
  /** Display order within the species variant */
  order: number;
  /** Whether this trait is required for the species variant */
  required: boolean;
  /** Type of values this trait stores */
  valueType: $Enums.TraitValueType;
  /** Default string value (if trait is string type) */
  defaultValueString?: string;
  /** Default integer value (if trait is integer type) */
  defaultValueInt?: number;
  /** Default timestamp value (if trait is timestamp type) */
  defaultValueTimestamp?: Date;
}

/**
 * Input data for updating a trait list entry
 */
interface UpdateTraitListEntryServiceInput {
  /** ID of the trait this entry belongs to */
  traitId?: string;
  /** ID of the species variant this entry belongs to */
  speciesVariantId?: string;
  /** Display order within the species variant */
  order?: number;
  /** Whether this trait is required for the species variant */
  required?: boolean;
  /** Type of values this trait stores */
  valueType?: $Enums.TraitValueType;
  /** Default string value (if trait is string type) */
  defaultValueString?: string;
  /** Default integer value (if trait is integer type) */
  defaultValueInt?: number;
  /** Default timestamp value (if trait is timestamp type) */
  defaultValueTimestamp?: Date;
}

@Injectable()
export class TraitListEntriesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new trait list entry */
  async create(input: CreateTraitListEntryServiceInput) {
    return this.prisma.traitListEntry.create({
      data: {
        order: input.order,
        required: input.required,
        valueType: input.valueType,
        defaultValueString: input.defaultValueString,
        defaultValueInt: input.defaultValueInt,
        defaultValueTimestamp: input.defaultValueTimestamp,
        trait: {
          connect: { id: input.traitId },
        },
        speciesVariant: {
          connect: { id: input.speciesVariantId },
        },
      },
    });
  }

  /** Find all trait list entries with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traitListEntries, totalCount] = await Promise.all([
      this.prisma.traitListEntry.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: [{ speciesVariant: { name: 'asc' } }, { order: 'asc' }],
      }),
      this.prisma.traitListEntry.count(),
    ]);

    const hasNextPage = traitListEntries.length > first;
    const nodes = hasNextPage
      ? traitListEntries.slice(0, -1)
      : traitListEntries;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find trait list entries by species variant ID with pagination */
  async findBySpeciesVariant(
    speciesVariantId: string,
    first: number = 20,
    after?: string,
  ) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traitListEntries, totalCount] = await Promise.all([
      this.prisma.traitListEntry.findMany({
        where: { speciesVariantId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { order: 'asc' },
      }),
      this.prisma.traitListEntry.count({
        where: { speciesVariantId },
      }),
    ]);

    const hasNextPage = traitListEntries.length > first;
    const nodes = hasNextPage
      ? traitListEntries.slice(0, -1)
      : traitListEntries;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find trait list entries by trait ID with pagination */
  async findByTrait(traitId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [traitListEntries, totalCount] = await Promise.all([
      this.prisma.traitListEntry.findMany({
        where: { traitId },
        take: first + 1,
        skip,
        cursor,
        orderBy: [{ speciesVariant: { name: 'asc' } }, { order: 'asc' }],
      }),
      this.prisma.traitListEntry.count({
        where: { traitId },
      }),
    ]);

    const hasNextPage = traitListEntries.length > first;
    const nodes = hasNextPage
      ? traitListEntries.slice(0, -1)
      : traitListEntries;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a trait list entry by ID */
  async findOne(id: string) {
    const traitListEntry = await this.prisma.traitListEntry.findUnique({
      where: { id },
    });

    if (!traitListEntry) {
      throw new NotFoundException(`TraitListEntry with ID ${id} not found`);
    }

    return traitListEntry;
  }

  /** Update a trait list entry */
  async update(id: string, input: UpdateTraitListEntryServiceInput) {
    const traitListEntry = await this.findOne(id); // This will throw if not found

    const updateData: Prisma.TraitListEntryUpdateInput = {};

    if (input.order !== undefined) updateData.order = input.order;
    if (input.required !== undefined) updateData.required = input.required;
    if (input.valueType !== undefined) updateData.valueType = input.valueType;
    if (input.defaultValueString !== undefined)
      updateData.defaultValueString = input.defaultValueString;
    if (input.defaultValueInt !== undefined)
      updateData.defaultValueInt = input.defaultValueInt;
    if (input.defaultValueTimestamp !== undefined)
      updateData.defaultValueTimestamp = input.defaultValueTimestamp;

    if (input.traitId !== undefined) {
      updateData.trait = { connect: { id: input.traitId } };
    }
    if (input.speciesVariantId !== undefined) {
      updateData.speciesVariant = { connect: { id: input.speciesVariantId } };
    }

    return this.prisma.traitListEntry.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a trait list entry */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.traitListEntry.delete({
      where: { id },
    });
  }
}
