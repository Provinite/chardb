import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateEnumValueSettingInput, UpdateEnumValueSettingInput } from './dto/enum-value-setting.dto';
import { EnumValueSetting, EnumValueSettingConnection } from './entities/enum-value-setting.entity';

@Injectable()
export class EnumValueSettingsService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new enum value setting */
  async create(createEnumValueSettingInput: CreateEnumValueSettingInput): Promise<EnumValueSetting> {
    return this.prisma.enumValueSetting.create({
      data: createEnumValueSettingInput,
      include: {
        enumValue: true,
        speciesVariant: true,
      },
    });
  }

  /** Find all enum value settings with pagination */
  async findAll(first: number = 20, after?: string): Promise<EnumValueSettingConnection> {
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
        include: {
          enumValue: true,
          speciesVariant: true,
        },
      }),
      this.prisma.enumValueSetting.count(),
    ]);

    const hasNextPage = enumValueSettings.length > first;
    const nodes = hasNextPage ? enumValueSettings.slice(0, -1) : enumValueSettings;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find enum value settings by species variant ID with pagination */
  async findBySpeciesVariant(speciesVariantId: string, first: number = 20, after?: string): Promise<EnumValueSettingConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValueSettings, totalCount] = await Promise.all([
      this.prisma.enumValueSetting.findMany({
        where: { speciesVariantId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { enumValue: { order: 'asc' } },
        include: {
          enumValue: true,
          speciesVariant: true,
        },
      }),
      this.prisma.enumValueSetting.count({
        where: { speciesVariantId },
      }),
    ]);

    const hasNextPage = enumValueSettings.length > first;
    const nodes = hasNextPage ? enumValueSettings.slice(0, -1) : enumValueSettings;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find enum value settings by enum value ID with pagination */
  async findByEnumValue(enumValueId: string, first: number = 20, after?: string): Promise<EnumValueSettingConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValueSettings, totalCount] = await Promise.all([
      this.prisma.enumValueSetting.findMany({
        where: { enumValueId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { speciesVariant: { name: 'asc' } },
        include: {
          enumValue: true,
          speciesVariant: true,
        },
      }),
      this.prisma.enumValueSetting.count({
        where: { enumValueId },
      }),
    ]);

    const hasNextPage = enumValueSettings.length > first;
    const nodes = hasNextPage ? enumValueSettings.slice(0, -1) : enumValueSettings;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find an enum value setting by ID */
  async findOne(id: string): Promise<EnumValueSetting> {
    const enumValueSetting = await this.prisma.enumValueSetting.findUnique({
      where: { id },
      include: {
        enumValue: true,
        speciesVariant: true,
      },
    });

    if (!enumValueSetting) {
      throw new NotFoundException(`EnumValueSetting with ID ${id} not found`);
    }

    return enumValueSetting;
  }

  /** Update an enum value setting */
  async update(id: string, updateEnumValueSettingInput: UpdateEnumValueSettingInput): Promise<EnumValueSetting> {
    const enumValueSetting = await this.findOne(id); // This will throw if not found

    return this.prisma.enumValueSetting.update({
      where: { id },
      data: updateEnumValueSettingInput,
      include: {
        enumValue: true,
        speciesVariant: true,
      },
    });
  }

  /** Remove an enum value setting */
  async remove(id: string): Promise<EnumValueSetting> {
    const enumValueSetting = await this.findOne(id); // This will throw if not found

    return this.prisma.enumValueSetting.delete({
      where: { id },
      include: {
        enumValue: true,
        speciesVariant: true,
      },
    });
  }
}