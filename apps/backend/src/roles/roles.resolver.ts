import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RequireAuthenticated } from '../auth/decorators/RequireAuthenticated';
import { RequireGlobalAdmin } from '../auth/decorators/RequireGlobalAdmin';
import { Role, RoleConnection } from './entities/role.entity';
import { CreateRoleInput, UpdateRoleInput } from './dto/role.dto';
import {
  mapCreateRoleInputToService,
  mapUpdateRoleInputToService,
  mapPrismaRoleToGraphQL,
  mapPrismaRoleConnectionToGraphQL,
} from './utils/role-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { Community } from '../communities/entities/community.entity';
import { CommunitiesService } from '../communities/communities.service';
import { mapPrismaCommunityToGraphQL } from '../communities/utils/community-resolver-mappers';

@Resolver(() => Role)
export class RolesResolver {
  constructor(
    private readonly rolesService: RolesService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  @RequireAuthenticated()
  @Mutation(() => Role, { description: 'Create a new role' })
  async createRole(
    @Args('createRoleInput', { description: 'Role creation data' })
    createRoleInput: CreateRoleInput,
  ): Promise<Role> {
    const serviceInput = mapCreateRoleInputToService(createRoleInput);
    const prismaResult = await this.rolesService.create(serviceInput);
    return mapPrismaRoleToGraphQL(prismaResult);
  }

  @RequireGlobalAdmin()
  @Query(() => RoleConnection, { name: 'roles', description: 'Get all roles with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of roles to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<RoleConnection> {
    const serviceResult = await this.rolesService.findAll(first, after);
    return mapPrismaRoleConnectionToGraphQL(serviceResult);
  }

  @RequireAuthenticated()
  @Query(() => RoleConnection, { name: 'rolesByCommunity', description: 'Get roles by community ID with pagination' })
  async findByCommunity(
    @Args('communityId', { type: () => ID, description: 'Community ID' })
    communityId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of roles to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<RoleConnection> {
    const serviceResult = await this.rolesService.findByCommunity(communityId, first, after);
    return mapPrismaRoleConnectionToGraphQL(serviceResult);
  }

  @RequireAuthenticated()
  @Query(() => Role, { name: 'roleById', description: 'Get a role by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Role ID' })
    id: string,
  ): Promise<Role> {
    const prismaResult = await this.rolesService.findOne(id);
    return mapPrismaRoleToGraphQL(prismaResult);
  }

  @RequireAuthenticated()
  @Mutation(() => Role, { description: 'Update a role' })
  async updateRole(
    @Args('id', { type: () => ID, description: 'Role ID' })
    id: string,
    @Args('updateRoleInput', { description: 'Role update data' })
    updateRoleInput: UpdateRoleInput,
  ): Promise<Role> {
    const serviceInput = mapUpdateRoleInputToService(updateRoleInput);
    const prismaResult = await this.rolesService.update(id, serviceInput);
    return mapPrismaRoleToGraphQL(prismaResult);
  }

  @RequireAuthenticated()
  @Mutation(() => RemovalResponse, { description: 'Remove a role' })
  async removeRole(
    @Args('id', { type: () => ID, description: 'Role ID' })
    id: string,
  ): Promise<RemovalResponse> {
    await this.rolesService.remove(id);
    return { removed: true, message: 'Role successfully removed' };
  }

  // Field resolver for relations
  @ResolveField('community', () => Community, { description: 'The community this role belongs to' })
  async resolveCommunity(@Parent() role: Role): Promise<Community | null> {
    try {
      const prismaResult = await this.communitiesService.findOne(role.communityId);
      return mapPrismaCommunityToGraphQL(prismaResult);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }
}