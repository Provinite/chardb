import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { CommunityMembersService } from "./community-members.service";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { CommunityPermission } from "../auth/CommunityPermission";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { PermissionService } from "../auth/PermissionService";
import { GlobalPermission } from "../auth/GlobalPermission";
import { CommunityResolverService } from "../auth/services/community-resolver.service";
import {
  CommunityMember,
  CommunityMemberConnection,
} from "./entities/community-member.entity";
import {
  CreateCommunityMemberInput,
  UpdateCommunityMemberInput,
} from "./dto/community-member.dto";
import { User } from "../users/entities/user.entity";
import { Role } from "../roles/entities/role.entity";
import {
  mapCreateCommunityMemberInputToService,
  mapUpdateCommunityMemberInputToService,
  mapPrismaCommunityMemberToGraphQL,
  mapPrismaCommunityMemberConnectionToGraphQL,
} from "./utils/community-member-resolver-mappers";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaRoleToGraphQL } from "../roles/utils/role-resolver-mappers";

@Resolver(() => CommunityMember)
export class CommunityMembersResolver {
  constructor(
    private readonly communityMembersService: CommunityMembersService,
    private readonly permissionService: PermissionService,
    private readonly communityResolverService: CommunityResolverService,
  ) {}

  @AllowGlobalAdmin()
  @Mutation(() => CommunityMember, {
    description: "Create a new community membership",
  })
  async createCommunityMember(
    @Args("createCommunityMemberInput", {
      description: "Community membership creation data",
    })
    createCommunityMemberInput: CreateCommunityMemberInput,
  ): Promise<CommunityMember> {
    const serviceInput = mapCreateCommunityMemberInputToService(
      createCommunityMemberInput,
    );
    const result = await this.communityMembersService.create(serviceInput);
    return mapPrismaCommunityMemberToGraphQL(result);
  }

  @AllowGlobalAdmin()
  @Query(() => CommunityMemberConnection, {
    name: "communityMembers",
    description: "Get all community members with pagination",
  })
  async findAll(
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of community members to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
  ): Promise<CommunityMemberConnection> {
    const result = await this.communityMembersService.findAll(first, after);
    return mapPrismaCommunityMemberConnectionToGraphQL(result);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => CommunityMemberConnection, {
    name: "communityMembersByCommunity",
    description: "Get community members by community ID with pagination",
  })
  async findByCommunity(
    @Args("communityId", { type: () => ID, description: "Community ID" })
    communityId: string,
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of community members to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
  ): Promise<CommunityMemberConnection> {
    const result = await this.communityMembersService.findByCommunity(
      communityId,
      first,
      after,
    );
    return mapPrismaCommunityMemberConnectionToGraphQL(result);
  }

  /** Get community members by user ID with pagination */
  @AllowAnyAuthenticated()
  @Query(() => CommunityMemberConnection, {
    name: "communityMembersByUser",
    description: "Get community members by user ID with pagination",
  })
  async findByUser(
    @Args("userId", { type: () => ID, description: "User ID" })
    userId: string,
    @CurrentUser() currentUser: AuthenticatedCurrentUserType,
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of community members to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
  ): Promise<CommunityMemberConnection> {
    // Check authorization: self OR admin
    const isSelf = this.permissionService.isSelf(currentUser.id, userId);
    const isAdmin = this.permissionService.hasGlobalPermission(
      currentUser,
      GlobalPermission.IsAdmin
    );

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException(
        "You can only view your own community memberships"
      );
    }

    const result = await this.communityMembersService.findByUser(
      userId,
      first,
      after,
    );
    return mapPrismaCommunityMemberConnectionToGraphQL(result);
  }

  /** Get a community member by ID */
  @AllowGlobalAdmin()
  @Query(() => CommunityMember, {
    name: "communityMemberById",
    description: "Get a community member by ID",
  })
  async findOne(
    @Args("id", { type: () => ID, description: "Community member ID" })
    id: string,
  ): Promise<CommunityMember> {
    const result = await this.communityMembersService.findOne(id);
    return mapPrismaCommunityMemberToGraphQL(result);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanManageMemberRoles)
  @ResolveCommunityFrom({ communityMemberId: "id" })
  @Mutation(() => CommunityMember, {
    description: "Update a community membership (change role)",
  })
  async updateCommunityMember(
    @Args("id", { type: () => ID, description: "Community member ID" })
    id: string,
    @Args("updateCommunityMemberInput", {
      description: "Community membership update data",
    })
    updateCommunityMemberInput: UpdateCommunityMemberInput,
  ): Promise<CommunityMember> {
    const serviceInput = mapUpdateCommunityMemberInputToService(
      updateCommunityMemberInput,
    );
    const result = await this.communityMembersService.update(id, serviceInput);
    return mapPrismaCommunityMemberToGraphQL(result);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => CommunityMember, {
    description: "Remove a community membership (leave community OR remove member with permission)",
  })
  async removeCommunityMember(
    @Args("id", { type: () => ID, description: "Community member ID" })
    id: string,
    @CurrentUser() currentUser: AuthenticatedCurrentUserType,
  ): Promise<CommunityMember> {
    const membership = await this.communityMembersService.findOne(id);

    // Resolve community from membership
    const community = await this.communityResolverService.resolve({
      type: "communityMemberId",
      value: id,
    });
    if (!community) {
      throw new NotFoundException("Community not found");
    }

    // Check all authorization conditions
    const isSelf = this.permissionService.isSelf(currentUser.id, membership.userId);
    const isAdmin = this.permissionService.hasGlobalPermission(
      currentUser,
      GlobalPermission.IsAdmin
    );
    const hasPermission = await this.permissionService.hasCommunityPermission(
      currentUser.id,
      community.id,
      CommunityPermission.CanRemoveCommunityMember
    );

    // Allow if: self-removal OR admin OR has permission
    if (!isSelf && !isAdmin && !hasPermission) {
      throw new ForbiddenException(
        "Cannot remove this community member"
      );
    }

    const result = await this.communityMembersService.remove(id);
    return mapPrismaCommunityMemberToGraphQL(result);
  }

  /** Resolve the role field */
  @AllowUnauthenticated()
  @ResolveField("role", () => Role, { description: "The role this member has" })
  async getRole(@Parent() communityMember: CommunityMember): Promise<Role> {
    const result = await this.communityMembersService.getRoleById(
      communityMember.roleId,
    );
    if (!result) {
      throw new NotFoundException(
        `Role with ID ${communityMember.roleId} not found`,
      );
    }
    return mapPrismaRoleToGraphQL(result);
  }

  /** Resolve the user field */
  @AllowUnauthenticated()
  @ResolveField("user", () => User, {
    description: "The user who is the member",
  })
  async getUser(@Parent() communityMember: CommunityMember): Promise<User> {
    const result = await this.communityMembersService.getUserById(
      communityMember.userId,
    );
    if (!result) {
      throw new NotFoundException(
        `User with ID ${communityMember.userId} not found`,
      );
    }
    return mapPrismaUserToGraphQL(result);
  }
}
