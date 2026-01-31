import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { DatabaseService } from "../../database/database.service";
import { PermissionService } from "../PermissionService";
import { CommunityResolverService } from "../services/community-resolver.service";
import { getUserFromContext } from "../utils/get-user-from-context";
import { getNestedValue } from "../../common/utils/getNestedValue";
import { AllowCharacterRegistryEditor } from "../decorators/AllowCharacterRegistryEditor";
import { CommunityPermission } from "../CommunityPermission";

/**
 * Guard that checks character registry edit permissions based on ownership.
 *
 * Works with @AllowCharacterRegistryEditor() decorator.
 *
 * Permission logic:
 * - If user owns the character: requires `canEditOwnCharacterRegistry` permission
 * - If user does not own the character: requires `canEditCharacterRegistry` permission
 * - Permissions are resolved via character→species→community
 */
@Injectable()
export class CharacterRegistryEditGuard implements CanActivate {
  constructor(
    private prisma: DatabaseService,
    private permissionService: PermissionService,
    private communityResolverService: CommunityResolverService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = getUserFromContext(context);
    if (!user) {
      return false;
    }

    const config = this.reflector.getAllAndOverride(
      AllowCharacterRegistryEditor,
      [context.getHandler(), context.getClass()],
    );

    if (!config || !config.characterId) {
      return false;
    }

    // Resolve character ID from arguments
    const gqlContext = GqlExecutionContext.create(context);
    const args = gqlContext.getArgs();
    const characterId = getNestedValue(args, config.characterId);

    if (!characterId) {
      return false;
    }

    // Fetch character with species info
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: {
        ownerId: true,
        speciesId: true,
      },
    });

    if (!character) {
      return false;
    }

    // Registry edits require a species (can't edit registry on species-less characters)
    if (!character.speciesId) {
      return false;
    }

    const isOwner = character.ownerId === user.id;

    // Resolve community from species
    const resolvedIds = {
      type: "speciesId" as const,
      value: character.speciesId,
    };
    const community = await this.communityResolverService.resolve(resolvedIds);

    if (!community) {
      return false;
    }

    // Check appropriate registry permission based on ownership
    const requiredPermission = isOwner
      ? CommunityPermission.CanEditOwnCharacterRegistry
      : CommunityPermission.CanEditCharacterRegistry;

    const hasPermission = await this.permissionService.hasCommunityPermission(
      user.id,
      community.id,
      requiredPermission,
    );

    // Also allow if user has the "any character" permission
    if (!hasPermission && isOwner) {
      return this.permissionService.hasCommunityPermission(
        user.id,
        community.id,
        CommunityPermission.CanEditCharacterRegistry,
      );
    }

    return hasPermission;
  }
}
