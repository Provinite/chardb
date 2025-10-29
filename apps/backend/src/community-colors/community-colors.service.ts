import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';

@Injectable()
export class CommunityColorsService {
  constructor(private readonly db: DatabaseService) {}

  async createCommunityColor(input: Prisma.CommunityColorCreateInput) {
    try {
      return await this.db.communityColor.create({
        data: input,
        include: {
          community: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new ConflictException(
          'A color with this name already exists in this community',
        );
      }
      throw error;
    }
  }

  async findAllCommunityColors(communityId: string) {
    return await this.db.communityColor.findMany({
      where: { communityId },
      orderBy: { name: 'asc' },
      include: {
        community: true,
      },
    });
  }

  async findCommunityColorById(id: string) {
    const color = await this.db.communityColor.findUnique({
      where: { id },
      include: {
        community: true,
      },
    });

    if (!color) {
      throw new NotFoundException(`Community color with ID ${id} not found`);
    }

    return color;
  }

  async updateCommunityColor(id: string, input: Prisma.CommunityColorUpdateInput) {
    try {
      const color = await this.db.communityColor.update({
        where: { id },
        data: input,
        include: {
          community: true,
        },
      });

      return color;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Community color with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A color with this name already exists in this community',
        );
      }
      throw error;
    }
  }

  async deleteCommunityColor(id: string) {
    try {
      await this.db.communityColor.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Community color with ID ${id} not found`);
      }
      throw error;
    }
  }

  async validateColorBelongsToCommunity(colorId: string, communityId: string): Promise<boolean> {
    const color = await this.db.communityColor.findUnique({
      where: { id: colorId },
      select: { communityId: true },
    });

    if (!color) {
      throw new NotFoundException(`Community color with ID ${colorId} not found`);
    }

    if (color.communityId !== communityId) {
      throw new BadRequestException(
        'Color does not belong to the same community as the entity',
      );
    }

    return true;
  }
}
