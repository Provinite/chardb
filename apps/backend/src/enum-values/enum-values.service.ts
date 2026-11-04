import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "@chardb/database";
import { CommunityColorsService } from "../community-colors/community-colors.service";
import {
  assertCompleteReorder,
  positionsInLockOrder,
} from "../shared/utils/reorder";

/**
 * Service layer input types for enum values operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new enum value
 */
export interface CreateEnumValueServiceInput {
  /** Name/display text of this enum value */
  name: string;
  /** Display order within the trait's enum values */
  order?: number;
  /** ID of the trait this enum value belongs to */
  traitId: string;
  /** ID of the color for this enum value */
  colorId?: string | null;
}

/**
 * Input data for updating an enum value
 */
export interface UpdateEnumValueServiceInput {
  /** Name/display text of this enum value */
  name?: string;
  /** Display order within the trait's enum values */
  order?: number;
  /** ID of the trait this enum value belongs to */
  traitId?: string;
  /** ID of the color for this enum value */
  colorId?: string | null;
}

@Injectable()
export class EnumValuesService {
  constructor(
    private prisma: DatabaseService,
    private communityColorsService: CommunityColorsService,
  ) {}

  /** Create a new enum value */
  async create(input: CreateEnumValueServiceInput) {
    // Validate colorId if provided
    if (input.colorId) {
      // Get the trait and its species to find the communityId
      const trait = await this.prisma.trait.findUnique({
        where: { id: input.traitId },
        include: { species: { select: { communityId: true } } },
      });

      if (!trait) {
        throw new NotFoundException(`Trait with ID ${input.traitId} not found`);
      }

      // Validate the color belongs to the same community
      await this.communityColorsService.validateColorBelongsToCommunity(
        input.colorId,
        trait.species.communityId,
      );
    }

    return this.prisma.enumValue.create({
      data: {
        name: input.name,
        order: input.order ?? (await this.nextOrder(input.traitId)),
        trait: {
          connect: { id: input.traitId },
        },
        ...(input.colorId && {
          color: {
            connect: { id: input.colorId },
          },
        }),
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
        orderBy: [{ trait: { name: "asc" } }, { order: "asc" }],
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
        orderBy: { order: "asc" },
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

  /**
   * Arranges a trait's values in the order given. The list must name each of
   * the trait's values exactly once.
   */
  async reorder(traitId: string, enumValueIds: string[]) {
    const existing = await this.prisma.enumValue.findMany({
      where: { traitId },
      select: { id: true },
    });
    assertCompleteReorder(
      enumValueIds,
      existing.map((row) => row.id),
    );

    // `(traitId, order)` is unique and Postgres checks it row by row, so
    // writing the final positions directly would collide mid-swap. Every row
    // first moves to a negative position no final one can share.
    const rows = positionsInLockOrder(enumValueIds);
    await this.prisma.$transaction([
      ...rows.map(({ id, position }) =>
        this.prisma.enumValue.update({
          where: { id },
          data: { order: -(position + 1) },
        }),
      ),
      ...rows.map(({ id, position }) =>
        this.prisma.enumValue.update({
          where: { id },
          data: { order: position },
        }),
      ),
    ]);

    return this.prisma.enumValue.findMany({
      where: { traitId },
      orderBy: { order: "asc" },
    });
  }

  /** The position after a trait's last value. */
  private async nextOrder(traitId: string): Promise<number> {
    const { _max } = await this.prisma.enumValue.aggregate({
      where: { traitId },
      _max: { order: true },
    });
    return _max.order === null ? 0 : _max.order + 1;
  }

  /** Update an enum value */
  async update(id: string, input: UpdateEnumValueServiceInput) {
    const enumValue = await this.findOne(id); // This will throw if not found

    const updateData: Prisma.EnumValueUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.order !== undefined) updateData.order = input.order;
    if (input.traitId !== undefined) {
      updateData.trait = { connect: { id: input.traitId } };
    }
    if (input.colorId !== undefined) {
      // Validate colorId if it's being set (not null)
      if (input.colorId) {
        // Get the trait and its species to find the communityId
        const trait = await this.prisma.trait.findUnique({
          where: { id: enumValue.traitId },
          include: { species: { select: { communityId: true } } },
        });

        if (!trait) {
          throw new NotFoundException(
            `Trait with ID ${enumValue.traitId} not found`,
          );
        }

        // Validate the color belongs to the same community
        await this.communityColorsService.validateColorBelongsToCommunity(
          input.colorId,
          trait.species.communityId,
        );
      }

      updateData.color = input.colorId
        ? { connect: { id: input.colorId } }
        : { disconnect: true };
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
