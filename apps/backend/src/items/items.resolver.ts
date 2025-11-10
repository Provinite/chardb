import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { NotFoundException } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { ItemsService } from "./items.service";
import { CommunitiesService } from "../communities/communities.service";
import { UsersService } from "../users/users.service";
import { CommunityColorsService } from "../community-colors/community-colors.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { PendingOwnership } from "../pending-ownership/entities/pending-ownership.entity";
import { mapPrismaPendingOwnershipToGraphQL } from "../pending-ownership/utils/pending-ownership-mappers";
import {
  ItemType as ItemTypeEntity,
  ItemTypeConnection,
} from "./entities/item-type.entity";
import { Item as ItemEntity } from "./entities/item.entity";
import { Community } from "../communities/entities/community.entity";
import { Image } from "../images/entities/image.entity";
import { User } from "../users/entities/user.entity";
import { DatabaseService } from "../database/database.service";
import { mapPrismaImageToGraphQL } from "../images/utils/image-resolver-mappers";
import { CommunityColor } from "../community-colors/entities/community-color.entity";
import {
  CreateItemTypeInput,
  UpdateItemTypeInput,
  ItemTypeFiltersInput,
} from "./dto/item-type.dto";
import {
  GrantItemInput,
  UpdateItemInput,
  ItemFiltersInput,
} from "./dto/item.dto";
import {
  mapPrismaItemTypeConnectionToGraphQL,
  mapPrismaItemTypeToGraphQL,
} from "./utils/item-type-resolver-mappers";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaItemToGraphQL } from "./utils/item-resolver-mappers";

