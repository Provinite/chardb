import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/CurrentUser';
import { AuthenticatedCurrentUserType } from '../auth/types/current-user.type';
import { AllowAnyAuthenticated } from '../auth/decorators/AllowAnyAuthenticated';
import { AllowUnauthenticated } from '../auth/decorators/AllowUnauthenticated';
import { AllowCommunityPermission } from '../auth/decorators/AllowCommunityPermission';
import { ResolveCommunityFrom } from '../auth/decorators/ResolveCommunityFrom';
import { CommunityPermission } from '../auth/CommunityPermission';
import { ItemsService } from './items.service';
import { CommunitiesService } from '../communities/communities.service';
import { UsersService } from '../users/users.service';
import {
  ItemType as ItemTypeEntity,
  ItemTypeConnection,
} from './entities/item-type.entity';
import { Item as ItemEntity, ItemConnection } from './entities/item.entity';
import { Community } from '../communities/entities/community.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateItemTypeInput,
  UpdateItemTypeInput,
  ItemTypeFiltersInput,
} from './dto/item-type.dto';
import {
  GrantItemInput,
  UpdateItemInput,
  ItemFiltersInput,
} from './dto/item.dto';

@Resolver(() => ItemTypeEntity)
export class ItemsResolver {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly communitiesService: CommunitiesService,
    private readonly usersService: UsersService,
  ) {}

  // ==================== ItemType Mutations ====================

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: 'input.communityId' })
  @Mutation(() => ItemTypeEntity)
  async createItemType(
    @Args('input') input: CreateItemTypeInput,
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
      color: input.colorId ? { connect: { id: input.colorId } } : undefined,
      metadata: input.metadata || {},
      community: {
        connect: { id: input.communityId },
      },
    });

    return itemType as ItemTypeEntity;
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ itemTypeId: 'id' })
  @Mutation(() => ItemTypeEntity)
  async updateItemType(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateItemTypeInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
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
      color: input.colorId !== undefined
        ? (input.colorId ? { connect: { id: input.colorId } } : { disconnect: true })
        : undefined,
      metadata: input.metadata,
    });

    return itemType as ItemTypeEntity;
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ itemTypeId: 'id' })
  @Mutation(() => Boolean)
  async deleteItemType(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.itemsService.deleteItemType(id);
  }

  // ==================== ItemType Queries ====================

  @AllowUnauthenticated()
  @Query(() => ItemTypeConnection)
  async itemTypes(
    @Args('filters', { nullable: true }) filters?: ItemTypeFiltersInput,
  ): Promise<any> {
    return this.itemsService.findAllItemTypes(filters);
  }

  @AllowUnauthenticated()
  @Query(() => ItemTypeEntity)
  async itemType(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.findItemTypeById(id);
    return itemType as ItemTypeEntity;
  }

  // ==================== Item Mutations ====================

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemTypeId: 'input.itemTypeId' })
  @Mutation(() => ItemEntity, { description: 'Grant an item to a user (admin only)' })
  async grantItem(
    @Args('input') input: GrantItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ItemEntity> {
    const item = await this.itemsService.grantItem({
      itemTypeId: input.itemTypeId,
      userId: input.userId,
      quantity: input.quantity ?? 1,
      metadata: input.metadata,
    });

    return item as any;
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemId: 'id' })
  @Mutation(() => ItemEntity, { description: 'Update an item (admin only)' })
  async updateItem(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ItemEntity> {
    const item = await this.itemsService.updateItem(id, {
      quantity: input.quantity,
      metadata: input.metadata,
    });

    return item as any;
  }

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemId: 'id' })
  @Mutation(() => Boolean, { description: 'Delete an item (admin only)' })
  async deleteItem(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.itemsService.deleteItem(id);
  }

  // ==================== Field Resolvers ====================

  @AllowUnauthenticated()
  @ResolveField(() => Community, { nullable: true })
  async community(@Parent() itemType: ItemTypeEntity): Promise<Community | null> {
    if (itemType.community) {
      return itemType.community;
    }
    return this.communitiesService.findOne(itemType.communityId);
  }

  @AllowUnauthenticated()
  @ResolveField(() => ItemTypeEntity, { name: 'itemType' })
  async resolveItemType(@Parent() item: ItemEntity): Promise<any> {
    if (item.itemType) {
      return item.itemType;
    }
    return this.itemsService.findItemTypeById(item.itemTypeId);
  }

  @AllowUnauthenticated()
  @ResolveField(() => User, { name: 'owner' })
  async resolveOwner(@Parent() item: ItemEntity): Promise<any> {
    if (item.owner) {
      return item.owner;
    }
    return this.usersService.findById(item.ownerId);
  }
}
