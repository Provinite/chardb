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
import { AllowUnauthenticated } from '../auth/decorators/AllowUnauthenticated';
import { AllowAnyAuthenticated } from '../auth/decorators/AllowAnyAuthenticated';
import { AllowGlobalAdmin } from '../auth/decorators/AllowGlobalAdmin';
import { AllowCommunityPermission } from '../auth/decorators/AllowCommunityPermission';
import { ResolveCommunityFrom } from '../auth/decorators/ResolveCommunityFrom';
import { CommunityPermission } from '../auth/CommunityPermission';
import { CommunityColorsService } from './community-colors.service';
import { CommunitiesService } from '../communities/communities.service';
import { CommunityColor } from './entities/community-color.entity';
import { Community } from '../communities/entities/community.entity';
import {
  CreateCommunityColorInput,
  UpdateCommunityColorInput,
} from './dto/community-color.dto';

@Resolver(() => CommunityColor)
export class CommunityColorsResolver {
  constructor(
    private readonly communityColorsService: CommunityColorsService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  // ==================== Mutations ====================

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ communityId: 'input.communityId' })
  @Mutation(() => CommunityColor)
  async createCommunityColor(
    @Args('input') input: CreateCommunityColorInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CommunityColor> {
    const color = await this.communityColorsService.createCommunityColor({
      name: input.name,
      hexCode: input.hexCode,
      community: {
        connect: { id: input.communityId },
      },
    });

    return color as CommunityColor;
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ communityColorId: 'id' })
  @Mutation(() => CommunityColor)
  async updateCommunityColor(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCommunityColorInput,
  ): Promise<CommunityColor> {
    const color = await this.communityColorsService.updateCommunityColor(id, {
      name: input.name,
      hexCode: input.hexCode,
    });

    return color as CommunityColor;
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ communityColorId: 'id' })
  @Mutation(() => Boolean)
  async deleteCommunityColor(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.communityColorsService.deleteCommunityColor(id);
  }

  // ==================== Queries ====================

  @AllowUnauthenticated()
  @Query(() => [CommunityColor])
  async communityColors(
    @Args('communityId', { type: () => ID }) communityId: string,
  ): Promise<CommunityColor[]> {
    const colors = await this.communityColorsService.findAllCommunityColors(communityId);
    return colors as CommunityColor[];
  }

  @AllowUnauthenticated()
  @Query(() => CommunityColor)
  async communityColor(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CommunityColor> {
    const color = await this.communityColorsService.findCommunityColorById(id);
    return color as CommunityColor;
  }

  // ==================== Field Resolvers ====================

  @AllowUnauthenticated()
  @ResolveField(() => Community)
  async community(@Parent() color: CommunityColor): Promise<Community> {
    if (color.community) {
      return color.community;
    }
    return this.communitiesService.findOne(color.communityId);
  }
}