@Resolver(() => ItemTypeEntity)
export class ItemsResolver {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly communitiesService: CommunitiesService,
    private readonly usersService: UsersService,
    private readonly communityColorsService: CommunityColorsService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    private readonly database: DatabaseService,
  ) {}

  // ==================== ItemType Mutations ====================

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "input.communityId" })
  @Mutation(() => ItemTypeEntity)
  async createItemType(
    @Args("input") input: CreateItemTypeInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.createItemType({
      name: input.name,
      description: input.description,
      category: input.category,
      isStackable: input.isStackable ?? true,
      maxStackSize: input.maxStackSize,
      isTradeable: input.isTradeable ?? true,
      isConsumable: input.isConsumable ?? false,
      imageUrl: input.imageUrl,
      iconUrl: input.iconUrl,
      image: input.imageId ? { connect: { id: input.imageId } } : undefined,
      color: input.colorId ? { connect: { id: input.colorId } } : undefined,
      metadata: input.metadata || {},
      community: {
        connect: { id: input.communityId },
      },
    });

    return mapPrismaItemTypeToGraphQL(itemType);
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ itemTypeId: "id" })
  @Mutation(() => ItemTypeEntity)
  async updateItemType(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateItemTypeInput,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.updateItemType(id, {
      name: input.name,
      description: input.description,
      category: input.category,
      isStackable: input.isStackable,
      maxStackSize: input.maxStackSize,
      isTradeable: input.isTradeable,
      isConsumable: input.isConsumable,
      imageUrl: input.imageUrl,
      iconUrl: input.iconUrl,
      image:
        input.imageId !== undefined
          ? input.imageId
            ? { connect: { id: input.imageId } }
            : { disconnect: true }
          : undefined,
      color:
        input.colorId !== undefined
          ? input.colorId
            ? { connect: { id: input.colorId } }
            : { disconnect: true }
          : undefined,
      metadata: input.metadata,
    });

    return mapPrismaItemTypeToGraphQL(itemType);
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ itemTypeId: "id" })
  @Mutation(() => Boolean)
  async deleteItemType(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.itemsService.deleteItemType(id);
  }

  // ==================== ItemType Queries ====================

  @AllowUnauthenticated()
  @Query(() => ItemTypeConnection)
  async itemTypes(
    @Args("filters", { nullable: true }) filters?: ItemTypeFiltersInput,
  ): Promise<ItemTypeConnection> {
    const items = await this.itemsService.findAllItemTypes(filters);
    return mapPrismaItemTypeConnectionToGraphQL(items);
  }

  @AllowUnauthenticated()
  @Query(() => ItemTypeEntity)
  async itemType(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.findItemTypeById(id);
    return mapPrismaItemTypeToGraphQL(itemType);
  }

  // ==================== Item Mutations ====================

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemTypeId: "input.itemTypeId" })
  @Mutation(() => ItemEntity, {
    description: "Grant an item to a user (admin only)",
  })
  async grantItem(
    @Args("input") input: GrantItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ItemEntity> {
    const item = await this.itemsService.grantItem({
      itemTypeId: input.itemTypeId,
      userId: input.userId,
      quantity: input.quantity ?? 1,
      metadata: input.metadata,
      pendingOwner: input.pendingOwner,
    });

    return mapPrismaItemToGraphQL(item);
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemId: "id" })
  @Mutation(() => ItemEntity, { description: "Update an item (admin only)" })
  async updateItem(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateItemInput,
  ): Promise<ItemEntity> {
    const item = await this.itemsService.updateItem(id, {
      quantity: input.quantity,
      metadata: input.metadata,
    });

    return mapPrismaItemToGraphQL(item);
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemId: "id" })
  @Mutation(() => Boolean, { description: "Delete an item (admin only)" })
  async deleteItem(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.itemsService.deleteItem(id);
  }

  // ==================== Field Resolvers ====================

  @AllowUnauthenticated()
  @ResolveField(() => Community, { nullable: true })
  async community(
    @Parent() itemType: ItemTypeEntity,
  ): Promise<Community | null> {
    if (itemType.community) {
      return itemType.community;
    }
    return this.communitiesService.findOne(itemType.communityId);
  }

  @AllowUnauthenticated()
  @ResolveField(() => CommunityColor, { name: "color", nullable: true })
  async resolveColor(
    @Parent() itemType: ItemTypeEntity,
  ): Promise<CommunityColor | null> {
    if (!itemType.colorId) {
      return null;
    }

    try {
      return await this.communityColorsService.findCommunityColorById(
        itemType.colorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @AllowUnauthenticated()
  @ResolveField(() => Image, { name: "image", nullable: true })
  async resolveImage(
    @Parent() itemType: ItemTypeEntity,
  ): Promise<Image | null> {
    if (!itemType.imageId) {
      return null;
    }
    const prismaImage = await this.database.image.findUnique({
      where: { id: itemType.imageId },
      include: {
        uploader: true,
        artist: true,
      },
    });

    if (!prismaImage) {
      return null;
    }

    return mapPrismaImageToGraphQL(prismaImage);
  }
}

// Separate resolver for Item entity fields
@Resolver(() => ItemEntity)
export class ItemFieldsResolver {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly usersService: UsersService,
    private readonly pendingOwnershipService: PendingOwnershipService,
  ) {}

  @AllowUnauthenticated()
  @ResolveField(() => ItemTypeEntity, { name: "itemType" })
  async resolveItemType(@Parent() item: ItemEntity): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.findItemTypeById(item.itemTypeId);
    return mapPrismaItemTypeToGraphQL(itemType);
  }

  @AllowUnauthenticated()
  @ResolveField(() => User, { name: "owner", nullable: true })
  async resolveOwner(@Parent() item: ItemEntity): Promise<User | null> {
    if (!item.ownerId) return null; // Orphaned item
    const user = await this.usersService.findById(item.ownerId);
    if (!user) {
      return null;
    }
    return mapPrismaUserToGraphQL(user);
  }

  @AllowUnauthenticated()
  @ResolveField(() => PendingOwnership, {
    name: "pendingOwnership",
    nullable: true,
  })
  async resolvePendingOwnership(
    @Parent() item: ItemEntity,
  ): Promise<PendingOwnership | null> {
    const pending = await this.pendingOwnershipService.findByItemId(item.id);
    return pending ? mapPrismaPendingOwnershipToGraphQL(pending) : null;
  }
}
