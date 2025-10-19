import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for enum value settings operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new enum value setting
 */
interface CreateEnumValueSettingServiceInput {
  /** ID of the enum value this setting allows */
  enumValueId: string;
  /** ID of the species variant this setting belongs to */
  speciesVariantId: string;
}

/**
 * Input data for updating an enum value setting
 */
interface UpdateEnumValueSettingServiceInput {
  /** ID of the enum value this setting allows */
  enumValueId?: string;
  /** ID of the species variant this setting belongs to */
  speciesVariantId?: string;
}

@Injectable()
export class EnumValueSettingsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new enum value setting */
  async create(input: CreateEnumValueSettingServiceInput) {
    return this.prisma.enumValueSetting.create({
      data: {
        enumValue: {
          connect: { id: input.enumValueId },
        },
        speciesVariant: {
          connect: { id: input.speciesVariantId },
        },
      },
    });
  }

  /** Find all enum value settings with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValueSettings, totalCount] = await Promise.all([
      this.prisma.enumValueSetting.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: [
          { speciesVariant: { name: 'asc' } },
          { enumValue: { order: 'asc' } },
        ],
      }),
      this.prisma.enumValueSetting.count(),
    ]);

    const hasNextPage = enumValueSettings.length > first;
    const nodes = hasNextPage
      ? enumValueSettings.slice(0, -1)
      : enumValueSettings;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find enum value settings by species variant ID with pagination */
  async findBySpeciesVariant(
    speciesVariantId: string,
    first: number = 20,
    after?: string,
  ) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValueSettings, totalCount] = await Promise.all([
      this.prisma.enumValueSetting.findMany({
        where: { speciesVariantId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { enumValue: { order: 'asc' } },
      }),
      this.prisma.enumValueSetting.count({
        where: { speciesVariantId },
      }),
    ]);

    const hasNextPage = enumValueSettings.length > first;
    const nodes = hasNextPage
      ? enumValueSettings.slice(0, -1)
      : enumValueSettings;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find enum value settings by enum value ID with pagination */
  async findByEnumValue(
    enumValueId: string,
    first: number = 20,
    after?: string,
  ) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValueSettings, totalCount] = await Promise.all([
      this.prisma.enumValueSetting.findMany({
        where: { enumValueId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { speciesVariant: { name: 'asc' } },
      }),
      this.prisma.enumValueSetting.count({
        where: { enumValueId },
      }),
    ]);

    const hasNextPage = enumValueSettings.length > first;
    const nodes = hasNextPage
      ? enumValueSettings.slice(0, -1)
      : enumValueSettings;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find an enum value setting by ID */
  async findOne(id: string) {
    const enumValueSetting = await this.prisma.enumValueSetting.findUnique({
      where: { id },
    });

    if (!enumValueSetting) {
      throw new NotFoundException(`EnumValueSetting with ID ${id} not found`);
    }

    return enumValueSetting;
  }

  /** Update an enum value setting */
  async update(id: string, input: UpdateEnumValueSettingServiceInput) {
    await this.findOne(id); // This will throw if not found

    const updateData: Prisma.EnumValueSettingUpdateInput = {};

    if (input.enumValueId !== undefined) {
      updateData.enumValue = { connect: { id: input.enumValueId } };
    }
    if (input.speciesVariantId !== undefined) {
      updateData.speciesVariant = { connect: { id: input.speciesVariantId } };
    }

    return this.prisma.enumValueSetting.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove an enum value setting */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.enumValueSetting.delete({
      where: { id },
    });
  }
}
