import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for enum values operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new enum value
 */
interface CreateEnumValueServiceInput {
  /** Name/display text of this enum value */
  name: string;
  /** Display order within the trait's enum values */
  order?: number;
  /** ID of the trait this enum value belongs to */
  traitId: string;
}

/**
 * Input data for updating an enum value
 */
interface UpdateEnumValueServiceInput {
  /** Name/display text of this enum value */
  name?: string;
  /** Display order within the trait's enum values */
  order?: number;
  /** ID of the trait this enum value belongs to */
  traitId?: string;
}

@Injectable()
export class EnumValuesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new enum value */
  async create(input: CreateEnumValueServiceInput) {
    return this.prisma.enumValue.create({
      data: {
        name: input.name,
        order: input.order ?? 0,
        trait: {
          connect: { id: input.traitId },
        },
      },
    });
  }

  /** Find all enum values with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValues, totalCount] = await Promise.all([
      this.prisma.enumValue.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: [{ trait: { name: 'asc' } }, { order: 'asc' }],
      }),
      this.prisma.enumValue.count(),
    ]);

    const hasNextPage = enumValues.length > first;
    const nodes = hasNextPage ? enumValues.slice(0, -1) : enumValues;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find enum values by trait ID with pagination */
  async findByTrait(traitId: string, first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValues, totalCount] = await Promise.all([
      this.prisma.enumValue.findMany({
        where: { traitId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { order: 'asc' },
      }),
      this.prisma.enumValue.count({
        where: { traitId },
      }),
    ]);

    const hasNextPage = enumValues.length > first;
    const nodes = hasNextPage ? enumValues.slice(0, -1) : enumValues;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find an enum value by ID */
  async findOne(id: string) {
    const enumValue = await this.prisma.enumValue.findUnique({
      where: { id },
    });

    if (!enumValue) {
      throw new NotFoundException(`EnumValue with ID ${id} not found`);
    }

    return enumValue;
  }

  /** Update an enum value */
  async update(id: string, input: UpdateEnumValueServiceInput) {
    await this.findOne(id); // This will throw if not found

    const updateData: Prisma.EnumValueUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.order !== undefined) updateData.order = input.order;
    if (input.traitId !== undefined) {
      updateData.trait = { connect: { id: input.traitId } };
    }

    return this.prisma.enumValue.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove an enum value */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.enumValue.delete({
      where: { id },
    });
  }
}
