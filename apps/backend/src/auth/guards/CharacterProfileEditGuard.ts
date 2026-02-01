import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { DatabaseService } from "../../database/database.service";
import { PermissionService } from "../PermissionService";
import { CommunityResolverService } from "../services/community-resolver.service";
import { getUserFromContext } from "../utils/get-user-from-context";
import { getNestedValue } from "../../common/utils/getNestedValue";
import { AllowCharacterProfileEditor } from "../decorators/AllowCharacterProfileEditor";

/**
 * Guard that checks character profile edit permissions based on ownership.
 *
 * Works with @AllowCharacterProfileEditor() decorator.
 * For registry field editing, use @AllowCharacterRegistryEditor() instead.
 *
 * Permission logic:
 * - If user owns the character: requires `canEditOwnCharacter` or `canEditCharacter` permission
 * - If user does not own the character: requires `canEditCharacter` permission
 * - For orphaned characters: requires `canCreateOrphanedCharacter` or `canEditCharacter` permission
 * - Permissions are resolved via character→species→community
 */
@Injectable()
export class CharacterProfileEditGuard implements CanActivate {
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

    const config = this.reflector.getAllAndOverride(AllowCharacterProfileEditor, [
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

    const isOrphaned = character.ownerId === null;

    // Handle orphaned characters (no owner)
    if (isOrphaned) {
      // Orphaned characters without species cannot be edited
      if (!character.speciesId) {
        return false;
      }

      // Resolve community from species
      const resolvedIds = {
        type: "speciesId" as const,
        value: character.speciesId,
      };
      const community =
        await this.communityResolverService.resolve(resolvedIds);

      if (!community) {
        return false;
      }

      // For orphaned characters, check if user has permission to manage orphaned characters
      // OR has canEditCharacter permission (profile-level)
      const permissions =
        await this.permissionService.getCommunityPermissions(
          user.id,
          community.id,
        );

      return !!(
        permissions.canCreateOrphanedCharacter ||
        permissions.canEditCharacter
      );
    }

    // Handle owned characters
    const isOwner = character.ownerId === user.id;

    // If no species, only owner can edit
    if (!character.speciesId) {
      return isOwner;
    }

    // Resolve community from species
    const resolvedIds = {
      type: "speciesId" as const,
      value: character.speciesId,
    };
    const community = await this.communityResolverService.resolve(resolvedIds);

    if (!community) {
      // No community means only owner can edit
      return isOwner;
    }

    // Check profile-level permissions only
    const permissions = await this.permissionService.getCommunityPermissions(
      user.id,
      community.id,
    );

    if (isOwner) {
      // Owner can edit if they have canEditOwnCharacter or canEditCharacter
      return !!(
        permissions.canEditOwnCharacter ||
        permissions.canEditCharacter
      );
    } else {
      // Non-owner needs canEditCharacter permission
      return !!permissions.canEditCharacter;
    }
  }
}
