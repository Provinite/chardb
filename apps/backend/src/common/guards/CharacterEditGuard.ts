import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { DatabaseService } from "../../database/database.service";
import { PermissionService } from "../../auth/PermissionService";
import { CommunityResolverService } from "../../auth/services/community-resolver.service";
import { getUserFromContext } from "../../auth/utils/get-user-from-context";
import { getNestedValue } from "../utils/getNestedValue";
import { RequireCharacterEdit } from "../../auth/decorators/RequireCharacterEdit";
import { CommunityPermission } from "../../auth/CommunityPermission";

/**
 * Guard that checks character edit permissions based on ownership.
 *
 * Works with @RequireCharacterEdit() decorator.
 *
 * Permission logic:
 * - If user owns the character: requires `canEditOwnCharacter` permission
 * - If user does not own the character: requires `canEditCharacter` permission
 * - Permissions are resolved via character→species→community
 */
@Injectable()
export class CharacterEditGuard implements CanActivate {
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

    const config = this.reflector.getAllAndOverride(RequireCharacterEdit, [
      context.getHandler(),
      context.getClass(),
    ]);

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

    const isOwner = character.ownerId === user.id;

    // If no species, only owner can edit
    if (!character.speciesId) {
      return isOwner;
    }

    // Resolve community from species
    const resolvedIds = { type: "speciesId" as const, value: character.speciesId };
    const community = await this.communityResolverService.resolve(resolvedIds);

    if (!community) {
      // No community means only owner can edit
      return isOwner;
    }

    // Check appropriate permission based on ownership
    const requiredPermission = isOwner
      ? CommunityPermission.CanEditOwnCharacter
      : CommunityPermission.CanEditCharacter;

    return this.permissionService.hasCommunityPermission(
      user.id,
      community.id,
      requiredPermission,
    );
  }
}
