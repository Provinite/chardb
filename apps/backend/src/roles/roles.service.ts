import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Prisma } from "@chardb/database";

/**
 * Service layer input types for roles operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of Prisma relation objects.
 */

/**
 * Input data for creating a new role
 */
export interface CreateRoleServiceInput {
  /** The name of the role */
  name: string;
  /** The community this role belongs to */
  communityId: string;
  /** Permission to create new species */
  canCreateSpecies?: boolean;
  /** Permission to create new characters */
  canCreateCharacter?: boolean;
  /** Permission to create orphaned characters */
  canCreateOrphanedCharacter?: boolean;
  /** Permission to edit characters */
  canEditCharacter?: boolean;
  /** Permission to edit own characters only */
  canEditOwnCharacter?: boolean;
  /** Permission to edit species */
  canEditSpecies?: boolean;
  /** Permission to create invite codes */
  canCreateInviteCode?: boolean;
  /** Permission to list invite codes */
  canListInviteCodes?: boolean;
  /** Permission to create new roles */
  canCreateRole?: boolean;
  /** Permission to edit existing roles */
  canEditRole?: boolean;
  /** Permission to remove community members */
  canRemoveCommunityMember?: boolean;
  /** Permission to manage member roles */
  canManageMemberRoles?: boolean;
  /** Permission to manage item types */
  canManageItems?: boolean;
  /** Permission to grant items to users */
  canGrantItems?: boolean;
  /** Permission to upload images to own characters */
  canUploadOwnCharacterImages?: boolean;
  /** Permission to upload images to any character */
  canUploadCharacterImages?: boolean;
}

/**
 * Input data for updating a role
 */
export interface UpdateRoleServiceInput {
  /** The name of the role */
  name?: string;
  /** Permission to create new species */
  canCreateSpecies?: boolean;
  /** Permission to create new characters */
  canCreateCharacter?: boolean;
  /** Permission to create orphaned characters */
  canCreateOrphanedCharacter?: boolean;
  /** Permission to edit characters */
  canEditCharacter?: boolean;
  /** Permission to edit own characters only */
  canEditOwnCharacter?: boolean;
  /** Permission to edit species */
  canEditSpecies?: boolean;
  /** Permission to create invite codes */
  canCreateInviteCode?: boolean;
  /** Permission to list invite codes */
  canListInviteCodes?: boolean;
  /** Permission to create new roles */
  canCreateRole?: boolean;
  /** Permission to edit existing roles */
  canEditRole?: boolean;
  /** Permission to remove community members */
  canRemoveCommunityMember?: boolean;
  /** Permission to manage member roles */
  canManageMemberRoles?: boolean;
  /** Permission to manage item types */
  canManageItems?: boolean;
  /** Permission to grant items to users */
  canGrantItems?: boolean;
  /** Permission to upload images to own characters */
  canUploadOwnCharacterImages?: boolean;
  /** Permission to upload images to any character */
  canUploadCharacterImages?: boolean;
}

@Injectable()
export class RolesService {
  constructor(private prisma: DatabaseService) {}

  /** Create a new role */
  async create(input: CreateRoleServiceInput) {
    return this.prisma.role.create({
      data: {
        name: input.name,
        canCreateSpecies: input.canCreateSpecies ?? false,
        canCreateCharacter: input.canCreateCharacter ?? false,
        canCreateOrphanedCharacter: input.canCreateOrphanedCharacter ?? false,
        canEditCharacter: input.canEditCharacter ?? false,
        canEditOwnCharacter: input.canEditOwnCharacter ?? false,
        canEditSpecies: input.canEditSpecies ?? false,
        canCreateInviteCode: input.canCreateInviteCode ?? false,
        canListInviteCodes: input.canListInviteCodes ?? false,
        canCreateRole: input.canCreateRole ?? false,
        canEditRole: input.canEditRole ?? false,
        canRemoveCommunityMember: input.canRemoveCommunityMember ?? false,
        canManageMemberRoles: input.canManageMemberRoles ?? false,
        canManageItems: input.canManageItems ?? false,
        canGrantItems: input.canGrantItems ?? false,
        canUploadOwnCharacterImages: input.canUploadOwnCharacterImages ?? false,
        canUploadCharacterImages: input.canUploadCharacterImages ?? false,
        community: {
          connect: { id: input.communityId },
        },
      },
    });
  }

  /** Find all roles with pagination */
  async findAll(first: number = 20, after?: string) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [roles, totalCount] = await Promise.all([
      this.prisma.role.findMany({
        take: first + 1,
        skip,
        cursor,
        orderBy: [{ community: { name: "asc" } }, { name: "asc" }],
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
  async findByCommunity(
    communityId: string,
    first: number = 20,
    after?: string,
  ) {
    const skip = after ? 1 : 0;
    const cursor = after ? { id: after } : undefined;

    const [roles, totalCount] = await Promise.all([
      this.prisma.role.findMany({
        where: { communityId },
        take: first + 1,
        skip,
        cursor,
        orderBy: { name: "asc" },
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
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /** Update a role */
  async update(id: string, input: UpdateRoleServiceInput) {
    const role = await this.findOne(id); // This will throw if not found

    const updateData: Prisma.RoleUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.canCreateSpecies !== undefined)
      updateData.canCreateSpecies = input.canCreateSpecies;
    if (input.canCreateCharacter !== undefined)
      updateData.canCreateCharacter = input.canCreateCharacter;
    if (input.canCreateOrphanedCharacter !== undefined)
      updateData.canCreateOrphanedCharacter = input.canCreateOrphanedCharacter;
    if (input.canEditCharacter !== undefined)
      updateData.canEditCharacter = input.canEditCharacter;
    if (input.canEditOwnCharacter !== undefined)
      updateData.canEditOwnCharacter = input.canEditOwnCharacter;
    if (input.canEditSpecies !== undefined)
      updateData.canEditSpecies = input.canEditSpecies;
    if (input.canCreateInviteCode !== undefined)
      updateData.canCreateInviteCode = input.canCreateInviteCode;
    if (input.canListInviteCodes !== undefined)
      updateData.canListInviteCodes = input.canListInviteCodes;
    if (input.canCreateRole !== undefined)
      updateData.canCreateRole = input.canCreateRole;
    if (input.canEditRole !== undefined)
      updateData.canEditRole = input.canEditRole;
    if (input.canRemoveCommunityMember !== undefined)
      updateData.canRemoveCommunityMember = input.canRemoveCommunityMember;
    if (input.canManageMemberRoles !== undefined)
      updateData.canManageMemberRoles = input.canManageMemberRoles;
    if (input.canManageItems !== undefined)
      updateData.canManageItems = input.canManageItems;
    if (input.canGrantItems !== undefined)
      updateData.canGrantItems = input.canGrantItems;
    if (input.canUploadOwnCharacterImages !== undefined)
      updateData.canUploadOwnCharacterImages = input.canUploadOwnCharacterImages;
    if (input.canUploadCharacterImages !== undefined)
      updateData.canUploadCharacterImages = input.canUploadCharacterImages;

    return this.prisma.role.update({
      where: { id },
      data: updateData,
    });
  }

  /** Remove a role */
  async remove(id: string) {
    await this.findOne(id); // This will throw if not found

    return this.prisma.role.delete({
      where: { id },
    });
  }
}
