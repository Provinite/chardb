import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateRoleInput, UpdateRoleInput } from './dto/role.dto';
import { Role, RoleConnection } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new role */
  async create(createRoleInput: CreateRoleInput): Promise<Role> {
    return this.prisma.role.create({
      data: createRoleInput,
      include: {
        community: true,
      },
    });
  }

  /** Find all roles with pagination */
  async findAll(first: number = 20, after?: string): Promise<RoleConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [roles, totalCount] = await Promise.all([
      this.prisma.role.findMany({
        take: first + 1,
        skip,
        cursor,
        orderBy: [
          { community: { name: 'asc' } },
          { name: 'asc' },
        ],
        include: {
          community: true,
        },
      }),
      this.prisma.role.count(),
    ]);

    const hasNextPage = roles.length > first;
    const nodes = hasNextPage ? roles.slice(0, -1) : roles;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find roles by community ID with pagination */
  async findByCommunity(communityId: string, first: number = 20, after?: string): Promise<RoleConnection> {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [roles, totalCount] = await Promise.all([
      this.prisma.role.findMany({
        where: { communityId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { name: 'asc' },
        include: {
          community: true,
        },
      }),
      this.prisma.role.count({
        where: { communityId },
      }),
    ]);

    const hasNextPage = roles.length > first;
    const nodes = hasNextPage ? roles.slice(0, -1) : roles;

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage: !!after,
    };
  }

  /** Find a role by ID */
  async findOne(id: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        community: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /** Update a role */
  async update(id: string, updateRoleInput: UpdateRoleInput): Promise<Role> {
    const role = await this.findOne(id); // This will throw if not found

    return this.prisma.role.update({
      where: { id },
      data: updateRoleInput,
      include: {
        community: true,
      },
    });
  }

  /** Remove a role */
  async remove(id: string): Promise<Role> {
    const role = await this.findOne(id); // This will throw if not found

    return this.prisma.role.delete({
      where: { id },
      include: {
        community: true,
      },
    });
  }
}