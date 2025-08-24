import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { RolesService } from './roles.service';
import { Role, RoleConnection } from './entities/role.entity';
import { CreateRoleInput, UpdateRoleInput } from './dto/role.dto';

@Resolver(() => Role)
export class RolesResolver {
  constructor(private readonly rolesService: RolesService) {}

  /** Create a new role */
  @Mutation(() => Role, { description: 'Create a new role' })
  createRole(
    @Args('createRoleInput', { description: 'Role creation data' }) 
    createRoleInput: CreateRoleInput,
  ): Promise<Role> {
    return this.rolesService.create(createRoleInput);
  }

  /** Get all roles with pagination */
  @Query(() => RoleConnection, { name: 'roles', description: 'Get all roles with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of roles to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<RoleConnection> {
    return this.rolesService.findAll(first, after);
  }

  /** Get roles by community ID with pagination */
  @Query(() => RoleConnection, { name: 'rolesByCommunity', description: 'Get roles by community ID with pagination' })
  findByCommunity(
    @Args('communityId', { type: () => ID, description: 'Community ID' })
    communityId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of roles to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<RoleConnection> {
    return this.rolesService.findByCommunity(communityId, first, after);
  }

  /** Get a role by ID */
  @Query(() => Role, { name: 'roleById', description: 'Get a role by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Role ID' }) 
    id: string,
  ): Promise<Role> {
    return this.rolesService.findOne(id);
  }

  /** Update a role */
  @Mutation(() => Role, { description: 'Update a role' })
  updateRole(
    @Args('id', { type: () => ID, description: 'Role ID' }) 
    id: string,
    @Args('updateRoleInput', { description: 'Role update data' }) 
    updateRoleInput: UpdateRoleInput,
  ): Promise<Role> {
    return this.rolesService.update(id, updateRoleInput);
  }

  /** Remove a role */
  @Mutation(() => Role, { description: 'Remove a role' })
  removeRole(
    @Args('id', { type: () => ID, description: 'Role ID' }) 
    id: string,
  ): Promise<Role> {
    return this.rolesService.remove(id);
  }
}