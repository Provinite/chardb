import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateEnumValueInput, UpdateEnumValueInput } from './dto/enum-value.dto';
import { EnumValue, EnumValueConnection } from './entities/enum-value.entity';

@Injectable()
export class EnumValuesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new enum value */
  async create(createEnumValueInput: CreateEnumValueInput): Promise<EnumValue> {
    return this.prisma.enumValue.create({
      data: createEnumValueInput,
      include: {
        trait: true,
      },
    });
  }

  /** Find all enum values with pagination */
  async findAll(first: number = 20, after?: string): Promise<EnumValueConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValues, totalCount] = await Promise.all([
      this.prisma.enumValue.findMany({
        take: first + 1, // Take one extra to check if there's a next page
        skip,
        cursor,
        orderBy: [{ trait: { name: 'asc' } }, { order: 'asc' }],
        include: {
          trait: true,
        },
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
  async findByTrait(traitId: string, first: number = 20, after?: string): Promise<EnumValueConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [enumValues, totalCount] = await Promise.all([
      this.prisma.enumValue.findMany({
        where: { traitId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { order: 'asc' },
        include: {
          trait: true,
        },
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
  async findOne(id: string): Promise<EnumValue> {
    const enumValue = await this.prisma.enumValue.findUnique({
      where: { id },
      include: {
        trait: true,
      },
    });

    if (!enumValue) {
      throw new NotFoundException(`EnumValue with ID ${id} not found`);
    }

    return enumValue;
  }

  /** Update an enum value */
  async update(id: string, updateEnumValueInput: UpdateEnumValueInput): Promise<EnumValue> {
    const enumValue = await this.findOne(id); // This will throw if not found

    return this.prisma.enumValue.update({
      where: { id },
      data: updateEnumValueInput,
      include: {
        trait: true,
      },
    });
  }

  /** Remove an enum value */
  async remove(id: string): Promise<EnumValue> {
    const enumValue = await this.findOne(id); // This will throw if not found

    return this.prisma.enumValue.delete({
      where: { id },
      include: {
        trait: true,
      },
    });
  }
}