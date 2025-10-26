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
import { NotFoundException } from "@nestjs/common";
import { SpeciesService } from "./species.service";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { Species, SpeciesConnection } from "./entities/species.entity";
import { CreateSpeciesInput, UpdateSpeciesInput } from "./dto/species.dto";
import {
  mapCreateSpeciesInputToService,
  mapUpdateSpeciesInputToService,
  mapPrismaSpeciesToGraphQL,
  mapPrismaSpeciesConnectionToGraphQL,
} from "./utils/species-resolver-mappers";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import { Community } from "../communities/entities/community.entity";
import { CommunitiesService } from "../communities/communities.service";
import { mapPrismaCommunityToGraphQL } from "../communities/utils/community-resolver-mappers";
import { Trait } from "../traits/entities/trait.entity";
import { TraitsService } from "../traits/traits.service";
import { mapPrismaTraitToGraphQL } from "../traits/utils/trait-resolver-mappers";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";

@Resolver(() => Species)
export class SpeciesResolver {
  constructor(
    private readonly speciesService: SpeciesService,
    private readonly communitiesService: CommunitiesService,
    private readonly traitsService: TraitsService
  ) {}

  @AllowCommunityPermission(CommunityPermission.CanCreateSpecies)
  @ResolveCommunityFrom({ communityId: "createSpeciesInput.communityId" })
  @Mutation(() => Species, { description: "Create a new species" })
  async createSpecies(
    @Args("createSpeciesInput", { description: "Species creation data" })
    createSpeciesInput: CreateSpeciesInput
  ): Promise<Species> {
    const serviceInput = mapCreateSpeciesInputToService(createSpeciesInput);
    const prismaResult = await this.speciesService.create(serviceInput);
    return mapPrismaSpeciesToGraphQL(prismaResult);
  }

  /** Get all species with pagination - filtered by user's community memberships */
  @AllowAnyAuthenticated()
  @Query(() => SpeciesConnection, {
    name: "species",
    description: "Get all species with pagination",
  })
  async findAll(
    @CurrentUser() currentUser: AuthenticatedCurrentUserType,
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of species to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
  ): Promise<SpeciesConnection> {
    const serviceResult = await this.speciesService.findAll(
      first,
      after,
      currentUser.id,
    );
    return mapPrismaSpeciesConnectionToGraphQL(serviceResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => SpeciesConnection, {
    name: "speciesByCommunity",
    description: "Get species by community ID with pagination",
  })
  async findByCommunity(
    @Args("communityId", { type: () => ID, description: "Community ID" })
    communityId: string,
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of species to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string
  ): Promise<SpeciesConnection> {
    const serviceResult = await this.speciesService.findByCommunity(
      communityId,
      first,
      after
    );
    return mapPrismaSpeciesConnectionToGraphQL(serviceResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ speciesId: "id" })
  @Query(() => Species, {
    name: "speciesById",
    description: "Get a species by ID",
  })
  async findOne(
    @Args("id", { type: () => ID, description: "Species ID" })
    id: string
  ): Promise<Species> {
    const prismaResult = await this.speciesService.findOne(id);
    return mapPrismaSpeciesToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ speciesId: "id" })
  @Mutation(() => Species, { description: "Update a species" })
  async updateSpecies(
    @Args("id", { type: () => ID, description: "Species ID" })
    id: string,
    @Args("updateSpeciesInput", { description: "Species update data" })
    updateSpeciesInput: UpdateSpeciesInput
  ): Promise<Species> {
    const serviceInput = mapUpdateSpeciesInputToService(updateSpeciesInput);
    const prismaResult = await this.speciesService.update(id, serviceInput);
    return mapPrismaSpeciesToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ speciesId: "id" })
  @Mutation(() => RemovalResponse, { description: "Remove a species" })
  async removeSpecies(
    @Args("id", { type: () => ID, description: "Species ID" })
    id: string
  ): Promise<RemovalResponse> {
    await this.speciesService.remove(id);
    return { removed: true, message: "Species successfully removed" };
  }

  // Field resolvers for relations
  @AllowUnauthenticated()
  @ResolveField("community", () => Community, {
    description: "The community that owns this species",
  })
  async resolveCommunity(
    @Parent() species: Species
  ): Promise<Community | null> {
    try {
      const prismaResult = await this.communitiesService.findOne(
        species.communityId
      );
      return mapPrismaCommunityToGraphQL(prismaResult);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @AllowUnauthenticated()
  @ResolveField("traits", () => [Trait], {
    description: "Traits associated with this species",
  })
  async resolveTraits(@Parent() species: Species): Promise<Trait[]> {
    const serviceResult = await this.traitsService.findBySpecies(
      species.id,
      100
    ); // Get up to 100 traits
    return serviceResult.nodes.map(mapPrismaTraitToGraphQL);
  }
}
